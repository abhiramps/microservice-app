import { Request, Response } from 'express';
import { OrderService } from '../services/order.service';
import { logger } from '../utils/logger';

const orderService = new OrderService();

export class OrderController {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.headers['x-user-id'] as string;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const result = await orderService.createOrder({
        userId,
        items: req.body.items,
      });

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      logger.error('Create order failed:', error);
      res.status(500).json({ success: false, error: 'Failed to create order' });
    }
  }

  async findAll(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.headers['x-user-id'] as string;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { page, limit } = req.query;
      const result = await orderService.getUserOrders(
        userId,
        page ? parseInt(page as string, 10) : undefined,
        limit ? parseInt(limit as string, 10) : undefined
      );

      res.json({ success: true, data: result.orders, pagination: result.pagination });
    } catch (error) {
      logger.error('Fetch orders failed:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch orders' });
    }
  }

  async findById(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.headers['x-user-id'] as string;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const order = await orderService.getOrderById(req.params.id, userId);
      if (!order) {
        res.status(404).json({ success: false, error: 'Order not found' });
        return;
      }

      res.json({ success: true, data: order });
    } catch (error) {
      logger.error('Fetch order failed:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch order' });
    }
  }
}
