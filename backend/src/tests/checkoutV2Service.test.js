const checkoutV2Service = require('../services/checkoutV2Service');
const prisma = require('../utils/prismaClient');
const Stripe = require('stripe');
const inventoryService = require('../services/inventoryService');

jest.mock('../utils/prismaClient', () => ({
    $transaction: jest.fn(),
    cart: { findUnique: jest.fn() },
    product: { findMany: jest.fn() },
    marketplaceOrder: { findUnique: jest.fn(), update: jest.fn() },
    promoCode: { findUnique: jest.fn(), update: jest.fn() },
    promoCodeUsage: { count: jest.fn(), create: jest.fn() },
    address: { findUnique: jest.fn() }
}));

jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => ({
        paymentIntents: {
            create: jest.fn()
        }
    }));
});

jest.mock('../services/inventoryService', () => ({
    reserve: jest.fn()
}));

describe('Checkout V2 Service', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should throw error if cart is empty', async () => {
        prisma.cart.findUnique.mockResolvedValue(null);
        await expect(checkoutV2Service.processCheckoutV2({ buyerId: 'user1', fromCart: true }))
            .rejects.toThrow('Your cart is empty.');
    });

    test('should throw error if product is out of stock', async () => {
        const mockCart = { items: [{ productId: 'p1', quantity: 2 }] };
        const mockProduct = { id: 'p1', stock: 1, title: 'Item 1', store: { sellerId: 'seller1' }, price: 100 };
        prisma.cart.findUnique.mockResolvedValue(mockCart);
        prisma.product.findMany.mockResolvedValue([mockProduct]);
        
        await expect(checkoutV2Service.processCheckoutV2({ buyerId: 'user1', fromCart: true }))
            .rejects.toThrow(/Insufficient stock for "Item 1"/);
    });

    test('should process checkout successfully', async () => {
        const mockCart = { id: 'cart1', items: [{ productId: 'p1', quantity: 1 }] };
        const mockProduct = { id: 'p1', stock: 10, title: 'Item 1', store: { sellerId: 'seller1', id: 'store1' }, price: 100 };
        
        prisma.cart.findUnique.mockResolvedValue(mockCart);
        prisma.product.findMany.mockResolvedValue([mockProduct]);
        
        prisma.$transaction.mockImplementation(async (cb) => {
            const tx = {
                marketplaceOrder: { create: jest.fn().mockResolvedValue({ id: 'mo1' }) },
                fulfillmentOrder: { create: jest.fn().mockResolvedValue({ id: 'fo1', items: [] }) },
                cart: { findUnique: jest.fn().mockResolvedValue(mockCart) },
                cartItem: { deleteMany: jest.fn() }
            };
            return cb(tx);
        });

        inventoryService.reserve.mockResolvedValue({ id: 'res1' });
        
        const result = await checkoutV2Service.processCheckoutV2({ buyerId: 'user1', fromCart: true });
        
        expect(prisma.cart.findUnique).toHaveBeenCalledWith({ where: { userId: 'user1' }, include: { items: true } });
        expect(prisma.product.findMany).toHaveBeenCalledWith({ where: { id: { in: ['p1'] } }, include: { store: true } });
        expect(prisma.$transaction).toHaveBeenCalled();
        expect(result).toHaveProperty('marketplaceOrder');
        expect(result).toHaveProperty('fulfillmentOrders');
        expect(result.summary.subtotal).toBe(100);
    });
});
