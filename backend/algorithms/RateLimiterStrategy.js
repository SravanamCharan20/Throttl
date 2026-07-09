export default class RateLimiterStrategy {
  async checkLimit(clientId, limit, windowSeconds) {
    throw new Error('checkLimit() must be implemented by a subclass');
  }
}