const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

describe('Packing System', () => {
    beforeAll(async () => {
        // Clean up test data
        await prisma.packingResponse.deleteMany();
        await prisma.order.deleteMany({ where: { status: { in: ['PACKED', 'CONFIRMED'] } } });
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    test('should create packing response', async () => {
        // Create a test order first
        const testOrder = await prisma.order.create({
            data: {
                buyerId: 'test-buyer-id',
                totalAmount: 100.00,
                shippingCost: 10.00,
                taxAmount: 8.00,
                status: 'PACKED',
                items: {
                    create: {
                        productId: 'test-product-id',
                        quantity: 1,
                        priceAtTime: 100.00
                    }
                }
            }
        });

        // Create packing response
        const response = await prisma.packingResponse.create({
            data: {
                orderId: testOrder.id,
                type: 'shipping_tomorrow',
                message: 'We will ship your order tomorrow.',
                buyerMessage: 'Test buyer message'
            }
        });

        expect(response).toBeDefined();
        expect(response.type).toBe('shipping_tomorrow');
        expect(response.orderId).toBe(testOrder.id);

        // Clean up
        await prisma.packingResponse.delete({ where: { id: response.id } });
        await prisma.order.delete({ where: { id: testOrder.id } });
    });

    test('should update order status flow', async () => {
        // Create a test order
        const testOrder = await prisma.order.create({
            data: {
                buyerId: 'test-buyer-id',
                totalAmount: 100.00,
                shippingCost: 10.00,
                taxAmount: 8.00,
                status: 'PENDING',
                items: {
                    create: {
                        productId: 'test-product-id',
                        quantity: 1,
                        priceAtTime: 100.00
                    }
                }
            }
        });

        // Update to PACKED
        await prisma.order.update({
            where: { id: testOrder.id },
            data: { status: 'PACKED' }
        });

        let updatedOrder = await prisma.order.findUnique({
            where: { id: testOrder.id }
        });
        expect(updatedOrder.status).toBe('PACKED');

        // Update to CONFIRMED
        await prisma.order.update({
            where: { id: testOrder.id },
            data: { status: 'CONFIRMED' }
        });

        updatedOrder = await prisma.order.findUnique({
            where: { id: testOrder.id }
        });
        expect(updatedOrder.status).toBe('CONFIRMED');

        // Clean up
        await prisma.order.delete({ where: { id: testOrder.id } });
    });
});