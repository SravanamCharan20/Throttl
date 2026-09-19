import { randomUUID } from "crypto";
import redis from "../redisClient.js";
import RateLimiterStrategy from "./RateLimiterStrategy.js";

export default class SWL_testing extends RateLimiterStrategy {
  async checkLimit(clientId, limit, windowSeconds) {
    // first part
    const key = `ratelimit:SWL:${clientId}`;
    const now = Date.now();
    const member = `${now}-${randomUUID()}`;
    const windowMs = windowSeconds * 1000;

    // second part
    await redis.zadd(key, now, member);
    await redis.zremrangebyscore(key, 0, now - windowMs);
    const count = await redis.zcard(key);

    // third part
    if (count > limit) {
      await redis.zrem(key, member);
      return {
        allowed: false,
        remaining: 0,
        resetAt: now + windowMs,
      };
    }

    // fourth part
    await redis.expire(key, windowSeconds);

    return {
      allowed: true,
      remaining: limit - count,
      resetAt: now + windowMs,
    };
  }
}
