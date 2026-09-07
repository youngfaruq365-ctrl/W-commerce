#!/usr/bin/env node
/**
 * W-Commerce — Secret Generator
 * Generates strong cryptographic values for all required environment secrets.
 *
 * Usage: node scripts/generate-secrets.js
 *
 * Output: copy the values into your .env file.
 */

const crypto = require('crypto');

function hex(bytes) {
    return crypto.randomBytes(bytes).toString('hex');
}

const secrets = {
    JWT_SECRET:           hex(64),   // 128-char hex → 512-bit
    SESSION_SECRET:       hex(64),   // 128-char hex → 512-bit
    AES_ENCRYPTION_KEY:   hex(32),   // 64-char hex  → 256-bit
    FILE_ENCRYPTION_KEY:  hex(32),   // 64-char hex  → 256-bit
};

console.log('\n╔══════════════════════════════════════════════════════════════════╗');
console.log('║          W-COMMERCE — GENERATED SECRETS                         ║');
console.log('║  Copy these into your .env file. Do NOT commit them to git.     ║');
console.log('╚══════════════════════════════════════════════════════════════════╝\n');

for (const [key, value] of Object.entries(secrets)) {
    console.log(`${key}=${value}`);
}

console.log('\n# For VAPID push notification keys, run:');
console.log('# npx web-push generate-vapid-keys\n');

console.log('# For Paystack / Stripe / Monnify keys:');
console.log('# Visit the respective developer dashboards (see docs/environment.md)\n');
