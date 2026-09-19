import { randomUUID } from "crypto";
import redis from "../redisClient.js";
import RateLimiterStrategy from "./RateLimiterStrategy.js";

/**
 * Leaky bucket as a real FIFO queue (Redis ZSET).
 * Score = absolute processAt. Capacity = max queue length.
 * /check returns as soon as the request is scheduled (not after it leaks).
 */
const enqueueScript = `
local queueKey = KEYS[1]

local capacity = tonumber(ARGV[1])
local interval = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requestId = ARGV[4]
local ttl = tonumber(ARGV[5])

-- Drop requests whose process time has already passed.
-- Use now-1 so a peer scheduled at exactly \`now\` in this same ms is not popped
-- before the rest of a concurrent burst has enqueued.
redis.call("ZREMRANGEBYSCORE", queueKey, "-inf", now - 1)

local queueSize = redis.call("ZCARD", queueKey)

if queueSize >= capacity then
  redis.call("EXPIRE", queueKey, ttl)
  return {0, queueSize, -1, 0}
end

local last = redis.call("ZREVRANGE", queueKey, 0, 0, "WITHSCORES")

local processAt
if #last == 0 then
  -- At least one leak tick, even on an empty queue. Scheduling at \`now\`
  -- lets the next concurrent caller ZREMRANGE us away and over-admit.
  processAt = now + interval
else
  local lastProcessAt = tonumber(last[2])
  processAt = math.max(now, lastProcessAt) + interval
end

redis.call("ZADD", queueKey, processAt, requestId)

local position = redis.call("ZRANK", queueKey, requestId)

redis.call("EXPIRE", queueKey, ttl)

return {1, queueSize + 1, position, processAt}
`;

redis.defineCommand("leakyBucketEnqueue", {
  numberOfKeys: 1,
  lua: enqueueScript,
});

export default class LeakyBucket extends RateLimiterStrategy {
  async checkLimit(clientId, limit, windowSeconds) {
    const queueKey = `ratelimit:lb:q:${clientId}`;

    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const leakIntervalMs = windowMs / limit;
    const ttl = Math.max(windowSeconds * 2, 1);
    const requestId = randomUUID();

    const [allowed, queueLen, position, processAt] =
      await redis.leakyBucketEnqueue(
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
      };
    }

    const rank = Number(position);
    const estimatedProcessAt = Number(processAt);

    return {
      allowed: true,
      // slots left after this enqueue (= capacity - current depth)
      remaining: Math.max(0, limit - Number(queueLen)),
      resetAt: estimatedProcessAt,
      queuePosition: rank,
      estimatedProcessAt,
    };
  }
}
