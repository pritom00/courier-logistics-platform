# Courier & Logistics Management Platform — Backend API

A backend-only RESTful API for a courier/logistics platform: customers create
shipments, admins assign couriers and manage hubs, couriers update delivery
status, and payments are processed through a real Stripe integration.

**No frontend is included** — this is fully tested via Postman and an
automated verification script (see below). No manual UI testing is needed.

## 🔗 Live Links

| | |
|---|---|
| **Live API** | https://courier-logistics-platform.onrender.com |
| **API Docs (Swagger UI)** | https://courier-logistics-platform.onrender.com/api-docs |
| **Health check** | https://courier-logistics-platform.onrender.com/health |
| **Repo** | https://github.com/pritom00/courier-logistics-platform |

> Render's free tier spins the service down after inactivity — the very
> first request after a period of idle time may take 20–30 seconds to wake
> up. This is expected, not a bug.

### Demo Admin Credentials

```
email:    admin@courierhub.com
password: Admin@12345
```

Also seeded: `courier@courierhub.com` / `Courier@123` and
`customer@courierhub.com` / `Customer@123` — one account per role, for
testing RBAC.

## Tech Stack

- Node.js + TypeScript + Express.js
- PostgreSQL + Prisma ORM (hosted on Neon)
- Zod (validation)
- JWT (Bearer tokens) + bcryptjs (password hashing)
- Google Identity Services (GCP social login)
- Stripe (real payment processing, test mode)
- Redis via Upstash (caching layer — falls back to in-memory if unset)
- Swagger UI / OpenAPI 3.0 (interactive API docs at `/api-docs`)
- helmet, cors, express-rate-limit (security)
- Deployed on Render

## Roles

Three fixed roles, enforced by RBAC middleware on every protected route:

- **CUSTOMER** — creates shipments, pays, tracks their own parcels
- **COURIER** — sees assigned shipments, updates delivery status
- **ADMIN** — manages hubs, assigns couriers, manages users/roles, views stats & audit logs

## Getting Started (running your own copy)

```bash
npm install
cp .env.example .env        # fill in DATABASE_URL, JWT secrets, Stripe keys, etc.
npx prisma generate
npx prisma migrate deploy   # applies the existing migrations
npx prisma db seed          # creates demo admin/courier/customer + hubs
npm run dev                 # http://localhost:5000
```

Production build: `npm run build && npm start`

Interactive API docs, once running: `http://localhost:5000/api-docs`

## ✅ One-Command Verification

A script exercises every mandatory requirement — auth, RBAC across all 3
roles, full CRUD, validation, error handling (401/403/404/422), the shipment
state machine, real Stripe payments, Redis caching, and audit logs — and
prints a pass/fail report:

```bash
node scripts/verify-all.js            # tests localhost:5000
node scripts/verify-all.js --live     # tests the live Render deployment
```

Last run against the live deployment: **31/31 checks passed.**

## API Response Shape

Every endpoint returns this structure, success or failure:

```json
// success
{ "success": true, "message": "Operation successful", "data": {} }

// error
{ "success": false, "message": "Something went wrong", "errors": [] }
```

## Endpoint Map (29 operations across 22 routes, `/api/v1` versioned)

| Area | Method | Route | Access |
|---|---|---|---|
| Auth | POST | `/auth/register` | Public |
| Auth | POST | `/auth/login` | Public |
| Auth | POST | `/auth/google` | Public (GCP social login) |
| Auth | POST | `/auth/refresh-token` | Public (valid refresh token) |
| Auth | POST | `/auth/logout` | Authenticated |
| Profile | GET | `/users/me` | Authenticated |
| Profile | PATCH | `/users/me` | Authenticated |
| Hubs | POST | `/hubs` | Admin |
| Hubs | GET | `/hubs` | Authenticated (paginated) |
| Hubs | GET | `/hubs/:id` | Authenticated |
| Hubs | PATCH | `/hubs/:id` | Admin |
| Hubs | DELETE | `/hubs/:id` | Admin (soft delete) |
| Shipments | POST | `/shipments` | Customer |
| Shipments | GET | `/shipments` | Authenticated (paginated, filter by status, sort) |
| Shipments | GET | `/shipments/search?q=` | Authenticated |
| Shipments | GET | `/shipments/my-assigned` | Courier |
| Shipments | GET | `/shipments/:id` | Authenticated (owner/assignee/admin, includes tracking timeline) |
| Shipments | PATCH | `/shipments/:id` | Authenticated (owner/admin) |
| Shipments | DELETE | `/shipments/:id` | Admin (soft delete) |
| Shipments | POST | `/shipments/:id/assign` | Admin |
| Shipments | PATCH | `/shipments/:id/status` | Admin/Courier (state-machine enforced) |
| Shipments | POST | `/shipments/:id/cancel` | Authenticated |
| Payments | POST | `/payments/initiate` | Customer |
| Payments | POST | `/payments/webhook` | Stripe (signature-verified) |
| Payments | GET | `/payments/:id` | Authenticated |
| Admin | GET | `/admin/dashboard-stats` | Admin (Redis-cached) |
| Admin | GET | `/admin/audit-logs` | Admin |
| Admin | GET | `/admin/users` | Admin (paginated, filter, search) |
| Admin | PATCH | `/admin/users/:id/role` | Admin |

