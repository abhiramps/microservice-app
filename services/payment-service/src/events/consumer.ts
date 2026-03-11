import { v4 as uuidv4 } from 'uuid';
import { rabbitmq } from './rabbitmq';
import { PaymentService } from '../services/payment.service';
import { eventPublisher } from './publisher';
import { logger } from '../utils/logger';

const paymentService = new PaymentService();
const processedEvents = new Set<string>();

export async function startConsumers(): Promise<void> {
  const channel = rabbitmq.getChannel();

  const queueName = 'payment-service.order-events';
  await channel.assertQueue(queueName, {
    durable: true,
    deadLetterExchange: 'ecommerce.dlx',
    deadLetterRoutingKey: 'payment-service.order-events.dlq',
  });

  // Dead letter queue
  const dlqName = 'payment-service.order-events.dlq';
  await channel.assertQueue(dlqName, { durable: true });
  await channel.bindQueue(dlqName, 'ecommerce.dlx', 'payment-service.order-events.dlq');

  // Listen for order.created events
  await channel.bindQueue(queueName, 'ecommerce.events', 'order.created');

  await channel.prefetch(1);

  channel.consume(queueName, async (msg: any) => {
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

      if (event.type === 'order.created') {
        await handleOrderCreated(event);
      }

      processedEvents.add(event.eventId);
      channel.ack(msg);
    } catch (error) {
      logger.error('Failed to process message:', error);
      channel.nack(msg, false, false);
    }
  });

  logger.info(`Consuming from queue: ${queueName}`);
}

async function handleOrderCreated(event: Record<string, any>): Promise<void> {
  const { orderId, totalAmount } = event.payload;

  const payment = await paymentService.processPayment(orderId, totalAmount, event.correlationId);

  if (payment.status === 'completed') {
    await eventPublisher.publish('payment.completed', {
      eventId: uuidv4(),
      type: 'payment.completed',
      timestamp: new Date().toISOString(),
      correlationId: event.correlationId,
      payload: {
        paymentId: payment.id,
        orderId: payment.orderId,
        amount: payment.amount,
        transactionRef: payment.transactionRef,
      },
    });
  } else {
    await eventPublisher.publish('payment.failed', {
      eventId: uuidv4(),
      type: 'payment.failed',
      timestamp: new Date().toISOString(),
      correlationId: event.correlationId,
      payload: {
        paymentId: payment.id,
        orderId: payment.orderId,
        amount: payment.amount,
        reason: 'Payment processing failed (simulated)',
      },
    });
  }
}
