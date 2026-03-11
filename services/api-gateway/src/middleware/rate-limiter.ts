import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

const redis = new Redis(config.redis.url);

redis.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

interface RateLimitOptions {
  windowMs: number;  // Window size in milliseconds
  max: number;       // Max requests per window
}

export function rateLimiter(options: RateLimitOptions = { windowMs: 60000, max: 100 }) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = `rate-limit:${req.ip}`;
      const now = Date.now();
      const windowStart = now - options.windowMs;

      // Sliding window using Redis sorted set
      const pipeline = redis.pipeline();
      pipeline.zremrangebyscore(key, 0, windowStart);   // Remove old entries
      pipeline.zadd(key, now.toString(), `${now}:${Math.random()}`);  // Add current request
      pipeline.zcard(key);                               // Count requests in window
      pipeline.expire(key, Math.ceil(options.windowMs / 1000));  // Set expiry

      const results = await pipeline.exec();
      const requestCount = results?.[2]?.[1] as number;

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', options.max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, options.max - requestCount));

      if (requestCount > options.max) {
        logger.warn(`Rate limit exceeded for ${req.ip}`);
        res.status(429).json({
          success: false,
          error: 'Too many requests. Please try again later.',
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Rate limiter error:', error);
      // Fail open — allow request if Redis is down
      next();
    }
  };
}

export { redis };
