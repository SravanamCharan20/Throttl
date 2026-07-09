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
  const elapsedIntoWindow = now - current * windowMs;

  const currentCount = entries.filter(
    (e) => e.result.ok && e.result.data.allowed && windowIndex(e.sentAt, windowMs) === current,
  ).length;
  const previousCount = entries.filter(
    (e) => e.result.ok && e.result.data.allowed && windowIndex(e.sentAt, windowMs) === previous,
  ).length;

  const blended = currentCount + previousCount * weight;
  const barMax = Math.max(limit, currentCount, previousCount, 1);

  // Lay the previous + current fixed windows side by side (each 50% of the strip).
  // The trailing lookback is always exactly one window wide, sliding rightward as
  // "now" moves through the current window — that's the part actually rate-limited.
  const lookbackStartPct = 50 * (1 - weight);
  const nowPct = 100 - 50 * weight;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="relative h-14 overflow-hidden rounded-xl bg-white/[0.03]">
          <div className="absolute left-1/2 top-0 h-full w-px bg-white/10" />
          <div
            className="absolute top-0 h-full border-x border-violet-400/50 bg-violet-500/20 transition-all duration-200 ease-linear"
            style={{ left: `${lookbackStartPct}%`, width: "50%" }}
          />
          <div
            className="absolute top-0 h-full w-px bg-violet-300 shadow-[0_0_8px_rgba(196,181,253,0.8)] transition-all duration-200 ease-linear"
            style={{ left: `${nowPct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-600">
          <span>previous window</span>
          <span>current window</span>
        </div>
        <p className="text-xs text-slate-500">
          The highlighted band is the actual trailing {windowSeconds}s lookback — {Math.round(elapsedIntoWindow / 1000)}s
          into the current window, so it still counts the last {Math.round(weight * 100)}% of the
          previous one.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <div className="flex h-12 items-end rounded-xl bg-white/[0.03] p-2">
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
          <div className="flex h-12 items-end rounded-xl bg-white/[0.03] p-2">
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
          <span>
            Blended estimate: {currentCount} + {previousCount} × {Math.round(weight * 100)}%
          </span>
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