Full interactive reference with request/response schemas: **`/api-docs`**.

## Requirements Checklist → Where It Lives

- **Structured JSON responses** → `src/utils/apiResponse.ts`, used everywhere
- **Validation (Zod)** → one `*.validation.ts` file per module, applied via `src/middleware/validate.ts`
- **Auth + RBAC (3 roles)** → `src/middleware/auth.ts` (`authenticate`, `authorize(...)`)
- **Google/GCP social login** → `src/modules/auth/auth.service.ts::loginWithGoogle` (verifies Google ID token server-side against Google's public keys)
- **Payment integration (real, not simulated)** → `src/modules/payment` — Stripe PaymentIntents + signature-verified webhook is the source of truth for payment status; personally tested end-to-end including a real confirmed charge
- **PostgreSQL + Prisma, relationships, constraints, indexing** → `prisma/schema.prisma` (6 models, FKs, `@@index` on hot query paths)
- **Transactions / race-condition safety** → `shipment.service.ts::assignCourier` and `createShipment` use `prisma.$transaction` to prevent double-assignment and keep shipment+tracking-event writes atomic
- **State machine for shipment status** → `shipment.stateMachine.ts` rejects illegal transitions (verified: `PICKED_UP → DELIVERED` correctly rejected with 400)
- **Pagination** → `GET /shipments`, `/hubs`, `/admin/users`, `/admin/audit-logs`
- **Filtering & sorting** → `GET /shipments?status=&sortBy=&sortOrder=`
- **Search** → `GET /shipments/search?q=`, `admin/users?q=`
- **Soft deletes** → `deletedAt` on User/Hub/Shipment, enforced in every query's `where` (verified at the database row level: record persists, just excluded from queries)
- **Audit logs** → `src/utils/audit.ts`, called on registration, login, role changes, courier assignment, status changes, cancellations, payment events
- **Redis caching** → `src/config/redis.ts` (60s cache on `/admin/dashboard-stats` via Upstash, invalidated on shipment writes); falls back to an in-memory store if `REDIS_URL` is unset
- **Rate limiting** → `src/middleware/rateLimiter.ts` (global + tighter 20-req/15-min limiter on auth routes; verified: 21st rapid login attempt returns 429)
- **Security headers / CORS** → `helmet()` + `cors()` in `src/app.ts`
- **Centralized error handling** → `src/middleware/errorHandler.ts` (handles `ApiError`, Prisma error codes, and unknown errors uniformly)
- **API versioning** → all routes mounted under `/api/v1`
- **API documentation** → Swagger/OpenAPI 3.0 at `/api-docs`, plus a Postman collection (`postman_collection.json`)

## Payment Integration Notes

Stripe is the integration used (test mode, free to set up). The `Payment`
model and flow (`initiate → client confirms → webhook updates status`) is
provider-agnostic: swapping in bKash or SSLCommerz means replacing the
provider calls inside `payment.service.ts` while keeping the same `Payment`
schema, `PaymentStatus` enum, and webhook-is-source-of-truth pattern.

The webhook is the only thing that ever marks a payment `PAID` — the client
can never claim success on its own. This was verified end-to-end: created a
real PaymentIntent, confirmed it with a Stripe test card via the API, and
watched the webhook flip the stored payment status from `PENDING` to `PAID`.

To test locally: `stripe listen --api-key <your_sk_test_key> --forward-to localhost:5000/api/v1/payments/webhook`
using the [Stripe CLI](https://docs.stripe.com/stripe-cli).

## Postman Collection

Import `postman_collection.json`. It's organized to mirror this README:
Auth/Setup, Hubs, Shipments, Validation & Error Handling, Payments, and
Admin (caching & audit logs) — including RBAC failure demos (403s),
validation errors (422), and standard error responses (401/404). Requests
auto-chain tokens and IDs via test scripts — log in once, and every
subsequent request in the collection uses the saved token automatically.

`baseUrl` defaults to the live Render deployment; change it to
`http://localhost:5000/api/v1` to test locally instead.

## Project Structure

```
src/
  config/       env, Prisma client, Redis, Swagger spec
  middleware/   auth, RBAC, validation, error handling, rate limiting
  modules/      auth, users, hubs, shipments, payments, admin
                (each: controller, service, routes, validation)
  utils/        response helpers, ApiError, JWT, pagination, audit logging
  app.ts        Express app wiring
  server.ts     entrypoint
prisma/
  schema.prisma
  migrations/
  seed.ts
scripts/
  verify-all.js  one-command end-to-end test suite
```
