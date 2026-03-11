import express from 'express';
import cors from 'cors';
import { config } from './config';
import { connectDatabase } from './config/database';
import { rabbitmq } from './events/rabbitmq';
import { startConsumers } from './events/consumer';
import { orderRoutes } from './routes/order.routes';
import { logger } from './utils/logger';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'order-service' });
});

app.use('/api/orders', orderRoutes);

async function start(): Promise<void> {
  try {
    await connectDatabase();
    await rabbitmq.connect();
    await startConsumers();

    app.listen(config.port, () => {
      logger.info(`Order service running on port ${config.port}`);
    });
  } catch (error) {
    logger.error('Failed to start order service:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  await rabbitmq.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down...');
  await rabbitmq.close();
  process.exit(0);
});

start();

export { app };
