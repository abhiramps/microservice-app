# E-Commerce Microservices Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an educational e-commerce microservices platform with event-driven architecture covering all senior backend interview concepts.

**Architecture:** 5 microservices (API Gateway, User, Product, Order, Payment) communicating via REST (sync) and RabbitMQ (async). Each service has its own database (PostgreSQL or MongoDB). Docker Compose orchestrates everything.

**Tech Stack:** Node.js, TypeScript, Express, Sequelize, Mongoose, RabbitMQ (amqplib), Redis (ioredis), JWT, Docker

---

## Task 1: Project Scaffolding & Root Configuration

**Files:**
- Create: `package.json` (root workspace)
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `docker-compose.yml`

**Step 1: Initialize git and root package.json**

```bash
cd /root/projects/others/others/microservice-app
git init
```

Create `package.json`:
```json
{
  "name": "ecommerce-microservices",
  "version": "1.0.0",
  "private": true,
  "description": "Educational e-commerce microservices platform",
  "scripts": {
    "docker:up": "docker-compose up --build",
    "docker:down": "docker-compose down -v"
  }
}
```

**Step 2: Create base TypeScript config**

Create `tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

**Step 3: Create .gitignore**

```
node_modules/
dist/
.env
*.log
coverage/
```

**Step 4: Create docker-compose.yml**

```yaml
version: '3.8'

services:
  # Infrastructure
  postgres-user:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: user_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_user_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  postgres-order:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: order_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5433:5432"
    volumes:
      - postgres_order_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  postgres-payment:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: payment_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5434:5432"
    volumes:
      - postgres_payment_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 5s
      timeout: 5s
      retries: 5

  rabbitmq:
    image: rabbitmq:3-management-alpine
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "check_running"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Application Services
  api-gateway:
    build:
      context: ./services/api-gateway
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - NODE_ENV=development
      - JWT_SECRET=your-super-secret-jwt-key-change-in-production
      - REDIS_URL=redis://redis:6379
      - USER_SERVICE_URL=http://user-service:3001
      - PRODUCT_SERVICE_URL=http://product-service:3002
      - ORDER_SERVICE_URL=http://order-service:3003
      - PAYMENT_SERVICE_URL=http://payment-service:3004
    depends_on:
      redis:
        condition: service_healthy
      user-service:
        condition: service_started
      product-service:
        condition: service_started
      order-service:
        condition: service_started
      payment-service:
        condition: service_started

  user-service:
    build:
      context: ./services/user-service
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
      - NODE_ENV=development
      - DB_HOST=postgres-user
      - DB_PORT=5432
      - DB_NAME=user_db
      - DB_USER=postgres
      - DB_PASSWORD=postgres
      - JWT_SECRET=your-super-secret-jwt-key-change-in-production
      - RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
    depends_on:
      postgres-user:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy

  product-service:
    build:
      context: ./services/product-service
      dockerfile: Dockerfile
    ports:
      - "3002:3002"
    environment:
      - PORT=3002
      - NODE_ENV=development
      - MONGODB_URI=mongodb://mongodb:27017/product_db
      - RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
    depends_on:
      mongodb:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy

  order-service:
    build:
      context: ./services/order-service
      dockerfile: Dockerfile
    ports:
      - "3003:3003"
    environment:
      - PORT=3003
      - NODE_ENV=development
      - DB_HOST=postgres-order
      - DB_PORT=5432
      - DB_NAME=order_db
      - DB_USER=postgres
      - DB_PASSWORD=postgres
      - RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
    depends_on:
      postgres-order:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy

  payment-service:
    build:
      context: ./services/payment-service
      dockerfile: Dockerfile
    ports:
      - "3004:3004"
    environment:
      - PORT=3004
      - NODE_ENV=development
      - DB_HOST=postgres-payment
      - DB_PORT=5432
      - DB_NAME=payment_db
      - DB_USER=postgres
      - DB_PASSWORD=postgres
      - RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
    depends_on:
      postgres-payment:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy

volumes:
  postgres_user_data:
  postgres_order_data:
  postgres_payment_data:
  mongo_data:
  rabbitmq_data:
  redis_data:
```

**Step 5: Commit**

```bash
git add package.json tsconfig.base.json .gitignore docker-compose.yml
git commit -m "chore: scaffold root project with docker-compose infrastructure"
```

---

## Task 2: Shared Types Package

**Files:**
- Create: `shared/package.json`
- Create: `shared/tsconfig.json`
- Create: `shared/src/events/index.ts`
- Create: `shared/src/events/event-envelope.ts`
- Create: `shared/src/events/order-events.ts`
- Create: `shared/src/events/payment-events.ts`
- Create: `shared/src/dto/index.ts`
- Create: `shared/src/dto/api-response.ts`
- Create: `shared/src/index.ts`

**Step 1: Create shared package.json and tsconfig**

`shared/package.json`:
```json
{
  "name": "@ecommerce/shared",
  "version": "1.0.0",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}
```

`shared/tsconfig.json`:
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

**Step 2: Create event envelope types**

`shared/src/events/event-envelope.ts`:
```typescript
export interface EventEnvelope<T = unknown> {
  eventId: string;
  type: string;
  timestamp: string;
  correlationId: string;
  payload: T;
}

export function createEventEnvelope<T>(
  type: string,
  payload: T,
  correlationId: string
): EventEnvelope<T> {
  return {
    eventId: crypto.randomUUID(),
    type,
    timestamp: new Date().toISOString(),
    correlationId,
    payload,
  };
}
```

**Step 3: Create order event types**

`shared/src/events/order-events.ts`:
```typescript
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
```

**Step 4: Create payment event types**

`shared/src/events/payment-events.ts`:
```typescript
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
```

**Step 5: Create shared DTO types**

`shared/src/dto/api-response.ts`:
```typescript
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

**Step 6: Create barrel exports**

`shared/src/events/index.ts`:
```typescript
export * from './event-envelope';
export * from './order-events';
export * from './payment-events';
```

`shared/src/dto/index.ts`:
```typescript
export * from './api-response';
```

`shared/src/index.ts`:
```typescript
export * from './events';
export * from './dto';
```

**Step 7: Build and commit**

```bash
cd shared && npm install && npm run build && cd ..
git add shared/
git commit -m "feat: add shared types package with event envelopes and DTOs"
```

---

## Task 3: User Service — Setup, Model & Config

**Files:**
- Create: `services/user-service/package.json`
- Create: `services/user-service/tsconfig.json`
- Create: `services/user-service/.env.example`
- Create: `services/user-service/Dockerfile`
- Create: `services/user-service/src/config/database.ts`
- Create: `services/user-service/src/config/index.ts`
- Create: `services/user-service/src/models/User.ts`
- Create: `services/user-service/src/utils/logger.ts`
- Create: `services/user-service/src/index.ts`

**Step 1: Create package.json with dependencies**

`services/user-service/package.json`:
```json
{
  "name": "@ecommerce/user-service",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "test": "jest --passWithNoTests",
    "migrate": "sequelize-cli db:migrate",
    "migrate:undo": "sequelize-cli db:migrate:undo"
  },
  "dependencies": {
    "express": "^4.18.2",
    "sequelize": "^6.35.0",
    "pg": "^8.11.3",
    "pg-hstore": "^2.3.4",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "joi": "^17.11.0",
    "amqplib": "^0.10.3",
    "winston": "^3.11.0",
    "cors": "^2.8.5",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/bcrypt": "^5.0.2",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/amqplib": "^0.10.4",
    "@types/cors": "^2.8.17",
    "@types/uuid": "^9.0.7",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "ts-node-dev": "^2.0.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "@types/jest": "^29.5.11",
    "supertest": "^6.3.3",
    "@types/supertest": "^6.0.2"
  }
}
```

