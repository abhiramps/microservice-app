import { v4 as uuidv4 } from 'uuid';
import { Payment } from '../models/Payment';
import { logger } from '../utils/logger';

export class PaymentService {
  /**
   * Simulate payment processing.
   * In production, this would integrate with Stripe/PayPal/etc.
   * Randomly fails 20% of the time for demonstration purposes.
   */
  async processPayment(orderId: string, amount: number, correlationId: string): Promise<Payment> {
    const payment = await Payment.create({
      orderId,
      amount,
      method: 'card',
      correlationId,
    });

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Simulate success/failure (80% success rate)
    const isSuccess = Math.random() > 0.2;

    if (isSuccess) {
      payment.status = 'completed';
      payment.transactionRef = `txn_${uuidv4().slice(0, 8)}`;
      await payment.save();
      logger.info(`Payment completed for order ${orderId}`, { transactionRef: payment.transactionRef });
    } else {
      payment.status = 'failed';
      await payment.save();
      logger.warn(`Payment failed for order ${orderId}`);
    }

    return payment;
  }

  async getPaymentByOrderId(orderId: string): Promise<Payment | null> {
    return Payment.findOne({ where: { orderId } });
  }
}
