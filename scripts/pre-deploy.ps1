# W-COMMERCE — Pre-Deploy Checklist (PowerShell)
# Run: .\scripts\pre-deploy.ps1

$ErrorActionPreference = 'Stop'

Write-Host "`n======================================================" -ForegroundColor Cyan
Write-Host "  W-COMMERCE PRE-DEPLOY CHECKLIST" -ForegroundColor Cyan  
Write-Host "======================================================`n" -ForegroundColor Cyan

# ── 1. Required env vars ─────────────────────────────────────────────────────
Write-Host "[1/5] Checking required environment variables..." -ForegroundColor Yellow
$required = @('NODE_ENV','DATABASE_URL','JWT_SECRET','SESSION_SECRET','REDIS_URL','FRONTEND_URL','STRIPE_SECRET_KEY','PAYSTACK_SECRET_KEY')
$missing = $required | Where-Object { -not [System.Environment]::GetEnvironmentVariable($_) }
if ($missing.Count -gt 0) {
    $missing | ForEach-Object { Write-Host "    ❌ MISSING: $_" -ForegroundColor Red }
    throw "Missing required environment variables"
}
Write-Host "    ✅ All required variables present" -ForegroundColor Green

# ── 2. Placeholder secret check ──────────────────────────────────────────────
Write-Host "[2/5] Checking for placeholder secrets..." -ForegroundColor Yellow
$secrets = @('JWT_SECRET','SESSION_SECRET','STRIPE_SECRET_KEY','PAYSTACK_SECRET_KEY')
foreach ($s in $secrets) {
    $val = [System.Environment]::GetEnvironmentVariable($s)
    if ($val -match 'REPLACE|CHANGE_ME|placeholder') {
        throw "❌ $s still has a placeholder value. Set the real secret."
    }
}
Write-Host "    ✅ No placeholder secrets detected" -ForegroundColor Green

# ── 3. Block SQLite ──────────────────────────────────────────────────────────
Write-Host "[3/5] Checking database URL..." -ForegroundColor Yellow
$dbUrl = [System.Environment]::GetEnvironmentVariable('DATABASE_URL')
if ($dbUrl -match '^file:') { throw '❌ DATABASE_URL points to SQLite. Use PostgreSQL in production.' }
Write-Host "    ✅ PostgreSQL database URL detected" -ForegroundColor Green

# ── 4. Prisma migrations ─────────────────────────────────────────────────────
Write-Host "[4/5] Running Prisma migrations..." -ForegroundColor Yellow
npx prisma migrate deploy --schema=database/prisma/schema.prisma
Write-Host "    ✅ Migrations applied" -ForegroundColor Green

# ── 5. Frontend build ────────────────────────────────────────────────────────
Write-Host "[5/5] Verifying frontend build output..." -ForegroundColor Yellow
if (-not (Test-Path 'frontend/dist/index.html')) {
    throw "❌ frontend/dist/index.html not found. Run: npm run build:production"
}
Write-Host "    ✅ Frontend build output verified" -ForegroundColor Green

Write-Host "`n======================================================" -ForegroundColor Green
Write-Host "  ✅ PRE-DEPLOY CHECKS PASSED — safe to deploy" -ForegroundColor Green
Write-Host "======================================================`n" -ForegroundColor Green
