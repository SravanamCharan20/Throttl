interface ConfigPanelProps {
  limit: number;
  windowSeconds: number;
  onLimitChange: (limit: number) => void;
  onWindowSecondsChange: (windowSeconds: number) => void;
}

export default function ConfigPanel({
  limit,
  windowSeconds,
  onLimitChange,
  onWindowSecondsChange,
}: ConfigPanelProps) {
  return (
    <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-slate-400">Limit (requests)</span>
        <input
          type="number"
          min={1}
          value={limit}
          onChange={(e) => onLimitChange(Math.max(1, Number(e.target.value) || 1))}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-slate-400">Window (seconds)</span>
        <input
          type="number"
          min={1}
          value={windowSeconds}
          onChange={(e) => onWindowSecondsChange(Math.max(1, Number(e.target.value) || 1))}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
        />
      </label>
    </div>
  );
}
