import { randomUUID } from "crypto";
import redis from "../redisClient.js";
import RateLimiterStrategy from "./RateLimiterStrategy.js";

/**
 * Real leaky-bucket FIFO (not a water-level meter).
 *
 * Redis ZSET score = absolute processAt (ms). Members are request ids.
 *   - Capacity = max ZCARD
 *   - Constant leak: each new request is scheduled at
 *       max(now, latestScheduledProcessAt) + leakInterval
 *     (empty queue → first request schedules at `now`)
 *   - Due items are removed with ZREMRANGEBYSCORE up to now-1 so same-ms
 *     concurrent enqueues cannot pop each other
 *   - /check waits until this request's id has been processed (removed)
 */

const enqueueScript = `
local queueKey = KEYS[1]
local capacity = tonumber(ARGV[1])
local interval = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requestId = ARGV[4]
local ttl = tonumber(ARGV[5])

-- Process anything strictly due before this instant (keeps same-ms peers intact)
redis.call('ZREMRANGEBYSCORE', queueKey, '-inf', now - 1)

local card = redis.call('ZCARD', queueKey)
if card >= capacity then
  redis.call('EXPIRE', queueKey, ttl)
  return {0, card, -1, 0}
end

local tail = redis.call('ZREVRANGE', queueKey, 0, 0, 'WITHSCORES')
local processAt
if #tail == 0 then
  -- At least one leak tick even on an empty queue so a concurrent burst
  -- cannot free capacity mid-flight by immediately processing the first item.
  processAt = now + interval
else
  local tailScore = tonumber(tail[2])
  processAt = math.max(now, tailScore) + interval
end

redis.call('ZADD', queueKey, processAt, requestId)
local rank = redis.call('ZRANK', queueKey, requestId)
redis.call('EXPIRE', queueKey, ttl)

return {1, card + 1, rank, processAt}
`;

const drainScript = `
local queueKey = KEYS[1]
local now = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])
local expectId = ARGV[3]

redis.call('ZREMRANGEBYSCORE', queueKey, '-inf', now)
redis.call('EXPIRE', queueKey, ttl)

local score = redis.call('ZSCORE', queueKey, expectId)
local stillQueued = (score == false) and -1 or 0
local card = redis.call('ZCARD', queueKey)

return {stillQueued, card}
`;

redis.defineCommand("leakyBucketEnqueue", {
  numberOfKeys: 1,
  lua: enqueueScript,
});

redis.defineCommand("leakyBucketDrain", {
  numberOfKeys: 1,
  lua: drainScript,
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default class LeakyBucket extends RateLimiterStrategy {
  async checkLimit(clientId, limit, windowSeconds) {
    const queueKey = `ratelimit:lb:q:${clientId}`;
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const leakIntervalMs = windowMs / limit;
    const ttl = Math.max(windowSeconds * 2, 1);
    const requestId = randomUUID();

    const [allowed, queueLen, position, processAtRaw] = await redis.leakyBucketEnqueue(
      queueKey,
      limit,
      leakIntervalMs,
      now,
      requestId,
      ttl,
    );

    if (Number(allowed) !== 1) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: now + Math.ceil(leakIntervalMs),
        queuePosition: null,
        estimatedProcessAt: null,
        processedAt: null,
      };
    }

    const enqueuePosition = Number(position);
    const estimatedProcessAt = Math.round(Number(processAtRaw));
    const waitMs = Math.max(0, estimatedProcessAt - Date.now());

    if (waitMs > 0) {
      await sleep(waitMs);
    }

    let processedAt = Date.now();
    let queueAfter = Number(queueLen);

    for (let attempt = 0; attempt < 8; attempt++) {
      const tickNow = Date.now();
      const [stillQueued, card] = await redis.leakyBucketDrain(
        queueKey,
        tickNow,
        ttl,
        requestId,
      );

      queueAfter = Number(card);
      if (Number(stillQueued) < 0) {
        processedAt = tickNow;
        break;
      }

      // Still present — wait until its score (or a fraction of the interval)
      await sleep(Math.max(5, Math.ceil(leakIntervalMs / 4)));
    }

    // Force-remove if somehow still present after waits (should be rare)
    const leftover = await redis.zscore(queueKey, requestId);
    if (leftover !== null) {
      await redis.zrem(queueKey, requestId);
      processedAt = Date.now();
      queueAfter = await redis.zcard(queueKey);
    }

    return {
      allowed: true,
      remaining: Math.max(0, limit - queueAfter),
      resetAt: processedAt + Math.ceil(leakIntervalMs),
      queuePosition: enqueuePosition,
      estimatedProcessAt,
      processedAt,
    };
  }
}
