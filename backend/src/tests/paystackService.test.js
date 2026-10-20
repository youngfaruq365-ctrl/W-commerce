process.env.PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'test_secret';

const https = require('https');
const paystackService = require('../services/paystackService');

jest.mock('https', () => ({
    request: jest.fn()
}));

describe('Paystack Service', () => {
    let mockReq;
    beforeEach(() => {
        mockReq = {
            on: jest.fn(),
            write: jest.fn(),
            end: jest.fn()
        };
        https.request.mockReturnValue(mockReq);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('initializeTransaction should return authorizationUrl', async () => {
        const mockResponseData = {
            status: true,
            data: {
                authorization_url: 'https://checkout.paystack.com/mock',
                reference: 'mock-ref',
                access_code: 'mock-access'
            }
        };

        https.request.mockImplementation((options, cb) => {
            const res = {
                on: jest.fn((event, handler) => {
                    if (event === 'data') {
                        handler(JSON.stringify(mockResponseData));
                    }
                    if (event === 'end') {
                        handler();
                    }
                })
            };
            cb(res);
            return mockReq;
        });

        const result = await paystackService.initializeTransaction({
            email: 'test@example.com',
            amount: 5000,
            reference: 'ref-123'
        });

        expect(result.authorizationUrl).toBe('https://checkout.paystack.com/mock');
        expect(result.reference).toBe('mock-ref');
        expect(https.request).toHaveBeenCalledWith(
            expect.objectContaining({
                method: 'POST',
                path: '/transaction/initialize',
                headers: expect.objectContaining({ Authorization: 'Bearer test_secret' })
            }),
            expect.any(Function)
        );
    });

    test('verifyWebhookSignature should return true for valid signature', () => {
        const crypto = require('crypto');
        const payload = 'mock-payload';
        const signature = crypto.createHmac('sha512', 'test_secret').update(payload).digest('hex');
        
        const result = paystackService.verifyWebhookSignature(payload, signature);
        expect(result).toBe(true);
    });

    test('verifyWebhookSignature should return false for invalid signature', () => {
        const payload = 'mock-payload';
        const signature = 'invalid_signature';
        
        const result = paystackService.verifyWebhookSignature(payload, signature);
        expect(result).toBe(false);
    });
});
