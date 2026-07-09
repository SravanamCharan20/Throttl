import type { LogEntry } from "./types";

function latestBySentAt(entries: LogEntry[]): LogEntry | undefined {
  return entries.reduce<LogEntry | undefined>(
    (acc, e) => (!acc || e.sentAt > acc.sentAt ? e : acc),
    undefined,
  );
}

/** Tokens available right now, animated forward from the last known reading. */
export function estimateTokenBucketTokens(
  entries: LogEntry[],
  limit: number,
  windowSeconds: number,
  now: number,
): number {
  const refillRatePerMs = limit / (windowSeconds * 1000);
  const latest = latestBySentAt(entries.filter((e) => e.result.ok));

  let baseTokens = limit;
  let baseTime = now;
  if (latest && latest.result.ok) {
    baseTokens = latest.result.data.remaining;
    baseTime = latest.sentAt;
  }

  const elapsed = Math.max(0, now - baseTime);
  return Math.min(limit, baseTokens + elapsed * refillRatePerMs);
}

/** Milliseconds until the token bucket has at least 1 token available (0 if already there). */
export function estimateTokenBucketRetryMs(
  entries: LogEntry[],
  limit: number,
  windowSeconds: number,
  now: number,
): number {
  const tokens = estimateTokenBucketTokens(entries, limit, windowSeconds, now);
  if (tokens >= 1) return 0;
  const refillRatePerMs = limit / (windowSeconds * 1000);
  return Math.ceil((1 - tokens) / refillRatePerMs);
}

/** Current water level, animated forward (drained) from the last accepted request. */
export function estimateLeakyBucketLevel(
  entries: LogEntry[],
  limit: number,
  windowSeconds: number,
  now: number,
): number {
  const leakRatePerMs = limit / (windowSeconds * 1000);
  const latestAllowed = latestBySentAt(
    entries.filter(
      (e) => e.result.ok && e.result.data.allowed && typeof e.result.data.queuePosition === "number",
    ),
  );

  let baseLevel = 0;
  let baseTime = now;
  if (latestAllowed && latestAllowed.result.ok) {
    baseLevel = (latestAllowed.result.data.queuePosition ?? 0) + 1;
    baseTime = latestAllowed.sentAt;
  }

  const elapsed = Math.max(0, now - baseTime);
  return Math.max(0, baseLevel - elapsed * leakRatePerMs);
}

/** Milliseconds until the leaky bucket has room for one more request (0 if already there). */
export function estimateLeakyBucketRetryMs(
  entries: LogEntry[],
  limit: number,
  windowSeconds: number,
  now: number,
): number {
  const level = estimateLeakyBucketLevel(entries, limit, windowSeconds, now);
  const room = limit - 1 - level;
  if (room >= 0) return 0;
  const leakRatePerMs = limit / (windowSeconds * 1000);
  return Math.ceil(-room / leakRatePerMs);
}
