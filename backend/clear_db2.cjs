const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        console.log('Starting database cleanup...');

        const lastProduct = await prisma.product.findFirst({
            orderBy: { createdAt: 'desc' }
        });

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
        const keptStoreIds = await prisma.store.findMany({
            where: { sellerId: { in: keptUserIds } }
        }).then(res => res.map(s => s.id));

        console.log(`Keeping product: ${lastProduct?.title}`);
        console.log(`Keeping ${keptUserIds.length} users and ${keptStoreIds.length} stores.`);

        // To safely delete, we will just delete specific models that might contain the 'junk' data
        const modelsToDelete = [
            'fulfillmentItem',
            'fulfillmentOrder',
            'marketplaceOrder',
            'orderItem',
            'order',
            'cartItem',
            'cart',
            'disputeMessage',
            'dispute',
            'packingIssue',
            'paymentProof',
            'escrowPayment',
            'payment',
            'transaction',
            'walletLedgerEntry',
            'walletHold',
            'wallet',
            'review',
            'notification',
            'buyerNotification',
            'engagementEvent',
            'feedComment',
            'like',
            'feedPost',
            'sellerAnalytics',
            'buyerSellerProfile',
            'trackingEvent',
            'systemLog',
            'pageView',
            'consolidatedPackage',
            'deliveryAssignment',
            'deliveryTrackingEvent',
            'deliveryOffer',
            'deliveryRoute',
            'deliveryStop'
        ];

        for (const model of modelsToDelete) {
            try {
                if (prisma[model]) {
                    await prisma[model].deleteMany();
                    console.log(`Deleted ${model}`);
                }
            } catch (e) {
                console.log(`Skipped ${model} or error:`, e.message);
            }
        }

        // Now delete products not matching the last product
        if (lastProduct) {
            await prisma.product.deleteMany({
                where: { id: { not: lastProduct.id } }
            });
            console.log('Cleared old products.');
        }

        // Delete stores not associated with kept users
        await prisma.store.deleteMany({
            where: { sellerId: { notIn: keptUserIds } }
        });
        console.log('Cleared old stores.');

        // Delete users not in kept user ids
        await prisma.user.deleteMany({
            where: { id: { notIn: keptUserIds } }
        });
        console.log('Cleared old users.');

        console.log('Cleanup completed successfully!');
    } catch (e) {
        console.error('Error during cleanup:', e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