**Step 2: Create tsconfig.json**

`services/user-service/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

**Step 3: Create .env.example**

`services/user-service/.env.example`:
```
PORT=3001
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=user_db
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h
RABBITMQ_URL=amqp://guest:guest@localhost:5672
```

**Step 4: Create Dockerfile**

`services/user-service/Dockerfile`:
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["node", "dist/index.js"]
```

**Step 5: Create config files**

`services/user-service/src/config/index.ts`:
```typescript
export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'user_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
  },
};
```

`services/user-service/src/config/database.ts`:
```typescript
import { Sequelize } from 'sequelize';
import { config } from './index';
import { logger } from '../utils/logger';

export const sequelize = new Sequelize(
  config.db.name,
  config.db.user,
  config.db.password,
  {
    host: config.db.host,
    port: config.db.port,
    dialect: 'postgres',
    logging: (msg) => logger.debug(msg),
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

export async function connectDatabase(): Promise<void> {
  try {
    await sequelize.authenticate();
    logger.info('Database connected successfully');
    await sequelize.sync({ alter: config.nodeEnv === 'development' });
    logger.info('Database synced');
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
}
```

**Step 6: Create logger utility**

`services/user-service/src/utils/logger.ts`:
```typescript
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'user-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} [${service}] ${level}: ${message}${metaStr}`;
        })
      ),
    }),
  ],
});
```

**Step 7: Create User model**

`services/user-service/src/models/User.ts`:
```typescript
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
```

**Step 8: Create minimal index.ts entry point**

`services/user-service/src/index.ts`:
```typescript
import express from 'express';
import cors from 'cors';
import { config } from './config';
import { connectDatabase } from './config/database';
import { logger } from './utils/logger';

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'user-service' });
});

async function start(): Promise<void> {
  try {
    await connectDatabase();

    app.listen(config.port, () => {
      logger.info(`User service running on port ${config.port}`);
    });
  } catch (error) {
    logger.error('Failed to start user service:', error);
    process.exit(1);
  }
}

start();

export { app };
```

**Step 9: Install dependencies and commit**

```bash
cd services/user-service && npm install && cd ../..
git add services/user-service/
git commit -m "feat: scaffold user service with Sequelize model and config"
```

---

## Task 4: User Service — Auth Controller & Routes

**Files:**
- Create: `services/user-service/src/services/auth.service.ts`
- Create: `services/user-service/src/controllers/auth.controller.ts`
- Create: `services/user-service/src/controllers/user.controller.ts`
- Create: `services/user-service/src/middleware/validation.ts`
- Create: `services/user-service/src/routes/auth.routes.ts`
- Create: `services/user-service/src/routes/user.routes.ts`
- Modify: `services/user-service/src/index.ts`

**Step 1: Create auth service (business logic)**

`services/user-service/src/services/auth.service.ts`:
```typescript
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { config } from '../config';
import { logger } from '../utils/logger';

interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface AuthResponse {
  user: Record<string, unknown>;
  token: string;
}

export class AuthService {
  async register(input: RegisterInput): Promise<AuthResponse> {
    const existingUser = await User.findOne({ where: { email: input.email } });
    if (existingUser) {
      throw new Error('Email already registered');
    }

    const user = await User.create({
      email: input.email,
      passwordHash: input.password, // bcrypt hook handles hashing
      name: input.name,
    });

    const token = this.generateToken(user);
    logger.info(`User registered: ${user.id}`);

    return { user: user.toSafeJSON(), token };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await User.findOne({ where: { email: input.email } });
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isValidPassword = await user.comparePassword(input.password);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    const token = this.generateToken(user);
    logger.info(`User logged in: ${user.id}`);

    return { user: user.toSafeJSON(), token };
  }

  private generateToken(user: User): string {
    return jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn as string }
    );
  }
}
```

**Step 2: Create validation middleware**

`services/user-service/src/middleware/validation.ts`:
```typescript
import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().min(2).max(100).required(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export function validate(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const errors = error.details.map((d) => d.message);
      res.status(400).json({ success: false, error: 'Validation failed', details: errors });
      return;
    }
    next();
  };
}
```

**Step 3: Create auth controller**

`services/user-service/src/controllers/auth.controller.ts`:
```typescript
import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { logger } from '../utils/logger';

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.register(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      logger.error('Registration failed:', error);
      if (error.message === 'Email already registered') {
        res.status(409).json({ success: false, error: error.message });
        return;
      }
      res.status(500).json({ success: false, error: 'Registration failed' });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.login(req.body);
      res.json({ success: true, data: result });
    } catch (error: any) {
      logger.error('Login failed:', error);
      if (error.message === 'Invalid email or password') {
        res.status(401).json({ success: false, error: error.message });
        return;
      }
      res.status(500).json({ success: false, error: 'Login failed' });
    }
  }
}
```

**Step 4: Create user controller**

`services/user-service/src/controllers/user.controller.ts`:
```typescript
import { Request, Response } from 'express';
import { User } from '../models/User';
import { logger } from '../utils/logger';

export class UserController {
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.headers['x-user-id'] as string;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const user = await User.findByPk(userId);
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      res.json({ success: true, data: user.toSafeJSON() });
    } catch (error) {
      logger.error('Get profile failed:', error);
      res.status(500).json({ success: false, error: 'Failed to get profile' });
    }
  }
}
```

**Step 5: Create routes**

`services/user-service/src/routes/auth.routes.ts`:
```typescript
import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate, registerSchema, loginSchema } from '../middleware/validation';

const router = Router();
const authController = new AuthController();

router.post('/register', validate(registerSchema), (req, res) => authController.register(req, res));
router.post('/login', validate(loginSchema), (req, res) => authController.login(req, res));

export { router as authRoutes };
```

`services/user-service/src/routes/user.routes.ts`:
```typescript
import { Router } from 'express';
import { UserController } from '../controllers/user.controller';

const router = Router();
const userController = new UserController();

router.get('/profile', (req, res) => userController.getProfile(req, res));

export { router as userRoutes };
```

**Step 6: Update index.ts to register routes**

Update `services/user-service/src/index.ts` — add after `app.use(express.json())`:
```typescript
import { authRoutes } from './routes/auth.routes';
import { userRoutes } from './routes/user.routes';

// ... existing middleware ...

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
```

**Step 7: Commit**

```bash
git add services/user-service/src/
git commit -m "feat: add user service auth controller, routes, and validation"
```

---

## Task 5: RabbitMQ Event Infrastructure

**Files:**
- Create: `services/user-service/src/events/rabbitmq.ts`
- Create: `services/user-service/src/events/publisher.ts`

This pattern will be reused across all services.

**Step 1: Create RabbitMQ connection manager**

`services/user-service/src/events/rabbitmq.ts`:
```typescript
import amqp, { Connection, Channel } from 'amqplib';
import { config } from '../config';
import { logger } from '../utils/logger';

class RabbitMQConnection {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private retryCount = 0;
  private maxRetries = 5;

  async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(config.rabbitmq.url);
      this.channel = await this.connection.createChannel();

