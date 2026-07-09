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
    <div className="flex items-center justify-center py-16">
      <div className="w-full max-w-sm rounded-2xl bg-white/[0.03] p-7 text-center">
        {state === "unreachable" ? (
          <>
            <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-rose-500/10 text-sm text-rose-300">
              !
            </div>
            <h2 className="text-base font-semibold text-slate-100">Can&apos;t reach SkyCheck</h2>
            <p className="mt-2 text-sm text-slate-500">
              No response from{" "}
              <code className="rounded bg-white/5 px-1.5 py-0.5 text-xs text-slate-300">
                {API_BASE_URL}
              </code>
              . Make sure the Throttl backend is running and reachable.
            </p>
            <button
              onClick={() => {
                setState("checking");
                setRetryToken((n) => n + 1);
              }}
              className="mt-4 rounded-lg bg-gradient-to-b from-indigo-400 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-indigo-950/50 transition hover:brightness-110"
            >
              Retry
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-indigo-400" />
            <h2 className="text-base font-semibold text-slate-100">
              {state === "waking" ? "Waking up the server…" : "Connecting to SkyCheck…"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
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
