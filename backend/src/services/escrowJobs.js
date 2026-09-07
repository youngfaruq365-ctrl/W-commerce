/**
 * Escrow Background Jobs
 * Handles automatic fund release and reconciliation
 */

const cron = require('node-cron');
const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');
const paystackService = require('../services/paystackService');
const commissionService = require('../services/commissionService');

const RELEASE_DELAY_HOURS = 72; // 72 hours after delivery confirmation

/**
 * Initialize all escrow cron jobs with singleton pattern
 * Uses cronJobManager for distributed locking if provided
 */
/**
 * Lightweight schema readiness check for escrow (ensures payment table exists)
 */
async function isEscrowSchemaReady() {
    try {
        await prisma.payment.findFirst({ select: { id: true } });
        return true;
    } catch (err) {
        return false;
    }
}

const startEscrowJobs = async (cronJobManager = null) => {
    logger.info('Starting escrow background jobs...');

    const registerEscrow = async () => {
        const ready = await isEscrowSchemaReady();
        if (!ready) {
            logger.warn('⚠️ Escrow DB schema not ready; deferring escrow cron registration.');
            return false;
        }

        if (cronJobManager) {
            // Use distributed locking via cronJobManager
            cronJobManager.register('escrow-automatic-release', '0 * * * *', processAutomaticReleases);
            cronJobManager.register('escrow-reconciliation', '0 */6 * * *', runReconciliation);
            cronJobManager.register('escrow-stale-payments', '0 0 * * *', processStalePayments);
            logger.info('✅ Escrow jobs registered with distributed locking');
        } else {
            // Fallback to cron.schedule (not recommended for production)
            logger.warn('⚠️ Using direct cron.schedule for escrow jobs (not recommended for distributed systems)');
            cron.schedule('0 * * * *', processAutomaticReleases);
            cron.schedule('0 */6 * * *', runReconciliation);
            cron.schedule('0 0 * * *', processStalePayments);
            logger.info('Escrow background jobs started');
        }

        return true;
    };

    const registered = await registerEscrow();
    if (!registered) {
        const retryId = setInterval(async () => {
            try {
                if (await registerEscrow()) {
                    clearInterval(retryId);
                }
            } catch (err) {
                logger.error('Error while retrying escrow registration:', err.message || err);
            }
        }, 60 * 1000);
    }
};

/**
 * Process automatic fund releases for payments that are:
 * - In RELEASE_PENDING status
 * - Past the release time
 * - Not disputed
 */
async function processAutomaticReleases() {
    try {
        logger.info('Processing automatic fund releases...');

        const now = new Date();

        // Find payments ready for release
        const readyPayments = await prisma.payment.findMany({
            where: {
                status: 'RELEASE_PENDING',
                releaseAt: {
                    lte: now
                }
            },
            include: {
                seller: true,
                order: true
            }
        });

        logger.info(`Found ${readyPayments.length} payments ready for release`);

        for (const payment of readyPayments) {
            try {
                // Double-check no dispute exists
                const dispute = await prisma.paymentDispute.findFirst({
                    where: {
                        paymentId: payment.id,
                        status: { in: ['OPEN', 'UNDER_REVIEW'] }
                    }
                });

                if (dispute) {
                    logger.info(`Skipping release - dispute active for payment: ${payment.id}`);
                    continue;
                }

                // Process transfer to seller
                await releaseFundsToSeller(payment);

                // Update payment status (use only fields that exist in schema)
                await prisma.payment.update({
                    where: { id: payment.id },
                    data: {
                        status: 'RELEASED'
                    }
                });

                logger.info(`Automatic release completed for payment: ${payment.id}`, {
                    amount: payment.sellerPayout,
                    sellerId: payment.sellerId
                });

            } catch (error) {
                logger.error(`Failed to release payment ${payment.id}:`, error);

                // Log failure - admin should review manually
                logger.error(`Payment ${payment.id} auto-release failed: ${error.message}. Manual intervention required.`);
            }
        }

    } catch (error) {
        logger.error('Process automatic releases error:', error);
    }
}

/**
 * Release funds to seller via Paystack
 * Looks up payout details from the seller's Store record first,
 * then falls back to the User record.
 */
