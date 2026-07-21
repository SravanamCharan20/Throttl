import { randomUUID } from "crypto";
import redis from "../redisClient.js";
import RateLimiterStrategy from "./RateLimiterStrategy.js";

export default class SlidingWindowLog extends RateLimiterStrategy {
  async checkLimit(clientId, limit, windowSeconds) {
    const key = `ratelimit:slw:log:${clientId}`;

    // Current time
    const now = Date.now();

    // Convert window to milliseconds
    const windowMs = windowSeconds * 1000;

    // Unique member for every request
    const member = `${now}-${randomUUID()}`;

    // 1. Add current request
    await redis.zadd(key, now, member);

    // 2. Remove requests outside the sliding window
    await redis.zremrangebyscore(key, 0, now - windowMs);

    // 3. Count requests inside the current sliding window
    const count = await redis.zcard(key);

    // 4. Limit exceeded
    if (count > limit) {
      // Remove current request because it is rejected
      await redis.zrem(key, member);

      return {
        allowed: false,
        remaining: 0,
        resetAt: now + windowMs,
      };
    }

    // 5. Automatically clean up inactive Redis key
    await redis.expire(key, windowSeconds);

    // 6. Allow request
    return {
      allowed: true,
      remaining: limit - count,
      resetAt: now + windowMs,
    };
  }
}
