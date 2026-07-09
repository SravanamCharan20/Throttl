export default function ScenarioIntro() {
  return (
    <div className="space-y-3">
      <span className="inline-flex items-center rounded-full border border-sky-800 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-300">
        SkyCheck Weather API
      </span>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-100 sm:text-3xl">
        You&apos;re a developer building on SkyCheck
      </h1>
      <p className="max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
        SkyCheck gives every developer a free-tier quota, and{" "}
        <span className="text-slate-200">Throttl</span> is the rate limiter guarding the door.
        Pick a strategy below, tune the limits, and start firing requests to see exactly how
        each algorithm decides who gets through.
      </p>
    </div>
  );
}
