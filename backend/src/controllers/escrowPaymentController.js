/**
 * Escrow Payment Controller
 * Handles the complete Nigerian escrow payment lifecycle
 */

const { v4: uuidv4 } = require('uuid');
const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');
const paystackService = require('../services/paystackService');
const commissionService = require('../services/commissionService');

// Constants
const AUTO_RELEASE_HOURS = 72; // 72 hours after delivery confirmation
const DISPUTE_WINDOW_HOURS = 72; // 72 hours to raise dispute after delivery

/**
 * Initialize an escrow payment
 * Creates a pending payment and returns Paystack authorization URL
 */
exports.initializePayment = async (req, res) => {
    try {
        const { orderId, amount, sellerId, email, metadata } = req.body;
        const buyerId = req.user.id;

        // Validate required fields
        if (!orderId || !amount || !sellerId) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: orderId, amount, sellerId'
            });
        }

        // Verify order exists and belongs to buyer
        const order = await prisma.order.findFirst({
            where: {
                id: orderId,
                buyerId
            },
            include: {
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found or does not belong to buyer'
            });
        }

        // Verify seller exists
        const seller = await prisma.user.findUnique({
            where: { id: sellerId },
            include: { store: true }
        });

        if (!seller) {
            return res.status(404).json({
                success: false,
                message: 'Seller not found'
            });
        }

        // Generate unique reference
        const reference = `GX_${uuidv4().substring(0, 8).toUpperCase()}_${Date.now()}`;

        // Calculate commission
        const commission = await commissionService.calculateWithValidation(amount);

        // Create payment record
        const payment = await prisma.payment.create({
            data: {
                orderId,
                buyerId,
                sellerId,
                amount: amount,
                currency: 'NGN',
                platformFee: commission.commissionAmount,
                sellerPayout: commission.sellerPayout,
                commissionRate: commission.commissionRate,
                paystackReference: reference,
                status: 'PENDING',
                paystackSubaccountCode: seller.paystackSubaccount
            }
        });

        // Initialize Paystack transaction
        const paystackResult = await paystackService.initializeTransaction({
            email: email || req.user.email,
            amount: amount, // Already in NGN
            currency: 'NGN',
            reference,
            metadata: {
                paymentId: payment.id,
                orderId,
                buyerId,
                sellerId,
                type: 'ESCROW_PAYMENT'
            }
        });

        logger.info(`Escrow payment initialized: ${payment.id}`, {
            orderId,
            amount,
            sellerId,
            reference
        });

        res.json({
            success: true,
            message: 'Payment initialized successfully',
            data: {
                paymentId: payment.id,
                authorizationUrl: paystackResult.authorizationUrl,
                reference: paystackResult.reference
            }
        });

    } catch (error) {
        logger.error('Initialize payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to initialize payment: ' + error.message
        });
    }
};

/**
 * Verify payment and transition to HELD status
 */
exports.verifyPayment = async (req, res) => {
    try {
        const { reference } = req.params;

        // Verify with Paystack
        const verification = await paystackService.verifyTransaction(reference);

        // Find payment by reference
        const payment = await prisma.payment.findFirst({
            where: { paystackReference: reference }
        });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        if (payment.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                message: `Payment already processed. Current status: ${payment.status}`
            });
        }

        // Update payment status
        const updatedPayment = await prisma.payment.update({
            where: { id: payment.id },
            data: {
                status: verification.status === 'success' ? 'HELD' : 'FAILED',
                paystackTransactionId: verification.id || verification.reference
            }
        });

        // Record commission
        await commissionService.recordCommission(
            payment.id,
            payment.amount,
            payment.currency
        );

        // Update order status if payment successful
        if (updatedPayment.status === 'HELD' && payment.orderId) {
            await prisma.order.update({
                where: { id: payment.orderId },
                data: { status: 'PAID' }
            });
        }

        logger.info(`Payment verified: ${payment.id}`, {
            status: updatedPayment.status,
            reference
        });

        res.json({
            success: true,
            message: 'Payment verified successfully',
            data: {
                paymentId: payment.id,
                status: updatedPayment.status
            }
        });

    } catch (error) {
        logger.error('Verify payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify payment: ' + error.message
        });
    }
};

/**
 * Confirm delivery - transitions payment from HELD to RELEASE_PENDING
 * Triggers automatic release after 72 hours if no dispute
 */
