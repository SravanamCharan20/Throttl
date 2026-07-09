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
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-6 text-center text-sm text-slate-500">
        No requests yet this session.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3 font-medium">Time</th>
            <th className="px-4 py-3 font-medium">Algorithm</th>
            <th className="px-4 py-3 font-medium">Result</th>
            <th className="px-4 py-3 font-medium">Remaining</th>
            <th className="px-4 py-3 font-medium">Queue</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const meta = algorithmMeta(entry.algorithm);
            return (
              <tr key={entry.id} className="border-b border-slate-800/60 last:border-0">
                <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-slate-400">
                  {formatTime(entry.sentAt)}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex items-center gap-1.5 text-xs ${meta.accent.text}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${meta.accent.dot}`} />
                    {meta.name}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  {!entry.result.ok ? (
                    <span className="inline-flex rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-300">
                      Error
                    </span>
                  ) : entry.result.data.allowed ? (
                    <span className="inline-flex rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-300">
                      Allowed
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-300">
                      Denied
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-slate-300">
                  {entry.result.ok ? entry.result.data.remaining : "—"}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-slate-400">
                  {entry.result.ok &&
                  entry.result.data.allowed &&
                  typeof entry.result.data.queuePosition === "number"
                    ? `#${entry.result.data.queuePosition} · processes ${formatTime(
                        entry.result.data.estimatedProcessAt ?? entry.result.data.resetAt,
                      )}`
                    : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
