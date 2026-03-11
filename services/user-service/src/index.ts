import express from 'express';
import cors from 'cors';
import { config } from './config';
import { connectDatabase } from './config/database';
import { authRoutes } from './routes/auth.routes';
import { userRoutes } from './routes/user.routes';
import { rabbitmq } from './events/rabbitmq';
import { logger } from './utils/logger';

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'user-service' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

async function start(): Promise<void> {
  try {
    await connectDatabase();
    await rabbitmq.connect();

    app.listen(config.port, () => {
      logger.info(`User service running on port ${config.port}`);
    });
  } catch (error) {
    logger.error('Failed to start user service:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await rabbitmq.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await rabbitmq.close();
  process.exit(0);
});

start();

export { app };
