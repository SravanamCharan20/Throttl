import { algorithmMeta } from "@/lib/algorithms";
import type { LogEntry } from "@/lib/types";

interface RequestLogProps {
  entries: LogEntry[];
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function RequestLog({ entries }: RequestLogProps) {
  if (entries.length === 0) {
    return (
      <div className="px-1 py-6 text-center text-sm text-slate-600">
        No requests yet this session.
      </div>
    );
  }

  return (
    <ul>
      {entries.map((entry) => {
        const meta = algorithmMeta(entry.algorithm);
        const resultLabel = !entry.result.ok
          ? "Error"
          : entry.result.data.allowed
            ? "Allowed"
            : "Denied";
        const resultColor = !entry.result.ok
          ? "text-amber-300"
          : entry.result.data.allowed
            ? "text-emerald-300"
            : "text-rose-300";
        const queueInfo =
          entry.result.ok &&
          entry.result.data.allowed &&
          typeof entry.result.data.queuePosition === "number"
            ? ` · #${entry.result.data.queuePosition} processes ${formatTime(
                entry.result.data.estimatedProcessAt ?? entry.result.data.resetAt,
              )}`
            : "";

        return (
          <li
            key={entry.id}
            className="border-b border-white/[0.05] px-1 py-3 transition-colors last:border-0 hover:bg-white/[0.02]"
          >
            <div className="flex min-w-0 items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
                <span className="truncate text-sm text-slate-300">{meta.name}</span>
              </div>
              <span className="shrink-0 font-mono text-xs text-slate-600">
                {formatTime(entry.sentAt)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2 text-xs">
              <span className={resultColor}>{resultLabel}</span>
              <span className="truncate text-slate-500">
                {entry.result.ok ? `${entry.result.data.remaining} left` : "—"}
                {queueInfo}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
