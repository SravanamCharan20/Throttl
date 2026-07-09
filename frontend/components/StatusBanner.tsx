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
  let dot = "bg-slate-600";
  let text = "text-slate-500";
  let bg = "bg-white/[0.02]";
  let message = `Send a request to see how ${algorithmName} responds.`;

  if (latest && now !== null) {
    if (!latest.result.ok) {
      dot = "bg-amber-400";
      text = "text-amber-300";
      bg = "bg-amber-500/[0.07]";
      message = latest.result.error;
    } else if (latest.result.data.allowed) {
      const { data } = latest.result;
      dot = "bg-emerald-400";
      text = "text-emerald-300";
      bg = "bg-emerald-500/[0.07]";
      message = `Allowed — ${data.remaining} request${data.remaining === 1 ? "" : "s"} remaining, window resets at ${formatClock(data.resetAt)}.`;
    } else {
      dot = "bg-rose-400";
      text = "text-rose-300";
      bg = "bg-rose-500/[0.07]";
      message = `Rate limit exceeded. Try again in ${formatCountdown(latest.result.data.resetAt - now)}.`;
    }
  }

  return (
    <div className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm transition-colors ${bg}`}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
      <span className={text}>{message}</span>
    </div>
  );
}
