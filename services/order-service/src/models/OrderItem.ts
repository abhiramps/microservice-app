import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { Order } from './Order';

export interface OrderItemAttributes {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  priceAtPurchase: number;
  quantity: number;
  createdAt?: Date;
}

interface OrderItemCreationAttributes extends Optional<OrderItemAttributes, 'id' | 'createdAt'> {}

export class OrderItem extends Model<OrderItemAttributes, OrderItemCreationAttributes> implements OrderItemAttributes {
  public id!: string;
  public orderId!: string;
  public productId!: string;
  public productName!: string;
  public priceAtPurchase!: number;
  public quantity!: number;
  public readonly createdAt!: Date;
}

OrderItem.init(
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
      references: { model: 'orders', key: 'id' },
    },
    productId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'product_id',
    },
    productName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'product_name',
    },
    priceAtPurchase: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'price_at_purchase',
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1 },
    },
  },
  {
    sequelize,
    tableName: 'order_items',
    underscored: true,
    updatedAt: false,
  }
);

// Associations
Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