      // Setup exchange — topic exchange allows flexible routing
      await this.channel.assertExchange('ecommerce.events', 'topic', { durable: true });

      // Dead letter exchange for failed messages
      await this.channel.assertExchange('ecommerce.dlx', 'topic', { durable: true });

      this.retryCount = 0;
      logger.info('RabbitMQ connected');

      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed, attempting reconnect...');
        setTimeout(() => this.connect(), 5000);
      });

      this.connection.on('error', (err) => {
        logger.error('RabbitMQ connection error:', err);
      });
    } catch (error) {
      this.retryCount++;
      if (this.retryCount <= this.maxRetries) {
        logger.warn(`RabbitMQ connection attempt ${this.retryCount}/${this.maxRetries} failed, retrying in 5s...`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return this.connect();
      }
      logger.error('RabbitMQ connection failed after max retries:', error);
      throw error;
    }
  }

  getChannel(): Channel {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }
    return this.channel;
  }

  async close(): Promise<void> {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
    logger.info('RabbitMQ connection closed');
  }
}

export const rabbitmq = new RabbitMQConnection();
```

**Step 2: Create event publisher**

`services/user-service/src/events/publisher.ts`:
```typescript
import { rabbitmq } from './rabbitmq';
import { logger } from '../utils/logger';

export class EventPublisher {
  async publish(routingKey: string, event: Record<string, unknown>): Promise<void> {
    try {
      const channel = rabbitmq.getChannel();
      const message = Buffer.from(JSON.stringify(event));

      channel.publish('ecommerce.events', routingKey, message, {
        persistent: true,
        contentType: 'application/json',
        messageId: event.eventId as string,
        timestamp: Date.now(),
      });

      logger.info(`Event published: ${routingKey}`, { eventId: event.eventId, correlationId: event.correlationId });
    } catch (error) {
      logger.error(`Failed to publish event: ${routingKey}`, error);
      throw error;
    }
  }
}

export const eventPublisher = new EventPublisher();
```

**Step 3: Update index.ts to connect RabbitMQ on startup**

Add to `services/user-service/src/index.ts` start function:
```typescript
import { rabbitmq } from './events/rabbitmq';

// Inside start() function, after connectDatabase():
await rabbitmq.connect();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await rabbitmq.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await rabbitmq.close();
  process.exit(0);
});
```

**Step 4: Commit**

```bash
git add services/user-service/src/events/
git commit -m "feat: add RabbitMQ connection manager and event publisher"
```

---

## Task 6: Product Service (MongoDB + Mongoose)

**Files:**
- Create: `services/product-service/package.json`
- Create: `services/product-service/tsconfig.json`
- Create: `services/product-service/.env.example`
- Create: `services/product-service/Dockerfile`
- Create: `services/product-service/src/config/index.ts`
- Create: `services/product-service/src/config/database.ts`
- Create: `services/product-service/src/models/Product.ts`
- Create: `services/product-service/src/services/product.service.ts`
- Create: `services/product-service/src/controllers/product.controller.ts`
- Create: `services/product-service/src/middleware/validation.ts`
- Create: `services/product-service/src/routes/product.routes.ts`
- Create: `services/product-service/src/utils/logger.ts`
- Create: `services/product-service/src/index.ts`

**Step 1: Create package.json**

`services/product-service/package.json`:
```json
{
  "name": "@ecommerce/product-service",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "test": "jest --passWithNoTests"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^8.0.0",
    "joi": "^17.11.0",
    "amqplib": "^0.10.3",
    "winston": "^3.11.0",
    "cors": "^2.8.5",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/amqplib": "^0.10.4",
    "@types/cors": "^2.8.17",
    "@types/uuid": "^9.0.7",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "ts-node-dev": "^2.0.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "@types/jest": "^29.5.11"
  }
}
```

**Step 2: Create tsconfig.json, .env.example, Dockerfile**

`services/product-service/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

`services/product-service/.env.example`:
```
PORT=3002
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/product_db
RABBITMQ_URL=amqp://guest:guest@localhost:5672
```

`services/product-service/Dockerfile`:
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3002

CMD ["node", "dist/index.js"]
```

**Step 3: Create config**

`services/product-service/src/config/index.ts`:
```typescript
export const config = {
  port: parseInt(process.env.PORT || '3002', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/product_db',
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
  },
};
```

`services/product-service/src/config/database.ts`:
```typescript
import mongoose from 'mongoose';
import { config } from './index';
import { logger } from '../utils/logger';

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(config.mongodb.uri);
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    throw error;
  }
}
```

**Step 4: Create logger**

`services/product-service/src/utils/logger.ts`:
```typescript
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'product-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} [${service}] ${level}: ${message}${metaStr}`;
        })
      ),
    }),
  ],
});
```

**Step 5: Create Product model (Mongoose)**

`services/product-service/src/models/Product.ts`:
```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  description: string;
  price: number;
  category: string;
  attributes: Record<string, unknown>;
  stockQuantity: number;
  status: 'active' | 'discontinued';
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, index: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, index: true },
    attributes: { type: Schema.Types.Mixed, default: {} },
    stockQuantity: { type: Number, required: true, default: 0, min: 0 },
    status: { type: String, enum: ['active', 'discontinued'], default: 'active' },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Text index for search
productSchema.index({ name: 'text', description: 'text' });

export const Product = mongoose.model<IProduct>('Product', productSchema);
```

**Step 6: Create product service**

`services/product-service/src/services/product.service.ts`:
```typescript
import { Product, IProduct } from '../models/Product';
import { logger } from '../utils/logger';

interface CreateProductInput {
  name: string;
  description: string;
  price: number;
  category: string;
  attributes?: Record<string, unknown>;
  stockQuantity: number;
}

interface ProductQuery {
  category?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class ProductService {
  async create(input: CreateProductInput): Promise<IProduct> {
    const product = await Product.create(input);
    logger.info(`Product created: ${product.id}`);
    return product;
  }

  async findById(id: string): Promise<IProduct | null> {
    return Product.findById(id);
  }

  async findAll(query: ProductQuery) {
    const { category, status, search, page = 1, limit = 20 } = query;
    const filter: Record<string, unknown> = {};

    if (category) filter.category = category;
    if (status) filter.status = status;
    if (search) filter.$text = { $search: search };

    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async update(id: string, input: Partial<CreateProductInput>): Promise<IProduct | null> {
    const product = await Product.findByIdAndUpdate(id, input, { new: true, runValidators: true });
    if (product) {
      logger.info(`Product updated: ${id}`);
    }
    return product;
  }

  async delete(id: string): Promise<boolean> {
    const result = await Product.findByIdAndDelete(id);
    if (result) {
      logger.info(`Product deleted: ${id}`);
    }
    return !!result;
  }
}
```

**Step 7: Create validation and controller**

`services/product-service/src/middleware/validation.ts`:
```typescript
import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

export const createProductSchema = Joi.object({
  name: Joi.string().min(2).max(200).required(),
  description: Joi.string().min(10).max(2000).required(),
  price: Joi.number().positive().required(),
  category: Joi.string().required(),
  attributes: Joi.object().optional(),
  stockQuantity: Joi.number().integer().min(0).required(),
});

export const updateProductSchema = Joi.object({
  name: Joi.string().min(2).max(200),
  description: Joi.string().min(10).max(2000),
  price: Joi.number().positive(),
  category: Joi.string(),
  attributes: Joi.object(),
  stockQuantity: Joi.number().integer().min(0),
  status: Joi.string().valid('active', 'discontinued'),
}).min(1);

export function validate(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const errors = error.details.map((d) => d.message);
      res.status(400).json({ success: false, error: 'Validation failed', details: errors });
      return;
    }
    next();
  };
}
```

`services/product-service/src/controllers/product.controller.ts`:
```typescript
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
```

**Step 8: Create routes**

`services/product-service/src/routes/product.routes.ts`:
```typescript
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
```

**Step 9: Create index.ts**

`services/product-service/src/index.ts`:
```typescript
import express from 'express';
import cors from 'cors';
import { config } from './config';
import { connectDatabase } from './config/database';
import { productRoutes } from './routes/product.routes';
import { logger } from './utils/logger';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'product-service' });
});

