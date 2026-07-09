export default function ScenarioIntro() {
  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-slate-100 sm:text-2xl">
        SkyCheck rate limiting playground
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
        You&apos;re a developer hitting SkyCheck&apos;s free-tier API. Throttl guards the door —
        pick a strategy, tune the limits, and send traffic to see how it responds.
      </p>
    </div>
  );
}
