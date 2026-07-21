import { randomUUID } from "crypto";
import redis from "../redisClient.js";
import RateLimiterStrategy from "./RateLimiterStrategy.js";

const slidingWindowLogScript = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]
local ttl = tonumber(ARGV[5])

redis.call('ZADD', key, now, member)
redis.call('ZREMRANGEBYSCORE', key, 0, now - windowMs)
local count = redis.call('ZCARD', key)

if count > limit then
  redis.call('ZREM', key, member)
  return {0, 0}
end

redis.call('EXPIRE', key, ttl)
return {1, limit - count}
`;

redis.defineCommand("slidingWindowLogCheck", { numberOfKeys: 1, lua: slidingWindowLogScript });

export default class SlidingWindowLog extends RateLimiterStrategy {
  async checkLimit(clientId, limit, windowSeconds) {
    const key = `ratelimit:slw:log:${clientId}`;
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const member = `${now}-${randomUUID()}`;

    const [allowed, remaining] = await redis.slidingWindowLogCheck(
      key, now, windowMs, limit, member, windowSeconds
    );

    return {
      allowed: allowed === 1,
      remaining: Number(remaining),
      resetAt: now + windowMs,
    };
  }
}