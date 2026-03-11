import { rabbitmq } from './rabbitmq';
import { logger } from '../utils/logger';

export class EventPublisher {
  async publish(routingKey: string, event: Record<string, unknown>): Promise<void> {
    try {
      const channel = rabbitmq.getChannel();
      const message = Buffer.from(JSON.stringify(event));

      channel.publish('ecommerce.events', routingKey, message, {
        persistent: true,
        contentType: 'application/json',
        messageId: event.eventId as string,
        timestamp: Date.now(),
      });

      logger.info(`Event published: ${routingKey}`, { eventId: event.eventId, correlationId: event.correlationId });
    } catch (error) {
      logger.error(`Failed to publish event: ${routingKey}`, error);
      throw error;
    }
  }
}

export const eventPublisher = new EventPublisher();
