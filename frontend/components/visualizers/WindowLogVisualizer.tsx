import type { LogEntry } from "@/lib/types";

interface WindowLogVisualizerProps {
  entries: LogEntry[];
  limit: number;
  windowSeconds: number;
  now: number;
}

const DENIED_MARKER_LIFETIME_MS = 3000;

export default function WindowLogVisualizer({
  entries,
  limit,
  windowSeconds,
  now,
}: WindowLogVisualizerProps) {
  const windowMs = windowSeconds * 1000;
  const cutoff = now - windowMs;

  const visible = entries
    .filter((e) => e.result.ok)
    .map((e) => {
      const allowed = e.result.ok && e.result.data.allowed;
      const lifetime = allowed ? windowMs : Math.min(windowMs, DENIED_MARKER_LIFETIME_MS);
      const age = now - e.sentAt;
      return { entry: e, allowed, age, lifetime };
    })
    .filter((v) => v.age >= 0 && v.age <= v.lifetime);

  const occupied = visible.filter((v) => v.allowed).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>Trailing {windowSeconds}s window</span>
        <span className="font-mono text-slate-300">
          {occupied} / {limit} occupied
        </span>
      </div>

      <div className="relative h-16 rounded-lg border border-slate-800 bg-slate-950/60">
        {visible.map(({ entry, allowed, age, lifetime }) => {
          const pct = Math.min(100, Math.max(0, ((entry.sentAt - cutoff) / windowMs) * 100));
          const fraction = lifetime > 0 ? age / lifetime : 1;
          const opacity = Math.max(0.15, 1 - fraction * 0.8);
          return (
            <div
              key={entry.id}
              className={`absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                allowed ? "bg-sky-400" : "bg-rose-500"
              }`}
              style={{ left: `${pct}%`, opacity }}
              title={`${allowed ? "Allowed" : "Denied"} at ${new Date(
                entry.sentAt,
              ).toLocaleTimeString()}`}
            />
          );
        })}
        <div className="absolute right-0 top-0 h-full w-px bg-sky-500/60" />
      </div>

      <div className="flex justify-between text-[11px] text-slate-600">
        <span>-{windowSeconds}s</span>
        <span>now</span>
      </div>
    </div>
  );
}
