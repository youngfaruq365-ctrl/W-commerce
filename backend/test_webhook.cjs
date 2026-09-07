const prisma = require('./src/utils/prismaClient');
const crypto = require('crypto');
const axios = require('axios');

async function run() {
    try {
        console.log('Finding any order to mock...');
        const order = await prisma.order.findFirst({
            orderBy: { createdAt: 'desc' }
        });

        if (!order) {
            console.log('No order found.');
            return;
        }

        const testRef = 'test-webhook-' + Date.now();
        await prisma.order.update({
            where: { id: order.id },
            data: { status: 'PENDING', paymentStatus: 'PENDING', stripePaymentId: testRef }
        });

        console.log(`Prepared Order ${order.id}. Reference: ${testRef}. Sending webhook to localhost...`);
        
        const payload = {
            event: 'charge.success',
            id: 'mock-event-' + Date.now(),
            data: {
                reference: testRef,
                amount: 500000 // In kobo
            }
        };

        const secret = process.env.PAYSTACK_SECRET_KEY || 'sk_test_73ffda9b22551857e4787592b0fa1c8c531f9c08';
        const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(payload)).digest('hex');

        try {
            const res = await axios.post('http://localhost:5000/api/v1/payment/webhook', payload, {
                headers: { 'x-paystack-signature': hash }
            });
            console.log('Webhook response:', res.status, res.data);
        } catch (e) {
            console.error('Webhook failed:', e.response?.data || e.message);
        }

        const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });
        console.log('Updated Order Status:', updatedOrder.status, 'PaymentStatus:', updatedOrder.paymentStatus);
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

run();
