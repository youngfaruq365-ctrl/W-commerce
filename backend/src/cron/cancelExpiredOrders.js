const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');
const checkoutService = require('../services/checkoutService');

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
            select: {
                id: true
            }
        });

        if (expiredOrders.length === 0) {
            logger.info('[CRON] No expired orders found.');
            return;
        }

        logger.info(`[CRON] Found ${expiredOrders.length} expired orders. Cancelling and restoring stock...`);

        for (const order of expiredOrders) {
            try {
                await checkoutService.cancelAndRestoreOrder({ orderId: order.id });
                logger.info(`[CRON] Cancelled order ${order.id} and restored stock.`);
            } catch (orderErr) {
                logger.error(`[CRON] Error cancelling order ${order.id}: ${orderErr.message}`);
            }
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
