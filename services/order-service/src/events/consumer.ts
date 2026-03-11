import { rabbitmq } from './rabbitmq';
import { Order } from '../models/Order';
import { logger } from '../utils/logger';
import { eventPublisher } from './publisher';
import { v4 as uuidv4 } from 'uuid';

// Track processed events for idempotency
const processedEvents = new Set<string>();

export async function startConsumers(): Promise<void> {
  const channel = rabbitmq.getChannel();

  // Queue for payment events with dead letter exchange
  const queueName = 'order-service.payment-events';
  await channel.assertQueue(queueName, {
    durable: true,
    deadLetterExchange: 'ecommerce.dlx',
    deadLetterRoutingKey: 'order-service.payment-events.dlq',
  });

  // Dead letter queue
  const dlqName = 'order-service.payment-events.dlq';
  await channel.assertQueue(dlqName, { durable: true });
  await channel.bindQueue(dlqName, 'ecommerce.dlx', 'order-service.payment-events.dlq');

  // Bind to payment events
  await channel.bindQueue(queueName, 'ecommerce.events', 'payment.completed');
  await channel.bindQueue(queueName, 'ecommerce.events', 'payment.failed');

  // Prefetch 1 message at a time for fair dispatch
  await channel.prefetch(1);

  channel.consume(queueName, async (msg) => {
    if (!msg) return;

    try {
      const event = JSON.parse(msg.content.toString());

      // Idempotency check
      if (processedEvents.has(event.eventId)) {
        logger.info(`Duplicate event skipped: ${event.eventId}`);
        channel.ack(msg);
        return;
      }

      logger.info(`Processing event: ${event.type}`, { eventId: event.eventId, correlationId: event.correlationId });

      if (event.type === 'payment.completed') {
        await handlePaymentCompleted(event);
      } else if (event.type === 'payment.failed') {
        await handlePaymentFailed(event);
      }

      processedEvents.add(event.eventId);
      channel.ack(msg);
    } catch (error) {
      logger.error('Failed to process message:', error);
      // Negative acknowledge — sends to DLQ
      channel.nack(msg, false, false);
    }
  });

  logger.info(`Consuming from queue: ${queueName}`);
}

async function handlePaymentCompleted(event: Record<string, any>): Promise<void> {
  const { orderId } = event.payload;
  const order = await Order.findByPk(orderId);

  if (!order || order.status !== 'pending') {
    logger.warn(`Order ${orderId} not found or not in pending status`);
    return;
  }

  await order.update({ status: 'confirmed' });
  logger.info(`Order ${orderId} confirmed`);

  // Publish order.confirmed event
  await eventPublisher.publish('order.confirmed', {
    eventId: uuidv4(),
    type: 'order.confirmed',
    timestamp: new Date().toISOString(),
    correlationId: event.correlationId,
    payload: {
      orderId: order.id,
      userId: order.userId,
      totalAmount: order.totalAmount,
    },
  });
}

async function handlePaymentFailed(event: Record<string, any>): Promise<void> {
  const { orderId, reason } = event.payload;
  const order = await Order.findByPk(orderId);

  if (!order || order.status !== 'pending') {
    logger.warn(`Order ${orderId} not found or not in pending status`);
    return;
  }

  // Compensating transaction — cancel the order
  await order.update({ status: 'cancelled' });
  logger.info(`Order ${orderId} cancelled due to payment failure: ${reason}`);

  // Publish order.cancelled event
  await eventPublisher.publish('order.cancelled', {
    eventId: uuidv4(),
    type: 'order.cancelled',
    timestamp: new Date().toISOString(),
    correlationId: event.correlationId,
    payload: {
      orderId: order.id,
      userId: order.userId,
      reason: `Payment failed: ${reason}`,
    },
  });
}
