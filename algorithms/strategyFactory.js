import SlidingWindowLog from './slidingWindowLog.js';
import SlidingWindowCounter from './slidingWindowCounter.js';
import TokenBucket from './tokenBucket.js';


const strategies = {
  'sliding-window-log': new SlidingWindowLog(),
  'sliding-window-counter': new SlidingWindowCounter(),
  'token-bucket': new TokenBucket(),
};

export function getStrategy(name) {
  const strategy = strategies[name];
  if (!strategy) {
    throw new Error(`Unknown rate limiting algorithm: ${name}`);
  }
  return strategy;
}