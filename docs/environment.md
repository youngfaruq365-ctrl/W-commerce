# W-Commerce — Environment Variables Reference

> **Last updated:** Phase 2 infrastructure hardening  
> For each environment, copy `.env.example` and fill in the values.  
> **Never commit `.env`, `.env.production`, or any file with real secrets.**

---

## Quick Setup

```bash
# 1. Copy the template
cp .env.example .env

# 2. Generate required secrets
node scripts/generate-secrets.cjs

# 3. Fill in payment keys, email, SMS (see sections below)

# 4. Start
npm run dev:all
```

---

## Variable Reference

### Server

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `NODE_ENV` | ✅ | `development` | Runtime environment. Accepted: `development`, `staging`, `production` |
| `PORT` | ✅ | `5000` | Backend HTTP port |
| `FRONTEND_URL` | ✅ | `http://localhost:5175` | Frontend origin — used in CORS, OAuth redirects, WebAuthn |
| `CLIENT_URL` | — | same as `FRONTEND_URL` | Alias used in some service files — keep in sync |
| `BASE_PATH` | — | *(empty)* | URL prefix for subfolder deployments (e.g. `/app`) |

---

### Database

| Variable | Required | Example | Purpose |
|---|---|---|---|
| `DATABASE_URL` | ✅ | `file:./prisma/dev.db` | Prisma connection URL |

**Development:** SQLite — `DATABASE_URL=file:./prisma/dev.db`  
**Production:** PostgreSQL required — `DATABASE_URL=postgresql://user:pass@host:5432/dbname?schema=public`

> ⚠️ The server **refuses to start** in `production` mode if `DATABASE_URL` points to a `file:` SQLite database.

---

### Redis

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `REDIS_URL` | Prod only | — | Redis connection URL |
| `REDIS_SESSION_PREFIX` | — | `sess:` | Key prefix for session entries in Redis |
| `REDIS_CONNECT_RETRIES` | — | `5` | Max connection retry attempts |
| `REDIS_RETRY_BASE_MS` | — | `1000` | Base delay (ms) between retries (exponential backoff) |

> In development without Redis, the server falls back to in-memory session storage. **All sessions are lost on restart.**  
> In production, `REDIS_URL` is required — the server refuses to start without it.

---

### Security

| Variable | Required | Min Length | Purpose |
|---|---|---|---|
| `JWT_SECRET` | ✅ | 32 (64 in prod) | Signs JWT access tokens. **Generate with:** `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `SESSION_SECRET` | ✅ | 16 | Signs Express session cookies |
| `AES_ENCRYPTION_KEY` | Prod | 32 bytes (64 hex) | AES-256 encryption for sensitive DB fields |
| `FILE_ENCRYPTION_KEY` | Prod | 32 bytes (64 hex) | Encrypts stored files |

> The validator detects known weak/placeholder secrets and blocks startup in production.

---

### WebAuthn / Passkeys

| Variable | Required | Example | Purpose |
|---|---|---|---|
| `WEBAUTHN_RP_NAME` | — | `W-Commerce` | Displayed to users during passkey setup |
| `WEBAUTHN_RP_ID` | — | `localhost` (dev), `yourdomain.com` (prod) | Must match the domain — **cannot be `localhost` in production** |
| `WEBAUTHN_ORIGIN` | — | `http://localhost:5175` | Full origin URL — must use `https://` in production |

> WebAuthn defaults to `localhost` values if not set. The validator blocks startup if `WEBAUTHN_RP_ID=localhost` in production.

---

### Payment Gateways

#### Paystack (NGN — Primary)
| Variable | Purpose |
|---|---|
| `PAYSTACK_SECRET_KEY` | Server-side API calls, webhook verification |
| `PAYSTACK_PUBLIC_KEY` | Frontend initialization |
| `PAYSTACK_PRIMARY_SECRET_KEY` | Alias used in some service files — keep in sync with `PAYSTACK_SECRET_KEY` |