exports.confirmDelivery = async (req, res) => {
    try {
        const { paymentId } = req.body;
        const buyerId = req.user.id;

        const payment = await prisma.payment.findFirst({
            where: {
                id: paymentId,
                buyerId,
                status: 'HELD'
            }
        });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Held payment not found or already processed'
            });
        }

        // Calculate release date (72 hours from now)
        const releaseAt = new Date(Date.now() + AUTO_RELEASE_HOURS * 60 * 60 * 1000);

        // Update payment status
        const updatedPayment = await prisma.payment.update({
            where: { id: paymentId },
            data: {
                status: 'RELEASE_PENDING',
                deliveryConfirmedAt: new Date(),
                releaseAt
            }
        });

        logger.info(`Delivery confirmed for payment: ${paymentId}`, {
            releaseAt: releaseAt.toISOString()
        });

        res.json({
            success: true,
            message: 'Delivery confirmed. Funds will be released after 72 hours if no dispute is raised.',
            data: {
                paymentId,
                releaseAt: releaseAt.toISOString(),
                disputeWindowHours: DISPUTE_WINDOW_HOURS
            }
        });

    } catch (error) {
        logger.error('Confirm delivery error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to confirm delivery: ' + error.message
        });
    }
};

/**
 * Raise a dispute - prevents payout and freezes funds
 */
exports.raiseDispute = async (req, res) => {
    try {
        const { paymentId, reason, description } = req.body;
        const buyerId = req.user.id;

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Dispute reason is required'
            });
        }

        const payment = await prisma.payment.findFirst({
            where: {
                id: paymentId,
                buyerId,
                status: {
                    in: ['HELD', 'RELEASE_PENDING']
                }
            }
        });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found or dispute window closed'
            });
        }

        // Create dispute record
        const dispute = await prisma.paymentDispute.create({
            data: {
                paymentId,
                buyerId,
                reason,
                description,
                status: 'OPEN'
            }
        });

        // Update payment status
        await prisma.payment.update({
            where: { id: paymentId },
            data: {
                status: 'DISPUTED',
                disputeReason: reason
            }
        });

        logger.info(`Dispute raised for payment: ${paymentId}`, {
            reason,
            buyerId
        });

        res.json({
            success: true,
            message: 'Dispute raised successfully. Funds are now frozen until resolution.',
            data: {
                disputeId: dispute.id,
                paymentId
            }
        });

    } catch (error) {
        logger.error('Raise dispute error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to raise dispute: ' + error.message
        });
    }
};

/**
 * Resolve dispute - admin endpoint
 */
exports.resolveDispute = async (req, res) => {
    try {
        const { disputeId, resolution, resolutionNotes } = req.body;
        const adminId = req.user.id;

        // Resolution must be one of: REFUND, RELEASE, PARTIAL_REFUND
        if (!['REFUND', 'RELEASE', 'PARTIAL_REFUND'].includes(resolution)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid resolution. Must be REFUND, RELEASE, or PARTIAL_REFUND'
            });
        }

        const dispute = await prisma.paymentDispute.findUnique({
            where: { id: disputeId },
            include: { payment: true }
        });

        if (!dispute) {
            return res.status(404).json({
                success: false,
                message: 'Dispute not found'
            });
        }

        if (dispute.status !== 'OPEN') {
            return res.status(400).json({
                success: false,
                message: 'Dispute already resolved'
            });
        }

        let paymentStatus;

        // Process based on resolution
        if (resolution === 'REFUND') {
            // Process refund via Paystack
            if (dispute.payment.paystackReference) {
                await paystackService.createRefund({
                    transactionReference: dispute.payment.paystackReference,
                    customerNote: 'Refund processed due to dispute resolution'
                });
            }
            paymentStatus = 'REFUNDED';

        } else if (resolution === 'RELEASE') {
            // Release funds to seller
            await releaseFundsToSeller(dispute.payment);
            paymentStatus = 'RELEASED';
        } else if (resolution === 'PARTIAL_REFUND') {
            // Process partial refund via Paystack
            if (dispute.payment.paystackReference && req.body.refundAmount) {
                await paystackService.createRefund({
                    transactionReference: dispute.payment.paystackReference,
                    amount: req.body.refundAmount,
                    customerNote: 'Partial refund processed due to dispute resolution'
                });
            }
            paymentStatus = 'PARTIAL_REFUND';
        }

        // Update dispute
        await prisma.paymentDispute.update({
            where: { id: disputeId },
            data: {
                status: 'RESOLVED',
                resolution,
                resolvedBy: adminId,
                resolvedAt: new Date(),
                resolutionNotes
            }
        });

        // Update payment
        await prisma.payment.update({
            where: { id: dispute.paymentId },
            data: {
                status: paymentStatus,
                disputeResolvedBy: adminId,
                disputeResolvedAt: new Date(),
                disputeResolution: resolution
            }
        });

        logger.info(`Dispute resolved: ${disputeId}`, {
            resolution,
            adminId
        });

        res.json({
            success: true,
            message: `Dispute resolved. Funds ${resolution.toLowerCase()}ed.`,
            data: {
                disputeId,
                resolution
            }
        });

    } catch (error) {
        logger.error('Resolve dispute error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to resolve dispute: ' + error.message
        });
    }
};