app.use('/api/products', productRoutes);

async function start(): Promise<void> {
  try {
    await connectDatabase();

    app.listen(config.port, () => {
      logger.info(`Product service running on port ${config.port}`);
    });
  } catch (error) {
    logger.error('Failed to start product service:', error);
    process.exit(1);
  }
}

start();

export { app };
```

**Step 10: Install and commit**

```bash
cd services/product-service && npm install && cd ../..
git add services/product-service/
git commit -m "feat: add product service with MongoDB, Mongoose, CRUD operations"
```

---

## Task 7: Order Service with Event Publishing (Saga Initiator)

**Files:**
- Create: `services/order-service/package.json`
- Create: `services/order-service/tsconfig.json`
- Create: `services/order-service/.env.example`
- Create: `services/order-service/Dockerfile`
- Create: `services/order-service/src/config/index.ts`
- Create: `services/order-service/src/config/database.ts`
- Create: `services/order-service/src/models/Order.ts`
- Create: `services/order-service/src/models/OrderItem.ts`
- Create: `services/order-service/src/services/order.service.ts`
- Create: `services/order-service/src/controllers/order.controller.ts`
- Create: `services/order-service/src/middleware/validation.ts`
- Create: `services/order-service/src/routes/order.routes.ts`
- Create: `services/order-service/src/events/rabbitmq.ts`
- Create: `services/order-service/src/events/publisher.ts`
- Create: `services/order-service/src/events/consumer.ts`
- Create: `services/order-service/src/utils/logger.ts`
- Create: `services/order-service/src/index.ts`

**Step 1: Create package.json**

`services/order-service/package.json`:
```json
{
  "name": "@ecommerce/order-service",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "test": "jest --passWithNoTests"
  },
  "dependencies": {
    "express": "^4.18.2",
    "sequelize": "^6.35.0",
    "pg": "^8.11.3",
    "pg-hstore": "^2.3.4",
    "joi": "^17.11.0",
    "amqplib": "^0.10.3",
    "winston": "^3.11.0",
    "cors": "^2.8.5",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/amqplib": "^0.10.4",
    "@types/cors": "^2.8.17",
    "@types/uuid": "^9.0.7",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "ts-node-dev": "^2.0.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "@types/jest": "^29.5.11"
  }
}
```

**Step 2: Create tsconfig, .env.example, Dockerfile**

`services/order-service/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

`services/order-service/.env.example`:
```
PORT=3003
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5433
DB_NAME=order_db
DB_USER=postgres
DB_PASSWORD=postgres
RABBITMQ_URL=amqp://guest:guest@localhost:5672
```

`services/order-service/Dockerfile`:
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3003

CMD ["node", "dist/index.js"]
```

**Step 3: Create config, database, logger**

`services/order-service/src/config/index.ts`:
```typescript
export const config = {
  port: parseInt(process.env.PORT || '3003', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    name: process.env.DB_NAME || 'order_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
  },
};
```

`services/order-service/src/config/database.ts`:
```typescript
import { Sequelize } from 'sequelize';
import { config } from './index';
import { logger } from '../utils/logger';

export const sequelize = new Sequelize(
  config.db.name,
  config.db.user,
  config.db.password,
  {
    host: config.db.host,
    port: config.db.port,
    dialect: 'postgres',
    logging: (msg) => logger.debug(msg),
  }
);

export async function connectDatabase(): Promise<void> {
  try {
    await sequelize.authenticate();
    logger.info('Database connected successfully');
    await sequelize.sync({ alter: config.nodeEnv === 'development' });
    logger.info('Database synced');
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
}
```

`services/order-service/src/utils/logger.ts`:
```typescript
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'order-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} [${service}] ${level}: ${message}${metaStr}`;
        })
      ),
    }),
  ],
});
```

**Step 4: Create Order and OrderItem models**

`services/order-service/src/models/Order.ts`:
```typescript
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
```

`services/order-service/src/models/OrderItem.ts`:
```typescript
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
```

**Step 5: Create RabbitMQ connection, publisher, and consumer**

`services/order-service/src/events/rabbitmq.ts`:
```typescript
import amqp, { Connection, Channel } from 'amqplib';
import { config } from '../config';
import { logger } from '../utils/logger';

class RabbitMQConnection {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private retryCount = 0;
  private maxRetries = 5;

  async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(config.rabbitmq.url);
      this.channel = await this.connection.createChannel();

      await this.channel.assertExchange('ecommerce.events', 'topic', { durable: true });
      await this.channel.assertExchange('ecommerce.dlx', 'topic', { durable: true });

      this.retryCount = 0;
      logger.info('RabbitMQ connected');

      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed, attempting reconnect...');
        setTimeout(() => this.connect(), 5000);
      });
    } catch (error) {
      this.retryCount++;
      if (this.retryCount <= this.maxRetries) {
        logger.warn(`RabbitMQ retry ${this.retryCount}/${this.maxRetries}...`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return this.connect();
      }
      throw error;
    }
  }

  getChannel(): Channel {
    if (!this.channel) throw new Error('RabbitMQ channel not initialized');
    return this.channel;
  }

  async close(): Promise<void> {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
  }
}

export const rabbitmq = new RabbitMQConnection();
```

`services/order-service/src/events/publisher.ts`:
```typescript
import { rabbitmq } from './rabbitmq';
import { logger } from '../utils/logger';

export class EventPublisher {
  async publish(routingKey: string, event: Record<string, unknown>): Promise<void> {
    const channel = rabbitmq.getChannel();
    const message = Buffer.from(JSON.stringify(event));

    channel.publish('ecommerce.events', routingKey, message, {
      persistent: true,
      contentType: 'application/json',
      messageId: event.eventId as string,
    });

    logger.info(`Event published: ${routingKey}`, { eventId: event.eventId, correlationId: event.correlationId });
  }
}

export const eventPublisher = new EventPublisher();
```

`services/order-service/src/events/consumer.ts` — listens for payment events:
```typescript
import { rabbitmq } from './rabbitmq';
import { Order } from '../models/Order';
import { logger } from '../utils/logger';
import { eventPublisher } from './publisher';
import { v4 as uuidv4 } from 'uuid';

// Track processed events for idempotency
const processedEvents = new Set<string>();

