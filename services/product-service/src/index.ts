import express from 'express';
import cors from 'cors';
import { config } from './config';
import { connectDatabase } from './config/database';
import { productRoutes } from './routes/product.routes';
import { logger } from './utils/logger';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'product-service' });
});

app.use('/api/products', productRoutes);

async function start(): Promise<void> {
  try {
    await connectDatabase();

    app.listen(config.port, () => {
      logger.info(`Product service running on port ${config.port}`);
    });
  } catch (error) {
    logger.error('Failed to start product service:', error);
    process.exit(1);
  }
}

start();

export { app };
