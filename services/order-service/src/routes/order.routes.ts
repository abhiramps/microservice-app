import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { validate, createOrderSchema } from '../middleware/validation';

const router = Router();
const orderController = new OrderController();

router.post('/', validate(createOrderSchema), (req, res) => orderController.create(req, res));
router.get('/', (req, res) => orderController.findAll(req, res));
router.get('/:id', (req, res) => orderController.findById(req, res));

export { router as orderRoutes };
