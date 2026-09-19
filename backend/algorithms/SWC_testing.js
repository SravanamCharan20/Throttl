import redis from "../redisClient.js";
import RateLimiterStrategy from "./RateLimiterStrategy.js";

export default class SlidingWindowCounter extends RateLimiterStrategy {
  async checkLimit(clientId, limit, windowSeconds) {
    // first step
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const currentWindow = Math.floor(now / windowMs);
    const currentWindowKey = `ratelimit:swc:${clientId}:${currentWindow}`;
    const prevWindowKey = `ratelimit:swc:${clientId}:${currentWindow - 1}`;

    // second step
    const elapsedTime = now - currentWindow * windowMs;
    const prevWindowWeight = (windowMs - elapsedTime) / windowMs;
    const previousWindowCount = Number(await redis.get(prevWindowKey)) || 0;

    // thrid step
    const currentWindowCount = await redis.incr(currentWindowKey);
    if (currentWindowCount === 1) {
      await redis.expire(currentWindowKey, windowSeconds * 2);
    }

    // fourth step
    const estimatedCount =
      currentWindowCount + prevWindowWeight * previousWindowCount;
    if (estimatedCount > limit) {
      await redis.decr(currentWindowKey);
      return {
        allowed: false,
        remaining: 0,
        resetAt: (currentWindow + 1) * windowMs,
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, Math.floor(limit - estimatedCount)),
      resetAt: (currentWindow + 1) * windowMs,
    };
  }
}
