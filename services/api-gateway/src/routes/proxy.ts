import { Router, Request, Response } from 'express';
import { authenticate, authorizeAdmin } from '../middleware/auth';
import { proxyRequest } from '../middleware/circuit-breaker';
import { config } from '../config';
import { logger } from '../utils/logger';

const router = Router();

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

// Auth routes (public)
router.post('/api/auth/register', (req, res) => forward('user-service', config.services.user, req, res));
router.post('/api/auth/login', (req, res) => forward('user-service', config.services.user, req, res));

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
