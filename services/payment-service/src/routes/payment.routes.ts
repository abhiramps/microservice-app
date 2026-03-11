import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';

const router = Router();
const paymentController = new PaymentController();

router.get('/:orderId', (req, res) => paymentController.getByOrderId(req, res));

export { router as paymentRoutes };
