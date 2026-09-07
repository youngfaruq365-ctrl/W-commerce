# W-COMMERCE Security Guide

## Secret Rotation Checklist

> Rotate secrets immediately if:
> - A team member with access leaves
> - A secret is accidentally committed to git
> - A breach or suspicious activity is detected
> - Quarterly (routine rotation)

### How to Rotate Secrets

1. **Generate new secrets**:
   ```bash
   node scripts/generate-production-secrets.cjs
   ```

2. **Update your secrets manager** (AWS Secrets Manager / Doppler / Vault).

3. **Update `.env.production`** with new values.

4. **Restart the server** to pick up new secrets.

5. **Note**: Rotating `JWT_SECRET` will immediately invalidate all existing user sessions — users will need to log in again.

---

## Sensitive Files — Never Commit

| File Pattern | Risk | Action |
|---|---|---|
| `.env`, `.env.*` | Exposes all secrets | Excluded by `.gitignore` |
| `*credentials*.csv` | AWS/API access keys | Delete or move to password manager |
| `*accessKeys*.csv` | AWS IAM keys | Rotate immediately if ever committed |
| `*recovery_code*.txt` | 2FA bypass codes | Store in password manager offline |
| `client_secret*.json` | OAuth app secret | Keep in secrets manager only |

---

## Pre-Production Security Checklist

- [ ] All `.env.production` placeholders replaced with real secrets
- [ ] `FRONTEND_URL` set to actual production domain
- [ ] `DATABASE_URL` points to PostgreSQL (not SQLite)
- [ ] `REDIS_URL` configured for production Redis
- [ ] Stripe/Paystack live keys configured (not test keys)
- [ ] `WEBAUTHN_RP_ID` and `WEBAUTHN_ORIGIN` set to production domain
- [ ] `ENABLE_AI_CHAT=false` unless AI backend is ready
- [ ] Run `./scripts/pre-deploy.sh` and fix all failures
- [ ] Verify no secrets in git history: `git log --all --full-history -- .env`

---

## Paystack Test Keys Found in `.env` (Dev)

⚠️ The development `.env` contains Paystack **test** keys (`sk_test_...`).  
These are safe for development but **must be replaced** with live keys in `.env.production`.  
If these test keys were accidentally pushed to a public repo, rotate them at https://dashboard.paystack.com.
