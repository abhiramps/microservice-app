# E-Commerce Microservices Platform — Design Document

## Purpose

Educational backend microservices application for senior backend developer interview preparation. Covers microservices, event-driven architecture, and core backend concepts.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Domain | E-Commerce | Universally understood, covers widest range of patterns |
| Services | 5 core (Gateway, User, Product, Order, Payment) | Covers all patterns without being overwhelming |
| Message Broker | RabbitMQ | Explicit concepts (exchanges, queues, DLQ), great for learning |
| Databases | Polyglot — PostgreSQL + MongoDB + Redis | Demonstrates choosing right DB per service |
| Auth | JWT at API Gateway | Covers key auth interview topics cleanly |
| Language | TypeScript | Type safety, expected at senior level |
| ORM | Sequelize (PostgreSQL), Mongoose (MongoDB) | Full-featured with migrations and typed models |
| Containers | Docker Compose | One command to run everything |

## Architecture

```
                        +---------------+
                        |    Client     |
                        +-------+-------+
                                |
                        +-------v-------+
                        |  API Gateway  |  JWT validation, rate limiting, routing
                        |  (Port 3000)  |
                        +-------+-------+
                                |
              +-----------------+-----------------+
              |                 |                 |
       +------v------+  +------v------+  +-------v-----+
       | User Service|  |Product Svc  |  | Order Svc   |
       | (Port 3001) |  |(Port 3002)  |  | (Port 3003) |
       | PostgreSQL  |  |  MongoDB    |  | PostgreSQL  |
       +------+------+  +------+------+  +-------+-----+
              |                 |                 |
              +-----------------+-----------------+
                                |
                         +------v------+
                         |  RabbitMQ   |   Event bus
                         +------+------+
                                |
                         +------v------+
                         |Payment Svc  |
                         |(Port 3004)  |
                         | PostgreSQL  |
                         +-------------+
```

## Services

### 1. API Gateway (Port 3000)

Entry point for all client requests.

Responsibilities:
- Route requests to downstream services
- JWT validation (public/protected/admin routes)
- Rate limiting (Redis sliding window)
- Circuit breaker per downstream service (opossum)
- Correlation ID generation for distributed tracing
- Request validation (Joi)
- Standardized error responses
- Health checks

Route structure:
- POST /api/auth/register → User Service (public)
- POST /api/auth/login → User Service (public)
- POST /api/auth/logout → API Gateway (protected, revokes current session)
- POST /api/auth/revoke-all-sessions → API Gateway (protected, revokes all sessions)
- GET /api/users/profile → User Service (protected)
- GET /api/products → Product Service (public)
- GET /api/products/:id → Product Service (public)
- POST /api/products → Product Service (admin)
- POST /api/orders → Order Service (protected)
- GET /api/orders → Order Service (protected)
- GET /api/orders/:id → Order Service (protected)
- GET /api/payments/:orderId → Payment Service (protected)

### 2. User Service (Port 3001) — PostgreSQL

Handles authentication and user management.

Data model:
- id (UUID, PK)
- email (UNIQUE)
- password_hash (bcrypt)
- name
- role (enum: customer, admin)
- created_at, updated_at

### 3. Product Service (Port 3002) — MongoDB

Product catalog with flexible schema for varied product attributes.

Data model:
- _id (ObjectId)
- name, description, price, category
- attributes (flexible nested object — reason for MongoDB)
- stock_quantity (moves to Inventory Service later)
- status (active, discontinued)
- created_at, updated_at

### 4. Order Service (Port 3003) — PostgreSQL

Order creation and lifecycle management. Acts as saga initiator.

Data models:

orders:
- id (UUID, PK)
- user_id
- status (enum: pending, confirmed, cancelled, shipped, delivered)
- total_amount
- correlation_id
- created_at, updated_at

order_items:
- id (UUID, PK)
- order_id (FK)
- product_id
- product_name (denormalized)
- price_at_purchase (denormalized)
- quantity
- created_at

### 5. Payment Service (Port 3004) — PostgreSQL

Payment processing triggered by order events.

Data model:
- id (UUID, PK)
- order_id
- amount
- status (enum: pending, completed, failed, refunded)
- method (card, wallet)
- transaction_ref
- correlation_id
- processed_events (JSONB — idempotency tracking)
- created_at, updated_at

## Event-Driven Flow — Order Saga (Choreography)

```
Customer places order
       |
       v
Order Service --> publishes "order.created"
                        |
                  +-----v-----+
                  |Payment Svc|
                  | processes  |
                  +-----+-----+
                        |
              +---------+---------+
              v                   v
     "payment.completed"   "payment.failed"
              |                   |
              v                   v
   Order -> "confirmed"   Order -> "cancelled"
              |                   |
              v                   v
   "order.confirmed"      "order.cancelled"
```

Event envelope standard:
```typescript
interface EventEnvelope<T> {
  eventId: string;       // UUID, unique per event
  type: string;          // e.g., "order.created"
  timestamp: string;     // ISO 8601
  correlationId: string; // ties saga events together
  payload: T;
}
```

## Patterns & Concepts Covered

Architecture & Design:
- Microservices architecture (service boundaries, single responsibility)
- API Gateway pattern
- Event-driven architecture (async via RabbitMQ)
- Saga pattern — choreography
- Circuit breaker pattern
- Database-per-service
- Polyglot persistence
- CQRS-lite (denormalized read data)

Communication:
- Synchronous — REST APIs via HTTP
- Asynchronous — RabbitMQ pub/sub with exchanges and queues
- Event envelope standard with correlationId

Data & Consistency:
- Eventual consistency
- Compensating transactions (payment failure -> order cancellation)
- Idempotent event handlers
- Database migrations (Sequelize)
- Data denormalization

Reliability & Resilience:
- Dead letter queues
- Circuit breaker (cascading failure prevention)
- Health checks per service
- Retry with exponential backoff
- Graceful shutdown

Security:
- JWT authentication
- Role-based access control
- Password hashing (bcrypt)
- Rate limiting (Redis sliding window)
- Input validation at gateway + service level

Observability:
- Structured logging (winston)
- Correlation ID tracing
- Health check endpoints

DevOps:
- Docker containerization
- Docker Compose orchestration
- Environment-based configuration

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js + Express |
| Language | TypeScript |
| Auth | jsonwebtoken + bcrypt |
| Validation | Joi |
| PostgreSQL ORM | Sequelize (sequelize-typescript) |
| MongoDB ODM | Mongoose |
| Message Broker | amqplib |
| Redis Client | ioredis |
| HTTP Proxy | http-proxy-middleware |
| Circuit Breaker | opossum |
| Logging | winston |
| Testing | Jest + supertest |
| Containers | Docker + Docker Compose |

## Project Structure

```
root/
├── shared/                  # shared TypeScript types
│   ├── events/              # event type definitions
│   ├── dto/                 # common request/response types
│   └── tsconfig.json
├── services/
│   ├── api-gateway/
│   ├── user-service/
│   ├── product-service/
│   ├── order-service/
│   └── payment-service/
├── docker-compose.yml
└── docs/
```

Each service follows:
```
├── src/
│   ├── config/
│   ├── controllers/
│   ├── models/
│   ├── migrations/          # Sequelize migrations
│   ├── routes/
│   ├── services/
│   ├── events/              # publishers & consumers
│   ├── middleware/
│   ├── utils/
│   └── index.ts
├── tests/
├── Dockerfile
├── tsconfig.json
├── package.json
└── .env.example
```

## Future Extensions

- Notification Service (email/SMS on order events)
- Inventory Service (stock management, reserve-on-order pattern)
