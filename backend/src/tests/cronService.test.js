const cronService = require('../services/cronService');
const prisma = require('../utils/prismaClient');
const emailService = require('../services/emailService');

jest.mock('../utils/prismaClient', () => ({
    order: { findMany: jest.fn(), updateMany: jest.fn() },
    user: { findMany: jest.fn(), deleteMany: jest.fn() },
    pool: { findMany: jest.fn(), update: jest.fn() },
    notification: { create: jest.fn() },
    session: { deleteMany: jest.fn() },
    cart: { findMany: jest.fn() }
}));

jest.mock('../services/emailService', () => ({
    sendVerificationReminder: jest.fn()
}));

jest.mock('../controllers/paymentController', () => ({
    processEscrowRelease: jest.fn()
}));

jest.mock('jsonwebtoken', () => ({
    sign: jest.fn(() => 'mock-token')
}));

describe('Cron Service', () => {
    let originalEnv;

    beforeEach(() => {
        originalEnv = process.env;
        process.env = { ...originalEnv, JWT_SECRET: 'mock-secret' };
        jest.clearAllMocks();
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    test('checkEscrowStatus should process eligible orders', async () => {
        const { processEscrowRelease } = require('../controllers/paymentController');
        prisma.order.findMany.mockResolvedValue([{ id: 'order1' }, { id: 'order2' }]);
        
        await cronService.checkEscrowStatus();
        
        expect(prisma.order.findMany).toHaveBeenCalled();
        expect(processEscrowRelease).toHaveBeenCalledTimes(2);
        expect(processEscrowRelease).toHaveBeenCalledWith('order1', 'SYSTEM_AUTO');
        expect(processEscrowRelease).toHaveBeenCalledWith('order2', 'SYSTEM_AUTO');
    });

    test('sendVerificationReminders should send emails', async () => {
        prisma.user.findMany.mockResolvedValue([
            { id: 'u1', email: 'test1@example.com', createdAt: new Date() }
        ]);

        await cronService.sendVerificationReminders();

        expect(prisma.user.findMany).toHaveBeenCalled();
        expect(emailService.sendVerificationReminder).toHaveBeenCalledTimes(1);
        expect(emailService.sendVerificationReminder).toHaveBeenCalledWith(
            'test1@example.com',
            expect.any(Object)
        );
    });

    test('cleanupUnverifiedAccounts should delete old accounts', async () => {
        prisma.user.deleteMany.mockResolvedValue({ count: 5 });

        await cronService.cleanupUnverifiedAccounts();

        expect(prisma.user.deleteMany).toHaveBeenCalled();
    });
});
