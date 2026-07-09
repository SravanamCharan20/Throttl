import { windowIndex, previousWindowWeight } from "@/lib/windowMath";
import type { LogEntry } from "@/lib/types";

interface WindowCounterVisualizerProps {
  entries: LogEntry[];
  limit: number;
  windowSeconds: number;
  now: number;
}

function meterColor(ratio: number): string {
  if (ratio >= 1) return "from-rose-500 to-rose-400";
  if (ratio >= 0.7) return "from-amber-500 to-amber-400";
  return "from-violet-500 to-violet-400";
}

export default function WindowCounterVisualizer({
  entries,
  limit,
  windowSeconds,
  now,
}: WindowCounterVisualizerProps) {
  const windowMs = windowSeconds * 1000;
  const current = windowIndex(now, windowMs);
  const previous = current - 1;
  const weight = previousWindowWeight(now, windowMs);

  const currentCount = entries.filter(
    (e) => e.result.ok && e.result.data.allowed && windowIndex(e.sentAt, windowMs) === current,
  ).length;
  const previousCount = entries.filter(
    (e) => e.result.ok && e.result.data.allowed && windowIndex(e.sentAt, windowMs) === previous,
  ).length;

  const blended = currentCount + previousCount * weight;
  const barMax = Math.max(limit, currentCount, previousCount, 1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <div className="flex h-24 items-end rounded-xl bg-white/[0.03] p-2">
            <div
              className="w-full rounded-md bg-gradient-to-t from-violet-500/50 to-violet-400/30 transition-all duration-200"
              style={{ height: `${Math.min(100, (previousCount / barMax) * 100)}%` }}
            />
          </div>
          <p className="text-center text-sm text-slate-400">
            Previous window: <span className="font-mono text-slate-200">{previousCount}</span>
          </p>
        </div>
        <div className="space-y-1.5">
          <div className="flex h-24 items-end rounded-xl bg-white/[0.03] p-2">
            <div
              className="w-full rounded-md bg-gradient-to-t from-violet-500 to-violet-400 shadow-[0_0_16px_rgba(167,139,250,0.35)] transition-all duration-200"
              style={{ height: `${Math.min(100, (currentCount / barMax) * 100)}%` }}
            />
          </div>
          <p className="text-center text-sm text-slate-400">
            Current window: <span className="font-mono text-slate-200">{currentCount}</span>
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>Blended estimate (carrying {Math.round(weight * 100)}% of previous window)</span>
          <span className="font-mono text-slate-300">
            {blended.toFixed(2)} / {limit}
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={`h-full rounded-full bg-gradient-to-r transition-all duration-200 ${meterColor(blended / limit)}`}
            style={{ width: `${Math.min(100, (blended / limit) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
