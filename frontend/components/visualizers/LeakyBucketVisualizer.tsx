import type { LogEntry } from "@/lib/types";
import { estimateLeakyBucketLevel, leakyBucketQueueItems } from "@/lib/bucketMath";

interface LeakyBucketVisualizerProps {
  entries: LogEntry[];
  limit: number;
  windowSeconds: number;
  now: number;
}

export default function LeakyBucketVisualizer({
  entries,
  limit,
  windowSeconds,
  now,
}: LeakyBucketVisualizerProps) {
  const level = estimateLeakyBucketLevel(entries, limit, windowSeconds, now);
  const pct = limit > 0 ? Math.min(100, (level / limit) * 100) : 0;
  const leakPerSecond = limit / windowSeconds;
  const queue = leakyBucketQueueItems(entries, now).slice(0, 8);

  const recentProcessed = entries
    .filter(
      (e) =>
        !e.inFlight &&
        e.result.ok &&
        e.result.data.allowed &&
        typeof e.result.data.processedAt === "number" &&
        now - (e.result.data.processedAt ?? 0) < 8000,
    )
    .sort((a, b) => {
      const ap = a.result.ok ? (a.result.data.processedAt ?? 0) : 0;
      const bp = b.result.ok ? (b.result.data.processedAt ?? 0) : 0;
      return bp - ap;
    })
    .slice(0, 4);

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>FIFO queue depth</span>
          <span className="font-mono text-slate-300">
            {level} / {limit}
          </span>
        </div>
        <div className="relative mx-auto h-40 w-28 overflow-hidden rounded-[1.5rem] bg-white/[0.03]">
          <div
            className="absolute bottom-0 left-0 w-full rounded-t-md bg-gradient-to-t from-emerald-500 to-emerald-300 shadow-[0_0_18px_rgba(52,211,153,0.35)] transition-all duration-200 ease-linear"
            style={{ height: `${pct}%` }}
          >
            <div className="h-1.5 w-full rounded-full bg-white/40 blur-[2px]" />
          </div>
        </div>
        <p className="text-center text-xs text-slate-500">
          capacity {limit} · processes at {leakPerSecond.toFixed(2)} req/s (constant leak)
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-slate-400">Waiting to process</p>
          {queue.length === 0 ? (
            <div className="rounded-xl bg-white/[0.03] px-3 py-4 text-center text-xs text-slate-600">
              Queue empty — next request processes at the leak rate.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {queue.map((e, i) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2.5 text-sm"
                >
                  <span className="text-slate-300">
                    {e.inFlight
                      ? "In flight…"
                      : i === 0
                        ? "Next up"
                        : `#${(e.queuePosition ?? i) + 1} in line`}
                  </span>
                  <span className="font-mono text-slate-500">
                    {e.estimatedProcessAt
                      ? `${Math.max(0, Math.ceil((e.estimatedProcessAt - now) / 1000))}s`
                      : "queued"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {recentProcessed.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-slate-400">Recently processed</p>
            <ul className="space-y-1.5">
              {recentProcessed.map((e) => {
                const data = e.result.ok ? e.result.data : null;
                const waitMs =
                  data && typeof data.processedAt === "number"
                    ? Math.max(0, data.processedAt - e.sentAt)
                    : 0;
                return (
                  <li
                    key={e.id}
                    className="flex items-center justify-between rounded-lg bg-emerald-500/[0.06] px-3 py-2 text-xs text-emerald-200/90"
                  >
                    <span>
                      #{typeof data?.queuePosition === "number" ? data.queuePosition : "—"} leaked
                    </span>
                    <span className="font-mono text-emerald-200/60">
                      waited {(waitMs / 1000).toFixed(1)}s
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
