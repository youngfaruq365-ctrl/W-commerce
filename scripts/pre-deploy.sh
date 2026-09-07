#!/bin/bash
# W-COMMERCE — Pre-Deploy Checklist
# Run this script BEFORE deploying to production.
# It validates environment, runs migrations, and verifies the build.

set -e

echo ""
echo "======================================================"
echo "  W-COMMERCE PRE-DEPLOY CHECKLIST"
echo "======================================================"
echo ""

# ── 1. Check required env vars ──────────────────────────────────────────────
echo "[1/5] Checking required environment variables..."
REQUIRED_VARS=("NODE_ENV" "DATABASE_URL" "JWT_SECRET" "SESSION_SECRET" "REDIS_URL" "FRONTEND_URL" "STRIPE_SECRET_KEY" "PAYSTACK_SECRET_KEY")
MISSING=0
for VAR in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!VAR}" ]; then
        echo "    ❌ MISSING: $VAR"
        MISSING=$((MISSING+1))
    fi
done
if [ "$MISSING" -gt 0 ]; then
    echo "    ❌ $MISSING required variable(s) missing. Aborting."
    exit 1
fi
echo "    ✅ All required variables present"

# ── 2. Block placeholder secrets ────────────────────────────────────────────
echo "[2/5] Checking for placeholder secrets..."
for VAR in "JWT_SECRET" "SESSION_SECRET" "STRIPE_SECRET_KEY" "PAYSTACK_SECRET_KEY"; do
    if [[ "${!VAR}" == *"REPLACE"* ]] || [[ "${!VAR}" == *"CHANGE_ME"* ]] || [[ "${!VAR}" == *"placeholder"* ]]; then
        echo "    ❌ $VAR still contains a placeholder value. Set the real secret."
        exit 1
    fi
done
echo "    ✅ No placeholder secrets detected"

# ── 3. Block SQLite in production ───────────────────────────────────────────
echo "[3/5] Checking database URL..."
if [[ "$DATABASE_URL" == file:* ]]; then
    echo "    ❌ DATABASE_URL points to a SQLite file. Use PostgreSQL in production."
    exit 1
fi
echo "    ✅ PostgreSQL database URL detected"

# ── 4. Run database migrations ──────────────────────────────────────────────
echo "[4/5] Running Prisma migrations..."
npx prisma migrate deploy --schema=database/prisma/schema.prisma
echo "    ✅ Migrations applied"

# ── 5. Verify frontend build ─────────────────────────────────────────────────
echo "[5/5] Verifying frontend build output..."
if [ ! -f "frontend/dist/index.html" ]; then
    echo "    ❌ frontend/dist/index.html not found. Run: npm run build:production"
    exit 1
fi
echo "    ✅ Frontend build output verified"

echo ""
echo "======================================================"
echo "  ✅ PRE-DEPLOY CHECKS PASSED — safe to deploy"
echo "======================================================"
echo ""
