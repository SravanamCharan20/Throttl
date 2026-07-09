import { randomUUID } from "crypto";
import redis from "../redisClient.js";
import RateLimiterStrategy from "./RateLimiterStrategy.js";

export default class SlidingWindowLog extends RateLimiterStrategy {
  async checkLimit(clientId, limit, windowSeconds) {
    const key = `ratelimit:slw:log:${clientId}`;
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    const member = `${now}-${randomUUID()}`; // creating a unique ID for every request
    await redis.zadd(key, now, member);
    // ZADD
    // {
    //   key → Name of the sorted set.
    //   score → Number used for sorting in our case that is timestamp in ms.
    //   member → Unique value stored in the set.
    //   key    = ratelimit:slw:log:user123
    //   now    = 5000ms
    //   member = 5000-abcd
    // }

    await redis.zremrangebyscore(key, 0, now - windowMs);
    const count = await redis.zcard(key);

    if (count > limit) {
      await redis.zrem(key, member);
      return {
        allowed: false,
        remaining: 0,
        resetAt: now + windowMs,
      };
    }

    await redis.expire(key, windowSeconds);
    return {
      allowed: true,
      remaining: limit - count,
      resetAt: now + windowMs,
    };
  }
}
