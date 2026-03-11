import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface OrderAttributes {
  id: string;
  userId: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'shipped' | 'delivered';
  totalAmount: number;
  correlationId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface OrderCreationAttributes extends Optional<OrderAttributes, 'id' | 'status' | 'createdAt' | 'updatedAt'> {}

export class Order extends Model<OrderAttributes, OrderCreationAttributes> implements OrderAttributes {
  public id!: string;
  public userId!: string;
  public status!: 'pending' | 'confirmed' | 'cancelled' | 'shipped' | 'delivered';
  public totalAmount!: number;
  public correlationId!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Order.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'cancelled', 'shipped', 'delivered'),
      defaultValue: 'pending',
      allowNull: false,
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'total_amount',
    },
    correlationId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'correlation_id',
    },
  },
  {
    sequelize,
    tableName: 'orders',
    underscored: true,
  }
);
