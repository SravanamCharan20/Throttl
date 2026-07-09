interface ClientIdentityProps {
  clientId: string;
  onRotate: () => void;
}

export default function ClientIdentity({ clientId, onRotate }: ClientIdentityProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500">
      <span>Requesting as</span>
      <code className="rounded bg-white/[0.06] px-2 py-0.5 text-sm text-slate-300">
        {clientId}
      </code>
      <button
        onClick={onRotate}
        className="text-sm text-indigo-400 transition hover:text-indigo-300"
      >
        new client
      </button>
    </div>
  );
}
