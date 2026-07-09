import type { LogEntry } from "@/lib/types";

interface TokenBucketVisualizerProps {
  entries: LogEntry[];
  limit: number;
  windowSeconds: number;
  now: number;
}

export default function TokenBucketVisualizer({
  entries,
  limit,
  windowSeconds,
  now,
}: TokenBucketVisualizerProps) {
  const refillRatePerMs = limit / (windowSeconds * 1000);

  const latest = entries
    .filter((e) => e.result.ok)
    .reduce<LogEntry | undefined>((acc, e) => (!acc || e.sentAt > acc.sentAt ? e : acc), undefined);

  let baseTokens = limit;
  let baseTime = now;
  if (latest && latest.result.ok) {
    baseTokens = latest.result.data.remaining;
    baseTime = latest.sentAt;
  }

  const elapsed = Math.max(0, now - baseTime);
  const tokens = Math.min(limit, baseTokens + elapsed * refillRatePerMs);
  const pct = limit > 0 ? Math.min(100, (tokens / limit) * 100) : 0;
  const refillPerSecond = refillRatePerMs * 1000;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>Bucket capacity</span>
        <span className="font-mono text-slate-300">
          {tokens.toFixed(2)} / {limit} tokens
        </span>
      </div>

      <div className="relative mx-auto h-40 w-28 overflow-hidden rounded-[1.5rem] bg-white/[0.03]">
        <div
          className="absolute bottom-0 left-0 w-full rounded-t-md bg-gradient-to-t from-amber-500 to-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.35)] transition-all duration-200 ease-linear"
          style={{ height: `${pct}%` }}
        >
          <div className="h-1.5 w-full rounded-full bg-white/40 blur-[2px]" />
        </div>
      </div>

      <p className="text-center text-xs text-slate-500">
        refills at {refillPerSecond.toFixed(2)} tokens/sec, drains 1 per allowed request
      </p>
    </div>
  );
}
