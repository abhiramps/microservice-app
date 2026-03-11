import express from 'express';
import cors from 'cors';
import { config } from './config';
import { connectDatabase } from './config/database';
import { logger } from './utils/logger';

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'user-service' });
});

async function start(): Promise<void> {
  try {
    await connectDatabase();

    app.listen(config.port, () => {
      logger.info(`User service running on port ${config.port}`);
    });
  } catch (error) {
    logger.error('Failed to start user service:', error);
    process.exit(1);
  }
}

start();

export { app };
