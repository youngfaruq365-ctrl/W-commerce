/**
 * Paystack Webhook Handler
 * Processes Paystack webhook events for the GlobalX escrow system
 */

const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');
const paystackService = require('../services/paystackService');

/**
 * Process Paystack webhook events
 */
exports.handleWebhook = async (req, res) => {
    try {
        // Verify webhook signature
        const signature = req.headers['x-paystack-signature'];
        
        let payload;
        let event;

        if (Buffer.isBuffer(req.body)) {
            payload = req.body.toString('utf8');
            try {
                event = JSON.parse(payload);
            } catch (err) {
                logger.error('Invalid JSON in webhook payload');
                return res.status(400).json({ success: false, message: 'Invalid payload' });
            }
        } else {
            payload = req.rawBody || req.body;
            event = req.body;
        }

        // Verify signature
        if (process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_PRIMARY_SECRET_KEY) {
            const isValid = paystackService.verifyWebhookSignature(payload, signature);
            if (!isValid) {
                logger.warn('Invalid Paystack webhook signature');
                return res.status(401).json({ success: false, message: 'Invalid signature' });
            }
        }
        const eventType = event.event;
        const eventId = event.id;

        // Log webhook event
        logger.info(`Paystack webhook received: ${eventType}`, {
            eventId,
            reference: event.data?.reference
        });

        // Use upsert to prevent race conditions on duplicate webhooks
        const existingEvent = await prisma.webhookEvent.upsert({
            where: { eventId },
            update: {},
            create: {
                eventType,
                eventId,
                reference: event.data?.reference || event.data?.id,
                payload: typeof payload === 'string' ? payload : JSON.stringify(event),
                processed: false
            }
        });

        if (existingEvent.processed) {
            logger.info(`Duplicate webhook event: ${eventId}`);
            return res.status(200).json({ success: true, message: 'Already processed' });
        }

        // Process event based on type
        let result = { processed: false };

        switch (eventType) {
            case 'charge.success':
                result = await processSuccessfulCharge(event.data);
                break;

            case 'charge.failed':
                result = await processFailedCharge(event.data);
                break;

            case 'transfer.failed':
                result = await processFailedTransfer(event.data);
                break;

            case 'transfer.reversed':
                result = await processReversedTransfer(event.data);
                break;

            case 'refund.created':
                result = await processRefund(event.data);
                break;

            default:
                logger.info(`Unhandled webhook event type: ${eventType}`);
        }

        // Mark event as processed
        await prisma.webhookEvent.update({
            where: { eventId },
            data: {
                processed: true,
                processedAt: new Date()
            }
        });

        logger.info(`Webhook processed: ${eventType}`, {
            eventId,
            success: result.processed
        });

        res.status(200).json({ success: true, message: 'Webhook processed' });

    } catch (error) {
        logger.error('Webhook processing error:', error);
        res.status(500).json({
            success: false,
            message: 'Webhook processing failed'
        });
    }
};

/**
 * Process successful charge event
 */
async function processSuccessfulCharge(data) {
    try {
        const reference = data.reference;
        
        // Find pending payment
        const payment = await prisma.payment.findFirst({
            where: {
                paystackReference: reference,
                status: 'PENDING'
            }
        });

        if (!payment) {
            logger.warn(`Payment not found for reference: ${reference}. Attempting legacy fallback...`);
            const { _legacyChargeSuccess } = require('../services/paymentV2Service');
            try {
                 const amountNGN = data.amount / 100; // Paystack sends in kobo, legacy handler expects NGN
                 await _legacyChargeSuccess(reference, amountNGN);
                 return { processed: true };
            } catch (err) {
                 logger.error(`Legacy fallback failed: ${err.message}`);
                 return { processed: false };
            }
        }

        // Calculate commission
        const commission = await require('../services/commissionService').calculateWithValidation(
            Number(payment.amount)
        );

        // Update payment to HELD status
        await prisma.payment.update({
            where: { id: payment.id },
            data: {
                status: 'HELD',
                paystackTransactionId: data.id
            }
        });

        // Record commission
        await prisma.commission.create({
            data: {
                paymentId: payment.id,
                percentage: commission.commissionRate,
                amount: commission.commissionAmount,
                currency: payment.currency,
                transactionRef: reference
            }
        });

        // Finalize order (deducts stock, updates statuses)
        if (payment.orderId) {
            const paymentController = require('./paymentController');
            await paymentController.finalizeOrder(
                payment.orderId,
                reference,
                payment.amount,
                payment.userId || 'system',
                'PAYSTACK'
            );
        }

        logger.info(`Payment held: ${payment.id}`, {
            reference,
            amount: payment.amount
        });

        return { processed: true };

    } catch (error) {
        logger.error('Process successful charge error:', error);
        throw error;
    }
}

