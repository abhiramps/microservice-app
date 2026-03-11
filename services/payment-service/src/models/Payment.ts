import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface PaymentAttributes {
  id: string;
  orderId: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  method: 'card' | 'wallet';
  transactionRef: string | null;
  correlationId: string;
  processedEvents: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

interface PaymentCreationAttributes extends Optional<PaymentAttributes, 'id' | 'status' | 'transactionRef' | 'processedEvents' | 'createdAt' | 'updatedAt'> {}

export class Payment extends Model<PaymentAttributes, PaymentCreationAttributes> implements PaymentAttributes {
  public id!: string;
  public orderId!: string;
  public amount!: number;
  public status!: 'pending' | 'completed' | 'failed' | 'refunded';
  public method!: 'card' | 'wallet';
  public transactionRef!: string | null;
  public correlationId!: string;
  public processedEvents!: string[];
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public hasProcessedEvent(eventId: string): boolean {
    return this.processedEvents?.includes(eventId) || false;
  }
}

Payment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'order_id',
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
      defaultValue: 'pending',
      allowNull: false,
    },
    method: {
      type: DataTypes.ENUM('card', 'wallet'),
      defaultValue: 'card',
      allowNull: false,
    },
    transactionRef: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'transaction_ref',
    },
    correlationId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'correlation_id',
    },
    processedEvents: {
      type: DataTypes.JSONB,
      defaultValue: [],
      field: 'processed_events',
    },
  },
  {
    sequelize,
    tableName: 'payments',
    underscored: true,
  }
);
