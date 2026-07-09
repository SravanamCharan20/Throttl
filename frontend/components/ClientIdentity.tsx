interface ClientIdentityProps {
  clientId: string;
  onRotate: () => void;
}

export default function ClientIdentity({ clientId, onRotate }: ClientIdentityProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-sm">
      <div className="min-w-0">
        <span className="text-slate-500">Requesting as</span>{" "}
        <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-200">
          {clientId}
        </code>
      </div>
      <button
        onClick={onRotate}
        className="shrink-0 text-xs font-medium text-sky-400 transition hover:text-sky-300"
      >
        New client
      </button>
    </div>
  );
}
