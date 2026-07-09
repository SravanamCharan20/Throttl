"use client";

import { useEffect, useRef, useState } from "react";
import { checkHealth } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";

type GateState = "checking" | "waking" | "unreachable" | "ready";

const WAKE_THRESHOLD_MS = 6000;
const GIVE_UP_MS = 45000;
const POLL_INTERVAL_MS = 3000;

export default function BackendGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GateState>("checking");
  const [retryToken, setRetryToken] = useState(0);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    startedAtRef.current = Date.now();

    async function poll() {
      const healthy = await checkHealth();
      if (cancelled) return;

      if (healthy) {
        setState("ready");
        return;
      }

      const elapsed = Date.now() - (startedAtRef.current ?? Date.now());
      if (elapsed > GIVE_UP_MS) {
        setState("unreachable");
        return;
      }

      setState(elapsed > WAKE_THRESHOLD_MS ? "waking" : "checking");
      setTimeout(poll, POLL_INTERVAL_MS);
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [retryToken]);

  if (state === "ready") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center shadow-xl">
        {state === "unreachable" ? (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-2xl">
              !
            </div>
            <h2 className="text-lg font-semibold text-slate-100">
              Can&apos;t reach SkyCheck
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              No response from{" "}
              <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-300">
                {API_BASE_URL}
              </code>
              . Make sure the Throttl backend is running and reachable.
            </p>
            <button
              onClick={() => {
                setState("checking");
                setRetryToken((n) => n + 1);
              }}
              className="mt-6 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-400"
            >
              Retry
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-sky-400" />
            <h2 className="text-lg font-semibold text-slate-100">
              {state === "waking" ? "Waking up the server..." : "Connecting to SkyCheck..."}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {state === "waking"
                ? "The backend may be asleep after a period of inactivity. This can take up to 30 seconds."
                : "Checking whether the rate limiter is awake."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
