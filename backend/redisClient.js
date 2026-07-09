import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  connectTimeout: 10000,
  commandTimeout: 5000,
});

redis.on('connect', () => console.log('[redis] connected'));
redis.on('error', (err) => console.error('[redis] error', err.message));

export default redis;