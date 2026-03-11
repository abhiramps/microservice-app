import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';
import { redis } from './rate-limiter';

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  jti: string;
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    // Check if session exists in Redis (token allowlist)
    if (decoded.jti) {
      const sessionKey = `session:${decoded.userId}:${decoded.jti}`;
      redis.exists(sessionKey).then((exists) => {
        if (!exists) {
          logger.warn('Token revoked or session not found', { userId: decoded.userId, jti: decoded.jti });
          res.status(401).json({ success: false, error: 'Token revoked' });
          return;
        }

        // Forward user info to downstream services via headers
        req.headers['x-user-id'] = decoded.userId;
        req.headers['x-user-email'] = decoded.email;
        req.headers['x-user-role'] = decoded.role;
        req.headers['x-user-jti'] = decoded.jti;

        next();
      }).catch((err) => {
        logger.error('Redis session check failed:', err);
        // Fail open — allow request if Redis is down
        req.headers['x-user-id'] = decoded.userId;
        req.headers['x-user-email'] = decoded.email;
        req.headers['x-user-role'] = decoded.role;
        req.headers['x-user-jti'] = decoded.jti;
        next();
      });
    } else {
      // Legacy token without jti — allow through
      req.headers['x-user-id'] = decoded.userId;
      req.headers['x-user-email'] = decoded.email;
      req.headers['x-user-role'] = decoded.role;
      next();
    }
  } catch (error) {
    logger.warn('Invalid JWT token', { error: (error as Error).message });
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

export function authorizeAdmin(req: Request, res: Response, next: NextFunction): void {
  const role = req.headers['x-user-role'] as string;
  if (role !== 'admin') {
    res.status(403).json({ success: false, error: 'Admin access required' });
    return;
  }
  next();
}