export async function startConsumers(): Promise<void> {
  const channel = rabbitmq.getChannel();

  // Queue for payment events with dead letter exchange
  const queueName = 'order-service.payment-events';
  await channel.assertQueue(queueName, {
    durable: true,
    deadLetterExchange: 'ecommerce.dlx',
    deadLetterRoutingKey: 'order-service.payment-events.dlq',
  });

  // Dead letter queue
  const dlqName = 'order-service.payment-events.dlq';
  await channel.assertQueue(dlqName, { durable: true });
  await channel.bindQueue(dlqName, 'ecommerce.dlx', 'order-service.payment-events.dlq');

  // Bind to payment events
  await channel.bindQueue(queueName, 'ecommerce.events', 'payment.completed');
  await channel.bindQueue(queueName, 'ecommerce.events', 'payment.failed');

  // Prefetch 1 message at a time for fair dispatch
  await channel.prefetch(1);

  channel.consume(queueName, async (msg) => {
    if (!msg) return;

    try {
      const event = JSON.parse(msg.content.toString());

      // Idempotency check
      if (processedEvents.has(event.eventId)) {
        logger.info(`Duplicate event skipped: ${event.eventId}`);
        channel.ack(msg);
        return;
      }

      logger.info(`Processing event: ${event.type}`, { eventId: event.eventId, correlationId: event.correlationId });

      if (event.type === 'payment.completed') {
        await handlePaymentCompleted(event);
      } else if (event.type === 'payment.failed') {
        await handlePaymentFailed(event);
      }

      processedEvents.add(event.eventId);
      channel.ack(msg);
    } catch (error) {
      logger.error('Failed to process message:', error);
      // Negative acknowledge — sends to DLQ
      channel.nack(msg, false, false);
    }
  });

  logger.info(`Consuming from queue: ${queueName}`);
}

async function handlePaymentCompleted(event: Record<string, any>): Promise<void> {
  const { orderId } = event.payload;
  const order = await Order.findByPk(orderId);

  if (!order || order.status !== 'pending') {
    logger.warn(`Order ${orderId} not found or not in pending status`);
    return;
  }

  await order.update({ status: 'confirmed' });
  logger.info(`Order ${orderId} confirmed`);

  // Publish order.confirmed event
  await eventPublisher.publish('order.confirmed', {
    eventId: uuidv4(),
    type: 'order.confirmed',
    timestamp: new Date().toISOString(),
    correlationId: event.correlationId,
    payload: {
      orderId: order.id,
      userId: order.userId,
      totalAmount: order.totalAmount,
    },
  });
}

async function handlePaymentFailed(event: Record<string, any>): Promise<void> {
  const { orderId, reason } = event.payload;
  const order = await Order.findByPk(orderId);

  if (!order || order.status !== 'pending') {
    logger.warn(`Order ${orderId} not found or not in pending status`);
    return;
  }

  // Compensating transaction — cancel the order
  await order.update({ status: 'cancelled' });
  logger.info(`Order ${orderId} cancelled due to payment failure: ${reason}`);

  // Publish order.cancelled event
  await eventPublisher.publish('order.cancelled', {
    eventId: uuidv4(),
    type: 'order.cancelled',
    timestamp: new Date().toISOString(),
    correlationId: event.correlationId,
    payload: {
      orderId: order.id,
      userId: order.userId,
      reason: `Payment failed: ${reason}`,
    },
  });
}
```

**Step 6: Create order service (business logic)**

`services/order-service/src/services/order.service.ts`:
```typescript
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
```

**Step 7: Create controller, validation, routes**

`services/order-service/src/middleware/validation.ts`:
```typescript
import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

export const createOrderSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().required(),
        productName: Joi.string().required(),
        price: Joi.number().positive().required(),
        quantity: Joi.number().integer().min(1).required(),
      })
    )
    .min(1)
    .required(),
});

export function validate(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const errors = error.details.map((d) => d.message);
      res.status(400).json({ success: false, error: 'Validation failed', details: errors });
      return;
    }
    next();
  };
}
```

`services/order-service/src/controllers/order.controller.ts`:
```typescript
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
```

`services/order-service/src/routes/order.routes.ts`:
```typescript
import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { validate, createOrderSchema } from '../middleware/validation';

const router = Router();
const orderController = new OrderController();

router.post('/', validate(createOrderSchema), (req, res) => orderController.create(req, res));
router.get('/', (req, res) => orderController.findAll(req, res));
router.get('/:id', (req, res) => orderController.findById(req, res));

export { router as orderRoutes };
```

**Step 8: Create index.ts**

`services/order-service/src/index.ts`:
```typescript
import express from 'express';
import cors from 'cors';
import { config } from './config';
import { connectDatabase } from './config/database';
import { rabbitmq } from './events/rabbitmq';
import { startConsumers } from './events/consumer';
import { orderRoutes } from './routes/order.routes';
import { logger } from './utils/logger';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'order-service' });
});

app.use('/api/orders', orderRoutes);

async function start(): Promise<void> {
  try {
    await connectDatabase();
    await rabbitmq.connect();
    await startConsumers();

    app.listen(config.port, () => {
      logger.info(`Order service running on port ${config.port}`);
    });
  } catch (error) {
    logger.error('Failed to start order service:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  await rabbitmq.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down...');
  await rabbitmq.close();
  process.exit(0);
});

start();

export { app };
```

**Step 9: Install and commit**

```bash
cd services/order-service && npm install && cd ../..
git add services/order-service/
git commit -m "feat: add order service with saga choreography and event publishing"
```

---

## Task 8: Payment Service with Event Consuming & Publishing

**Files:**
- Create: `services/payment-service/package.json`
- Create: `services/payment-service/tsconfig.json`
- Create: `services/payment-service/.env.example`
- Create: `services/payment-service/Dockerfile`
- Create: `services/payment-service/src/config/index.ts`
- Create: `services/payment-service/src/config/database.ts`
- Create: `services/payment-service/src/models/Payment.ts`
- Create: `services/payment-service/src/services/payment.service.ts`
- Create: `services/payment-service/src/controllers/payment.controller.ts`
- Create: `services/payment-service/src/routes/payment.routes.ts`
- Create: `services/payment-service/src/events/rabbitmq.ts`
- Create: `services/payment-service/src/events/publisher.ts`
- Create: `services/payment-service/src/events/consumer.ts`
- Create: `services/payment-service/src/utils/logger.ts`
- Create: `services/payment-service/src/index.ts`

**Step 1: Create package.json**

`services/payment-service/package.json`:
```json
{
  "name": "@ecommerce/payment-service",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "test": "jest --passWithNoTests"
  },
  "dependencies": {
    "express": "^4.18.2",
    "sequelize": "^6.35.0",
    "pg": "^8.11.3",
    "pg-hstore": "^2.3.4",
    "amqplib": "^0.10.3",
    "winston": "^3.11.0",
    "cors": "^2.8.5",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/amqplib": "^0.10.4",
    "@types/cors": "^2.8.17",
    "@types/uuid": "^9.0.7",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "ts-node-dev": "^2.0.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "@types/jest": "^29.5.11"
  }
}
```

**Step 2: Create tsconfig, .env.example, Dockerfile**

`services/payment-service/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

`services/payment-service/.env.example`:
```
PORT=3004
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5434
DB_NAME=payment_db
DB_USER=postgres
DB_PASSWORD=postgres
RABBITMQ_URL=amqp://guest:guest@localhost:5672
```

`services/payment-service/Dockerfile`:
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3004

