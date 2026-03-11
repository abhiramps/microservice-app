import express from 'express';
import cors from 'cors';
import { config } from './config';
import { correlationIdMiddleware } from './middleware/correlation-id';
import { rateLimiter } from './middleware/rate-limiter';
import { errorHandler } from './middleware/error-handler';
import { proxyRoutes } from './routes/proxy';
import { logger } from './utils/logger';

const app = express();

// Global middleware
app.use(cors());
app.use(express.json());
app.use(correlationIdMiddleware);
app.use(rateLimiter({ windowMs: 60000, max: 100 }));

// Request logging
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`, {
    correlationId: req.headers['x-correlation-id'],
    ip: req.ip,
  });
  next();
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api-gateway' });
});

// Proxy routes
app.use(proxyRoutes);

// Error handler (must be last)
app.use(errorHandler);

app.listen(config.port, () => {
  logger.info(`API Gateway running on port ${config.port}`);
});

export { app };
