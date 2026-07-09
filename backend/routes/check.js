import express from 'express';
import { getStrategy } from '../algorithms/strategyFactory.js';
import { defaultLimit, defaultWindowSeconds } from '../config/limits.js';

const router = express.Router();

router.post('/check', async (req, res) => {
  const {
    clientId,
    algorithm,
    limit = defaultLimit,
    windowSeconds = defaultWindowSeconds,
  } = req.body;

  if (!clientId) {
    return res.status(400).json({ error: 'clientId is required' });
  }

  let strategy;
  try {
    strategy = getStrategy(algorithm);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  try {
    const result = await strategy.checkLimit(clientId, limit, windowSeconds);
    return res.status(result.allowed ? 200 : 429).json(result);
  } catch (err) {
    console.error('[check] strategy failure', err);
    return res.status(503).json({ error: 'Rate limiter is temporarily unavailable. Please try again.' });
  }
});

export default router;