CMD ["node", "dist/index.js"]
```

**Step 3: Create config, database, logger**

`services/payment-service/src/config/index.ts`:
```typescript
export const config = {
  port: parseInt(process.env.PORT || '3004', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5434', 10),
    name: process.env.DB_NAME || 'payment_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
  },
};
```

`services/payment-service/src/config/database.ts`:
```typescript
import { Sequelize } from 'sequelize';
import { config } from './index';
import { logger } from '../utils/logger';

export const sequelize = new Sequelize(
  config.db.name,
  config.db.user,
  config.db.password,
  {
    host: config.db.host,
    port: config.db.port,
    dialect: 'postgres',
    logging: (msg) => logger.debug(msg),
  }
);

export async function connectDatabase(): Promise<void> {
  try {
    await sequelize.authenticate();
    logger.info('Database connected successfully');
    await sequelize.sync({ alter: config.nodeEnv === 'development' });
    logger.info('Database synced');
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
}
```

`services/payment-service/src/utils/logger.ts`:
```typescript
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'payment-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} [${service}] ${level}: ${message}${metaStr}`;
        })
      ),
    }),
  ],
});
```

**Step 4: Create Payment model**

`services/payment-service/src/models/Payment.ts`:
```typescript
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
```

**Step 5: Create payment service with simulated processing**

`services/payment-service/src/services/payment.service.ts`:
```typescript
import { v4 as uuidv4 } from 'uuid';
import { Payment } from '../models/Payment';
import { logger } from '../utils/logger';

export class PaymentService {
  /**
   * Simulate payment processing.
   * In production, this would integrate with Stripe/PayPal/etc.
   * Randomly fails 20% of the time for demonstration purposes.
   */
  async processPayment(orderId: string, amount: number, correlationId: string): Promise<Payment> {
    const payment = await Payment.create({
      orderId,
      amount,
      method: 'card',
      correlationId,
    });

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Simulate success/failure (80% success rate)
    const isSuccess = Math.random() > 0.2;

    if (isSuccess) {
      payment.status = 'completed';
      payment.transactionRef = `txn_${uuidv4().slice(0, 8)}`;
      await payment.save();
      logger.info(`Payment completed for order ${orderId}`, { transactionRef: payment.transactionRef });
    } else {
      payment.status = 'failed';
      await payment.save();
      logger.warn(`Payment failed for order ${orderId}`);
    }

    return payment;
  }

  async getPaymentByOrderId(orderId: string): Promise<Payment | null> {
    return Payment.findOne({ where: { orderId } });
  }
}
```

**Step 6: Create event consumer (listens for order.created)**

`services/payment-service/src/events/rabbitmq.ts`:
```typescript
import amqp, { Connection, Channel } from 'amqplib';
import { config } from '../config';
import { logger } from '../utils/logger';

class RabbitMQConnection {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private retryCount = 0;
  private maxRetries = 5;

  async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(config.rabbitmq.url);
      this.channel = await this.connection.createChannel();

      await this.channel.assertExchange('ecommerce.events', 'topic', { durable: true });
      await this.channel.assertExchange('ecommerce.dlx', 'topic', { durable: true });

      this.retryCount = 0;
      logger.info('RabbitMQ connected');

      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed, attempting reconnect...');
        setTimeout(() => this.connect(), 5000);
      });
    } catch (error) {
      this.retryCount++;
      if (this.retryCount <= this.maxRetries) {
        logger.warn(`RabbitMQ retry ${this.retryCount}/${this.maxRetries}...`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return this.connect();
      }
      throw error;
    }
  }

  getChannel(): Channel {
    if (!this.channel) throw new Error('RabbitMQ channel not initialized');
    return this.channel;
  }

  async close(): Promise<void> {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
  }
}

export const rabbitmq = new RabbitMQConnection();
```

`services/payment-service/src/events/publisher.ts`:
```typescript
import { rabbitmq } from './rabbitmq';
import { logger } from '../utils/logger';

export class EventPublisher {
  async publish(routingKey: string, event: Record<string, unknown>): Promise<void> {
    const channel = rabbitmq.getChannel();
    const message = Buffer.from(JSON.stringify(event));

    channel.publish('ecommerce.events', routingKey, message, {
      persistent: true,
      contentType: 'application/json',
      messageId: event.eventId as string,
    });

    logger.info(`Event published: ${routingKey}`, { eventId: event.eventId });
  }
}

export const eventPublisher = new EventPublisher();
```

`services/payment-service/src/events/consumer.ts`:
```typescript
import { v4 as uuidv4 } from 'uuid';
import { rabbitmq } from './rabbitmq';
import { PaymentService } from '../services/payment.service';
import { eventPublisher } from './publisher';
import { logger } from '../utils/logger';

const paymentService = new PaymentService();
const processedEvents = new Set<string>();

export async function startConsumers(): Promise<void> {
  const channel = rabbitmq.getChannel();

  const queueName = 'payment-service.order-events';
  await channel.assertQueue(queueName, {
    durable: true,
    deadLetterExchange: 'ecommerce.dlx',
    deadLetterRoutingKey: 'payment-service.order-events.dlq',
  });

  // Dead letter queue
  const dlqName = 'payment-service.order-events.dlq';
  await channel.assertQueue(dlqName, { durable: true });
  await channel.bindQueue(dlqName, 'ecommerce.dlx', 'payment-service.order-events.dlq');

  // Listen for order.created events
  await channel.bindQueue(queueName, 'ecommerce.events', 'order.created');

  await channel.prefetch(1);

  channel.consume(queueName, async (msg) => {
    if (!msg) return;

    try {
      const event = JSON.parse(msg.content.toString());

      // Idempotency check
      if (processedEvents.has(event.eventId)) {
        logger.info(`Duplicate event skipped: ${event.eventId}`);
        channel.ack(msg);
        return;
      }

      logger.info(`Processing event: ${event.type}`, { eventId: event.eventId, correlationId: event.correlationId });

      if (event.type === 'order.created') {
        await handleOrderCreated(event);
      }

      processedEvents.add(event.eventId);
      channel.ack(msg);
    } catch (error) {
      logger.error('Failed to process message:', error);
      channel.nack(msg, false, false);
    }
  });

  logger.info(`Consuming from queue: ${queueName}`);
}

async function handleOrderCreated(event: Record<string, any>): Promise<void> {
  const { orderId, totalAmount } = event.payload;

  const payment = await paymentService.processPayment(orderId, totalAmount, event.correlationId);

  if (payment.status === 'completed') {
    await eventPublisher.publish('payment.completed', {
      eventId: uuidv4(),
      type: 'payment.completed',
      timestamp: new Date().toISOString(),
      correlationId: event.correlationId,
      payload: {
        paymentId: payment.id,
        orderId: payment.orderId,
        amount: payment.amount,
        transactionRef: payment.transactionRef,
      },
    });
  } else {
    await eventPublisher.publish('payment.failed', {
      eventId: uuidv4(),
      type: 'payment.failed',
      timestamp: new Date().toISOString(),
      correlationId: event.correlationId,
      payload: {
        paymentId: payment.id,
        orderId: payment.orderId,
        amount: payment.amount,
        reason: 'Payment processing failed (simulated)',
      },
    });
  }
}
```

**Step 7: Create controller and routes**

`services/payment-service/src/controllers/payment.controller.ts`:
```typescript
import { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service';
import { logger } from '../utils/logger';

const paymentService = new PaymentService();

export class PaymentController {
  async getByOrderId(req: Request, res: Response): Promise<void> {
    try {
      const payment = await paymentService.getPaymentByOrderId(req.params.orderId);
      if (!payment) {
        res.status(404).json({ success: false, error: 'Payment not found' });
        return;
      }
      res.json({ success: true, data: payment });
    } catch (error) {
      logger.error('Fetch payment failed:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch payment' });
    }
  }
}
```

`services/payment-service/src/routes/payment.routes.ts`:
```typescript
import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';

