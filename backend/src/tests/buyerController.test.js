const request = require('supertest');
const express = require('express');
const buyerController = require('../controllers/buyerController');

jest.mock('../utils/prismaClient', () => ({
    order: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn()
    }
}));

jest.mock('../utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
}));

jest.mock('../services/notificationService', () => ({
    getBuyerNotifications: jest.fn(),
    updateBuyerPreferences: jest.fn()
}));

jest.mock('../services/buyerIntelligenceService', () => ({
    getSellerBuyerInsights: jest.fn(),
    getBuyerProfileForSeller: jest.fn()
}));

const prisma = require('../utils/prismaClient');
const buyerIntelligenceService = require('../services/buyerIntelligenceService');
const notificationService = require('../services/notificationService');

const app = express();
app.use(express.json());
// Mock user
app.use((req, res, next) => {
    req.user = { id: 'seller123', role: 'SELLER' };
    next();
});

app.get('/api/buyers', buyerController.getSellerBuyers);
app.get('/api/buyers/:buyerId/orders', buyerController.getBuyerOrders);
app.get('/api/buyers/:buyerId/notifications', buyerController.getBuyerNotifications);

describe('Buyer Controller Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/buyers', () => {
        it('should return seller buyers and segments', async () => {
            buyerIntelligenceService.getSellerBuyerInsights.mockResolvedValue({
                profiles: [
                    {
                        buyerId: 'b1',
                        buyer: { fullName: 'John Doe', email: 'john@example.com' },
                        totalSpend: 500,
                        totalOrders: 5,
                        intelligenceScore: 85
                    }
                ],
                bestBuyers: [{ buyerId: 'b1' }],
                repeatCustomers: [],
                highValueBuyers: [],
                bulkOpportunities: []
            });

            const res = await request(app).get('/api/buyers');

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.buyers).toHaveLength(1);
            expect(res.body.buyers[0].name).toBe('John Doe');
            expect(res.body.segments.bestBuyers).toContain('b1');
        });
    });

    describe('GET /api/buyers/:buyerId/orders', () => {
        it('should return buyer orders and intelligence', async () => {
            prisma.order.findMany.mockResolvedValue([
                {
                    id: 'o1',
                    createdAt: new Date().toISOString(),
                    status: 'DELIVERED',
                    items: [
                        {
                            product: { id: 'p1', title: 'Product 1', store: { sellerId: 'seller123' } },
                            quantity: 1,
                            priceAtTime: 50
                        }
                    ]
                }
            ]);
            prisma.order.count.mockResolvedValue(1);
            buyerIntelligenceService.getBuyerProfileForSeller.mockResolvedValue({ score: 90 });

            const res = await request(app).get('/api/buyers/b1/orders');

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.orders).toHaveLength(1);
            expect(res.body.intelligence.score).toBe(90);
        });
    });

    describe('GET /api/buyers/:buyerId/notifications', () => {
        it('should return buyer notifications if they have orders with seller', async () => {
            prisma.order.findFirst.mockResolvedValue({ id: 'o1' });
            notificationService.getBuyerNotifications.mockResolvedValue({
                notifications: [
                    { id: 'n1', message: 'Test message', type: 'INFO' }
                ],
                total: 1
            });

            const res = await request(app).get('/api/buyers/b1/notifications');

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.notifications).toHaveLength(1);
        });

        it('should return 404 if no order exists with seller', async () => {
            prisma.order.findFirst.mockResolvedValue(null);

            const res = await request(app).get('/api/buyers/b1/notifications');

            expect(res.statusCode).toBe(404);
            expect(res.body.message).toMatch(/Buyer not found/);
        });
    });
});
