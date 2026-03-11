import { Sequelize } from 'sequelize';
import { config } from './index';
import { logger } from '../utils/logger';

export const sequelize = new Sequelize(
  config.db.name,
  config.db.user,
  config.db.password,
  {
    host: config.db.host,
    port: config.db.port,
    dialect: 'postgres',
    logging: (msg) => logger.debug(msg),
  }
);

export async function connectDatabase(): Promise<void> {
  try {
    await sequelize.authenticate();
    logger.info('Database connected successfully');
    await sequelize.sync({ alter: config.nodeEnv === 'development' });
    logger.info('Database synced');
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
}