const router = Router();
const paymentController = new PaymentController();

router.get('/:orderId', (req, res) => paymentController.getByOrderId(req, res));

export { router as paymentRoutes };
```

**Step 8: Create index.ts**

`services/payment-service/src/index.ts`:
```typescript
import express from 'express';
import cors from 'cors';
import { config } from './config';
import { connectDatabase } from './config/database';
import { rabbitmq } from './events/rabbitmq';
import { startConsumers } from './events/consumer';
import { paymentRoutes } from './routes/payment.routes';
import { logger } from './utils/logger';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'payment-service' });
});

app.use('/api/payments', paymentRoutes);

async function start(): Promise<void> {
  try {
    await connectDatabase();
    await rabbitmq.connect();
    await startConsumers();

    app.listen(config.port, () => {
      logger.info(`Payment service running on port ${config.port}`);
    });
  } catch (error) {
    logger.error('Failed to start payment service:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  await rabbitmq.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down...');
  await rabbitmq.close();
  process.exit(0);
});

start();

export { app };
```

**Step 9: Install and commit**

```bash
cd services/payment-service && npm install && cd ../..
git add services/payment-service/
git commit -m "feat: add payment service with event consuming, processing, and saga response"
```

---

## Task 9: API Gateway with JWT, Rate Limiting, Circuit Breaker

**Files:**
- Create: `services/api-gateway/package.json`
- Create: `services/api-gateway/tsconfig.json`
- Create: `services/api-gateway/.env.example`
- Create: `services/api-gateway/Dockerfile`
- Create: `services/api-gateway/src/config/index.ts`
- Create: `services/api-gateway/src/middleware/auth.ts`
- Create: `services/api-gateway/src/middleware/rate-limiter.ts`
- Create: `services/api-gateway/src/middleware/circuit-breaker.ts`
- Create: `services/api-gateway/src/middleware/correlation-id.ts`
- Create: `services/api-gateway/src/middleware/error-handler.ts`
- Create: `services/api-gateway/src/routes/proxy.ts`
- Create: `services/api-gateway/src/utils/logger.ts`
- Create: `services/api-gateway/src/index.ts`

**Step 1: Create package.json**

`services/api-gateway/package.json`:
```json
{
  "name": "@ecommerce/api-gateway",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "test": "jest --passWithNoTests"
  },
  "dependencies": {
    "express": "^4.18.2",
    "http-proxy-middleware": "^2.0.6",
    "jsonwebtoken": "^9.0.2",
    "ioredis": "^5.3.2",
    "opossum": "^8.1.3",
    "winston": "^3.11.0",
    "cors": "^2.8.5",
    "uuid": "^9.0.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/cors": "^2.8.17",
    "@types/uuid": "^9.0.7",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "ts-node-dev": "^2.0.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "@types/jest": "^29.5.11"
  }
}
```

**Step 2: Create tsconfig, .env.example, Dockerfile**

`services/api-gateway/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

`services/api-gateway/.env.example`:
```
PORT=3000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-in-production
REDIS_URL=redis://localhost:6379
USER_SERVICE_URL=http://localhost:3001
PRODUCT_SERVICE_URL=http://localhost:3002
ORDER_SERVICE_URL=http://localhost:3003
PAYMENT_SERVICE_URL=http://localhost:3004
```

`services/api-gateway/Dockerfile`:
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

**Step 3: Create config**

`services/api-gateway/src/config/index.ts`:
```typescript
export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  services: {
    user: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    product: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002',
    order: process.env.ORDER_SERVICE_URL || 'http://localhost:3003',
    payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3004',
  },
};
```

**Step 4: Create logger**

`services/api-gateway/src/utils/logger.ts`:
```typescript
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'api-gateway' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} [${service}] ${level}: ${message}${metaStr}`;
        })
      ),
    }),
  ],
});
```

**Step 5: Create correlation ID middleware**

`services/api-gateway/src/middleware/correlation-id.ts`:
```typescript
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export function correlationIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
  req.headers['x-correlation-id'] = correlationId;
  next();
}
```

**Step 6: Create auth middleware (JWT validation)**

`services/api-gateway/src/middleware/auth.ts`:
```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    // Forward user info to downstream services via headers
    req.headers['x-user-id'] = decoded.userId;
    req.headers['x-user-email'] = decoded.email;
    req.headers['x-user-role'] = decoded.role;

    next();
  } catch (error) {
    logger.warn('Invalid JWT token', { error: (error as Error).message });
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

export function authorizeAdmin(req: Request, res: Response, next: NextFunction): void {
  const role = req.headers['x-user-role'] as string;
  if (role !== 'admin') {
    res.status(403).json({ success: false, error: 'Admin access required' });
    return;
  }
  next();
}
```

**Step 7: Create rate limiter middleware (Redis sliding window)**

`services/api-gateway/src/middleware/rate-limiter.ts`:
```typescript
import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

const redis = new Redis(config.redis.url);

redis.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

interface RateLimitOptions {
  windowMs: number;  // Window size in milliseconds
  max: number;       // Max requests per window
}

export function rateLimiter(options: RateLimitOptions = { windowMs: 60000, max: 100 }) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = `rate-limit:${req.ip}`;
      const now = Date.now();
      const windowStart = now - options.windowMs;

      // Sliding window using Redis sorted set
      const pipeline = redis.pipeline();
      pipeline.zremrangebyscore(key, 0, windowStart);   // Remove old entries
      pipeline.zadd(key, now.toString(), `${now}:${Math.random()}`);  // Add current request
      pipeline.zcard(key);                               // Count requests in window
      pipeline.expire(key, Math.ceil(options.windowMs / 1000));  // Set expiry

      const results = await pipeline.exec();
      const requestCount = results?.[2]?.[1] as number;

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', options.max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, options.max - requestCount));

      if (requestCount > options.max) {
        logger.warn(`Rate limit exceeded for ${req.ip}`);
        res.status(429).json({
          success: false,
          error: 'Too many requests. Please try again later.',
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Rate limiter error:', error);
      // Fail open — allow request if Redis is down
      next();
    }
  };
}

export { redis };
```

**Step 8: Create circuit breaker middleware**

`services/api-gateway/src/middleware/circuit-breaker.ts`:
```typescript
import CircuitBreaker from 'opossum';
import axios, { AxiosRequestConfig } from 'axios';
import { logger } from '../utils/logger';

const circuitBreakerOptions = {
  timeout: 10000,           // 10 seconds timeout
  errorThresholdPercentage: 50,  // Open circuit if 50% of requests fail
  resetTimeout: 30000,      // Try again after 30 seconds
  volumeThreshold: 5,       // Minimum 5 requests before tripping
};

const breakers = new Map<string, CircuitBreaker>();

function getCircuitBreaker(serviceName: string): CircuitBreaker {
  if (!breakers.has(serviceName)) {
    const breaker = new CircuitBreaker(
      async (config: AxiosRequestConfig) => {
        const response = await axios(config);
        return response;
      },
      { ...circuitBreakerOptions, name: serviceName }
    );

    breaker.on('open', () => {
      logger.warn(`Circuit breaker OPENED for ${serviceName}`);
    });

    breaker.on('halfOpen', () => {
      logger.info(`Circuit breaker HALF-OPEN for ${serviceName}`);
    });

    breaker.on('close', () => {
      logger.info(`Circuit breaker CLOSED for ${serviceName}`);
    });

    breaker.fallback(() => {
      return {
        status: 503,
        data: { success: false, error: `${serviceName} is currently unavailable. Please try again later.` },
      };
    });

    breakers.set(serviceName, breaker);
  }

  return breakers.get(serviceName)!;
}

export async function proxyRequest(
  serviceName: string,
  serviceUrl: string,
  method: string,
  path: string,
  headers: Record<string, string>,
  body?: unknown
) {
  const breaker = getCircuitBreaker(serviceName);

  const axiosConfig: AxiosRequestConfig = {
    method: method as any,
    url: `${serviceUrl}${path}`,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': headers['x-user-id'] || '',
      'x-user-email': headers['x-user-email'] || '',
      'x-user-role': headers['x-user-role'] || '',
      'x-correlation-id': headers['x-correlation-id'] || '',
    },
    data: body,
    timeout: 10000,
  };

  const response: any = await breaker.fire(axiosConfig);
  return { status: response.status, data: response.data };
}
```

**Step 9: Create error handler middleware**

`services/api-gateway/src/middleware/error-handler.ts`:
```typescript
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const correlationId = req.headers['x-correlation-id'];
  logger.error('Unhandled error', { error: err.message, stack: err.stack, correlationId });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    correlationId,
  });
}
```

**Step 10: Create proxy routes**

`services/api-gateway/src/routes/proxy.ts`:
```typescript
import { Router, Request, Response } from 'express';
import { authenticate, authorizeAdmin } from '../middleware/auth';
import { proxyRequest } from '../middleware/circuit-breaker';
import { config } from '../config';
import { logger } from '../utils/logger';

