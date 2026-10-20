'use strict';

/**
 * Payment V2 Controller — Phase 5
 *
 * Routes (all under /api/v1/payment):
 *   POST /initialize           → Create Paystack transaction for a MarketplaceOrder
 *   GET  /verify/:reference    → Manual verify (used by frontend callback page)
 *   POST /webhook/paystack     → Paystack webhook receiver (no auth, signature-verified)
 *
 * The legacy /api/payment/webhook is updated in paymentController.js to forward here.
 */

const paymentV2Service = require('../services/paymentV2Service');
const prisma           = require('../utils/prismaClient');
const logger           = require('../utils/logger');
const checkoutService  = require('../services/checkoutService'); // added for BNPL mock

// ─── POST /api/v1/payment/initialize ─────────────────────────────────────────

exports.initializePayment = async (req, res) => {
    try {
        const buyerId = req.user.id;
        const { marketplaceOrderId, callbackUrl } = req.body;

        if (!marketplaceOrderId) {
            return res.status(400).json({ success: false, message: 'marketplaceOrderId is required.' });
        }

        // Verify ownership
        const order = await prisma.marketplaceOrder.findUnique({
            where: { id: marketplaceOrderId },
            select: { id: true, buyerId: true, grandTotal: true, paymentStatus: true, paymentReference: true },
        });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Marketplace order not found.' });
        }
        if (order.buyerId !== buyerId) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }
        if (order.paymentStatus === 'PAID') {
            return res.status(409).json({ success: false, message: 'This order has already been paid.' });
        }
        if (order.paymentStatus === 'FAILED') {
            return res.status(409).json({ success: false, message: 'This order was cancelled due to a failed payment. Please create a new order.' });
        }

        const buyer = await prisma.user.findUnique({
            where:  { id: buyerId },
            select: { email: true },
        });

        const result = await paymentV2Service.initializePaystack({
            marketplaceOrderId: order.id,
            buyerEmail:         buyer.email,
            amountNGN:          Number(order.grandTotal),
            frontendCallbackUrl: callbackUrl,
        });

        return res.status(200).json({
            success:          true,
            authorizationUrl: result.authorizationUrl,
            reference:        result.reference,
            accessCode:       result.accessCode,
            amount:           Number(order.grandTotal),
            currency:         'NGN',
        });

    } catch (err) {
        logger.error(`[PaymentV2] initializePayment error: ${err.message}`);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: process.env.NODE_ENV === 'production' ? 'Failed to initialize payment.' : err.message,
        });
    }
};

// ─── GET /api/v1/payment/verify/:reference ────────────────────────────────────

exports.verifyPayment = async (req, res) => {
    try {
        const { reference } = req.params;

        if (!reference) {
            return res.status(400).json({ success: false, message: 'Payment reference is required.' });
        }

        if (reference.startsWith('WCOM-MNF-')) {
            const monnifyController = require('./monnifyController');
            return monnifyController.verifyMonnifyTransaction(req, res);
        }

        if (reference.startsWith('GX-') || reference.startsWith('TEMP-')) {
            const paymentController = require('./paymentController');
            return paymentController.verifyTransaction(req, res);
        }

        const result = await paymentV2Service.verifyAndConfirm(reference);

        return res.json({
            success:   true,
            status:    result.status,
            reference: result.reference,
            amount:    result.amount,
            currency:  result.currency,
            paidAt:    result.paidAt,
            confirmed: result.status === 'success',
            order:     result.order,
            receipt:   result.receipt,
        });

    } catch (err) {
        logger.error(`[PaymentV2] verifyPayment error: ${err.message}`);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: process.env.NODE_ENV === 'production' ? 'Payment verification failed.' : err.message,
        });
    }
};

// ─── POST /api/v1/payment/v2/vault-card ───────────────────────────────────────

