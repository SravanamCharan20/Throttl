interface ControlToolbarProps {
  limit: number;
  windowSeconds: number;
  onLimitChange: (limit: number) => void;
  onWindowSecondsChange: (windowSeconds: number) => void;
  burstCount: number;
  onBurstCountChange: (count: number) => void;
  onSendOne: () => void;
  onSendBurst: () => void;
  sendingOne: boolean;
  sendingBurst: boolean;
}

const inputClass =
  "w-16 rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-center text-sm text-slate-100 outline-none focus:border-indigo-400/60 focus:ring-1 focus:ring-indigo-400/30";

export default function ControlToolbar({
  limit,
  windowSeconds,
  onLimitChange,
  onWindowSecondsChange,
  burstCount,
  onBurstCountChange,
  onSendOne,
  onSendBurst,
  sendingOne,
  sendingBurst,
}: ControlToolbarProps) {
  const disabled = sendingOne || sendingBurst;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl bg-white/[0.03] px-4 py-3.5">
      <label className="flex items-center gap-1.5 text-sm text-slate-500">
        Limit
        <input
          type="number"
          min={1}
          value={limit}
          onChange={(e) => onLimitChange(Math.max(1, Number(e.target.value) || 1))}
          className={inputClass}
        />
      </label>

      <label className="flex items-center gap-1.5 text-sm text-slate-500">
        Window
        <input
          type="number"
          min={1}
          value={windowSeconds}
          onChange={(e) => onWindowSecondsChange(Math.max(1, Number(e.target.value) || 1))}
          className={inputClass}
        />
        s
      </label>

      <div className="hidden h-5 w-px bg-white/10 sm:block" />

      <button
        onClick={onSendOne}
        disabled={disabled}
        className="rounded-lg bg-gradient-to-b from-indigo-400 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-indigo-950/50 transition hover:brightness-110 disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-400 disabled:shadow-none"
      >
        {sendingOne ? "Sending…" : "Send one request"}
      </button>

      <div className="flex items-center gap-1.5">
        <button
          onClick={onSendBurst}
          disabled={disabled}
          className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/25 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:border-white/5 disabled:text-slate-500"
        >
          {sendingBurst ? "Firing burst…" : "Simulate burst"}
        </button>
        <label className="flex items-center gap-1 text-sm text-slate-500">
          of
          <input
            type="number"
            min={2}
            max={50}
            value={burstCount}
            onChange={(e) =>
              onBurstCountChange(Math.min(50, Math.max(2, Number(e.target.value) || 2)))
            }
            className={inputClass}
          />
        </label>
      </div>
    </div>
  );
}
