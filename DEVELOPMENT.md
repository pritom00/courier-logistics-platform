# Development Notes

## Local Setup Checklist

1. `npm install`
2. Copy `.env.example` to `.env` and fill in real values (never commit `.env`)
3. `npx prisma generate`
4. `npx prisma migrate deploy` (applies the existing migration) or `npx prisma migrate dev` (creates a new one)
5. `npx prisma db seed`
6. `npm run dev`

## Testing Payments Locally

Use the Stripe CLI to forward webhook events to your local server:



Copy the `whsec_...` value it prints into `STRIPE_WEBHOOK_SECRET` in `.env`.

## Database GUI

`npx prisma studio` opens a browser-based data browser at `localhost:5555` — useful for inspecting soft-deleted records, audit logs, and relations directly.

## Useful Debug Commands

- `git log --oneline` — view commit history
- `npx tsc --noEmit` — type-check without building
- `npm run build` — compile to `dist/`

stripe listen --api-key <your_sk_test_key> --forward-to localhost:5000/api/v1/payments/webhook