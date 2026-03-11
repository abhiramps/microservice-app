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
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
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
