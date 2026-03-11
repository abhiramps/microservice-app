# E-Commerce Microservices Platform

An educational e-commerce backend built with microservices architecture, event-driven communication, and modern backend patterns. Designed for learning and demonstrating senior backend engineering concepts.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Services](#services)
- [Infrastructure](#infrastructure)
- [Request Flow](#request-flow)
- [Event-Driven Saga](#event-driven-saga)
- [Design Patterns](#design-patterns)
- [Data Models](#data-models)
- [API Reference](#api-reference)
- [Running Locally](#running-locally)
- [Testing the APIs](#testing-the-apis)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)

---

## Architecture Overview

```
                         ┌──────────────┐
                         │    Client    │
                         └──────┬───────┘
                                │
                         ┌──────▼───────┐
                         │ API Gateway  │  Port 3000
                         │              │  JWT auth, rate limiting,
                         │    Redis ◄───│  circuit breaker, routing
                         └──────┬───────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
   ┌──────▼───────┐     ┌──────▼───────┐     ┌───────▼──────┐
   │ User Service │     │Product Service│     │Order Service │
   │  Port 3001   │     │  Port 3002   │     │  Port 3003   │
   │  PostgreSQL  │     │   MongoDB    │     │  PostgreSQL  │
   └──────────────┘     └──────────────┘     └───────┬──────┘
                                                     │
                                              ┌──────▼───────┐
                                              │   RabbitMQ   │
                                              │  Event Bus   │
                                              └──────┬───────┘
                                                     │
                                             ┌───────▼──────┐
                                             │Payment Service│
                                             │  Port 3004   │
                                             │  PostgreSQL  │
                                             └──────────────┘
```

Five microservices sit behind an API gateway. Services communicate synchronously via REST (through the gateway) and asynchronously via RabbitMQ events (service-to-service). Each service owns its database — no shared data stores between services.

---

## Services

### API Gateway (Port 3000)

The single entry point for all client requests. Does not contain business logic.

**Responsibilities:**
- Routes requests to downstream services via HTTP proxy
- JWT authentication and role-based authorization
- Rate limiting using Redis sliding window sorted sets (100 req/min per IP)
- Circuit breaker per downstream service (opossum — 50% error threshold, 30s reset)
- Correlation ID generation for distributed tracing (`x-correlation-id` header)
- Forwards authenticated user context via `x-user-id`, `x-user-email`, `x-user-role` headers

**Key files:**
- `services/api-gateway/src/routes/proxy.ts` — route definitions and forwarding
- `services/api-gateway/src/middleware/auth.ts` — JWT validation
- `services/api-gateway/src/middleware/circuit-breaker.ts` — circuit breaker + axios proxy
- `services/api-gateway/src/middleware/rate-limiter.ts` — Redis-backed rate limiter

### User Service (Port 3001)

Handles user registration, login, and profile management.

**Database:** PostgreSQL (port 5432)
**Key features:**
- Password hashing via bcryptjs (beforeCreate hook)
- JWT token generation (24h expiry)
- Joi request validation
- Publishes user events to RabbitMQ

### Product Service (Port 3002)

Product catalog with flexible schema for varied product attributes.

**Database:** MongoDB (port 27017)
**Key features:**
- Full CRUD operations
- Text search index on name and description
- Flexible `attributes` field (reason for choosing MongoDB)
- Pagination support

### Order Service (Port 3003)

Order creation and lifecycle management. Acts as the saga initiator.

**Database:** PostgreSQL (port 5433)
**Key features:**
- Creates orders with line items in a transaction
- Publishes `order.created` event to trigger payment saga
- Consumes `payment.completed` and `payment.failed` events
- Updates order status accordingly (confirmed or cancelled)
- Publishes `order.confirmed` or `order.cancelled` as compensating events

### Payment Service (Port 3004)

Payment processing triggered by order events.

**Database:** PostgreSQL (port 5434)
**Key features:**
- Consumes `order.created` events from RabbitMQ
- Simulates payment processing (80% success rate, 1s delay)
- Publishes `payment.completed` or `payment.failed` events
- Idempotent event processing via in-memory eventId deduplication
- Dead letter queue for failed message processing

---

## Infrastructure

| Component | Image | Port(s) | Purpose |
|-----------|-------|---------|---------|
| PostgreSQL (users) | postgres:15-alpine | 5432 | User service database |
| PostgreSQL (orders) | postgres:15-alpine | 5433 | Order service database |
| PostgreSQL (payments) | postgres:15-alpine | 5434 | Payment service database |
| MongoDB | mongo:7 | 27017 | Product service database |
| RabbitMQ | rabbitmq:3-management-alpine | 5672, 15672 | Message broker + management UI |
| Redis | redis:7-alpine | 6379 | Rate limiting |

All infrastructure services include health checks. Application services wait for their dependencies to be healthy before starting.

---

## Request Flow

A typical authenticated request flows through the system like this:

```
1. Client sends request to API Gateway (port 3000)
2. Correlation ID middleware assigns x-correlation-id (UUID)
3. Rate limiter checks Redis sliding window for client IP
4. If protected route: JWT auth middleware validates token
   - Extracts userId, email, role from JWT payload
   - Sets x-user-id, x-user-email, x-user-role headers
5. If admin route: authorization middleware checks role
6. Circuit breaker wraps the proxy request to downstream service
   - If circuit is OPEN: returns 503 immediately (fallback)
   - If circuit is CLOSED/HALF-OPEN: forwards request
7. Downstream service processes request
   - Validates input (Joi schema)
   - Executes business logic
   - Returns standardized response
8. Gateway returns response to client
```

**Standardized response format:**

```json
{
  "success": true,
  "data": { ... },
  "error": "string (only on failure)",
  "correlationId": "uuid"
}
```

---

## Event-Driven Saga

The order-payment flow uses choreography-based saga pattern through RabbitMQ:

```
  Customer places order
         │
         ▼
  ┌──────────────┐     publishes      ┌──────────────────────────────┐
  │ Order Service │ ──────────────►   │ ecommerce.events exchange    │
  │ creates order │  order.created    │ (topic exchange, durable)    │
  │ status=pending│                   └──────────┬───────────────────┘
  └──────────────┘                               │
                                                 │ routing key: order.created
                                                 ▼
                                    ┌────────────────────────┐
                                    │ payment-service         │
                                    │ .order-events queue     │
                                    └────────────┬───────────┘
                                                 │
                                                 ▼
                                    ┌────────────────────────┐
                                    │ Payment Service         │
                                    │ processes payment       │
                                    │ (80% success rate)      │
                                    └─────┬──────────┬───────┘
                                          │          │
                               success    │          │  failure
                                          ▼          ▼
                              payment.completed  payment.failed
                                          │          │
                                          ▼          ▼
                              ┌──────────────────────────────┐
                              │ order-service                 │
                              │ .payment-events queue         │
                              └──────────────┬───────────────┘
                                             │
                              ┌──────────────┴───────────────┐
                              ▼                              ▼
                    Order → confirmed              Order → cancelled
                    publishes                      publishes
                    order.confirmed                order.cancelled
```

**RabbitMQ topology:**
- **Exchange:** `ecommerce.events` (topic, durable)
- **Dead letter exchange:** `ecommerce.dlx` (direct, durable)
- **Queues:**
  - `payment-service.order-events` — binds to `order.created`
  - `order-service.payment-events` — binds to `payment.completed` and `payment.failed`
- **Dead letter queues:**
  - `payment-service.order-events.dlq`
  - `order-service.payment-events.dlq`

**Event envelope:**

```typescript
{
  eventId: "uuid",           // Unique per event (for idempotency)
  type: "order.created",     // Routing key
  timestamp: "ISO-8601",     // When the event was created
  correlationId: "uuid",     // Ties all saga events together
  payload: { ... }           // Event-specific data
}
```

---

## Design Patterns

| Pattern | Where | Purpose |
|---------|-------|---------|
| **API Gateway** | api-gateway service | Single entry point, cross-cutting concerns |
| **Circuit Breaker** | api-gateway → each downstream service | Prevent cascading failures |
| **Saga (Choreography)** | order-service ↔ payment-service | Distributed transaction across services |
| **Compensating Transaction** | order cancellation on payment failure | Undo partial work in saga |
| **Database per Service** | Each service owns its DB | Loose coupling, independent scaling |
| **Polyglot Persistence** | PostgreSQL + MongoDB | Right database for the right job |
| **Event-Driven Architecture** | RabbitMQ pub/sub | Async decoupled communication |
| **Dead Letter Queue** | RabbitMQ DLX | Handle poison messages |
| **Idempotent Consumer** | eventId deduplication in consumers | Safe message reprocessing |
| **Rate Limiting** | Redis sliding window | Protect against abuse |
| **Correlation ID** | x-correlation-id header propagation | Distributed request tracing |
| **CQRS-lite** | Denormalized productName/price in order items | Avoid cross-service joins |

---

## Data Models

### User (PostgreSQL — `users` table)

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | Primary key, auto-generated |
| email | VARCHAR(255) | Unique, not null, email format |
| password_hash | VARCHAR(255) | Not null, bcryptjs hashed |
| name | VARCHAR(255) | Not null |
| role | ENUM('customer','admin') | Default 'customer' |
| created_at | TIMESTAMPTZ | Auto |
| updated_at | TIMESTAMPTZ | Auto |

### Product (MongoDB — `products` collection)

| Field | Type | Constraints |
|-------|------|-------------|
| _id | ObjectId | Auto-generated |
| name | String | Required, indexed |
| description | String | Required |
| price | Number | Required, min 0 |
| category | String | Required, indexed |
| attributes | Mixed | Optional (flexible JSON) |
| stockQuantity | Number | Required, default 0, min 0 |
| status | String | 'active' or 'discontinued', default 'active' |

Text index on `name` and `description` for search.

### Order (PostgreSQL — `orders` table)

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Not null |
| status | ENUM | 'pending','confirmed','cancelled','shipped','delivered' |
| total_amount | DECIMAL(10,2) | Not null |
| correlation_id | UUID | Not null (saga tracking) |

### OrderItem (PostgreSQL — `order_items` table)

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | Primary key |
| order_id | UUID | Foreign key → orders.id |
| product_id | VARCHAR | Not null |
| product_name | VARCHAR | Not null (denormalized) |
| price_at_purchase | DECIMAL(10,2) | Not null (denormalized) |
| quantity | INTEGER | Not null, min 1 |

### Payment (PostgreSQL — `payments` table)

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | Primary key |
| order_id | UUID | Not null |
| amount | DECIMAL(10,2) | Not null |
| status | ENUM | 'pending','completed','failed','refunded' |
| method | ENUM | 'card','wallet', default 'card' |
| transaction_ref | VARCHAR | Nullable (set on success) |
| correlation_id | UUID | Not null (saga tracking) |
| processed_events | JSONB | Array of eventIds, default [] |

---

## API Reference

All requests go through the API Gateway at `http://localhost:3000`.

### Authentication

#### Register

```
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"    // min 8 characters
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "john@example.com", "name": "John Doe", "role": "customer" },
    "token": "eyJhbG..."
  }
}
```

#### Login

```
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

Response (200): Same shape as register.

### Users (Protected)

#### Get Profile

```
GET /api/users/profile
Authorization: Bearer <token>
```

### Products

#### List Products (Public)

```
GET /api/products
GET /api/products?page=1&limit=20
```

Response includes pagination:
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": { "page": 1, "limit": 20, "total": 50, "totalPages": 3 }
}
```

#### Get Product by ID (Public)

```
GET /api/products/:id
```

#### Create Product (Admin only)

```
POST /api/products
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "Laptop Pro",
  "description": "High-performance laptop for developers",
  "price": 999.99,
  "stockQuantity": 50,
  "category": "electronics",
  "attributes": { "brand": "TechCo", "ram": "16GB" }
}
```

#### Update Product (Admin only)

```
PUT /api/products/:id
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "price": 899.99,
  "stockQuantity": 45
}
```

#### Delete Product (Admin only)

```
DELETE /api/products/:id
Authorization: Bearer <admin-token>
```

### Orders (Protected)

#### Create Order

```
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "items": [
    {
      "productId": "product-id-here",
      "productName": "Laptop Pro",
      "price": 999.99,
      "quantity": 1
    }
  ]
}
```

This triggers the order-payment saga. The order starts as `pending` and transitions to `confirmed` or `cancelled` based on payment outcome.

#### List Orders

```
GET /api/orders
Authorization: Bearer <token>
```

Returns orders for the authenticated user with their items.

#### Get Order by ID

```
GET /api/orders/:id
Authorization: Bearer <token>
```

### Payments (Protected)

#### Get Payment by Order ID

```
GET /api/payments/:orderId
Authorization: Bearer <token>
```

### Health Checks

Each service exposes a health endpoint (no auth required):

```
GET http://localhost:3000/health    # API Gateway
GET http://localhost:3001/health    # User Service
GET http://localhost:3002/health    # Product Service
GET http://localhost:3003/health    # Order Service
GET http://localhost:3004/health    # Payment Service
```

---

## Running Locally

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for individual service development)

### Option 1: Docker Compose (Recommended)

Start the entire stack with one command:

```bash
# Build and start all services + infrastructure
npm run docker:up

# Or equivalently:
docker compose up --build
```

This starts all 11 containers (6 infrastructure + 5 application services). Services wait for their database and RabbitMQ dependencies to be healthy before starting.

To stop and clean up:

```bash
npm run docker:down

# Or equivalently:
docker compose down -v
```

### Option 2: Individual Service Development

For developing a single service with hot reload:

1. Start infrastructure only:

```bash
# Start just the databases, RabbitMQ, and Redis
docker compose up -d postgres-user postgres-order postgres-payment mongodb rabbitmq redis
```

2. Build the shared library (if services import from it):

```bash
cd shared && npm run build && cd ..
```

3. Run the service in dev mode:

```bash
cd services/user-service
npm install
npm run dev    # ts-node-dev with hot reload
```

### Port Reference

| Service | Port | URL |
|---------|------|-----|
| API Gateway | 3000 | http://localhost:3000 |
| User Service | 3001 | http://localhost:3001 |
| Product Service | 3002 | http://localhost:3002 |
| Order Service | 3003 | http://localhost:3003 |
| Payment Service | 3004 | http://localhost:3004 |
| RabbitMQ Management | 15672 | http://localhost:15672 (guest/guest) |

### Environment Variables

Each service reads configuration from environment variables with sensible defaults for local development. In Docker, these are set in `docker-compose.yml`. For individual service development, copy `.env.example` to `.env` in the service directory.

Key variables:
- `PORT` — Service port
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` — PostgreSQL connection
- `MONGODB_URI` — MongoDB connection string
- `RABBITMQ_URL` — RabbitMQ AMQP URL
- `REDIS_URL` — Redis connection URL
- `JWT_SECRET` — JWT signing secret (must match between gateway and user-service)

---

## Testing the APIs

### End-to-End Test Script

After starting the stack with `docker compose up --build`, run this sequence:

```bash
# 1. Register a user
curl -s http://localhost:3000/api/auth/register \
  -X POST -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@test.com","password":"password123"}'

# 2. Login and capture the token
TOKEN=$(curl -s http://localhost:3000/api/auth/login \
  -X POST -H "Content-Type: application/json" \
  -d '{"email":"alice@test.com","password":"password123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")

# 3. Get user profile
curl -s http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer $TOKEN"

# 4. Promote user to admin (for product creation)
docker compose exec postgres-user \
  psql -U postgres -d user_db \
  -c "UPDATE users SET role='admin' WHERE email='alice@test.com';"

# 5. Re-login to get token with admin role
TOKEN=$(curl -s http://localhost:3000/api/auth/login \
  -X POST -H "Content-Type: application/json" \
  -d '{"email":"alice@test.com","password":"password123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")

# 6. Create a product
PRODUCT=$(curl -s http://localhost:3000/api/products \
  -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Laptop","description":"A high-end development laptop","price":999.99,"stockQuantity":50,"category":"electronics"}')
echo "$PRODUCT" | python3 -m json.tool
PRODUCT_ID=$(echo "$PRODUCT" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")

# 7. List products
curl -s http://localhost:3000/api/products | python3 -m json.tool

# 8. Create an order (triggers saga)
ORDER=$(curl -s http://localhost:3000/api/orders \
  -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"items\":[{\"productId\":\"$PRODUCT_ID\",\"productName\":\"Laptop\",\"price\":999.99,\"quantity\":1}]}")
echo "$ORDER" | python3 -m json.tool
ORDER_ID=$(echo "$ORDER" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['order']['id'])")

# 9. Wait for saga to complete, then check order status
sleep 3
curl -s "http://localhost:3000/api/orders/$ORDER_ID" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# 10. Check payment status
curl -s "http://localhost:3000/api/payments/$ORDER_ID" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

### Verifying the Saga

After creating an order, check the service logs to see the saga in action:

```bash
# Watch order and payment service logs
docker compose logs -f order-service payment-service
```

You should see:
1. Order service publishes `order.created`
2. Payment service consumes it and processes payment
3. Payment service publishes `payment.completed` or `payment.failed`
4. Order service updates order to `confirmed` or `cancelled`

### RabbitMQ Management UI

Open http://localhost:15672 (credentials: guest/guest) to:
- View exchange topology (`ecommerce.events`, `ecommerce.dlx`)
- Monitor queue depths and message rates
- Check dead letter queues for failed messages

### Validation Error Examples

```bash
# Missing required fields
curl -s http://localhost:3000/api/auth/register \
  -X POST -H "Content-Type: application/json" \
  -d '{"email":"bad"}'
# Returns 400 with validation details

# Unauthorized access
curl -s http://localhost:3000/api/orders
# Returns 401 — no token provided

# Non-admin trying to create product
curl -s http://localhost:3000/api/products \
  -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -d '{"name":"Test","description":"Test product desc","price":10,"stockQuantity":5,"category":"test"}'
# Returns 403 — admin role required
```

---

## Project Structure

```
microservice-app/
├── docker-compose.yml              # All infrastructure + services
├── package.json                    # Root scripts (docker:up, docker:down)
├── tsconfig.base.json              # Base TypeScript config
├── CLAUDE.md                       # AI assistant instructions
├── shared/                         # Shared TypeScript types
│   └── src/
│       ├── events/                 # EventEnvelope, order/payment event types
│       └── dto/                    # ApiResponse, PaginatedResponse
├── services/
│   ├── api-gateway/                # Port 3000
│   │   └── src/
│   │       ├── config/             # Service configuration
│   │       ├── middleware/         # auth, circuit-breaker, rate-limiter,
│   │       │                      # correlation-id, error-handler
│   │       ├── routes/            # proxy.ts — route forwarding
│   │       └── utils/             # Winston logger
│   ├── user-service/               # Port 3001
│   │   └── src/
│   │       ├── config/            # App + database config
│   │       ├── controllers/       # Auth, user controllers
│   │       ├── models/            # Sequelize User model
│   │       ├── routes/            # auth.routes, user.routes
│   │       ├── services/          # Auth service (register, login)
│   │       ├── events/            # RabbitMQ connection + publisher
│   │       └── middleware/        # Joi validation schemas
│   ├── product-service/            # Port 3002
│   │   └── src/
│   │       ├── config/            # App + MongoDB config
│   │       ├── controllers/       # Product CRUD controller
│   │       ├── models/            # Mongoose Product model
│   │       ├── routes/            # product.routes
│   │       ├── services/          # Product service
│   │       └── middleware/        # Joi validation schemas
│   ├── order-service/              # Port 3003
│   │   └── src/
│   │       ├── config/            # App + database config
│   │       ├── controllers/       # Order controller
│   │       ├── models/            # Order + OrderItem models
│   │       ├── routes/            # order.routes
│   │       ├── services/          # Order service
│   │       ├── events/            # RabbitMQ, publisher, consumer
│   │       └── middleware/        # Joi validation schemas
│   └── payment-service/            # Port 3004
│       └── src/
│           ├── config/            # App + database config
│           ├── controllers/       # Payment controller
│           ├── models/            # Payment model
│           ├── routes/            # payment.routes
│           ├── services/          # Payment processing (simulated)
│           └── events/            # RabbitMQ, publisher, consumer
└── docs/
    ├── architecture.md            # This file
    └── plans/                     # Design docs and implementation plan
```

Each service follows the same layered structure: `routes → controllers → services → models`, with `events/` for RabbitMQ integration and `middleware/` for request validation.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Runtime | Node.js 20 + Express | HTTP server and routing |
| Language | TypeScript (strict mode) | Type safety |
| Auth | jsonwebtoken + bcryptjs | JWT tokens + password hashing |
| Validation | Joi | Request schema validation |
| PostgreSQL ORM | Sequelize | User, order, payment models |
| MongoDB ODM | Mongoose | Product model with flexible schema |
| Message Broker | RabbitMQ (amqplib) | Async event communication |
| Caching/Rate Limiting | Redis (ioredis) | Sliding window rate limiter |
| Circuit Breaker | opossum | Cascading failure prevention |
| HTTP Client | axios | Gateway-to-service proxying |
| Logging | Winston | Structured JSON logging |
| Containers | Docker + Docker Compose | Development orchestration |
| Testing | Jest + Supertest | Unit and integration tests |
