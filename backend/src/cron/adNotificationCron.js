const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');
const { sendPushNotification } = require('../services/pushService');

/**
 * Checks for ad discount sessions that have timers expired (ready for next claim)
 * and sends a push notification to remind the buyer.
 */
const notifyPendingAdClaims = async () => {
    try {
        const now = new Date();
        
        // Find sessions where nextClaimAvailableAt is in the past, not completed, and we haven't notified them recently
        // To prevent spam, we could add a `notifiedAt` field, but for now we just look for exact match or close match
        // Or we can just send it once exactly 1 minute after it becomes available.
        // Let's find sessions that became available in the last 2 minutes
        const twoMinsAgo = new Date(now.getTime() - 2 * 60000);
        
        const sessions = await prisma.adDiscountSession.findMany({
            where: {
                isCompleted: false,
                nextClaimAvailableAt: {
                    lte: now,
                    gt: twoMinsAgo
                }
            },
            include: {
                product: true
            }
        });

        for (const session of sessions) {
            try {
                await sendPushNotification(session.buyerId, {
                    title: 'Claim Your Next Offer! 🎁',
                    message: `Your next discount is ready for ${session.product.title}. Watch a quick ad to get it!`,
                    data: {
                        productId: session.productId,
                        type: 'AD_DISCOUNT_READY'
                    }
                });
                logger.info(`[AdNotificationCron] Sent notification to buyer ${session.buyerId} for product ${session.productId}`);
            } catch (err) {
                logger.error(`[AdNotificationCron] Failed to send push to buyer ${session.buyerId}: ${err.message}`);
            }
        }
    } catch (error) {
        logger.error(`[AdNotificationCron] Error processing pending ad claims: ${error.message}`);
    }
};

module.exports = notifyPendingAdClaims;
