import { v4 as uuidv4 } from 'uuid';
import { Order } from '../models/Order';
import { OrderItem } from '../models/OrderItem';
import { sequelize } from '../config/database';
import { eventPublisher } from '../events/publisher';
import { logger } from '../utils/logger';

interface OrderItemInput {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
}

interface CreateOrderInput {
  userId: string;
  items: OrderItemInput[];
}

export class OrderService {
  async createOrder(input: CreateOrderInput) {
    const correlationId = uuidv4();
    const totalAmount = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Use transaction to ensure order + items are created atomically
    const result = await sequelize.transaction(async (t) => {
      const order = await Order.create(
        {
          userId: input.userId,
          totalAmount,
          correlationId,
        },
        { transaction: t }
      );

      const items = await Promise.all(
        input.items.map((item) =>
          OrderItem.create(
            {
              orderId: order.id,
              productId: item.productId,
              productName: item.productName,
              priceAtPurchase: item.price,
              quantity: item.quantity,
            },
            { transaction: t }
          )
        )
      );

      return { order, items };
    });

    // Publish order.created event (saga begins)
    await eventPublisher.publish('order.created', {
      eventId: uuidv4(),
      type: 'order.created',
      timestamp: new Date().toISOString(),
      correlationId,
      payload: {
        orderId: result.order.id,
        userId: input.userId,
        items: input.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          priceAtPurchase: item.price,
          quantity: item.quantity,
        })),
        totalAmount,
      },
    });

    logger.info(`Order created: ${result.order.id}, saga started with correlationId: ${correlationId}`);
    return result;
  }

  async getOrderById(orderId: string, userId: string) {
    return Order.findOne({
      where: { id: orderId, userId },
      include: [{ model: OrderItem, as: 'items' }],
    });
  }

  async getUserOrders(userId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const { count, rows } = await Order.findAndCountAll({
      where: { userId },
      include: [{ model: OrderItem, as: 'items' }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return {
      orders: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  }
}