/**
 * Process failed charge event
 */
async function processFailedCharge(data) {
    try {
        const reference = data.reference;

        const payment = await prisma.payment.findFirst({
            where: { paystackReference: reference }
        });

        if (payment) {
            await prisma.payment.update({
                where: { id: payment.id },
                data: {
                    status: 'FAILED'
                }
            });

            logger.info(`Payment failed: ${payment.id}`, { reference });
        }

        // Restore stock for legacy Order if it exists
        const orderId = data.metadata?.orderId || reference.replace('GX-', '');
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { items: true }
        });

        if (order && order.paymentStatus !== 'FAILED' && order.paymentStatus !== 'PAID') {
            await prisma.$transaction(async (tx) => {
                await tx.order.update({
                    where: { id: order.id },
                    data: { paymentStatus: 'FAILED', status: 'CANCELLED' }
                });
                for (const item of order.items) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { stock: { increment: item.quantity } }
                    });
                }
            });
            logger.info(`Restored stock for failed legacy Order ${order.id}`);
        }

        return { processed: true };

    } catch (error) {
        logger.error('Process failed charge error:', error);
        throw error;
    }
}

/**
 * Process failed transfer event
 */
async function processFailedTransfer(data) {
    try {
        const reference = data.reference;

        // Find payment by payout reference or update status
        const payment = await prisma.payment.findFirst({
            where: {
                status: 'RELEASE_PENDING'
            }
        });

        if (payment) {
            // Mark as failed - funds remain in platform
            await prisma.payment.update({
                where: { id: payment.id },
                data: {
                    status: 'HELD', // Revert to held
                    adminNote: `Transfer failed: ${data.reason || 'Unknown error'}`
                }
            });

            logger.warn(`Transfer failed for payment: ${payment.id}`, {
                reference,
                reason: data.reason
            });
        }

        return { processed: true };

    } catch (error) {
        logger.error('Process failed transfer error:', error);
        throw error;
    }
}

/**
 * Process reversed transfer event
 */
async function processReversedTransfer(data) {
    try {
        const reference = data.reference;

        logger.info(`Transfer reversed: ${reference}`, {
            amount: data.amount,
            recipient: data.recipient
        });

        // Could implement automatic refund to buyer or manual intervention
        // For now, just log the event

        return { processed: true };

    } catch (error) {
        logger.error('Process reversed transfer error:', error);
        throw error;
    }
}

/**
 * Process refund event
 */
async function processRefund(data) {
    try {
        const transactionReference = data.transaction;

        const payment = await prisma.payment.findFirst({
            where: { paystackReference: transactionReference }
        });

        if (payment) {
            await prisma.payment.update({
                where: { id: payment.id },
                data: {
                    status: 'REFUNDED',
                    refundedAt: new Date()
                }
            });

            // Update order status and cascade
            if (payment.orderId) {
                await prisma.order.update({
                    where: { id: payment.orderId },
                    data: { status: 'REFUNDED', paymentStatus: 'REFUNDED' }
                });
                await prisma.order.updateMany({
                    where: { parentOrderId: payment.orderId },
                    data: { status: 'REFUNDED', paymentStatus: 'REFUNDED' }
                });
            }

            logger.info(`Payment refunded: ${payment.id}`, {
                reference: transactionReference,
                amount: data.amount
            });
        }

        return { processed: true };

    } catch (error) {
        logger.error('Process refund error:', error);
        throw error;
    }
}

/**
 * Reconciliation job - sync local transactions with Paystack
 */
exports.runReconciliation = async () => {
    try {
        logger.info('Starting payment reconciliation...');

        // Get all pending payments older than 5 minutes
        const pendingPayments = await prisma.payment.findMany({
            where: {
                status: 'PENDING',
                createdAt: {
                    lt: new Date(Date.now() - 5 * 60 * 1000)
                }
            }
        });

        for (const payment of pendingPayments) {
            try {
                const verification = await paystackService.verifyTransaction(
                    payment.paystackReference
                );

                if (verification.status === 'success') {
                    // Process as successful
                    await processSuccessfulCharge({
                        reference: payment.paystackReference,
                        id: verification.id
                    });
                } else {
                    // Mark as failed
                    await prisma.payment.update({
                        where: { id: payment.id },
                        data: { status: 'FAILED' }
                    });
                }

            } catch (error) {
                logger.error(`Reconciliation error for payment ${payment.id}:`, error);
            }
        }

        logger.info(`Reconciliation complete. Processed ${pendingPayments.length} payments.`);

    } catch (error) {
        logger.error('Reconciliation job error:', error);
    }
};

module.exports = exports;
