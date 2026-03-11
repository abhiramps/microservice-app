import { rabbitmq } from './rabbitmq';
import { logger } from '../utils/logger';

export class EventPublisher {
  async publish(routingKey: string, event: Record<string, unknown>): Promise<void> {
    const channel = rabbitmq.getChannel();
    const message = Buffer.from(JSON.stringify(event));

    channel.publish('ecommerce.events', routingKey, message, {
      persistent: true,
      contentType: 'application/json',
      messageId: event.eventId as string,
    });

    logger.info(`Event published: ${routingKey}`, { eventId: event.eventId });
  }
}

export const eventPublisher = new EventPublisher();
