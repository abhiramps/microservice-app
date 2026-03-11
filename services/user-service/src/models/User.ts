import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import bcrypt from 'bcrypt';

export interface UserAttributes {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: 'customer' | 'admin';
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'role' | 'createdAt' | 'updatedAt'> {}

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string;
  public email!: string;
  public passwordHash!: string;
  public name!: string;
  public role!: 'customer' | 'admin';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public async comparePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.passwordHash);
  }

  public toSafeJSON() {
    const { passwordHash, ...safeUser } = this.toJSON();
    return safeUser;
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'password_hash',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('customer', 'admin'),
      defaultValue: 'customer',
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'users',
    underscored: true,
    hooks: {
      beforeCreate: async (user: User) => {
        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(user.passwordHash, salt);
      },
    },
  }
);
