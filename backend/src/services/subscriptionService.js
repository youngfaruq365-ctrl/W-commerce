const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');

/**
 * Finalizes a subscription after payment confirmation (Webhook or Admin Approval)
 */
async function finalizeSubscription(userId, paymentRef, amount, provider, tier = 'YEARLY') {
    try {
        const startDate = new Date();
        const endDate = new Date();
        if (tier === 'MONTHLY') {
            endDate.setMonth(endDate.getMonth() + 1); // +1 Month Validity
        } else {
            endDate.setFullYear(endDate.getFullYear() + 1); // +1 Year Validity
        }

        // Transactional Update: Set User fields AND Create Subscription record AND Ledger Entry
        await prisma.$transaction([
            // Update User for fast access checks in middleware
            prisma.user.update({
                where: { id: userId },
                data: {
                    hasPaidAccess: true,
                    subscriptionTier: tier,
                    accessExpiry: endDate
                }
            }),
            // Create Audit-friendly Subscription record
            prisma.subscription.create({
                data: {
                    userId: userId,
                    tier: tier,
                    status: 'ACTIVE',
                    startDate: startDate,
                    endDate: endDate,
                    paymentRef: paymentRef,
                    amount: amount,
                    currency: provider === 'PAYSTACK' ? 'NGN' : 'USD'
                }
            }),
            // Log as Transaction in financial ledger
            prisma.transaction.create({
                data: {
                    userId: userId,
                    type: 'SUBSCRIPTION',
                    amount: amount,
                    currency: provider === 'PAYSTACK' ? 'NGN' : 'USD',
                    status: 'COMPLETED',
                    referenceId: paymentRef,
                    description: `${tier} Platform Access Fee (${provider})`
                }
            })
        ]);

        logger.info(`[SUBSCRIPTION] User ${userId} activated ${tier} tier until ${endDate.toISOString()}`);
        return { success: true, endDate };

    } catch (e) {
        logger.error(`[SUBSCRIPTION] Failed to finalize: ${userId} - ${e.message}`);
        throw e;
    }
}

module.exports = {
    finalizeSubscription
};
