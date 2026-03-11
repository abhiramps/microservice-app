import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const correlationId = req.headers['x-correlation-id'];
  logger.error('Unhandled error', { error: err.message, stack: err.stack, correlationId });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    correlationId,
  });
}
