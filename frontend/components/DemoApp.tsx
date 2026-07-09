"use client";

import { useCallback, useMemo, useState } from "react";
import { checkLimit } from "@/lib/api";
import { algorithmMeta } from "@/lib/algorithms";
import { rotateClientId, useClientId } from "@/lib/clientId";
import { useNow } from "@/lib/useNow";
import type { Algorithm, LogEntry } from "@/lib/types";
import BackendGate from "./BackendGate";
import ScenarioIntro from "./ScenarioIntro";
import ClientIdentity from "./ClientIdentity";
import AlgorithmSelector from "./AlgorithmSelector";
import ControlToolbar from "./ControlToolbar";
import StatusBanner from "./StatusBanner";
import RequestLog from "./RequestLog";
import VisualizerPanel from "./visualizers/VisualizerPanel";

function newEntryId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function DemoApp() {
  const clientId = useClientId();
  const [algorithm, setAlgorithm] = useState<Algorithm>("sliding-window-log");
  const [limit, setLimit] = useState(5);
  const [windowSeconds, setWindowSeconds] = useState(20);
  const [burstCount, setBurstCount] = useState(8);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [sendingOne, setSendingOne] = useState(false);
  const [sendingBurst, setSendingBurst] = useState(false);

  const now = useNow(200);

  const sendOne = useCallback(async () => {
    if (!clientId || sendingOne || sendingBurst) return;
    setSendingOne(true);
    const sentAt = Date.now();
    const result = await checkLimit({ clientId, algorithm, limit, windowSeconds });
    setLog((prev) => [
      { id: newEntryId(), algorithm, clientId, sentAt, limit, windowSeconds, result },
      ...prev,
    ]);
    setSendingOne(false);
  }, [clientId, algorithm, limit, windowSeconds, sendingOne, sendingBurst]);

  const sendBurst = useCallback(async () => {
    if (!clientId || sendingOne || sendingBurst) return;
    setSendingBurst(true);
    const dispatches = Array.from({ length: burstCount }, () => ({
      sentAt: Date.now(),
      promise: checkLimit({ clientId, algorithm, limit, windowSeconds }),
    }));
    const results = await Promise.all(dispatches.map((d) => d.promise));
    const entries: LogEntry[] = results.map((result, i) => ({
      id: newEntryId(),
      algorithm,
      clientId,
      sentAt: dispatches[i].sentAt,
      limit,
      windowSeconds,
      result,
    }));
    setLog((prev) => [...entries.reverse(), ...prev]);
    setSendingBurst(false);
  }, [clientId, algorithm, limit, windowSeconds, burstCount, sendingOne, sendingBurst]);

  const algoEntries = useMemo(
    () => (clientId ? log.filter((e) => e.algorithm === algorithm && e.clientId === clientId) : []),
    [log, algorithm, clientId],
  );

  const meta = algorithmMeta(algorithm);
  const latestForAlgorithm = algoEntries[0];

  return (
    <div className="flex h-screen flex-col overflow-hidden text-slate-200 lg:flex-row">
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-6 px-5 py-8 sm:px-8 lg:px-10">
          <div>
            <ScenarioIntro />
            {clientId && (
              <div className="mt-3">
                <ClientIdentity clientId={clientId} onRotate={rotateClientId} />
              </div>
            )}
          </div>

          <BackendGate>
            {clientId === null || now === null ? (
              <div className="rounded-xl bg-white/[0.02] px-3 py-6 text-center text-sm text-slate-600">
                Setting up your session…
              </div>
            ) : (
              <div className="space-y-6">
                <AlgorithmSelector selected={algorithm} onSelect={setAlgorithm} />

                <ControlToolbar
                  limit={limit}
                  windowSeconds={windowSeconds}
                  onLimitChange={setLimit}
                  onWindowSecondsChange={setWindowSeconds}
                  burstCount={burstCount}
                  onBurstCountChange={setBurstCount}
                  onSendOne={sendOne}
                  onSendBurst={sendBurst}
                  sendingOne={sendingOne}
                  sendingBurst={sendingBurst}
                />

                <StatusBanner
                  latest={latestForAlgorithm}
                  algorithm={algorithm}
                  algorithmName={meta.name}
                  entries={algoEntries}
                  limit={limit}
                  windowSeconds={windowSeconds}
                  now={now}
                />

                <section className="rounded-2xl bg-white/[0.03] p-6 sm:p-8">
                  <div className="mb-6 flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                    <h2 className="text-sm font-medium text-slate-300">
                      {meta.name} — live state
                    </h2>
                  </div>
                  <VisualizerPanel
                    algorithm={algorithm}
                    entries={algoEntries}
                    limit={limit}
                    windowSeconds={windowSeconds}
                    now={now}
                  />
                </section>
              </div>
            )}
          </BackendGate>
        </div>
      </main>

      <aside className="flex h-[38vh] min-h-0 shrink-0 flex-col border-t border-white/[0.06] lg:h-auto lg:w-[380px] lg:border-l lg:border-t-0">
        <div className="shrink-0 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-200">Request log</h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
          <RequestLog entries={clientId ? log.filter((e) => e.clientId === clientId) : []} />
        </div>
      </aside>
    </div>
  );
}
