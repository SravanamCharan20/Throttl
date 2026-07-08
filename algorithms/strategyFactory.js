import SlidingWindowLog from './slidingWindowLog.js';

const strategies = {
  'sliding-window-log': new SlidingWindowLog(),
};

export function getStrategy(name) {
  const strategy = strategies[name];
  if (!strategy) {
    throw new Error(`Unknown rate limiting algorithm: ${name}`);
  }
  return strategy;
}