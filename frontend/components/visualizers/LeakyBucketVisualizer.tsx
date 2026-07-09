import type { LogEntry } from "@/lib/types";
import { estimateLeakyBucketLevel } from "@/lib/bucketMath";

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

  const pending = entries
    .flatMap((e) => {
      if (!e.result.ok || !e.result.data.allowed) return [];
      const { queuePosition, estimatedProcessAt } = e.result.data;
      if (typeof queuePosition !== "number" || typeof estimatedProcessAt !== "number") return [];
      if (estimatedProcessAt <= now) return [];
      return [{ id: e.id, queuePosition, estimatedProcessAt }];
    })
    .sort((a, b) => a.estimatedProcessAt - b.estimatedProcessAt)
    .slice(0, 5);

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>Bucket level</span>
          <span className="font-mono text-slate-300">
            {level.toFixed(2)} / {limit}
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
          rises 1 per accepted request, drains at a constant, paced rate
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-slate-400">Processing queue</p>
        {pending.length === 0 ? (
          <div className="rounded-xl bg-white/[0.03] px-3 py-4 text-center text-xs text-slate-600">
            Nothing pending right now.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {pending.map((e, i) => (
              <li
                key={e.id}
                className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2.5 text-sm"
              >
                <span className="text-slate-300">{i === 0 ? "Next up" : `#${i + 1} in line`}</span>
                <span className="font-mono text-slate-500">
                  {Math.max(0, Math.ceil((e.estimatedProcessAt - now) / 1000))}s
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
