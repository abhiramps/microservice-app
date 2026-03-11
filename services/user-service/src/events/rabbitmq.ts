import amqp, { Connection, Channel } from 'amqplib';
import { config } from '../config';
import { logger } from '../utils/logger';

class RabbitMQConnection {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private retryCount = 0;
  private maxRetries = 5;

  async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(config.rabbitmq.url);
      this.channel = await this.connection.createChannel();

      // Setup exchange — topic exchange allows flexible routing
      await this.channel.assertExchange('ecommerce.events', 'topic', { durable: true });

      // Dead letter exchange for failed messages
      await this.channel.assertExchange('ecommerce.dlx', 'topic', { durable: true });

      this.retryCount = 0;
      logger.info('RabbitMQ connected');

      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed, attempting reconnect...');
        setTimeout(() => this.connect(), 5000);
      });

      this.connection.on('error', (err) => {
        logger.error('RabbitMQ connection error:', err);
      });
    } catch (error) {
      this.retryCount++;
      if (this.retryCount <= this.maxRetries) {
        logger.warn(`RabbitMQ connection attempt ${this.retryCount}/${this.maxRetries} failed, retrying in 5s...`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return this.connect();
      }
      logger.error('RabbitMQ connection failed after max retries:', error);
      throw error;
    }
  }

  getChannel(): Channel {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }
    return this.channel;
  }

  async close(): Promise<void> {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
    logger.info('RabbitMQ connection closed');
  }
}

export const rabbitmq = new RabbitMQConnection();
