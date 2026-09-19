/**
 * Classify strategy/Redis failures so /check can return 503 for temporary
 * infrastructure problems vs 400 for bad caller input.
 */
export function isRedisFailure(err) {
  if (!err) return false;

  const name = err.name || "";
  const message = String(err.message || "");
  const code = err.code || "";

  if (
    name === "ReplyError" ||
    name === "AbortError" ||
    name === "MaxRetriesPerRequestError" ||
    name === "AggregateError"
  ) {
    return true;
  }

  if (
    code === "ECONNREFUSED" ||
    code === "ECONNRESET" ||
    code === "ETIMEDOUT" ||
    code === "ENOTFOUND" ||
    code === "EAI_AGAIN" ||
    code === "NR_CLOSED"
  ) {
    return true;
  }

  if (/redis|lua|READONLY|LOADING|NOSCRIPT|connection|timeout|socket/i.test(message)) {
    return true;
  }

  return false;
}

export function parsePositiveInt(value, fieldName) {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: undefined };
  }

  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
    return {
      ok: false,
      error: `${fieldName} must be a positive integer`,
    };
  }

  return { ok: true, value: n };
}
