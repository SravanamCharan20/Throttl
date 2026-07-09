import redis from "../redisClient.js";
import RateLimiterStrategy from "./RateLimiterStrategy.js";

export default class SlidingWindowCounter extends RateLimiterStrategy {
  async checkLimit(clientId, limit, windowSeconds) {
    // Convert window to milliseconds
    const windowMs = windowSeconds * 1000;

    // Current timestamp
    const now = Date.now();

    // Which window are we currently in?
    // Example:
    // Window 0 -> 0 to 59999 ms
    // Window 1 -> 60000 to 119999 ms
    const currentWindow = Math.floor(now / windowMs);

    // Redis Keys
    const currentWindowKey = `ratelimit:swc:${clientId}:${currentWindow}`;
    const previousWindowKey = `ratelimit:swc:${clientId}:${currentWindow - 1}`;

    // -----------------------------------------
    // Find how much of the previous window
    // still overlaps with our current
    // sliding window.
    // -----------------------------------------

    // Time spent inside current window
    const elapsedTime = now - currentWindow * windowMs;

    // Remaining fraction of previous window
    const previousWindowWeight = (windowMs - elapsedTime) / windowMs;

    // -----------------------------------------
    // Read previous window count
    // -----------------------------------------

    const previousWindowCount = Number(await redis.get(previousWindowKey)) || 0;

    // -----------------------------------------
    // Count current request
    // -----------------------------------------

    const currentWindowCount = await redis.incr(currentWindowKey);

    // First request?
    // Keep this key alive for two windows.
    if (currentWindowCount === 1) {
      await redis.expire(currentWindowKey, windowSeconds * 2);
    }

    // -----------------------------------------
    // Calculate request count BEFORE
    // current request is accepted.
    // -----------------------------------------

    const estimatedRequestsBeforeCurrentRequest =
      currentWindowCount - 1 + previousWindowCount * previousWindowWeight;

    // -----------------------------------------
    // Limit exceeded?
    // -----------------------------------------

    if (estimatedRequestsBeforeCurrentRequest >= limit) {
      // Undo INCR because request is rejected.
      await redis.decr(currentWindowKey);

      return {
        allowed: false,
        remaining: 0,
        resetAt: (currentWindow + 1) * windowMs,
      };
    }

    // -----------------------------------------
    // Accept current request
    // -----------------------------------------

    const estimatedRequestsAfterCurrentRequest =
      estimatedRequestsBeforeCurrentRequest + 1;

    return {
      allowed: true,
      remaining: Math.max(
        0,
        Math.floor(limit - estimatedRequestsAfterCurrentRequest),
      ),
      resetAt: (currentWindow + 1) * windowMs,
    };
  }
}
