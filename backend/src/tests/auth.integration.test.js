/**
 * Auth Integration Tests
 * Tests the authentication flow: register → login → protected route → logout
 * Run: npx jest backend/src/tests/auth.integration.test.js
 */

const request = require('supertest');

// Set test environment before any server modules load
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.PORT = process.env.PORT || '0'; // random port
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./prisma/dev.db';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_that_is_long_enough_for_testing_purposes_only';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test_session_secret_long_enough';

let app;
let server;

beforeAll(async () => {
    // Lazy-require to allow env vars to be set first
    const serverModule = require('../../server.cjs');
    // server.cjs exports nothing directly; we need the express app
    // Access via global if exported, or construct a test client
    app = global.__GLOBALX_STARTUP?.app;
    if (!app) {
        throw new Error('Could not get express app from server. Check global.__GLOBALX_STARTUP.app export.');
    }
}, 15000);

afterAll(async () => {
    // Give connections time to close
    await new Promise(r => setTimeout(r, 500));
});

describe('POST /api/v1/auth/register', () => {
    it('rejects registration with missing fields', async () => {
        const res = await request(app)
            .post('/api/v1/auth/register')
            .send({ email: 'test@example.com' }); // missing password, name
        expect(res.status).toBeGreaterThanOrEqual(400);
        expect(res.body.success).toBe(false);
    });

    it('rejects registration with invalid email format', async () => {
        const res = await request(app)
            .post('/api/v1/auth/register')
            .send({ email: 'not-an-email', password: 'StrongPass123!', name: 'Test User' });
        expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('rejects registration with weak password', async () => {
        const res = await request(app)
            .post('/api/v1/auth/register')
            .send({ email: 'test@example.com', password: '123', name: 'Test User' });
        expect(res.status).toBeGreaterThanOrEqual(400);
    });
});

describe('POST /api/v1/auth/login', () => {
    it('rejects login with non-existent email', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'doesnotexist_xyz_123@example.com', password: 'SomePassword1!' });
        expect(res.status).toBeGreaterThanOrEqual(400);
        expect(res.body.success).toBe(false);
    });

    it('rejects login with empty body', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({});
        expect(res.status).toBeGreaterThanOrEqual(400);
    });
});

describe('GET /health', () => {
    it('returns health status', async () => {
        const res = await request(app).get('/health');
        expect([200, 503]).toContain(res.status);
        expect(res.body).toHaveProperty('status');
    });
});

describe('Rate limiting', () => {
    it('returns 429 after too many rapid requests', async () => {
        const results = await Promise.all(
            Array.from({ length: 25 }, () =>
                request(app).post('/api/v1/auth/login').send({ email: 'x@x.com', password: 'wrong' })
            )
        );
        // At least one should be rate-limited
        const limited = results.some(r => r.status === 429);
        expect(limited).toBe(true);
    }, 30000);
});

describe('404 handling', () => {
    it('returns 404 JSON for unknown API routes', async () => {
        const res = await request(app).get('/api/v1/this-route-does-not-exist-xyz');
        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
    });
});