/**
 * Get payment details
 */
exports.getPayment = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        const payment = await prisma.payment.findFirst({
            where: {
                id: paymentId,
                OR: [
                    { buyerId: userId },
                    { sellerId: userId },
                    { order: { buyerId: userId } }
                ]
            },
            include: {
                buyer: {
                    select: { id: true, fullName: true, email: true }
                },
                seller: {
                    select: { id: true, fullName: true, email: true }
                },
                order: true,
                paymentDispute: true,
                commissions: true
            }
        });

        // Admin can view any payment
        if (!payment && userRole === 'ADMIN') {
            const adminPayment = await prisma.payment.findUnique({
                where: { id: paymentId },
                include: {
                    buyer: {
                        select: { id: true, fullName: true, email: true }
                    },
                    seller: {
                        select: { id: true, fullName: true, email: true }
                    },
                    order: true,
                    paymentDispute: true,
                    commissions: true
                }
            });
            
            if (!adminPayment) {
                return res.status(404).json({
                    success: false,
                    message: 'Payment not found'
                });
            }

            return res.json({
                success: true,
                data: adminPayment
            });
        }

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found or access denied'
            });
        }

        res.json({
            success: true,
            data: payment
        });

    } catch (error) {
        logger.error('Get payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get payment: ' + error.message
        });
    }
};

/**
 * Get buyer's payments
 */
exports.getBuyerPayments = async (req, res) => {
    try {
        const buyerId = req.user.id;
        const { status, page = 1, limit = 20 } = req.query;

        const where = { buyerId };
        if (status) where.status = status;

        const payments = await prisma.payment.findMany({
            where,
            include: {
                seller: {
                    select: { id: true, fullName: true }
                },
                order: true,
                paymentDispute: true
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: parseInt(limit)
        });

        const total = await prisma.payment.count({ where });

        res.json({
            success: true,
            data: payments,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        logger.error('Get buyer payments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get payments: ' + error.message
        });
    }
};

/**
 * Get seller's payments
 */
exports.getSellerPayments = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { status, page = 1, limit = 20 } = req.query;

        const where = { sellerId };
        if (status) where.status = status;

        const payments = await prisma.payment.findMany({
            where,
            include: {
                buyer: {
                    select: { id: true, fullName: true }
                },
                order: true,
                paymentDispute: true
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: parseInt(limit)
        });

        const total = await prisma.payment.count({ where });

        res.json({
            success: true,
            data: payments,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        logger.error('Get seller payments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get payments: ' + error.message
        });
    }
};

/**
 * Helper: Release funds to seller
 */
async function releaseFundsToSeller(payment) {
    try {
        // Get seller details
        const seller = await prisma.user.findUnique({
            where: { id: payment.sellerId }
        });

        if (!seller) {
            throw new Error('Seller not found');
        }

        // Use Paystack transfer
        let recipientCode = seller.paystackSubaccount || seller.paystackRecipientCode;

        // If no subaccount, create a transfer recipient
        if (!recipientCode && seller.bankCode && seller.accountNumber) {
            const recipient = await paystackService.createTransferRecipient({
                name: seller.fullName,
                accountNumber: seller.accountNumber,
                bankCode: seller.bankCode
            });
            recipientCode = recipient.recipientCode;

            // Update seller with recipient code
            await prisma.user.update({
                where: { id: seller.id },
                data: { paystackRecipientCode: recipientCode }
            });
        }

        if (recipientCode) {
            const transfer = await paystackService.initiateTransfer(
                Number(payment.sellerPayout),
                recipientCode,
                'Sale proceeds from GlobalX Marketplace'
            );

            logger.info(`Funds released to seller: ${payment.id}`, {
                amount: payment.sellerPayout,
                reference: transfer.reference
            });
        } else {
            logger.warn(`No payout method for seller: ${seller.id}. Manual payout required.`);
        }

    } catch (error) {
        logger.error('Release funds error:', error);
        throw error;
    }
}

module.exports = exports;
