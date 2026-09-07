const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    const seller = await prisma.user.findUnique({ where: { email: 'fakunlefaruq@gmail.com' }, include: { store: true } });
    if (!seller || !seller.store) return;
    const orderItems = await prisma.orderItem.findMany({ where: { product: { storeId: seller.store.id } }, select: { orderId: true } });
    const uniqueOrderIds = new Set(orderItems.map(i => i.orderId));
    console.log('Unique orders based on OrderItem:', uniqueOrderIds.size);
    const legacyOrders = await prisma.order.count({ where: { sellerId: seller.id } });
    console.log('Orders with sellerId:', legacyOrders);
}
run().catch(console.error).finally(()=>prisma.$disconnect());
