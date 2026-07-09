import SlidingWindowLog from "./slidingWindowLog.js";
import SlidingWindowCounter from "./slidingWindowCounter.js";
import TokenBucket from "./tokenBucket.js";
import LeakyBucket from "./leakyBucket.js";

const strategies = {
  "sliding-window-log": new SlidingWindowLog(),
  "sliding-window-counter": new SlidingWindowCounter(),
  "token-bucket": new TokenBucket(),
  "leaky-bucket": new LeakyBucket(),
};

export function getStrategy(name) {
  const strategy = strategies[name];
  if (!strategy) {
    throw new Error(`Unknown rate limiting algorithm: ${name}`);
  }
  return strategy;
}
