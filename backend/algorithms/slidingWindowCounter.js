import redis from "../redisClient.js";
import RateLimiterStrategy from "./RateLimiterStrategy.js";

const slidingWindowCounterScript = `
local currentKey = KEYS[1]
local previousKey = KEYS[2]
local weight = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local ttl = tonumber(ARGV[3])

local previousCount = tonumber(redis.call('GET', previousKey)) or 0
local currentCount = tonumber(redis.call('GET', currentKey)) or 0

local estimated = currentCount + previousCount * weight

if estimated >= limit then
  return {0, 0}
end

local newCount = redis.call('INCR', currentKey)
if newCount == 1 then
  redis.call('EXPIRE', currentKey, ttl)
end

local remaining = limit - estimated - 1
if remaining < 0 then remaining = 0 end

return {1, remaining}
`;

redis.defineCommand("slidingWindowCounterCheck", { numberOfKeys: 2, lua: slidingWindowCounterScript });

export default class SlidingWindowCounter extends RateLimiterStrategy {
  async checkLimit(clientId, limit, windowSeconds) {
    const windowMs = windowSeconds * 1000;
    const now = Date.now();
    const currentWindow = Math.floor(now / windowMs);

    const currentWindowKey = `ratelimit:swc:${clientId}:${currentWindow}`;
    const previousWindowKey = `ratelimit:swc:${clientId}:${currentWindow - 1}`;

    const elapsedTime = now - currentWindow * windowMs;
    const previousWindowWeight = (windowMs - elapsedTime) / windowMs;

    const [allowed, remaining] = await redis.slidingWindowCounterCheck(
      currentWindowKey, previousWindowKey,
      previousWindowWeight, limit, windowSeconds * 2
    );

    return {
      allowed: allowed === 1,
      remaining: Math.floor(Number(remaining)),
      resetAt: (currentWindow + 1) * windowMs,
    };
  }
}