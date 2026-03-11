import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, authorizeAdmin } from '../middleware/auth';
import { proxyRequest } from '../middleware/circuit-breaker';
import { config } from '../config';
import { logger } from '../utils/logger';
import { redis } from '../middleware/rate-limiter';

const router = Router();

const SESSION_TTL = 60 * 60 * 24; // 24 hours in seconds

// Helper to forward request to a service
async function forward(
  serviceName: string,
  serviceUrl: string,
  req: Request,
  res: Response
): Promise<void> {
  try {
    const result = await proxyRequest(
      serviceName,
      serviceUrl,
      req.method,
      req.originalUrl.replace(/^\/api\/(auth|users|products|orders|payments)/, '/api/$1'),
      req.headers as Record<string, string>,
      req.body
    );
    res.status(result.status).json(result.data);
  } catch (error: any) {
    logger.error(`Proxy error to ${serviceName}:`, error);
    res.status(502).json({ success: false, error: `Failed to reach ${serviceName}` });
  }
}

// Helper to forward auth requests and store session in Redis on success
async function forwardAuth(req: Request, res: Response): Promise<void> {
  try {
    const result = await proxyRequest(
      'user-service',
      config.services.user,
      req.method,
      req.originalUrl.replace(/^\/api\/(auth|users)/, '/api/$1'),
      req.headers as Record<string, string>,
      req.body
    );

    // If login/register succeeded, store session in Redis
    if (result.status >= 200 && result.status < 300 && result.data?.data?.token) {
      try {
        const token = result.data.data.token;
        const decoded = jwt.decode(token) as { userId: string; email: string; role: string; jti: string } | null;

        if (decoded?.jti) {
          const sessionKey = `session:${decoded.userId}:${decoded.jti}`;
          await redis.set(sessionKey, JSON.stringify({
            email: decoded.email,
            role: decoded.role,
            createdAt: new Date().toISOString(),
          }), 'EX', SESSION_TTL);

          logger.info('Session created', { userId: decoded.userId, jti: decoded.jti });
        }
      } catch (err) {
        logger.error('Failed to store session in Redis:', err);
        // Don't block the response — session storage is best-effort
      }
    }

    res.status(result.status).json(result.data);
  } catch (error: any) {
    logger.error('Proxy error to user-service:', error);
    res.status(502).json({ success: false, error: 'Failed to reach user-service' });
  }
}

// Auth routes (public)
router.post('/api/auth/register', (req, res) => forwardAuth(req, res));
router.post('/api/auth/login', (req, res) => forwardAuth(req, res));

// Logout (protected) — revokes current session
router.post('/api/auth/logout', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const jti = req.headers['x-user-jti'] as string;

    if (!jti) {
      res.status(400).json({ success: false, error: 'Token does not support revocation' });
      return;
    }

    const sessionKey = `session:${userId}:${jti}`;
    await redis.del(sessionKey);

    logger.info('Session revoked', { userId, jti });
    res.json({ success: true, data: { message: 'Logged out successfully' } });
  } catch (error: any) {
    logger.error('Logout failed:', error);
    res.status(500).json({ success: false, error: 'Logout failed' });
  }
});

// Revoke all sessions (protected) — logs out from all devices
router.post('/api/auth/revoke-all-sessions', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const pattern = `session:${userId}:*`;

    let cursor = '0';
    let deletedCount = 0;

    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
        deletedCount += keys.length;
      }
    } while (cursor !== '0');

    logger.info('All sessions revoked', { userId, count: deletedCount });
    res.json({ success: true, data: { message: `${deletedCount} session(s) revoked` } });
  } catch (error: any) {
    logger.error('Revoke all sessions failed:', error);
    res.status(500).json({ success: false, error: 'Failed to revoke sessions' });
  }
});

// User routes (protected)
router.get('/api/users/profile', authenticate, (req, res) => forward('user-service', config.services.user, req, res));

// Product routes (public for read, admin for write)
router.get('/api/products', (req, res) => forward('product-service', config.services.product, req, res));
router.get('/api/products/:id', (req, res) => forward('product-service', config.services.product, req, res));
router.post('/api/products', authenticate, authorizeAdmin, (req, res) => forward('product-service', config.services.product, req, res));
router.put('/api/products/:id', authenticate, authorizeAdmin, (req, res) => forward('product-service', config.services.product, req, res));
router.delete('/api/products/:id', authenticate, authorizeAdmin, (req, res) => forward('product-service', config.services.product, req, res));

// Order routes (protected)
router.post('/api/orders', authenticate, (req, res) => forward('order-service', config.services.order, req, res));
router.get('/api/orders', authenticate, (req, res) => forward('order-service', config.services.order, req, res));
router.get('/api/orders/:id', authenticate, (req, res) => forward('order-service', config.services.order, req, res));

// Payment routes (protected)
router.get('/api/payments/:orderId', authenticate, (req, res) => forward('payment-service', config.services.payment, req, res));

export { router as proxyRoutes };
