import { API_BASE_URL } from "./config";
import type { ApiErrorResponse, CheckRequestBody, CheckResponse, CheckResult } from "./types";

function isErrorPayload(payload: unknown): payload is ApiErrorResponse {
  return (
    typeof payload === "object" &&
    payload !== null &&
    typeof (payload as Record<string, unknown>).error === "string"
  );
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/uptime`, { cache: "no-store" });
    if (!res.ok) return false;
    const data: unknown = await res.json().catch(() => null);
    return (
      typeof data === "object" &&
      data !== null &&
      (data as Record<string, unknown>).status === "ok"
    );
  } catch {
    return false;
  }
}

export async function checkLimit(body: CheckRequestBody): Promise<CheckResult> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return {
      ok: false,
      status: null,
      error: "Could not reach the SkyCheck server. Check your connection and try again.",
    };
  }

  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    return {
      ok: false,
      status: res.status,
      error: `The server sent back something unreadable (status ${res.status}).`,
    };
  }

  if (res.status === 200 || res.status === 429) {
    return { ok: true, status: res.status, data: payload as CheckResponse };
  }

  const message = isErrorPayload(payload)
    ? payload.error
    : `Request failed with status ${res.status}.`;

  return { ok: false, status: res.status, error: message };
}
