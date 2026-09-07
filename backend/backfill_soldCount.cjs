const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const products = await prisma.product.findMany({
        include: {
            fulfillmentItems: {
                include: {
                    fulfillmentOrder: { select: { paymentStatus: true } }
                }
            },
            orderItems: {
                include: {
                    order: { select: { paymentStatus: true } }
                }
            }
        }
    });

    for (const product of products) {
        let sold = 0;
        const validItems = (product.fulfillmentItems || []).filter(item => 
            ['PAID', 'HELD', 'COMPLETED', 'RELEASED'].includes(item.fulfillmentOrder?.paymentStatus)
        );
        const validLegacyItems = (product.orderItems || []).filter(item => 
            ['PAID', 'HELD', 'COMPLETED', 'RELEASED'].includes(item.order?.paymentStatus)
        );

        sold += validItems.reduce((sum, item) => sum + item.quantity, 0);
        sold += validLegacyItems.reduce((sum, item) => sum + item.quantity, 0);

        await prisma.product.update({
            where: { id: product.id },
            data: { soldCount: sold }
        });
        console.log(`Product ${product.title} updated with soldCount: ${sold}`);
    }
    console.log('Done!');
}
run().catch(console.error).finally(() => prisma.$disconnect());