Get keys: [https://dashboard.paystack.com/#/settings/developers](https://dashboard.paystack.com/#/settings/developers)

#### Stripe (USD — International)
| Variable | Purpose |
|---|---|
| `STRIPE_SECRET_KEY` | Server-side API calls |
| `STRIPE_PUBLISHABLE_KEY` | Frontend initialization |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification |
| `STRIPE_CONNECT_CLIENT_ID` | Marketplace split payments |
| `STRIPE_CONNECT_SECRET` | Connect API calls |

#### Monnify (NGN — Alternative)
| Variable | Purpose |
|---|---|
| `MONNIFY_API_KEY` | API authentication |
| `MONNIFY_SECRET_KEY` | Request signing |
| `MONNIFY_CONTRACT_CODE` | Identifies your merchant contract |

#### Platform Economics
| Variable | Default | Purpose |
|---|---|---|
| `DEFAULT_PROVIDER` | `PAYSTACK` | Default gateway: `PAYSTACK` \| `STRIPE` \| `MONNIFY` |
| `PLATFORM_COMMISSION_RATE` | `0.05` | Platform fee as decimal (0.05 = 5%) |
| `SHIPPING_BASE_RATE` | `750` | Base shipping in NGN (overridden per-seller) |

---

### Social Authentication

| Variable | Purpose |
|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Must match Google Console authorized redirect URI |

Get credentials: [https://console.developers.google.com](https://console.developers.google.com)

---

### Email

**Option A — SendGrid (recommended)**
| Variable | Purpose |
|---|---|
| `SENDGRID_API_KEY` | SendGrid API key |
| `EMAIL_FROM` | Sender address |
| `EMAIL_FROM_NAME` | Display name |

**Option B — SMTP**
| Variable | Purpose |
|---|---|
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP port (usually 587 or 465) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |

| Variable | Default | Purpose |
|---|---|---|
| `ALLOW_EMAIL_SIMULATION` | `true` (dev) | When `true`, emails are logged to console only |

---

### SMS

| Variable | Default | Purpose |
|---|---|---|
| `SMS_PROVIDER` | `SIMULATION` | Provider: `TWILIO` \| `TERMII` \| `SIMULATION` |
| `SMS_FROM_NUMBER` | — | Sender number in E.164 format |
| `ALLOW_SMS_SIMULATION` | `true` (dev) | When `true`, OTP codes logged to console |

**Twilio**
| Variable | Purpose |
|---|---|
| `TWILIO_ACCOUNT_SID` | Account identifier |
| `TWILIO_AUTH_TOKEN` | Auth token |
| `TWILIO_VERIFY_SID` | Verify Service SID (for OTP) |
| `TWILIO_FROM_NUMBER` | Twilio phone number |

**Termii**
| Variable | Purpose |
|---|---|
| `TERMII_API_KEY` | API key |
| `TERMII_API_URL` | Optional, defaults to `https://v4.api.termii.com/` |

---

### Push Notifications (Web Push / VAPID)

| Variable | Purpose |
|---|---|
| `VAPID_PUBLIC_KEY` | Sent to the browser to subscribe |
| `VAPID_PRIVATE_KEY` | Signs push messages on the server |

Generate: `npx web-push generate-vapid-keys`

---

### AI & External APIs

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Google Gemini — powers AI assistant (Phase integration) |
| `GOOGLE_MAPS_API_KEY` | Delivery routing, pickup station map |
| `EXCHANGE_RATE_API_KEY` | Live exchange rates for multi-currency wallet |
| `TRACKING_PROVIDER` | External courier tracking provider name |
| `TRACKING_API_KEY` | External courier tracking API key |

---

### Storage

**Option A — Cloudinary**
| Variable | Purpose |
|---|---|
| `CLOUDINARY_CLOUD_NAME` | Cloud name |
| `CLOUDINARY_API_KEY` | API key |
| `CLOUDINARY_API_SECRET` | API secret |

**Option B — AWS S3**
| Variable | Purpose |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM access key |
| `AWS_SECRET_ACCESS_KEY` | IAM secret |
| `AWS_S3_BUCKET_NAME` | Bucket name |
| `AWS_REGION` | AWS region (e.g. `eu-west-1`) |

> Without cloud storage, uploads are saved to `backend/storage/uploads/` locally.

---

### Feature Flags

| Variable | Default | Purpose |
|---|---|---|
| `ENABLE_CRON_JOBS` | `true` | Enable background scheduled jobs |
| `ENABLE_SOCKETS` | `true` | Enable Socket.IO realtime |
| `ENABLE_PAYMENTS` | `true` | Enable payment endpoints |
| `ENABLE_SOCIAL_LOGIN` | `true` | Enable Google / Apple OAuth |
| `ENABLE_NOTIFICATIONS` | `true` | Enable in-app notification engine |
| `ALLOW_MOCK_EXTERNAL_APIS` | `true` (dev) | Allow stub responses for unconfigured services |
| `ENABLE_REAL_INVENTORY_SYNC` | `false` | Enable live inventory sync with external warehouses |

---

### Operational

| Variable | Default | Purpose |
|---|---|---|
| `LOG_LEVEL` | `info` | Winston log level: `error` \| `warn` \| `info` \| `http` \| `debug` |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window in ms (15 minutes) |
| `RATE_LIMIT_MAX` | `100` | Max requests per window per IP |
| `BULK_REQUEST_THRESHOLD` | `100` | Item count above which batch operations trigger |
| `REDIS_SESSION_PREFIX` | `sess:` | Redis key prefix for session data |

---

## Generating Secrets

Use the included script:

```bash
node scripts/generate-secrets.cjs
```

Or manually:

```bash
# 64-char hex (JWT_SECRET, SESSION_SECRET)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 32-char hex (AES_ENCRYPTION_KEY, FILE_ENCRYPTION_KEY)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# VAPID keys
npx web-push generate-vapid-keys
```

---

## Production Checklist

- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL` points to PostgreSQL (not `file:`)
- [ ] `REDIS_URL` is set and Redis is reachable
- [ ] `JWT_SECRET` is ≥ 64 characters and random
- [ ] `SESSION_SECRET` is ≥ 32 characters and random
- [ ] `WEBAUTHN_RP_ID` is your actual domain (not `localhost`)
- [ ] `WEBAUTHN_ORIGIN` uses `https://`
- [ ] At least one payment gateway is fully configured
- [ ] `SENDGRID_API_KEY` or SMTP configured (not simulation)
- [ ] `SMS_PROVIDER` set to `TWILIO` or `TERMII` (not `SIMULATION`)
- [ ] `ALLOW_EMAIL_SIMULATION=false`
- [ ] `ALLOW_SMS_SIMULATION=false`
- [ ] `ALLOW_MOCK_EXTERNAL_APIS=false`
- [ ] HTTPS enforced at reverse proxy (nginx/Caddy)
