interface ConcurrencyValidation {
  concurrent: number;
  limit: number;
  admitted: number;
  denied: number;
  errors: number;
  passed: boolean;
}

interface ConcurrencyReportProps {
  result: ConcurrencyValidation | null;
}

export default function ConcurrencyReport({ result }: ConcurrencyReportProps) {
  if (!result) return null;

  return (
    <div
      className={`rounded-xl px-4 py-3 text-sm ${
        result.passed
          ? "bg-emerald-500/10 text-emerald-200"
          : "bg-rose-500/10 text-rose-200"
      }`}
    >
      <p className="font-medium">
        {result.passed
          ? "Concurrency check passed"
          : "Concurrency check failed — over-admission detected"}
      </p>
      <p className="mt-1 text-xs opacity-80">
        {result.concurrent} simultaneous requests · limit {result.limit} · admitted{" "}
        {result.admitted} · denied {result.denied}
        {result.errors > 0 ? ` · errors ${result.errors}` : ""}
        {result.passed
          ? " — no algorithm path admitted more than the configured limit under Redis contention."
          : ` — admitted ${result.admitted} exceeds limit ${result.limit}.`}
      </p>
    </div>
  );
}
