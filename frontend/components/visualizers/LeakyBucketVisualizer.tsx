import type { LogEntry } from "@/lib/types";

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
  const leakRatePerMs = limit / (windowSeconds * 1000);

  const latestAllowed = entries
    .filter((e) => e.result.ok && e.result.data.allowed && typeof e.result.data.queuePosition === "number")
    .reduce<LogEntry | undefined>((acc, e) => (!acc || e.sentAt > acc.sentAt ? e : acc), undefined);

  let baseLevel = 0;
  let baseTime = now;
  if (latestAllowed && latestAllowed.result.ok) {
    baseLevel = (latestAllowed.result.data.queuePosition ?? 0) + 1;
    baseTime = latestAllowed.sentAt;
  }

  const elapsed = Math.max(0, now - baseTime);
  const level = Math.max(0, baseLevel - elapsed * leakRatePerMs);
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
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Bucket level</span>
          <span className="font-mono text-slate-300">
            {level.toFixed(2)} / {limit}
          </span>
        </div>
        <div className="relative mx-auto h-40 w-28 overflow-hidden rounded-b-2xl rounded-t-md border border-slate-700 bg-slate-950/60">
          <div
            className="absolute bottom-0 left-0 w-full bg-emerald-500/70 transition-all duration-200 ease-linear"
            style={{ height: `${pct}%` }}
          />
        </div>
        <p className="text-center text-xs text-slate-500">
          rises 1 per accepted request, drains at a constant, paced rate
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-slate-400">Processing queue</p>
        {pending.length === 0 ? (
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-4 text-center text-xs text-slate-600">
            Nothing pending right now.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {pending.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs"
              >
                <span className="text-slate-300">position #{e.queuePosition}</span>
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
