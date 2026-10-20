'use strict';

const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');
const paymentV2Service = require('./paymentV2Service');

/**
 * Reconciles pending payments that are older than 15 minutes.
 */
exports.reconcilePendingPayments = async () => {
    try {
        const cutoffTime = new Date(Date.now() - 15 * 60 * 1000);
        const pendingOrders = await prisma.marketplaceOrder.findMany({
            where: {
                paymentStatus: 'PENDING',
                createdAt: { lt: cutoffTime },
                paymentReference: { not: null }
            }
        });

        logger.info(`[PaymentReconciliation] Found ${pendingOrders.length} pending orders to reconcile.`);

        for (const order of pendingOrders) {
            try {
                logger.info(`[PaymentReconciliation] Verifying payment for reference: ${order.paymentReference}`);
                await paymentV2Service.verifyAndConfirm(order.paymentReference);
            } catch (err) {
                logger.error(`[PaymentReconciliation] Error verifying order ${order.id}: ${err.message}`);
            }
        }
    } catch (err) {
        logger.error(`[PaymentReconciliation] Job failed: ${err.message}`);
    }
};

exports.startReconciliationJob = (cronJobManager) => {
    if (cronJobManager) {
        // Run every 15 minutes
        cronJobManager.register('payment-reconciliation', '*/15 * * * *', exports.reconcilePendingPayments);
        logger.info('✅ Payment reconciliation job registered');
    }
};
