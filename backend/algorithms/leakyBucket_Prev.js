import redis from "../redisClient.js";
import RateLimiterStrategy from "./RateLimiterStrategy.js";

export default class LeakyBucket extends RateLimiterStrategy {
  async checkLimit(clientId, limit, windowSeconds) {
    const key = `ratelimit:lb:${clientId}`;
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const leakRatePerMs = limit / windowMs;
    const leakIntervalMs = windowMs / limit;

    const bucket = await redis.hmget(key, "level", "lastLeak");
    let level = bucket[0] !== null ? Number(bucket[0]) : 0;
    let lastLeak = bucket[1] !== null ? Number(bucket[1]) : now;

    const elapsed = now - lastLeak;
    const leaked = elapsed * leakRatePerMs;
    level = Math.max(0, level - leaked);

    const position = level;
    let allowed = false;

    if (level + 1 <= limit) {
      level += 1;
      allowed = true;
    }

    await redis.hmset(key, "level", level, "lastLeak", now);
    await redis.expire(key, windowSeconds * 2);

    if (!allowed) {
      return { allowed: false, remaining: 0, resetAt: now + windowMs, queuePosition: null, estimatedProcessAt: null };
    }

    const delayMs = position * leakIntervalMs;

    return {
      allowed: true,
      remaining: Math.max(0, Math.floor(limit - (position + 1))),
      resetAt: now + windowMs,
      queuePosition: Math.max(0, Math.floor(position)),
      estimatedProcessAt: Math.round(now + delayMs),
    };
  }
}