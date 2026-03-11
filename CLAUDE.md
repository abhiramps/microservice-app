# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

**Full stack (Docker):**
```bash
npm run docker:up        # Build and start all services + infrastructure
npm run docker:down      # Stop and remove volumes
```

**Individual service development:**
```bash
cd services/<service-name>
npm run dev              # ts-node-dev with hot reload
npm run build            # TypeScript compile
npm run test             # Jest (--passWithNoTests)
npm start                # Run compiled dist/index.js
```

**Shared library (must build before services that import it):**
```bash
cd shared && npm run build
```

**User service migrations:**
```bash
cd services/user-service
npm run migrate          # Run Sequelize migrations
npm run migrate:undo     # Rollback last migration
```

## Architecture

Five microservices behind an API gateway, communicating via REST (synchronous) and RabbitMQ (asynchronous events).

**Services:**
| Service | Port | Database | ORM |
|---------|------|----------|-----|
| api-gateway | 3000 | Redis (rate limiting) | ioredis |
| user-service | 3001 | PostgreSQL | Sequelize |
| product-service | 3002 | MongoDB | Mongoose |
| order-service | 3003 | PostgreSQL | Sequelize |
| payment-service | 3004 | PostgreSQL | Sequelize |

**Infrastructure:** 3 PostgreSQL instances (ports 5432-5434), MongoDB (27017), RabbitMQ (5672/15672), Redis (6379).

### Request Flow

Client → API Gateway (JWT auth, rate limiting, circuit breaker) → downstream service. The gateway forwards user context via `x-user-id`, `x-user-email`, `x-user-role` headers and propagates `x-correlation-id` for distributed tracing.

### Event-Driven Saga (Choreography)

Order creation triggers an event-driven saga through RabbitMQ topic exchange (`ecommerce.events`):
1. Order Service publishes `order.created`
2. Payment Service consumes it, processes payment, publishes `payment.completed` or `payment.failed`
3. Order Service updates status accordingly (confirmed or cancelled as compensating transaction)

All events use `EventEnvelope<T>` from `shared/src/events/` with `eventId`, `correlationId`, `type`, `timestamp`, and `payload`.

### Key Patterns

- **Circuit breaker** (opossum) per downstream service in API gateway — 50% error threshold, 30s reset
- **Rate limiting** via Redis sliding window sorted sets — fails open if Redis is down
- **Dead letter queues** for failed event processing (`ecommerce.dlx` exchange)
- **Idempotent consumers** using in-memory eventId deduplication
- **Polyglot persistence** — PostgreSQL for relational data, MongoDB for flexible product attributes

## Code Conventions

- TypeScript strict mode, target ES2020, CommonJS modules — base config in `tsconfig.base.json`
- Each service extends base tsconfig
- Standardized API response shape: `{ success: boolean, data?: T, error?: string, correlationId?: string }`
- Winston structured JSON logging with service name context
- Joi for request validation
- UUID primary keys (Sequelize), ObjectId (Mongoose)
- Sequelize models use `alter: true` sync in development (no explicit migrations for order/payment)
- Password hashing via bcrypt `beforeCreate` hook on User model

## Shared Library

`shared/` contains event type definitions (`EventEnvelope`, order/payment event types) and common DTOs (`ApiResponse`). Services import from this compiled package.
