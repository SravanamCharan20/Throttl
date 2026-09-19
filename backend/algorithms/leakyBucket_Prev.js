import { randomUUID } from "crypto";
import redis from "../redisClient.js";
import RateLimiterStrategy from "./RateLimiterStrategy.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default class LeakyBucket extends RateLimiterStrategy {
  async checkLimit(clientId, limit, windowSeconds) {
    const queueKey = `ratelimit:lb:q:${clientId}`;

    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    // One request leaves the bucket every leak interval
    const leakIntervalMs = windowMs / limit;

    const ttl = Math.max(windowSeconds * 2, 1);

    // Unique ID for this request
    const requestId = randomUUID();

    // ------------------------------------------------
    // 1. Remove requests that are already processed
    // ------------------------------------------------

    await redis.zremrangebyscore(
      queueKey,
      0,
      now
    );

    // ------------------------------------------------
    // 2. Check bucket capacity
    // ------------------------------------------------

    const queueLength = await redis.zcard(queueKey);

    if (queueLength >= limit) {
      await redis.expire(queueKey, ttl);

      return {
        allowed: false,
        remaining: 0,
        resetAt: now + Math.ceil(leakIntervalMs),
        queuePosition: null,
        estimatedProcessAt: null,
        processedAt: null,
      };
    }

    // ------------------------------------------------
    // 3. Find the last scheduled request
    // ------------------------------------------------

    const lastRequest = await redis.zrevrange(
      queueKey,
      0,
      0,
      "WITHSCORES"
    );

    let processAt;

    if (lastRequest.length === 0) {
      // Empty queue
      processAt = now + leakIntervalMs;
    } else {
      const lastProcessAt = Number(lastRequest[1]);

      processAt =
        Math.max(now, lastProcessAt) + leakIntervalMs;
    }

    // ------------------------------------------------
    // 4. Add this request to the queue
    // ------------------------------------------------

    await redis.zadd(
      queueKey,
      processAt,
      requestId
    );

    // Find this request's position
    const queuePosition = await redis.zrank(
      queueKey,
      requestId
    );

    await redis.expire(queueKey, ttl);

    // ------------------------------------------------
    // 5. Wait until this request should be processed
    // ------------------------------------------------

    const estimatedProcessAt = Math.round(processAt);

    const waitMs = Math.max(
      0,
      estimatedProcessAt - Date.now()
    );

    if (waitMs > 0) {
      await sleep(waitMs);
    }

    // ------------------------------------------------
    // 6. Drain requests that are due
    // ------------------------------------------------

    let processedAt = Date.now();

    await redis.zremrangebyscore(
      queueKey,
      0,
      processedAt
    );

    // Check whether our request was processed
    let requestStillExists = await redis.zscore(
      queueKey,
      requestId
    );

    // ------------------------------------------------
    // 7. If still present, wait and try again
    // ------------------------------------------------

    for (let attempt = 0; attempt < 8; attempt++) {
      if (requestStillExists === null) {
        processedAt = Date.now();
        break;
      }

      await sleep(
        Math.max(5, Math.ceil(leakIntervalMs / 4))
      );

      const tickNow = Date.now();

      await redis.zremrangebyscore(
        queueKey,
        0,
        tickNow
      );

      requestStillExists = await redis.zscore(
        queueKey,
        requestId
      );

      if (requestStillExists === null) {
        processedAt = tickNow;
        break;
      }
    }

    // ------------------------------------------------
    // 8. Safety cleanup
    // ------------------------------------------------

    const leftover = await redis.zscore(
      queueKey,
      requestId
    );

    if (leftover !== null) {
      await redis.zrem(
        queueKey,
        requestId
      );

      processedAt = Date.now();
    }

    // ------------------------------------------------
    // 9. Current queue size
    // ------------------------------------------------

    const queueAfter = await redis.zcard(queueKey);

    return {
      allowed: true,
      remaining: Math.max(
        0,
        limit - queueAfter
      ),
      resetAt:
        processedAt + Math.ceil(leakIntervalMs),

      queuePosition,

      estimatedProcessAt,

      processedAt,
    };
  }
}