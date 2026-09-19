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

export interface LeakyQueueItem {
  id: string;
  sentAt: number;
  queuePosition: number | null;
  estimatedProcessAt: number | null;
  inFlight: boolean;
  processed: boolean;
}

/**
 * Reconstruct the FIFO: in-flight requests plus completed ones still within
 * their process window. Sorted by estimated process time / send order.
 */
export function leakyBucketQueueItems(entries: LogEntry[], now: number): LeakyQueueItem[] {
  const items: LeakyQueueItem[] = [];

  for (const e of entries) {
    if (e.inFlight) {
      items.push({
        id: e.id,
        sentAt: e.sentAt,
        queuePosition: null,
        estimatedProcessAt: null,
        inFlight: true,
        processed: false,
      });
      continue;
    }

    if (!e.result.ok || !e.result.data.allowed) continue;
    const { queuePosition, estimatedProcessAt, processedAt } = e.result.data;
    const doneAt = processedAt ?? estimatedProcessAt ?? e.sentAt;
    // Keep in the "recently processed" strip briefly; treat as queued until doneAt.
    if (doneAt > now) {
      items.push({
        id: e.id,
        sentAt: e.sentAt,
        queuePosition: typeof queuePosition === "number" ? queuePosition : null,
        estimatedProcessAt: typeof estimatedProcessAt === "number" ? estimatedProcessAt : null,
        inFlight: false,
        processed: false,
      });
    }
  }

  return items.sort((a, b) => {
    const aKey = a.estimatedProcessAt ?? a.sentAt;
    const bKey = b.estimatedProcessAt ?? b.sentAt;
    return aKey - bKey;
  });
}

/** Occupancy of the FIFO (in-flight + not-yet-processed). */
export function estimateLeakyBucketLevel(
  entries: LogEntry[],
  _limit: number,
  _windowSeconds: number,
  now: number,
): number {
  return leakyBucketQueueItems(entries, now).length;
}

/** Milliseconds until the leaky bucket has room for one more request (0 if already there). */
export function estimateLeakyBucketRetryMs(
  entries: LogEntry[],
  limit: number,
  windowSeconds: number,
  now: number,
): number {
  const level = estimateLeakyBucketLevel(entries, limit, windowSeconds, now);
  if (level < limit) return 0;

  const interval = (windowSeconds * 1000) / limit;
  const waiting = leakyBucketQueueItems(entries, now);
  const nextDone = waiting
    .map((w) => w.estimatedProcessAt)
    .filter((t): t is number => typeof t === "number")
    .sort((a, b) => a - b)[0];

  if (typeof nextDone === "number") {
    return Math.max(0, nextDone - now);
  }
  return Math.ceil(interval);
}
