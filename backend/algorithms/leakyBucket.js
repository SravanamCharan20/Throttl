import redis from "../redisClient.js";
import RateLimiterStrategy from "./RateLimiterStrategy.js";

const leakyBucketScript = `
local bucket = redis.call('HMGET', KEYS[1], 'level', 'lastLeak')
local level = tonumber(bucket[1])
local lastLeak = tonumber(bucket[2])

if level == nil then
  level = 0
  lastLeak = tonumber(ARGV[3])
end

local elapsed = tonumber(ARGV[3]) - lastLeak
local leaked = elapsed * tonumber(ARGV[2])
level = math.max(0, level - leaked)

local allowed = 0
local position = level

if level + 1 <= tonumber(ARGV[1]) then
  level = level + 1
  allowed = 1
end

redis.call('HMSET', KEYS[1], 'level', level, 'lastLeak', ARGV[3])
redis.call('EXPIRE', KEYS[1], ARGV[4])

return { allowed, tostring(position) }
`;

redis.defineCommand("leakyBucketCheck", {
  numberOfKeys: 1,
  lua: leakyBucketScript,
});

export default class LeakyBucket extends RateLimiterStrategy {
  async checkLimit(clientId, limit, windowSeconds) {
    const key = `ratelimit:lb:${clientId}`;
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const leakRatePerMs = limit / windowMs;
    const leakIntervalMs = windowMs / limit;

    const [allowed, positionRaw] = await redis.leakyBucketCheck(
      key,
      limit,
      leakRatePerMs,
      now,
      windowSeconds * 2,
    );

    if (allowed !== 1) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: now + windowMs,
        queuePosition: null,
        estimatedProcessAt: null,
      };
    }

    const position = Number(positionRaw);
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