const router = Router();

// Helper to forward request to a service
async function forward(
  serviceName: string,
  serviceUrl: string,
  req: Request,
  res: Response
): Promise<void> {
  try {
    const result = await proxyRequest(
      serviceName,
      serviceUrl,
      req.method,
      req.originalUrl.replace(/^\/api\/(auth|users|products|orders|payments)/, '/api/$1'),
      req.headers as Record<string, string>,
      req.body
    );
    res.status(result.status).json(result.data);
  } catch (error: any) {
    logger.error(`Proxy error to ${serviceName}:`, error);
    res.status(502).json({ success: false, error: `Failed to reach ${serviceName}` });
  }
}

// Auth routes (public)
router.post('/api/auth/register', (req, res) => forward('user-service', config.services.user, req, res));
router.post('/api/auth/login', (req, res) => forward('user-service', config.services.user, req, res));

// User routes (protected)
router.get('/api/users/profile', authenticate, (req, res) => forward('user-service', config.services.user, req, res));

// Product routes (public for read, admin for write)
router.get('/api/products', (req, res) => forward('product-service', config.services.product, req, res));
router.get('/api/products/:id', (req, res) => forward('product-service', config.services.product, req, res));
router.post('/api/products', authenticate, authorizeAdmin, (req, res) => forward('product-service', config.services.product, req, res));
router.put('/api/products/:id', authenticate, authorizeAdmin, (req, res) => forward('product-service', config.services.product, req, res));
router.delete('/api/products/:id', authenticate, authorizeAdmin, (req, res) => forward('product-service', config.services.product, req, res));

// Order routes (protected)
router.post('/api/orders', authenticate, (req, res) => forward('order-service', config.services.order, req, res));
router.get('/api/orders', authenticate, (req, res) => forward('order-service', config.services.order, req, res));
router.get('/api/orders/:id', authenticate, (req, res) => forward('order-service', config.services.order, req, res));

// Payment routes (protected)
router.get('/api/payments/:orderId', authenticate, (req, res) => forward('payment-service', config.services.payment, req, res));

export { router as proxyRoutes };
```

**Step 11: Create index.ts**

`services/api-gateway/src/index.ts`:
```typescript
import express from 'express';
import cors from 'cors';
import { config } from './config';
import { correlationIdMiddleware } from './middleware/correlation-id';
import { rateLimiter } from './middleware/rate-limiter';
import { errorHandler } from './middleware/error-handler';
import { proxyRoutes } from './routes/proxy';
import { logger } from './utils/logger';

const app = express();

// Global middleware
app.use(cors());
app.use(express.json());
app.use(correlationIdMiddleware);
app.use(rateLimiter({ windowMs: 60000, max: 100 }));

// Request logging
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`, {
    correlationId: req.headers['x-correlation-id'],
    ip: req.ip,
  });
  next();
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api-gateway' });
});

// Proxy routes
app.use(proxyRoutes);

// Error handler (must be last)
app.use(errorHandler);

app.listen(config.port, () => {
  logger.info(`API Gateway running on port ${config.port}`);
});

export { app };
```

**Step 12: Install and commit**

```bash
cd services/api-gateway && npm install && cd ../..
git add services/api-gateway/
git commit -m "feat: add API gateway with JWT auth, rate limiting, circuit breaker, and proxy routing"
```

---

## Task 10: Integration Testing & Verification

**Step 1: Verify Docker Compose starts all services**

```bash
docker-compose up --build
```

Expected: All 5 services start, connect to their databases and RabbitMQ, and log ready messages.

**Step 2: Test the full flow manually**

```bash
# 1. Register a user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# 2. Login and get JWT
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
# Save the token from response

# 3. Create a product (would need admin role — register as admin for testing)
# 4. Create an order (triggers saga)
# 5. Check order status (should move from pending → confirmed/cancelled)
# 6. Check payment status
```

**Step 3: Verify event flow in RabbitMQ Management UI**

Open `http://localhost:15672` (guest/guest) and observe:
- Exchanges: `ecommerce.events`, `ecommerce.dlx`
- Queues: `order-service.payment-events`, `payment-service.order-events`
- Messages flowing through the system

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: integration testing fixes"
```

---

## Task 11: Add Graceful Shutdown & Health Checks Enhancement

**Files:**
- Modify: all service `index.ts` files

Each service should properly handle shutdown signals:
1. Stop accepting new requests
2. Finish processing in-flight requests
3. Close database connections
4. Close RabbitMQ connections
5. Exit cleanly

This is already partially implemented. Verify all services have:
```typescript
process.on('SIGTERM', async () => { /* cleanup */ });
process.on('SIGINT', async () => { /* cleanup */ });
```

**Commit:**
```bash
git add -A
git commit -m "feat: verify graceful shutdown across all services"
```

---

## Summary of Commits

1. `chore: scaffold root project with docker-compose infrastructure`
2. `feat: add shared types package with event envelopes and DTOs`
3. `feat: scaffold user service with Sequelize model and config`
4. `feat: add user service auth controller, routes, and validation`
5. `feat: add RabbitMQ connection manager and event publisher`
6. `feat: add product service with MongoDB, Mongoose, CRUD operations`
7. `feat: add order service with saga choreography and event publishing`
8. `feat: add payment service with event consuming, processing, and saga response`
9. `feat: add API gateway with JWT auth, rate limiting, circuit breaker, and proxy routing`
10. `fix: integration testing fixes`
11. `feat: verify graceful shutdown across all services`
