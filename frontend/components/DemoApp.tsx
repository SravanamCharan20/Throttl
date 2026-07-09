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
import ConfigPanel from "./ConfigPanel";
import ActionBar from "./ActionBar";
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
    <div className="mx-auto flex min-w-0 max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <ScenarioIntro />

      <BackendGate>
        {clientId === null || now === null ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-6 text-center text-sm text-slate-500">
            Setting up your session...
          </div>
        ) : (
          <div className="flex min-w-0 flex-col gap-6">
            <ClientIdentity clientId={clientId} onRotate={rotateClientId} />

            <section className="space-y-3">
              <h2 className="text-sm font-medium text-slate-300">
                Choose a rate-limiting strategy
              </h2>
              <AlgorithmSelector selected={algorithm} onSelect={setAlgorithm} />
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ConfigPanel
                limit={limit}
                windowSeconds={windowSeconds}
                onLimitChange={setLimit}
                onWindowSecondsChange={setWindowSeconds}
              />
              <ActionBar
                burstCount={burstCount}
                onBurstCountChange={setBurstCount}
                onSendOne={sendOne}
                onSendBurst={sendBurst}
                sendingOne={sendingOne}
                sendingBurst={sendingBurst}
              />
            </section>

            <StatusBanner latest={latestForAlgorithm} algorithmName={meta.name} now={now} />

            <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${meta.accent.dot}`} />
                <h2 className="text-sm font-medium text-slate-200">{meta.name} — live state</h2>
              </div>
              <VisualizerPanel
                algorithm={algorithm}
                entries={algoEntries}
                limit={limit}
                windowSeconds={windowSeconds}
                now={now}
              />
            </section>

            <section className="min-w-0 space-y-3">
              <h2 className="text-sm font-medium text-slate-300">Request log</h2>
              <RequestLog entries={log.filter((e) => e.clientId === clientId)} />
            </section>
          </div>
        )}
      </BackendGate>
    </div>
  );
}
