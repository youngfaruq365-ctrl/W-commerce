const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        console.log('Starting database cleanup...');

        // 1. Delete dependent models (Orders, Carts, etc.)
        await prisma.engagementEvent.deleteMany();
        await prisma.notification.deleteMany();
        await prisma.cartItem.deleteMany();
        await prisma.cart.deleteMany();
        await prisma.dispute.deleteMany();
        await prisma.package.deleteMany();
        await prisma.orderItem.deleteMany();
        await prisma.fulfillmentOrder.deleteMany();
        await prisma.marketplaceOrder.deleteMany();
        await prisma.order.deleteMany();
        await prisma.withdrawalRequest.deleteMany();
        await prisma.walletTransaction.deleteMany();
        await prisma.wallet.deleteMany();
        await prisma.review.deleteMany();

        // 2. Identify the last listed product
        const lastProduct = await prisma.product.findFirst({
            orderBy: { createdAt: 'desc' }
        });

        if (lastProduct) {
            console.log('Keeping product:', lastProduct.title);
            // Delete all products EXCEPT the last one
            await prisma.product.deleteMany({
                where: {
                    id: { not: lastProduct.id }
                }
            });
        } else {
            // Delete all products if none exist (shouldn't happen)
            await prisma.product.deleteMany();
        }

        // 3. Keep Stores for the kept users
        // Users to keep: role=ADMIN or email contains 'fakunle' or 'young'
        const usersToKeep = await prisma.user.findMany({
            where: {
                OR: [
                    { role: 'ADMIN' },
                    { email: { contains: 'fakunle' } },
                    { email: { contains: 'young' } }
                ]
            }
        });

        const keptUserIds = usersToKeep.map(u => u.id);
        console.log(`Keeping ${keptUserIds.length} users.`);

        // Delete stores of users who are going to be deleted
        await prisma.store.deleteMany({
            where: {
                sellerId: { notIn: keptUserIds }
            }
        });

        // 4. Delete users NOT in the keep list
        await prisma.user.deleteMany({
            where: {
                id: { notIn: keptUserIds }
            }
        });

        console.log('Database cleanup completed successfully!');
    } catch (e) {
        console.error('Error during cleanup:', e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
