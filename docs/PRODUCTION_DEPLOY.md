# Production Deploy Guide

This is the checklist for taking W-Commerce live. Items marked **YOU** need your accounts or keys.

## 1. Database (PostgreSQL)

Local dev uses SQLite (`database/prisma/schema.prisma`). **Production uses PostgreSQL**, and the server
refuses to start in production if `DATABASE_URL` is a `file:` URL.

| File | Purpose |
|---|---|
| `database/prisma/schema.prisma` | Source of truth (SQLite, local dev). Edit models here. |
| `database/prisma/postgres/schema.prisma` | **Generated** PostgreSQL schema. Do not edit. |
| `database/prisma/postgres/migrations/` | PostgreSQL migration history, applied with `prisma migrate deploy`. |

After you change a model in `schema.prisma`:

```bash
npm run db:sync-postgres-schema          # regenerate the Postgres schema
# create the migration SQL for the change (needs a Postgres DB reachable via DATABASE_URL):
npx prisma migrate dev --schema=database/prisma/postgres/schema.prisma --name describe_change
```

CI fails if the generated Postgres schema is out of date (`scripts/sync-postgres-schema.cjs --check`).

First deploy (**YOU**: create a managed Postgres, e.g. Neon, Supabase, Railway or RDS):

```bash
export DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?schema=public"
npm run db:migrate:deploy      # creates all 114 tables from the baseline migration
```

The Docker images run `prisma migrate deploy` automatically on start.

> Your existing SQLite data is **not** migrated automatically. Use fresh data in production, or export and
> import what you need.

## 2. Environment (`.env.production`)

`.env.production` is git-ignored and currently contains placeholders. **YOU** must replace every value:

- **Secrets:** `JWT_SECRET` and `SESSION_SECRET` (64+ random chars each), `AES_ENCRYPTION_KEY`, `FILE_ENCRYPTION_KEY`.
  Generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
- **URLs:** `FRONTEND_URL` (your real https domain, used for CORS, OAuth and email links), `WEBAUTHN_RP_ID`,
  `WEBAUTHN_ORIGIN`, `VITE_APP_URL`.
- **Payments:** `STRIPE_*`, `PAYSTACK_*` with **live** keys. Test keys are rejected in production.
- **Services:** `CLOUDINARY_*` (required: local uploads are wiped on redeploy), `SENDGRID_API_KEY`,
  `TWILIO_*` (or `TERMII_API_KEY`) with `SMS_PROVIDER` set, `REDIS_URL`, `SENTRY_DSN`, `GEMINI_API_KEY`, `QLOO_API_KEY`.
- `ALLOW_MOCK_EXTERNAL_APIS` must stay unset. Mock mode is already disabled whenever `NODE_ENV=production`.

## 3. Deploy

```bash
docker compose up -d --build     # db + redis + backend + nginx frontend
```

Set a real `DB_PASSWORD` and `REDIS_PASSWORD` in your shell or `.env` first. The compose defaults are for local use only.
Put a TLS-terminating proxy (Caddy, Cloudflare or your host's load balancer) in front of port 80.

## 4. Smoke test (staging first, Stripe and Paystack in test mode)

1. `GET /health` returns OK.
2. Sign up, verify email, log in (buyer, seller, courier).
3. Place an order and complete a payment, then check the order detail page.
4. Mark a notification read (uses `PATCH`) and toggle courier availability.
5. Upload a product image and confirm it is served from Cloudinary.
