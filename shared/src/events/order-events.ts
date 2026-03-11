export enum OrderEventType {
  ORDER_CREATED = 'order.created',
  ORDER_CONFIRMED = 'order.confirmed',
  ORDER_CANCELLED = 'order.cancelled',
}

export interface OrderItem {
  productId: string;
  productName: string;
  priceAtPurchase: number;
  quantity: number;
}

export interface OrderCreatedPayload {
  orderId: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
}

export interface OrderConfirmedPayload {
  orderId: string;
  userId: string;
  totalAmount: number;
}

export interface OrderCancelledPayload {
  orderId: string;
  userId: string;
  reason: string;
}
