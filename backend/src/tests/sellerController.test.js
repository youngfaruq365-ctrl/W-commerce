const request = require('supertest');
const express = require('express');
const sellerController = require('../controllers/sellerController');

jest.mock('../utils/prismaClient', () => ({
    user: {
        findUnique: jest.fn(),
        update: jest.fn()
    },
    store: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
    },
    sellerFollow: {
        count: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        delete: jest.fn()
    },
    review: {
        aggregate: jest.fn()
    },
    order: {
        count: jest.fn()
    }
}));

jest.mock('../utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
}));

const prisma = require('../utils/prismaClient');
const app = express();
app.use(express.json());

// Mock user
app.use((req, res, next) => {
    req.user = { id: 'user123', role: 'BUYER' };
    next();
});

app.get('/api/sellers/:sellerId', sellerController.getSellerProfile);
app.post('/api/sellers/onboarding', sellerController.sellerOnboarding);
app.post('/api/sellers/:sellerId/follow', sellerController.followSeller);
app.post('/api/sellers/integration', sellerController.connectIntegration);

describe('Seller Controller Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/sellers/:sellerId', () => {
        it('should return seller profile without private data', async () => {
            prisma.user.findUnique.mockResolvedValue({
                id: 's1',
                fullName: 'Test Seller',
                isVerified: true,
                role: 'SELLER',
                store: {
                    id: 'store1',
                    storeName: 'Test Store',
                    _count: { products: 10 },
                    products: [
                        { id: 'p1', title: 'Product 1', price: 100 }
                    ]
                }
            });
            prisma.sellerFollow.count.mockResolvedValue(5);
            prisma.review.aggregate.mockResolvedValue({ _count: { id: 2 }, _avg: { rating: 4.5 } });
            prisma.order.count.mockResolvedValue(10);

            const res = await request(app).get('/api/sellers/s1');

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.seller.name).toBe('Test Seller');
            expect(res.body.seller.stats.rating).toBe(4.5);
            expect(res.body.seller.store.name).toBe('Test Store');
        });

        it('should return 404 if seller not found or not a seller', async () => {
            prisma.user.findUnique.mockResolvedValue({ role: 'BUYER' });
            
            const res = await request(app).get('/api/sellers/s1');

            expect(res.statusCode).toBe(404);
        });
    });

    describe('POST /api/sellers/onboarding', () => {
        it('should create store if not exists and update role', async () => {
            prisma.store.findFirst.mockResolvedValue(null);
            prisma.store.create.mockResolvedValue({ id: 'newStore' });
            prisma.user.update.mockResolvedValue({});

            const res = await request(app)
                .post('/api/sellers/onboarding')
                .send({
                    businessName: 'My Business',
                    country: 'US'
                });

            expect(res.statusCode).toBe(200);
            expect(prisma.store.create).toHaveBeenCalled();
            expect(prisma.user.update).toHaveBeenCalledWith(
                expect.objectContaining({ data: { role: 'SELLER' } })
            );
        });
    });

    describe('POST /api/sellers/:sellerId/follow', () => {
        it('should toggle follow status', async () => {
            // First mock not following
            prisma.sellerFollow.findFirst.mockResolvedValue(null);
            prisma.sellerFollow.create.mockResolvedValue({ id: 'f1' });

            const res = await request(app).post('/api/sellers/s1/follow');
            expect(res.statusCode).toBe(200);
            expect(res.body.isFollowing).toBe(true);
            expect(prisma.sellerFollow.create).toHaveBeenCalled();
        });
    });

    describe('POST /api/sellers/integration', () => {
        it('should connect integration successfully', async () => {
            const res = await request(app)
                .post('/api/sellers/integration')
                .send({ platform: 'SHOPIFY', apiKey: 'testkey' });

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toMatch(/connected successfully/);
        });
    });
});
