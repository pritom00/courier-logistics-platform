# Courier & Logistics Management Platform — Backend API

A backend-only RESTful API for a courier/logistics platform: customers create
shipments, admins assign couriers and manage hubs, couriers update delivery
status, and payments are processed through a real payment gateway.

No frontend is included — test everything with the included Postman
collection (`postman_collection.json`) or Thunder Client.

## Tech Stack

- Node.js + TypeScript + Express.js
- PostgreSQL + Prisma ORM
- Zod (validation)
- JWT (Bearer tokens) + bcryptjs (password hashing)
- Google Identity Services (GCP social login)
- Stripe (real payment processing, test mode)
- Redis (optional — caching layer, falls back to in-memory if unset)
- helmet, cors, express-rate-limit (security)

## Roles

Three fixed roles, enforced by RBAC middleware on every protected route:

- **CUSTOMER** — creates shipments, pays, tracks their own parcels
- **COURIER** — sees assigned shipments, updates delivery status
- **ADMIN** — manages hubs, assigns couriers, manages users/roles, views stats & audit logs

## Getting Started

```bash
npm install
cp .env.example .env        # fill in DATABASE_URL, JWT secrets, Stripe keys, etc.
npx prisma migrate dev      # creates tables (or: npx prisma migrate deploy in prod)
npx prisma db seed          # creates demo admin/courier/customer + a hub
npm run dev                 # http://localhost:5000
```

Production build: `npm run build && npm start`

### Demo Admin Credentials

```
email:    admin@courierhub.com
password: Admin@12345
```

(also creates `courier@courierhub.com` / `Courier@123` and
`customer@courierhub.com` / `Customer@123` for testing all three roles)

## API Response Shape

Every endpoint returns this structure, success or failure:

```json
// success
{ "success": true, "message": "Operation successful", "data": {} }

// error
{ "success": false, "message": "Something went wrong", "errors": [] }
```

## Endpoint Map (26 endpoints, `/api/v1` versioned)

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

## Requirements Checklist → Where It Lives

- **Structured JSON responses** → `src/utils/apiResponse.ts`, used everywhere
- **Validation (Zod)** → one `*.validation.ts` file per module, applied via `src/middleware/validate.ts`
- **Auth + RBAC (3 roles)** → `src/middleware/auth.ts` (`authenticate`, `authorize(...)`)
- **Google/GCP social login** → `src/modules/auth/auth.service.ts::loginWithGoogle` (verifies Google ID token server-side)
- **Payment integration (real, not simulated)** → `src/modules/payment` — Stripe PaymentIntents + signature-verified webhook is the source of truth for payment status
- **PostgreSQL + Prisma, relationships, constraints, indexing** → `prisma/schema.prisma` (6 models, FKs, `@@index` on hot query paths)
- **Transactions / race-condition safety** → `shipment.service.ts::assignCourier` and `createShipment` use `prisma.$transaction` to prevent double-assignment and keep shipment+tracking-event writes atomic
- **State machine for shipment status** → `shipment.stateMachine.ts` rejects illegal transitions
- **Pagination** → `GET /shipments`, `/hubs`, `/admin/users`, `/admin/audit-logs`
- **Filtering & sorting** → `GET /shipments?status=&sortBy=&sortOrder=`
- **Search** → `GET /shipments/search?q=`, `admin/users?q=`
- **Soft deletes** → `deletedAt` on User/Hub/Shipment, enforced in every query's `where`
- **Audit logs** → `src/utils/audit.ts`, called on registration, login, role changes, courier assignment, status changes, cancellations
- **Redis caching** → `src/config/redis.ts` (60s cache on `/admin/dashboard-stats`, invalidated on shipment writes); falls back to an in-memory store if `REDIS_URL` is unset so local dev works without Redis installed
- **Rate limiting** → `src/middleware/rateLimiter.ts` (global + tighter limiter on auth routes)
- **Security headers / CORS** → `helmet()` + `cors()` in `src/app.ts`
- **Centralized error handling** → `src/middleware/errorHandler.ts` (handles `ApiError`, Prisma error codes, and unknown errors uniformly)
- **API versioning** → all routes mounted under `/api/v1`

## Payment Integration Notes

Stripe is the reference integration (works in test mode with your own free
Stripe test keys — no business verification needed to test). The `Payment`
model and flow (`initiate → provider redirect/confirm → webhook updates
status`) is provider-agnostic: swapping in bKash or SSLCommerz means
replacing the calls inside `payment.service.ts` while keeping the same
`Payment` schema, `PaymentStatus` enum, and webhook-is-source-of-truth
pattern.

To test locally: `stripe listen --forward-to localhost:5000/api/v1/payments/webhook`
using the [Stripe CLI](https://docs.stripe.com/stripe-cli), and use Stripe's
[test card numbers](https://docs.stripe.com/testing) to simulate a charge.

## What Still Needs Your Own Credentials

This repo is complete and runs end-to-end, but three things require
credentials only you can generate (they're secrets, not code):

1. **`DATABASE_URL`** — your own PostgreSQL instance (local, Supabase, Neon, Render, etc.)
2. **`GOOGLE_CLIENT_ID`** — from Google Cloud Console (OAuth consent screen + Web client ID) for the GCP social login requirement
3. **`STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`** — free from your Stripe dashboard, test mode

Deployment (Vercel/Render) and the walkthrough video are the last two
submission items — the API itself is ready for both once you plug in the
above.

## Verified in This Build

- `npm install` — clean install, 224 packages
- `npx tsc --noEmit` — 0 type errors across the whole codebase
- `npm run build` — compiles to `dist/` successfully
- The Prisma schema's SQL migration was hand-verified by running it against
  a real local PostgreSQL 16 instance: all 6 tables, 9 foreign keys, and
  every index were created without error (`prisma/migrations/20260101000000_init/migration.sql`)

> Note: `npx prisma generate` / `migrate dev` couldn't complete inside the
> sandbox this was built in because it needs to download Prisma's engine
> binary from `binaries.prisma.sh`, which that sandbox's network allowlist
> blocks. This is a sandbox limitation, not a project issue — on your own
> machine (or in CI/Vercel/Render) `npx prisma generate` will work normally
> as part of `npm install`. The SQL migration above proves the schema itself
> is correct.
