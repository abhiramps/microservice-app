import amqp from 'amqplib';
import { config } from '../config';
import { logger } from '../utils/logger';

class RabbitMQConnection {
  private connection: any = null;
  private channel: any = null;
  private retryCount = 0;
  private maxRetries = 5;

  async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(config.rabbitmq.url);
      this.channel = await this.connection.createChannel();

      await this.channel.assertExchange('ecommerce.events', 'topic', { durable: true });
      await this.channel.assertExchange('ecommerce.dlx', 'topic', { durable: true });

      this.retryCount = 0;
      logger.info('RabbitMQ connected');

      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed, attempting reconnect...');
        setTimeout(() => this.connect(), 5000);
      });
    } catch (error) {
      this.retryCount++;
      if (this.retryCount <= this.maxRetries) {
        logger.warn(`RabbitMQ retry ${this.retryCount}/${this.maxRetries}...`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return this.connect();
      }
      throw error;
    }
  }

  getChannel(): any {
    if (!this.channel) throw new Error('RabbitMQ channel not initialized');
    return this.channel;
  }

  async close(): Promise<void> {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
  }
}

export const rabbitmq = new RabbitMQConnection();
