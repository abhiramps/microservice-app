import { Request, Response } from 'express';
import { ProductService } from '../services/product.service';
import { logger } from '../utils/logger';

const productService = new ProductService();

export class ProductController {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const product = await productService.create(req.body);
      res.status(201).json({ success: true, data: product });
    } catch (error) {
      logger.error('Create product failed:', error);
      res.status(500).json({ success: false, error: 'Failed to create product' });
    }
  }

  async findAll(req: Request, res: Response): Promise<void> {
    try {
      const { category, status, search, page, limit } = req.query;
      const result = await productService.findAll({
        category: category as string,
        status: status as string,
        search: search as string,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });
      res.json({ success: true, data: result.products, pagination: result.pagination });
    } catch (error) {
      logger.error('Find products failed:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch products' });
    }
  }

  async findById(req: Request, res: Response): Promise<void> {
    try {
      const product = await productService.findById(req.params.id);
      if (!product) {
        res.status(404).json({ success: false, error: 'Product not found' });
        return;
      }
      res.json({ success: true, data: product });
    } catch (error) {
      logger.error('Find product failed:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch product' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const product = await productService.update(req.params.id, req.body);
      if (!product) {
        res.status(404).json({ success: false, error: 'Product not found' });
        return;
      }
      res.json({ success: true, data: product });
    } catch (error) {
      logger.error('Update product failed:', error);
      res.status(500).json({ success: false, error: 'Failed to update product' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const deleted = await productService.delete(req.params.id);
      if (!deleted) {
        res.status(404).json({ success: false, error: 'Product not found' });
        return;
      }
      res.json({ success: true, message: 'Product deleted' });
    } catch (error) {
      logger.error('Delete product failed:', error);
      res.status(500).json({ success: false, error: 'Failed to delete product' });
    }
  }
}
