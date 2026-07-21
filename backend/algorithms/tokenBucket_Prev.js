import redis from '../redisClient.js';
import RateLimiterStrategy from './RateLimiterStrategy.js';

export default class TokenBucket extends RateLimiterStrategy {
  async checkLimit(clientId, limit, windowSeconds) {
    const key = `ratelimit:tb:${clientId}`;
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const refillRatePerMs = limit / windowMs;

    const bucket = await redis.hmget(key, 'tokens', 'lastRefill');
    let tokens = bucket[0] !== null ? Number(bucket[0]) : limit;
    let lastRefill = bucket[1] !== null ? Number(bucket[1]) : now;

    const elapsed = now - lastRefill;
    const refill = elapsed * refillRatePerMs;
    tokens = Math.min(limit, tokens + refill);

    let allowed = false;
    if (tokens >= 1) {
      tokens -= 1;
      allowed = true;
    }

    await redis.hmset(key, 'tokens', tokens, 'lastRefill', now);
    await redis.expire(key, windowSeconds * 2);

    return {
      allowed,
      remaining: Math.floor(tokens),
      resetAt: now + windowMs,
    };
  }
}