async function releaseFundsToSeller(payment) {
    const seller = payment.seller;

    if (!seller) {
        throw new Error('Seller not found');
    }

    // Look up the seller's Store for payout details (paystackRecipientCode lives on Store)
    const sellerStore = await prisma.store.findUnique({
        where: { sellerId: seller.id }
    });

    // Determine payout method: prefer Store's recipient code, fall back to User's subaccount
    let recipientCode = sellerStore?.paystackRecipientCode || sellerStore?.paystackSubaccount || seller.paystackSubaccount;

    // If no subaccount/recipient, try to create one from store bank details
    if (!recipientCode) {
        const bankCode = sellerStore?.bankCode || seller.bankCode;
        const accountNumber = sellerStore?.accountNumber || seller.accountNumber;
        const accountName = sellerStore?.storeName || seller.fullName;

        if (bankCode && accountNumber) {
            try {
                const recipient = await paystackService.createTransferRecipient({
                    name: accountName,
                    accountNumber,
                    bankCode
                });
                recipientCode = recipient.recipientCode;

                // Save recipient code to Store (correct model)
                if (sellerStore) {
                    await prisma.store.update({
                        where: { id: sellerStore.id },
                        data: { paystackRecipientCode: recipientCode }
                    });
                }

            } catch (error) {
                logger.error('Failed to create transfer recipient:', error);
                throw new Error('Cannot process payout - bank details invalid');
            }
        }
    }

    if (!recipientCode) {
        throw new Error('No payout method configured for seller');
    }

    // Initiate transfer
    const transfer = await paystackService.initiateTransfer({
        amount: Number(payment.sellerPayout),
        recipientCode,
        reference: `GX_Payout_${payment.id}_${Date.now()}`,
        reason: 'Sale proceeds from GlobalX Marketplace'
    });

    return transfer;
}

/**
 * Reconciliation job - sync with Paystack
 */
async function runReconciliation() {
    try {
        logger.info('Running payment reconciliation...');

        // Check pending payments
        const pendingPayments = await prisma.payment.findMany({
            where: {
                status: 'PENDING',
                createdAt: {
                    lt: new Date(Date.now() - 10 * 60 * 1000) // Older than 10 minutes
                }
            }
        });

        for (const payment of pendingPayments) {
            try {
                const verification = await paystackService.verifyTransaction(
                    payment.paystackReference
                );

                if (verification.status === 'success') {
                    // Process successful charge
                    await prisma.payment.update({
                        where: { id: payment.id },
                        data: {
                            status: 'HELD',
                            paystackTransactionId: verification.id
                        }
                    });

                    // Record commission
                    await commissionService.recordCommission(
                        payment.id,
                        Number(payment.amount),
                        payment.currency
                    );

                    // Update order
                    if (payment.orderId) {
                        await prisma.order.update({
                            where: { id: payment.orderId },
                            data: { status: 'PAID' }
                        });
                    }

                    logger.info(`Reconciled payment: ${payment.id}`);

                } else if (verification.status === 'failed') {
                    await prisma.payment.update({
                        where: { id: payment.id },
                        data: { status: 'FAILED' }
                    });

                    logger.info(`Marked payment as failed: ${payment.id}`);
                }

            } catch (error) {
                logger.error(`Reconciliation error for ${payment.id}:`, error);
            }
        }

        // Check pending transfers (release pending payments)
        const releasePending = await prisma.payment.findMany({
            where: {
                status: 'RELEASE_PENDING'
            }
        });

        for (const payment of releasePending) {
            // Check if transfer actually succeeded
            // This would require tracking transfer references
            // For now, log for manual review
            logger.info(`Pending transfer check for: ${payment.id}`);
        }

        logger.info('Reconciliation complete');

    } catch (error) {
        logger.error('Reconciliation error:', error);
    }
}

/**
 * Process stale payments - handle cases where buyer never confirms delivery
 */
async function processStalePayments() {
    try {
        logger.info('Processing stale payments...');

        const STALE_DAYS = 14; // 14 days after payment

        // Find held payments older than 14 days
        const staleDate = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);

        const stalePayments = await prisma.payment.findMany({
            where: {
                status: 'HELD',
                createdAt: {
                    lt: staleDate
                }
            }
        });

        logger.info(`Found ${stalePayments.length} stale held payments`);

        for (const payment of stalePayments) {
            // Check if there's an active dispute
            const dispute = await prisma.paymentDispute.findFirst({
                where: {
                    paymentId: payment.id,
                    status: { in: ['OPEN', 'UNDER_REVIEW'] }
                }
            });

            if (dispute) {
                logger.info(`Skipping stale payment ${payment.id} - dispute active`);
                continue;
            }

            // Auto-release after 14 days (platform policy)
            // In production, this could be configurable per order type
            logger.info(`Auto-releasing stale payment: ${payment.id}`);

            try {
                await releaseFundsToSeller(payment);

                await prisma.payment.update({
                    where: { id: payment.id },
                    data: {
                        status: 'RELEASED'
                        // Note: releasedAt and releaseTriggeredBy fields don't exist in the Payment schema
                    }
                });

            } catch (error) {
                logger.error(`Failed to auto-release ${payment.id}:`, error);
            }
        }

    } catch (error) {
        logger.error('Process stale payments error:', error);
    }
}

/**
 * Export for manual triggering
 */
module.exports = {
    startEscrowJobs,
    processAutomaticReleases,
    runReconciliation,
    processStalePayments
};
