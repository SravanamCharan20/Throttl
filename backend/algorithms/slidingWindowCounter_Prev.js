import redis from "../redisClient.js";
import RateLimiterStrategy from "./RateLimiterStrategy.js";

export default class SlidingWindowCounter extends RateLimiterStrategy {
  async checkLimit(clientId, limit, windowSeconds) {
    // Convert window to milliseconds
    const windowMs = windowSeconds * 1000;

    // Current time
    const now = Date.now();

    // Find current fixed window
    const currentWindow = Math.floor(now / windowMs);

    // Redis keys
    const currentWindowKey = `ratelimit:swc:${clientId}:${currentWindow}`;

    const previousWindowKey = `ratelimit:swc:${clientId}:${currentWindow - 1}`;

    // Find how much time has passed
    // inside the current window
    const elapsedTime = now - currentWindow * windowMs;

    // Calculate how much of the previous
    // window should still be considered
    const previousWindowWeight = (windowMs - elapsedTime) / windowMs;

    // Get previous window request count
    const previousWindowCount = Number(await redis.get(previousWindowKey)) || 0;

    // Increment current window count.
    // This INCLUDES the new request.
    const currentWindowCount = await redis.incr(currentWindowKey);

    // Set expiry when key is first created
    if (currentWindowCount === 1) {
      await redis.expire(currentWindowKey, windowSeconds * 2);
    }

    // Estimate total requests,
    // INCLUDING the new request
    const estimatedCount =
      currentWindowCount + previousWindowCount * previousWindowWeight;

    // If adding this request exceeds the limit
    if (estimatedCount > limit) {
      // Undo the INCR
      await redis.decr(currentWindowKey);

      return {
        allowed: false,
        remaining: 0,
        resetAt: (currentWindow + 1) * windowMs,
      };
    }

    // Request allowed
    return {
      allowed: true,
      remaining: Math.max(0, Math.floor(limit - estimatedCount)),
      resetAt: (currentWindow + 1) * windowMs,
    };
  }
}
