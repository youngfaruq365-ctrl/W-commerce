const request = require('supertest');
const express = require('express');
const adminController = require('../controllers/adminController');

jest.mock('../utils/prismaClient', () => ({
    transaction: {
        aggregate: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn()
    },
    user: {
        count: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn()
    },
    order: {
        count: jest.fn(),
        aggregate: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn()
    },
    pageView: {
        count: jest.fn()
    },
    payout: {
        aggregate: jest.fn(),
        findMany: jest.fn()
    },
    dispute: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn()
    },
    systemLog: {
        create: jest.fn(),
        findMany: jest.fn()
    },
    verificationRequest: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn()
    },
    store: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn()
    },
    promoCode: {
        findMany: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn()
    }
}));

jest.mock('../utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
}));

jest.mock('../services/socketService', () => ({
    getOnlineCount: jest.fn(() => 5)
}));

jest.mock('../services/subscriptionService', () => ({
    finalizeSubscription: jest.fn()
}));

jest.mock('../services/walletService', () => ({
    credit: jest.fn()
}));

const prisma = require('../utils/prismaClient');
const app = express();
app.use(express.json());
// Add a mock user to request
app.use((req, res, next) => {
    req.user = { id: 'admin123', role: 'ADMIN' };
    next();
});

app.get('/api/admin/wallet-stats', adminController.getWalletStats);
app.get('/api/admin/stats', adminController.getStats);
app.post('/api/admin/resolve-dispute', adminController.resolveDispute);

describe('Admin Controller Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/admin/wallet-stats', () => {
        it('should return wallet statistics', async () => {
            prisma.transaction.aggregate
                .mockResolvedValueOnce({ _sum: { amount: 1000 } }) // Purchases
                .mockResolvedValueOnce({ _sum: { amount: 200 } })  // Escrow Release
                .mockResolvedValueOnce({ _sum: { amount: 50 } });  // Refund
            prisma.payout.aggregate.mockResolvedValueOnce({ _sum: { amount: 100 } }); // Pending Payouts

            const res = await request(app).get('/api/admin/wallet-stats');

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.stats.platformRevenue).toBe(100); // 10% of 1000
            expect(res.body.stats.totalVolume).toBe(1000);
        });
    });

    describe('GET /api/admin/stats', () => {
        it('should return overall dashboard stats', async () => {
            prisma.user.count.mockResolvedValue(100);
            prisma.order.count.mockResolvedValue(10);
            prisma.order.aggregate.mockResolvedValue({ _sum: { totalAmount: 500 } });
            prisma.pageView.count.mockResolvedValue(50);

            const res = await request(app).get('/api/admin/stats');

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.totalUsers).toBe(100);
            expect(res.body.activeUsers).toBe(5); // from mock getOnlineCount
            expect(res.body.gmv24h).toBe(500);
        });
    });

    describe('POST /api/admin/resolve-dispute', () => {
        it('should successfully resolve a dispute in favor of buyer', async () => {
            prisma.dispute.findUnique.mockResolvedValue({
                id: 'disp1',
                buyerId: 'b1',
                orderId: 'o1',
                order: { totalAmount: 50 }
            });
            prisma.dispute.update.mockResolvedValue({ id: 'disp1', status: 'RESOLVED_REFUNDED' });

            const res = await request(app)
                .post('/api/admin/resolve-dispute')
                .send({ disputeId: 'disp1', status: 'RESOLVED_REFUNDED', resolution: 'Refunded buyer' });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(prisma.systemLog.create).toHaveBeenCalled();
            expect(prisma.transaction.create).toHaveBeenCalled();
        });
    });
});
