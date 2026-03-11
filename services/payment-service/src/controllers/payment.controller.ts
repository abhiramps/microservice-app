import { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service';
import { logger } from '../utils/logger';

const paymentService = new PaymentService();

export class PaymentController {
  async getByOrderId(req: Request, res: Response): Promise<void> {
    try {
      const payment = await paymentService.getPaymentByOrderId(req.params.orderId);
      if (!payment) {
        res.status(404).json({ success: false, error: 'Payment not found' });
        return;
      }
      res.json({ success: true, data: payment });
    } catch (error) {
      logger.error('Fetch payment failed:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch payment' });
    }
  }
}
