import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { validate, createProductSchema, updateProductSchema } from '../middleware/validation';

const router = Router();
const productController = new ProductController();

router.get('/', (req, res) => productController.findAll(req, res));
router.get('/:id', (req, res) => productController.findById(req, res));
router.post('/', validate(createProductSchema), (req, res) => productController.create(req, res));
router.put('/:id', validate(updateProductSchema), (req, res) => productController.update(req, res));
router.delete('/:id', (req, res) => productController.delete(req, res));

export { router as productRoutes };
