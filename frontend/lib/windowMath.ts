export function windowIndex(timestamp: number, windowMs: number): number {
  return Math.floor(timestamp / windowMs);
}

export function previousWindowWeight(now: number, windowMs: number): number {
  const current = windowIndex(now, windowMs);
  const elapsed = now - current * windowMs;
  return (windowMs - elapsed) / windowMs;
}
