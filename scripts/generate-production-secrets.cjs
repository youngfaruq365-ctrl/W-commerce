#!/usr/bin/env node
/**
 * W-COMMERCE — Production Secret Generator
 * Run: node scripts/generate-production-secrets.cjs
 * Generates strong secrets for JWT_SECRET, SESSION_SECRET, AES_ENCRYPTION_KEY, FILE_ENCRYPTION_KEY
 * and prints a ready-to-copy .env.production block.
 */

const crypto = require('crypto');

const jwt        = crypto.randomBytes(64).toString('hex');   // 128 hex chars
const session    = crypto.randomBytes(64).toString('hex');   // 128 hex chars
const aes        = crypto.randomBytes(32).toString('hex');   // 64 hex chars  (AES-256 key)
const fileEnc    = crypto.randomBytes(32).toString('hex');   // 64 hex chars
const vapidKeys  = (() => {
    try {
        const { generateVAPIDKeys } = require('web-push');
        return generateVAPIDKeys();
    } catch (e) {
        return { publicKey: '<run: npx web-push generate-vapid-keys>', privateKey: '<run: npx web-push generate-vapid-keys>' };
    }
})();

console.log('\n🔑  GENERATED PRODUCTION SECRETS — copy into your secrets manager / .env.production');
console.log('=' .repeat(72));
console.log('# ── Core Security ──────────────────────────────────────────────────────────');
console.log(`JWT_SECRET=${jwt}`);
console.log(`SESSION_SECRET=${session}`);
console.log(`AES_ENCRYPTION_KEY=${aes}`);
console.log(`FILE_ENCRYPTION_KEY=${fileEnc}`);
console.log('\n# ── Web Push (VAPID) ───────────────────────────────────────────────────────');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log('=' .repeat(72));
console.log('\n⚠️  Store these in a secrets manager (AWS Secrets Manager, Doppler, Vault).');
console.log('⚠️  NEVER commit these values to git.');
console.log('✅  Secrets generated at: ' + new Date().toISOString() + '\n');
