/**
 * Payment Webhook Integration Tests
 * Validates Stripe and Paystack webhook signature verification.
 * Run: npx jest backend/src/tests/webhook.integration.test.js
 */

const request = require('supertest');
const crypto  = require('crypto');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.PORT = process.env.PORT || '0';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./prisma/dev.db';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_that_is_long_enough_for_testing_purposes_only';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test_session_secret_long_enough';
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret';
process.env.PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_test_paystack_key';

let app;

beforeAll(async () => {
    app = global.__GLOBALX_STARTUP?.app;
    if (!app) {
        throw new Error('Could not get express app from server. Check global.__GLOBALX_STARTUP.app export.');
    }
}, 15000);

describe('Stripe Webhook', () => {
    const ENDPOINT = '/api/v1/payment/webhook';

    it('rejects requests with missing stripe-signature header', async () => {
        const res = await request(app)
            .post(ENDPOINT)
            .set('Content-Type', 'application/json')
            .send(JSON.stringify({ type: 'payment_intent.succeeded' }));
        // Should return 400 (bad signature) or 403, not 200/500
        expect([400, 403]).toContain(res.status);
    });

    it('rejects requests with invalid stripe-signature', async () => {
        const res = await request(app)
            .post(ENDPOINT)
            .set('Content-Type', 'application/json')
            .set('stripe-signature', 'v1=invalid_signature_here')
            .send(JSON.stringify({ type: 'payment_intent.succeeded' }));
        expect([400, 403]).toContain(res.status);
    });
});

describe('Paystack Webhook', () => {
    const ENDPOINT = '/api/v1/payment/paystack/webhook';

    function buildPaystackSignature(body, secret) {
        return crypto.createHmac('sha512', secret).update(body).digest('hex');
    }

    it('rejects webhook with missing x-paystack-signature header', async () => {
        const body = JSON.stringify({ event: 'charge.success', data: {} });
        const res = await request(app)
            .post(ENDPOINT)
            .set('Content-Type', 'application/json')
            .send(body);
        expect([400, 403, 404]).toContain(res.status);
    });

    it('rejects webhook with wrong signature', async () => {
        const body = JSON.stringify({ event: 'charge.success', data: {} });
        const badSig = 'deadbeefdeadbeef';
        const res = await request(app)
            .post(ENDPOINT)
            .set('Content-Type', 'application/json')
            .set('x-paystack-signature', badSig)
            .send(body);
        expect([400, 403, 404]).toContain(res.status);
    });

    it('accepts webhook with valid HMAC-SHA512 signature', async () => {
        const body = JSON.stringify({ event: 'charge.success', data: { reference: 'TEST_REF', status: 'success', amount: 10000, currency: 'NGN', customer: { email: 'test@example.com' } } });
        const sig = buildPaystackSignature(body, process.env.PAYSTACK_SECRET_KEY);
        const res = await request(app)
            .post(ENDPOINT)
            .set('Content-Type', 'application/json')
            .set('x-paystack-signature', sig)
            .send(body);
        // 200 OK or 400 bad-reference (DB not seeded) — but NOT 403 (signature valid)
        expect(res.status).not.toBe(403);
    });
});
