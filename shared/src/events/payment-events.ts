export enum PaymentEventType {
  PAYMENT_COMPLETED = 'payment.completed',
  PAYMENT_FAILED = 'payment.failed',
}

export interface PaymentCompletedPayload {
  paymentId: string;
  orderId: string;
  amount: number;
  transactionRef: string;
}

export interface PaymentFailedPayload {
  paymentId: string;
  orderId: string;
  amount: number;
  reason: string;
}
