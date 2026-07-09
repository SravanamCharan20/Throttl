import redis from '../redisClient.js';
import RateLimiterStrategy from './RateLimiterStrategy.js';

const tokenBucketScript = `
local bucket = redis.call('HMGET', KEYS[1], 'tokens', 'lastRefill')
local tokens = tonumber(bucket[1])
local lastRefill = tonumber(bucket[2])

if tokens == nil then
  tokens = tonumber(ARGV[1])
  lastRefill = tonumber(ARGV[3])
end

local elapsed = tonumber(ARGV[3]) - lastRefill
local refill = elapsed * tonumber(ARGV[2])
tokens = math.min(tonumber(ARGV[1]), tokens + refill)

local allowed = 0
if tokens >= 1 then
  tokens = tokens - 1
  allowed = 1
end

redis.call('HMSET', KEYS[1], 'tokens', tokens, 'lastRefill', ARGV[3])
redis.call('EXPIRE', KEYS[1], ARGV[4])

return { allowed, tostring(tokens) }
`;

redis.defineCommand('tokenBucketCheck', {
  numberOfKeys: 1,
  lua: tokenBucketScript,
});

export default class TokenBucket extends RateLimiterStrategy {
  async checkLimit(clientId, limit, windowSeconds) {
    const key = `ratelimit:tb:${clientId}`;
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const refillRatePerMs = limit / windowMs;

    const [allowed, tokensRemaining] = await redis.tokenBucketCheck(
      key,
      limit,
      refillRatePerMs,
      now,
      windowSeconds * 2
    );

    return {
      allowed: allowed === 1,
      remaining: Math.floor(Number(tokensRemaining)),
      resetAt: now + windowMs,
    };
  }
}