exports.vaultCard = async (req, res) => {
    try {
        const { cardNumber, expiry, cvv } = req.body;
        
        if (!cardNumber || !expiry || !cvv) {
            return res.status(400).json({ success: false, message: 'Missing card details' });
        }
        
        // Mock secure vaulting process (e.g. via Stripe, Paystack)
        const last4 = cardNumber.slice(-4);
        
        return res.status(200).json({
            success: true,
            message: 'Card successfully vaulted',
            card: {
                last4,
                brand: cardNumber.startsWith('4') ? 'Visa' : 'MasterCard',
                expMonth: expiry.split('/')[0],
                expYear: expiry.split('/')[1]
            }
        });
    } catch (error) {
        logger.error(`[PaymentV2] vaultCard error: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Failed to vault card' });
    }
};

// ─── POST /api/v1/payment/webhook/paystack ────────────────────────────────────
//
// CRITICAL: This endpoint must NOT use JSON body parsing middleware.
// Express must receive the raw Buffer so the HMAC can be computed correctly.
// The route is registered with express.raw() — see paymentV2Routes.js.

exports.paystackWebhook = async (req, res) => {
    // Always respond 200 immediately — Paystack retries on non-2xx
    res.sendStatus(200);

    const signature = req.headers['x-paystack-signature'];
    const rawBody   = req.body; // Buffer (from express.raw middleware on this route)

    if (!rawBody || !signature) {
        logger.warn('[PaymentV2] Webhook received with missing body or signature');
        return;
    }

    try {
        const result = await paymentV2Service.handlePaystackWebhook(rawBody, signature);

        if (!result.ok) {
            logger.warn(`[PaymentV2] Webhook processing issue: ${result.reason}`);
        }
    } catch (error) {
        logger.error(`[PaymentV2] Webhook processing exception: ${error.message}`);
    }
};

// ─── POST /api/v1/payment/webhook/stripe ──────────────────────────────────────

exports.stripeWebhook = async (req, res) => {
    res.sendStatus(200);

    const signature = req.headers['stripe-signature'];
    const rawBody = req.body;

    if (!rawBody || !signature) {
        logger.warn('[PaymentV2] Stripe Webhook received with missing body or signature');
        return;
    }

    try {
        const stripeService = require('../services/stripeService');
        const event = await stripeService.constructWebhookEvent(rawBody, signature);

        const dedupeId = `stripe:${event.type}:${event.id}`;
        
        try {
            await prisma.webhookEvent.create({
                data: {
                    eventType: event.type,
                    eventId: dedupeId,
                    reference: event.data.object?.id || null,
                    payload: JSON.stringify(event),
                    processed: false,
                },
            });
        } catch (uniqueErr) {
            if (uniqueErr.code === 'P2002') {
                logger.info(`[PaymentV2] Duplicate stripe webhook skipped: ${dedupeId}`);
                return;
            }
            logger.warn(`[PaymentV2] WebhookEvent create warning: ${uniqueErr.message}`);
        }

        if (event.type === 'payment_intent.succeeded') {
            const pi = event.data.object;
            const reference = pi.metadata?.marketplaceOrderId || pi.id;

            const order = await prisma.marketplaceOrder.findFirst({
                where: { OR: [{ id: reference }, { paymentReference: reference }] },
                include: { fulfillmentOrders: true }
            });

            if (order && order.paymentStatus === 'PENDING') {
                await prisma.$transaction(async (tx) => {
                    await tx.marketplaceOrder.update({
                        where: { id: order.id },
                        data: { paymentStatus: 'PAID', paidAt: new Date(), status: 'PROCESSING', paymentMethod: 'STRIPE' }
                    });
                    for (const fo of order.fulfillmentOrders) {
                        await tx.fulfillmentOrder.update({
                            where: { id: fo.id },
                            data: { paymentStatus: 'HELD', status: 'CONFIRMED' }
                        });
                        await tx.escrowPayment.create({
                            data: {
                                fulfillmentOrderId: fo.id,
                                buyerId: order.buyerId,
                                sellerId: fo.sellerId,
                                totalAmount: fo.grandTotal,
                                commissionRate: fo.commissionRate,
                                commissionAmount: fo.commissionAmount,
                                sellerAmount: fo.sellerAmount,
                                paymentReference: pi.id,
                                paymentProvider: 'STRIPE',
                                status: 'HELD'
                            }
                        });
                    }
                    await tx.transaction.create({
                        data: {
                            userId: order.buyerId,
                            type: 'PURCHASE',
                            amount: pi.amount / 100,
                            currency: pi.currency.toUpperCase(),
                            status: 'COMPLETED',
                            referenceId: order.id,
                            description: `Stripe payment for Order #${order.id.substring(0, 8)}`,
                        }
                    });
                });
            }
        }

        await prisma.webhookEvent.updateMany({
            where: { eventId: dedupeId },
            data: { processed: true, processedAt: new Date() }
        });

    } catch (error) {
        logger.error(`[PaymentV2] Stripe Webhook error: ${error.message}`);
    }
};

// ─── BNPL Mock Endpoints ──────────────────────────────────────────────────────

exports.initializeBnpl = async (req, res) => {
    try {
        const userId = req.user.id;
        const { items, shippingAddress, isConsolidated, region = 'US', promoCode, provider } = req.body;
        
        const { parentOrder: order, totalAmountUSD } = await checkoutService.processCheckout({
            userId,
            items,
            shippingAddress,
            isConsolidated,
            region,
            promoCodeStr: promoCode,
            paymentMethod: provider ? provider.toUpperCase() : 'BNPL',
            initialStatus: 'PENDING'
        });

        // Fake reference/intentId
        const intentId = `BNPL-${provider.toUpperCase()}-${order.id}-${Date.now()}`;

        // Return a mock redirect URL to trigger the frontend modal/flow
        return res.status(200).json({
            success: true,
            authorization_url: `#bnpl-modal-${intentId}`,
            intentId,
            orderId: order.id,
            provider,
            amount: totalAmountUSD
        });
    } catch (error) {
        logger.error(`[BNPL] Initialize error: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Failed to initialize BNPL' });
    }
};

exports.verifyBnpl = async (req, res) => {
    try {
        const { intentId, orderId, provider } = req.body;
        const userId = req.user.id;

        const order = await prisma.order.findUnique({
            where: { id: orderId }
        });

        if (!order || order.buyerId !== userId) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Mark as paid
        await prisma.order.update({
            where: { id: orderId },
            data: {
                paymentStatus: 'PAID',
                status: 'PROCESSING',
                paymentReference: intentId,
                paymentMethod: provider.toUpperCase()
            }
        });

        // SubOrders
        await prisma.order.updateMany({
            where: { parentOrderId: orderId },
            data: {
                paymentStatus: 'PAID',
                status: 'PROCESSING'
            }
        });

        await prisma.transaction.create({
            data: {
                userId,
                type: 'PURCHASE',
                amount: Number(order.totalAmount),
                currency: 'NGN',
                status: 'COMPLETED',
                referenceId: orderId,
                description: `Payment for Order #${orderId.substring(0, 8)} via ${provider}`
            }
        });
        
        // Remove items from cart
        const cart = await prisma.cart.findUnique({ where: { userId } });
        if (cart) {
            const productIds = (await prisma.orderItem.findMany({ where: { orderId } })).map(i => String(i.productId));
            await prisma.cartItem.deleteMany({
                where: {
                    cartId: cart.id,
                    productId: { in: productIds }
                }
            });
        }

        return res.json({ success: true, message: 'BNPL payment verified successfully', order });
    } catch (error) {
        logger.error(`[BNPL] Verify error: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Failed to verify BNPL' });
    }
};
