// Set required env vars BEFORE any module is loaded
process.env.JWT_SECRET = 'test_jwt_secret_that_is_long_enough_for_testing_purposes_only';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const express = require('express');
const authController = require('../controllers/authController');

// Mock dependencies
jest.mock('../utils/prismaClient', () => ({
    user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },
    store: {
        create: jest.fn(),
    },
    userSession: {
        create: jest.fn(),
        updateMany: jest.fn(),
        findMany: jest.fn()
    }
}));

jest.mock('../services/emailService', () => ({
    sendVerificationCode: jest.fn(),
    sendPasswordResetOTP: jest.fn()
}));

jest.mock('../services/smsService', () => ({
    sendVerificationCode: jest.fn()
}));

jest.mock('../utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
}));

const prisma = require('../utils/prismaClient');

const app = express();
app.use(express.json());

app.post('/api/auth/signup', authController.signup);
app.post('/api/auth/login', authController.login);
app.post('/api/auth/verify', authController.verifyOTP);

describe('Auth Controller Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/auth/signup', () => {
        it('should register a new user successfully', async () => {
            prisma.user.findUnique.mockResolvedValue(null);
            prisma.user.create.mockResolvedValue({
                id: '1',
                fullName: 'Test User',
                email: 'test@example.com',
                role: 'BUYER'
            });
            prisma.user.update.mockResolvedValue({});

            const res = await request(app)
                .post('/api/auth/signup')
                .send({
                    fullName: 'Test User',
                    email: 'test@example.com',
                    password: 'Password123!',
                    role: 'BUYER'
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(prisma.user.create).toHaveBeenCalled();
        });

        it('should return error if user already exists', async () => {
            prisma.user.findUnique.mockResolvedValue({ id: '1', email: 'test@example.com' });

            const res = await request(app)
                .post('/api/auth/signup')
                .send({
                    fullName: 'Test User',
                    email: 'test@example.com',
                    password: 'Password123!'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('User already exists');
        });
    });

    describe('POST /api/auth/login', () => {
        it('should login a user successfully', async () => {
            const bcrypt = require('bcryptjs');
            jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

            prisma.user.findUnique.mockResolvedValue({
                id: '1',
                email: 'test@example.com',
                passwordHash: 'hashedpassword',
                isVerified: true,
                role: 'BUYER',
                failedLoginAttempts: 0,
                lockoutUntil: null
            });

            // login resets failedLoginAttempts only if > 0; still mock it
            prisma.user.update.mockResolvedValue({});
            prisma.userSession.create.mockResolvedValue({ id: 'session1' });

            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'Password123!'
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.user.email).toBe('test@example.com');
        });

        it('should fail if user is not verified', async () => {
            prisma.user.findUnique.mockResolvedValue({
                id: '1',
                email: 'test@example.com',
                isVerified: false
            });

            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'Password123!'
                });

            expect(res.statusCode).toBe(403);
            expect(res.body.message).toMatch(/verify your email/);
        });
    });
});
