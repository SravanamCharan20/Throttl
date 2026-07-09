import type { LogEntry } from "@/lib/types";

interface StatusBannerProps {
  latest: LogEntry | undefined;
  algorithmName: string;
  now: number | null;
}

function formatCountdown(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${seconds}s`;
}

function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function StatusBanner({ latest, algorithmName, now }: StatusBannerProps) {
  if (!latest || now === null) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm text-slate-400">
        Send a request to see how {algorithmName} responds.
      </div>
    );
  }

  if (!latest.result.ok) {
    return (
      <div className="rounded-xl border border-amber-800 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
        {latest.result.error}
      </div>
    );
  }

  const { data } = latest.result;

  if (data.allowed) {
    return (
      <div className="rounded-xl border border-emerald-800 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
        Allowed — {data.remaining} request{data.remaining === 1 ? "" : "s"} remaining, window
        resets at {formatClock(data.resetAt)}.
      </div>
    );
  }

  const remainingMs = data.resetAt - now;

  return (
    <div className="rounded-xl border border-rose-800 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
      Rate limit exceeded. Try again in {formatCountdown(remainingMs)}.
    </div>
  );
}
