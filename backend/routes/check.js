import express from 'express';
import { getStrategy } from '../algorithms/strategyFactory.js';
import { defaultLimit, defaultWindowSeconds } from '../config/limits.js';
import { isRedisFailure, parsePositiveInt } from '../lib/httpErrors.js';

const router = express.Router();

router.post('/check', async (req, res) => {
  const {
    clientId,
    algorithm,
    limit: rawLimit = defaultLimit,
    windowSeconds: rawWindow = defaultWindowSeconds,
  } = req.body ?? {};

  if (!clientId || typeof clientId !== 'string' || !clientId.trim()) {
    return res.status(400).json({ error: 'clientId is required' });
  }

  if (!algorithm || typeof algorithm !== 'string') {
    return res.status(400).json({ error: 'algorithm is required' });
  }

  const limitParsed = parsePositiveInt(rawLimit, 'limit');
  if (!limitParsed.ok) {
    return res.status(400).json({ error: limitParsed.error });
  }

  const windowParsed = parsePositiveInt(rawWindow, 'windowSeconds');
  if (!windowParsed.ok) {
    return res.status(400).json({ error: windowParsed.error });
  }

  const limit = limitParsed.value ?? defaultLimit;
  const windowSeconds = windowParsed.value ?? defaultWindowSeconds;

  let strategy;
  try {
    strategy = getStrategy(algorithm);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  try {
    const result = await strategy.checkLimit(clientId.trim(), limit, windowSeconds);

    if (!result.allowed) {
      const retryAfterSec = Math.max(
        1,
        Math.ceil((Number(result.resetAt) - Date.now()) / 1000) || windowSeconds,
      );
      res.set('Retry-After', String(retryAfterSec));
      return res.status(429).json(result);
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('[check] strategy failure', err);

    if (isRedisFailure(err)) {
      return res.status(503).json({
        error: 'Rate limiter is temporarily unavailable. Please try again.',
      });
    }

    // Unexpected application error — still not the caller's fault, but not a
    // known Redis outage either. Keep 503 so clients treat it as retryable infra.
    return res.status(503).json({
      error: 'Rate limiter is temporarily unavailable. Please try again.',
    });
  }
});

export default router;
