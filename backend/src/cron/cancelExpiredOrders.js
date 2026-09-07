const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');

async function cancelExpiredOrders() {
    logger.info('[CRON] Checking for expired pending orders...');

    try {
        const now = new Date();
        
        // Find orders that are PENDING and have expired
        const expiredOrders = await prisma.order.findMany({
            where: {
                status: 'PENDING',
                parentOrderId: null,
                expiresAt: {
                    lt: now
                }
            },
            include: {
                items: true
            }
        });

        if (expiredOrders.length === 0) {
            logger.info('[CRON] No expired orders found.');
            return;
        }

        logger.info(`[CRON] Found ${expiredOrders.length} expired orders. Cancelling and restoring stock...`);

        for (const order of expiredOrders) {
            await prisma.$transaction(async (tx) => {
                // Restore stock for each item
                for (const item of order.items) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { stock: { increment: item.quantity } }
                    });
                }

                // Mark order as CANCELLED
                await tx.order.update({
                    where: { id: order.id },
                    data: { status: 'CANCELLED' }
                });
                
                // If this is a parent order, its children will be caught in the query since they also have expiresAt and are PENDING,
                // but we could also cascade just in case. 
                await tx.order.updateMany({
                    where: { parentOrderId: order.id, status: 'PENDING' },
                    data: { status: 'CANCELLED' }
                });
            });
            logger.info(`[CRON] Cancelled order ${order.id} and restored stock.`);
        }
        
    } catch (error) {
        logger.error(`[CRON] Error cancelling expired orders: ${error.message}`);
    }
}

// If run directly via node
if (require.main === module) {
    cancelExpiredOrders().then(() => {
        logger.info('[CRON] Execution complete.');
        process.exit(0);
    });
}

module.exports = cancelExpiredOrders;
