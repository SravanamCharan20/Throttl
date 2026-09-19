import { randomUUID } from "crypto";
import redis from "../redisClient.js";

export default class LeakyBucket {
  async checkLimit(clientId, limit, windowSeconds) {
    const key = `ratelimit:lb:${clientId}`;

    const now = Date.now();
    const interval = (windowSeconds * 1000) / limit;
    const requestId = randomUUID();

    // Remove already processed requests
    await redis.zremrangebyscore(key, 0, now);

    // Check capacity
    const size = await redis.zcard(key);

    if (size >= limit) {
      return {
        allowed: false,
        remaining: 0
      };
    }

    // Get last scheduled request
    const last = await redis.zrevrange(
      key,
      0,
      0,
      "WITHSCORES"
    );

    const lastProcessAt = last.length
      ? Number(last[1])
      : now;

    // Schedule this request
    const processAt =
      Math.max(now, lastProcessAt) + interval;

    await redis.zadd(key, processAt, requestId);

    await redis.expire(key, windowSeconds * 2);

    return {
      allowed: true,
      remaining: limit - size - 1,
      estimatedProcessAt: processAt
    };
  }
}