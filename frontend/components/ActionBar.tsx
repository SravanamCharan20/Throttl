interface ActionBarProps {
  burstCount: number;
  onBurstCountChange: (count: number) => void;
  onSendOne: () => void;
  onSendBurst: () => void;
  sendingOne: boolean;
  sendingBurst: boolean;
}

export default function ActionBar({
  burstCount,
  onBurstCountChange,
  onSendOne,
  onSendBurst,
  sendingOne,
  sendingBurst,
}: ActionBarProps) {
  const disabled = sendingOne || sendingBurst;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <button
        onClick={onSendOne}
        disabled={disabled}
        className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      >
        {sendingOne ? "Sending..." : "Send one request"}
      </button>

      <div className="flex items-center gap-2">
        <button
          onClick={onSendBurst}
          disabled={disabled}
          className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          {sendingBurst ? "Firing burst..." : "Simulate burst"}
        </button>
        <label className="flex items-center gap-1.5 text-xs text-slate-400">
          of
          <input
            type="number"
            min={2}
            max={50}
            value={burstCount}
            onChange={(e) =>
              onBurstCountChange(Math.min(50, Math.max(2, Number(e.target.value) || 2)))
            }
            className="w-14 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-center text-sm text-slate-100 outline-none focus:border-sky-500"
          />
          requests
        </label>
      </div>
    </div>
  );
}
