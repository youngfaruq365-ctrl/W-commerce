'use strict';

/**
 * Payment V2 Service — Phase 5
 *
 * Full Paystack webhook lifecycle for the MarketplaceOrder architecture:
 *
 *   initializePaystack()      → Creates Paystack transaction, tags MarketplaceOrder.paymentReference
 *   handlePaystackWebhook()   → Verifies signature, dispatches to event handlers
 *
 * Webhook event handlers (atomic, idempotent):
 *   onChargeSuccess()   → Mark PAID, set FulfillmentOrder paymentStatus=HELD,
 *                         create Transaction log, notify buyer + sellers
 *   onChargeFailed()    → Mark FAILED, restore stock, notify buyer
 *   onTransferSuccess() → Mark Payout COMPLETED (Phase 6 payout hook)
 *   onTransferFailed()  → Mark Payout FAILED, alert admin
 *
 * Design:
 *   • Webhook always returns 200 so Paystack doesn't retry indefinitely
 *   • Idempotency: duplicate events detected via WebhookEvent.eventId (unique)
 *   • Stock restored on charge.failed inside a transaction
 *   • EscrowPayment records use legacy Order relation with FO id in metadata
 *     (full bridge FK added in Phase 9 migration)
 */

const crypto         = require('crypto');
const prisma         = require('../utils/prismaClient');
const logger         = require('../utils/logger');
const notificationV2 = require('./notificationV2Service'); // Phase 9
const inventory      = require('./inventoryService');       // Phase 13
const fulfillment    = require('./fulfillmentService');     // Phase 14
// eventBus lazy-loaded to avoid circular deps at startup

const PAYSTACK_SECRET =
    process.env.PAYSTACK_PRIMARY_SECRET_KEY ||
    process.env.PAYSTACK_SECRET_KEY;

// ─── HTTP helpers (zero extra deps) ──────────────────────────────────────────

function paystackRequest(path, method = 'GET', body = null) {
    const https   = require('https');
    const payload = body ? JSON.stringify(body) : null;

    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.paystack.co',
            path,
            method,
            headers: {
                Authorization:  `Bearer ${PAYSTACK_SECRET}`,
                'Content-Type': 'application/json',
                ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
            },
        };

        const req = https.request(options, res => {
            let data = '';
            res.on('data', c => (data += c));
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.status) resolve(parsed.data);
                    else reject(new Error(parsed.message || 'Paystack API error'));
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}

// ─── Signature verification ───────────────────────────────────────────────────

/**
 * Verify HMAC-SHA512 webhook signature.
 * @param {Buffer|string} rawBody   - Raw request body (before JSON.parse)
 * @param {string}        signature - x-paystack-signature header
 */
exports.verifySignature = (rawBody, signature) => {
    if (!PAYSTACK_SECRET) return false;
    const hash = crypto
        .createHmac('sha512', PAYSTACK_SECRET)
        .update(rawBody)
        .digest('hex');
    return hash === signature;
};

// ─── Initialize payment ───────────────────────────────────────────────────────

/**
 * Create a Paystack transaction for a MarketplaceOrder.
 * @returns {{ authorizationUrl, reference, accessCode }}
 */
exports.initializePaystack = async ({
    marketplaceOrderId,
    buyerEmail,
    amountNGN,
    frontendCallbackUrl,
}) => {
    if (!PAYSTACK_SECRET) {
        throw Object.assign(
            new Error('Paystack is not configured. Set PAYSTACK_SECRET_KEY in your environment.'),
            { statusCode: 503 }
        );
    }

    // Deterministic reference — re-initialization for same order returns same reference
    const reference = `MO-${marketplaceOrderId.replace(/-/g, '').substring(0, 20)}`;

    const data = await paystackRequest('/transaction/initialize', 'POST', {
        email:        buyerEmail,
        amount:       Math.round(amountNGN * 100),  // kobo
        currency:     'NGN',
        reference,
        bearer:       'account', // Platform bears the Paystack transaction fee
        metadata: {
            marketplaceOrderId,
            custom_fields: [
                {
                    display_name:  'Order ID',
                    variable_name: 'marketplace_order_id',
                    value:         marketplaceOrderId,
                },
            ],
        },
        callback_url: frontendCallbackUrl || `${process.env.FRONTEND_URL}/orders/${marketplaceOrderId}`,
    });

    // Store the reference on the order so the webhook can look it up
    await prisma.marketplaceOrder.update({
        where: { id: marketplaceOrderId },
        data:  { paymentReference: reference },
    });

    // Phase 12: Create authoritative PaymentIntent record (PENDING)
    if (prisma.paymentIntent) {
        await prisma.paymentIntent.upsert({
            where:  { reference },
            create: {
                marketplaceOrderId,
                gateway:    'PAYSTACK',
                reference,
                accessCode: data.access_code || null,
                amount:     amountNGN,
                currency:   'NGN',
                status:     'PENDING',
            },
            update: {
                accessCode: data.access_code || null,
                status:     'PENDING',
            },
        }).catch(e => logger.warn(`[PaymentV2] PaymentIntent upsert warning: ${e.message}`));
    }

    return {
        authorizationUrl: data.authorization_url,
        reference:        data.reference,
        accessCode:       data.access_code,
    };
};

// ─── Verify / confirm (manual callback path) ──────────────────────────────────

/**
 * Verify a Paystack transaction by reference (used on the frontend callback route).
 * Calls the same onChargeSuccess logic if the transaction is successful.
 */
exports.verifyAndConfirm = async (reference) => {
    if (reference.startsWith('pi_') || reference.startsWith('cs_') || reference.startsWith('ch_')) {
        // Verify with Stripe directly — never trust the client-supplied reference.
        if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe is not configured');
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        let paid = false, amount = 0, currency = 'USD';
        if (reference.startsWith('cs_')) {
            const s = await stripe.checkout.sessions.retrieve(reference);
            paid = s.payment_status === 'paid'; amount = (s.amount_total || 0) / 100; currency = s.currency;
        } else if (reference.startsWith('pi_')) {
            const pi = await stripe.paymentIntents.retrieve(reference);
            paid = pi.status === 'succeeded'; amount = (pi.amount_received || 0) / 100; currency = pi.currency;
        } else {
            const ch = await stripe.charges.retrieve(reference);
            paid = ch.paid && ch.status === 'succeeded'; amount = (ch.amount || 0) / 100; currency = ch.currency;
        }
        if (!paid) throw new Error('Stripe payment not completed');
        return { status: 'success', reference, amount, currency: String(currency).toUpperCase(), paidAt: new Date() };
    }

    if (!PAYSTACK_SECRET) {
        throw Object.assign(new Error('Paystack not configured.'), { statusCode: 503 });
    }

    const response = await paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`);
    const txData = response.data || {};

    if (txData.status === 'success') {
        await onChargeSuccess(txData);
    }

    const txReference = txData.reference || txData.id || reference;
    let order = null;
    let receipt = null;

    // Fetch the V2 order
    const marketplaceOrder = await prisma.marketplaceOrder.findFirst({
        where: {
            OR: [
                { paymentReference: txReference },
                ...(txData.metadata?.marketplaceOrderId ? [{ id: txData.metadata.marketplaceOrderId }] : [])
            ]
        },
        include: {
            fulfillmentOrders: {
                include: { items: true }
            }
        },
    });

    if (marketplaceOrder) {
        order = marketplaceOrder;
        receipt = {
            orderId: marketplaceOrder.id,
            subtotal: marketplaceOrder.subtotal,
            shipping: marketplaceOrder.shippingCost,
            discount: marketplaceOrder.discountTotal,
            total: marketplaceOrder.grandTotal,
            items: marketplaceOrder.fulfillmentOrders.flatMap(fo => fo.items)
        };
    } else {
        // Fallback to legacy order
        const legacyOrder = await prisma.order.findFirst({
            where: { stripePaymentId: txReference },
            include: { items: true }
        });
        if (legacyOrder) {
            order = legacyOrder;
            const subtotal = legacyOrder.items.reduce((acc, i) => acc + (Number(i.priceAtTime) * Number(i.quantity)), 0);
            const shipping = Number(legacyOrder.shippingCost || 0);
            const total = Number(legacyOrder.totalAmount);
            receipt = {
                orderId: legacyOrder.id,
                subtotal: subtotal,
                shipping: shipping,
                discount: Math.max(0, subtotal + shipping - total),
                total: total,
                items: legacyOrder.items
            };
        }
    }

    return {
        status:    txData.status,
        reference: txData.reference,
        amount:    (txData.amount || 0) / 100,
        currency:  txData.currency,
        paidAt:    txData.paid_at,
        order:     order,
        receipt:   receipt
    };
};

// ─── Webhook dispatcher ───────────────────────────────────────────────────────

/**
 * Main webhook entry point.
 * Always resolves — never throws — so the HTTP handler can always return 200.
 */
exports.handlePaystackWebhook = async (rawBody, signature) => {
    // 1. Signature check
    if (!exports.verifySignature(rawBody, signature)) {
        logger.warn('[PaymentV2] Webhook rejected: invalid signature');
        return { ok: false, reason: 'invalid_signature' };
    }

    let event;
    try {
        event = JSON.parse(rawBody.toString());
    } catch {
        logger.warn('[PaymentV2] Webhook rejected: unparseable body');
        return { ok: false, reason: 'parse_error' };
    }

    const { event: eventType, data } = event;

    // 2. Idempotency — WebhookEvent.eventId is @unique in the schema
    const dedupeId = `${eventType}:${data?.reference || data?.id || Date.now()}`;
    try {
        await prisma.webhookEvent.create({
            data: {
                eventType,
                eventId:   dedupeId,
                reference: data?.reference || null,
                payload:   JSON.stringify(event),
                processed: false,
            },
        });
    } catch (uniqueErr) {
        // P2002 = unique constraint violation — duplicate event
        if (uniqueErr.code === 'P2002') {
            logger.info(`[PaymentV2] Duplicate webhook skipped: ${dedupeId}`);
            return { ok: true, skipped: true };
        }
        // Other DB errors — log but still try to process
        logger.warn(`[PaymentV2] WebhookEvent create warning: ${uniqueErr.message}`);
    }

    // 3. Dispatch
    try {
        switch (eventType) {
            case 'charge.success':
                await onChargeSuccess(data);
                break;
            case 'charge.failed':
                await onChargeFailed(data);
                break;
            case 'transfer.success':
                await onTransferSuccess(data);
                break;
            case 'transfer.failed':
            case 'transfer.reversed':
                await onTransferFailed(data, eventType);
                break;
            default:
                logger.info(`[PaymentV2] Unhandled webhook event type: ${eventType}`);
        }

        // Mark processed
        await prisma.webhookEvent.updateMany({
            where: { eventId: dedupeId },
            data:  { processed: true, processedAt: new Date() },
        });

        return { ok: true, eventType };

    } catch (err) {
        logger.error(`[PaymentV2] Handler error for ${eventType}: ${err.message}`);
        // Don't update processed — will be retried by Paystack
        return { ok: false, reason: err.message };
    }
};

// ─── Event Handlers ───────────────────────────────────────────────────────────

/**
 * charge.success
 *
 * Atomic steps:
 *  a. MarketplaceOrder → paymentStatus=PAID, paidAt=now, status=PROCESSING
 *  b. All FulfillmentOrders → paymentStatus=HELD, status=CONFIRMED
 *  c. Transaction record (buyer payment audit log)
 * Then: notify buyer + each seller (fire-and-forget)
 */
async function onChargeSuccess(data) {
    const reference = data.reference;
    const amountNGN = (data.amount || 0) / 100;

    // Locate MarketplaceOrder
    const marketplaceOrder = await prisma.marketplaceOrder.findFirst({
        where: {
            OR: [
                { paymentReference: reference },
                ...(data.metadata?.marketplaceOrderId ? [{ id: data.metadata.marketplaceOrderId }] : [])
            ]
        },
        include: {
            fulfillmentOrders: {
                include: { items: true }
            },
            buyer: { select: { id: true, email: true, fullName: true } },
        },
    });

    if (!marketplaceOrder) {
        // Could be a legacy GX-{orderId} reference
        await _legacyChargeSuccess(reference, amountNGN);
        return;
    }

    // Idempotency guard
    if (marketplaceOrder.paymentStatus === 'PAID') {
        logger.info(`[PaymentV2] MarketplaceOrder ${marketplaceOrder.id} already PAID — skipping`);
        return;
    }

    const now = new Date();
    // Baseline escrow window — overwritten with actual delivery time + 48 h in Phase 4 controller
    const escrowReleaseAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
        // a. Confirm payment on MarketplaceOrder
        await tx.marketplaceOrder.update({
            where: { id: marketplaceOrder.id },
            data: {
                paymentStatus:  'PAID',
                paymentMethod:  (data.channel || 'PAYSTACK').toUpperCase(),
                paidAt:         now,
                status:         'PROCESSING',
                expiresAt:      null,   // cancel checkout-session TTL
            },
        });

        // b. Hold escrow on each FulfillmentOrder
        for (const fo of marketplaceOrder.fulfillmentOrders) {
            await tx.fulfillmentOrder.update({
                where: { id: fo.id },
                data: {
                    paymentStatus:   'HELD',
                },
            });

            // Create EscrowPayment linked to FulfillmentOrder
            await tx.escrowPayment.create({
                data: {
                    fulfillmentOrderId: fo.id,
                    buyerId:          marketplaceOrder.buyerId,
                    sellerId:         fo.sellerId,
                    totalAmount:      fo.grandTotal,
                    commissionRate:   fo.commissionRate,
                    commissionAmount: fo.commissionAmount,
                    sellerAmount:     fo.sellerAmount,
                    paymentReference: reference,
                    paymentProvider:  (data.channel || 'PAYSTACK').toUpperCase(),
                    status:           'HELD',
                    releaseScheduledAt: escrowReleaseAt,
                }
            });

            // Increment soldCount for each product
            for (const item of fo.items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: { soldCount: { increment: item.quantity } }
                });
            }
        }

        // c. Buyer transaction log
        await tx.transaction.create({
            data: {
                userId:      marketplaceOrder.buyerId,
                type:        'PURCHASE',
                amount:      amountNGN,
                currency:    'NGN',
                status:      'COMPLETED',
                referenceId: marketplaceOrder.id,
                description: `Paystack payment for MarketplaceOrder #${marketplaceOrder.id.substring(0, 8)}`,
            },
        });

        // d. Clear purchased cart items for V2 online payments
        if (marketplaceOrder.buyerId) {
            const purchasedProductIds = marketplaceOrder.fulfillmentOrders.flatMap(fo => fo.items.map(i => i.productId));
            const cart = await tx.cart.findUnique({ where: { userId: marketplaceOrder.buyerId } });
            if (cart && purchasedProductIds.length > 0) {
                await tx.cartItem.deleteMany({
                    where: {
                        cartId: cart.id,
                        productId: { in: purchasedProductIds }
                    }
                });
            }
        }
    });

    // Phase 12: Create authoritative PaymentIntent row (CAPTURED)
    if (prisma.paymentIntent) {
        await prisma.paymentIntent.upsert({
            where:  { reference },
            create: {
                marketplaceOrderId: marketplaceOrder.id,
                gateway:         'PAYSTACK',
                reference,
                amount:          amountNGN,
                currency:        'NGN',
                channel:         data.channel || null,
                status:          'CAPTURED',
                authorizedAt:    now,
                capturedAt:      now,
                gatewayResponse: JSON.stringify(data),
            },
            update: {
                status:          'CAPTURED',
                channel:         data.channel || null,
                capturedAt:      now,
                gatewayResponse: JSON.stringify(data),
            },
        }).catch(e => logger.warn(`[PaymentV2] PaymentIntent captured upsert: ${e.message}`));
    }

    // Phase 13: Mark all inventory reservations as DEDUCTED (stock already decremented at reserve())
    for (const fo of marketplaceOrder.fulfillmentOrders) {
        await inventory.deductForFulfillmentOrder(fo.id)
            .catch(e => logger.warn(`[PaymentV2] Inventory deduct FO ${fo.id}: ${e.message}`));
    }

    // Phase 14: Auto-advance each FulfillmentOrder PENDING → SELLER_REVIEW
    for (const fo of marketplaceOrder.fulfillmentOrders) {
        await fulfillment.advanceToReview(fo.id)
            .catch(e => logger.warn(`[PaymentV2] advanceToReview FO ${fo.id}: ${e.message}`));
    }

    // Notifications via V2 service (non-blocking)
    _notifyPaymentConfirmed(marketplaceOrder).catch(e =>
        logger.error(`[PaymentV2] Notification error: ${e.message}`)
    );

    // Emit PAYMENT_CONFIRMED domain event via event bus
    setImmediate(() => {
        try {
            const eventBus = require('./eventBus');
            eventBus.emit(
                'PAYMENT_CONFIRMED',
                'MarketplaceOrder',
                marketplaceOrder.id,
                {
                    reference,
                    amountNGN,
                    buyerId:  marketplaceOrder.buyerId,
                    foCount:  marketplaceOrder.fulfillmentOrders.length,
                },
                { id: 'SYSTEM', type: 'SYSTEM' }
            ).catch(() => {});
        } catch { /* eventBus may not be initialized yet in tests */ }
        
        try {
            const orderEventService = require('./orderEventService');
            const sellerIds = marketplaceOrder.fulfillmentOrders.map(fo => fo.sellerId);
            orderEventService.emitOrderUpdated({
                orderId: marketplaceOrder.id,
                buyerId: marketplaceOrder.buyerId,
                sellerIds: sellerIds
            });
        } catch (e) {
            logger.error(`[PaymentV2] orderEventService error: ${e.message}`);
        }
    });

    logger.info(
        `[PaymentV2] charge.success ✅ MarketplaceOrder ${marketplaceOrder.id} → PAID` +
        ` | ₦${amountNGN.toLocaleString()} | ${marketplaceOrder.fulfillmentOrders.length} FOs held`
    );
}

/**
 * charge.failed — restore stock and mark FAILED
 */
async function onChargeFailed(data) {
    const reference = data.reference;

    const marketplaceOrder = await prisma.marketplaceOrder.findUnique({
        where: { paymentReference: reference },
        include: { fulfillmentOrders: { include: { items: true } } },
    });

    if (!marketplaceOrder) {
        logger.info(`[PaymentV2] charge.failed: checking legacy Order for ref ${reference}`);
        const checkoutService = require('./checkoutService');
        await checkoutService.cancelAndRestoreOrder({
            orderId: data.metadata?.orderId,
            reference
        }).catch(err => logger.error(`[PaymentV2] legacy cancel error: ${err.message}`));
        return;
    }

    if (marketplaceOrder.paymentStatus === 'FAILED') {
        logger.info(`[PaymentV2] MarketplaceOrder ${marketplaceOrder.id} already FAILED — skipping`);
        return;
    }

    await prisma.$transaction(async (tx) => {
        await tx.marketplaceOrder.update({
            where: { id: marketplaceOrder.id },
            data: { paymentStatus: 'FAILED', status: 'CANCELLED' },
        });

        for (const fo of marketplaceOrder.fulfillmentOrders) {
            await tx.fulfillmentOrder.update({
                where: { id: fo.id },
                data:  { status: 'CANCELLED' },
            });

            // Restore stock
            for (const item of fo.items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data:  { stock: { increment: item.quantity } },
                }).catch(e =>
                    logger.error(`[PaymentV2] Stock restore failed for ${item.productId}: ${e.message}`)
                );
            }
        }
    });

    // Phase 13: Release inventory reservations — stock returned to shelves
    for (const fo of marketplaceOrder.fulfillmentOrders) {
        await inventory.releaseForFulfillmentOrder(fo.id)
            .catch(e => logger.warn(`[PaymentV2] Inventory release FO ${fo.id}: ${e.message}`));
    }

    // Phase 12: Create FAILED PaymentIntent row (outside tx — non-blocking)
    if (prisma.paymentIntent) {
        await prisma.paymentIntent.upsert({
            where:  { reference },
            create: {
                marketplaceOrderId: marketplaceOrder.id,
                gateway:         'PAYSTACK',
                reference,
                amount:          (data.amount || 0) / 100,
                currency:        'NGN',
                channel:         data.channel || null,
                status:          'FAILED',
                failedAt:        new Date(),
                failureReason:   data.gateway_response || 'Payment declined',
                gatewayResponse: JSON.stringify(data),
            },
            update: {
                status:        'FAILED',
                failedAt:      new Date(),
                failureReason: data.gateway_response || 'Payment declined',
            },
        }).catch(e => logger.warn(`[PaymentV2] PaymentIntent failed upsert: ${e.message}`));
    }

    // Notify buyer via V2 service
    await notificationV2.notify(marketplaceOrder.buyerId, {
        type:      'PAYMENT_FAILED',
        title:     'Payment Failed',
        body:      `Payment for order #${marketplaceOrder.id.substring(0, 8).toUpperCase()} was not completed. Please try again.`,
        actionUrl: `/orders/${marketplaceOrder.id}`,
    }).catch(() => {});

    logger.warn(`[PaymentV2] charge.failed ❌ MarketplaceOrder ${marketplaceOrder.id} → FAILED | stock restored`);
}

/**
 * transfer.success — payout landed in seller's bank account
 */
async function onTransferSuccess(data) {
    const reference = data.reference;
    logger.info(`[PaymentV2] transfer.success: ${reference} | ₦${(data.amount || 0) / 100}`);

    await prisma.payout.updateMany({
        where: { reference },
        data:  { status: 'COMPLETED' },
    }).catch(e => logger.error(`[PaymentV2] Payout update error: ${e.message}`));
}

/**
 * transfer.failed / transfer.reversed
 */
async function onTransferFailed(data, eventType) {
    const reference = data.reference;
    logger.error(`[PaymentV2] ${eventType}: ${reference} | ₦${(data.amount || 0) / 100}`);

    await prisma.payout.updateMany({
        where: { reference },
        data:  { status: 'FAILED' },
    }).catch(e => logger.error(`[PaymentV2] Payout update error: ${e.message}`));
}

// ─── Notification helper (Phase 12: uses notificationV2Service) ───────────────

async function _notifyPaymentConfirmed(marketplaceOrder) {
    const shortId = marketplaceOrder.id.substring(0, 8).toUpperCase();

    // Buyer in-app (multi-channel via notificationV2)
    await notificationV2.notify(marketplaceOrder.buyerId, {
        type:      'ORDER_PAID',
        title:     'Payment Confirmed ✅',
        body:      `Order #${shortId} is confirmed. Sellers are preparing your items.`,
        actionUrl: `/orders/${marketplaceOrder.id}`,
        orderId:   marketplaceOrder.id,
    }).catch(e => logger.error(`[PaymentV2] Buyer notif error: ${e.message}`));

    // Each seller in-app
    for (const fo of marketplaceOrder.fulfillmentOrders) {
        await notificationV2.notify(fo.sellerId, {
            type:      'NEW_ORDER',
            title:     'New Order Received 🛒',
            body:      `Order #${shortId} — ₦${Number(fo.grandTotal).toLocaleString()}. Please pack and confirm.`,
            actionUrl: `/seller/orders/${fo.id}`,
            orderId:   marketplaceOrder.id,
        }).catch(e => logger.error(`[PaymentV2] Seller notif error (${fo.sellerId}): ${e.message}`));
    }
}

// ─── Legacy fallback ──────────────────────────────────────────────────────────

exports._legacyChargeSuccess = _legacyChargeSuccess;
async function _legacyChargeSuccess(reference, amountNGN) {
    // Legacy format: 'GX-{orderId}' or 'GX-{shortUUID}' or 'GX-TEMP-{timestamp}'
    let orderId = reference.replace(/^GX-/, '');
    
    // First, try to find the order by the stripePaymentId (which holds the Paystack reference)
    let order = await prisma.order.findFirst({
        where: { stripePaymentId: reference },
        include: { items: { select: { productId: true, quantity: true } } }
    }).catch(() => null);

    // Fallback: try to find by ID if the reference was actually an order ID
    if (!order) {
        order = await prisma.order.findUnique({ 
            where: { id: orderId },
            include: { items: { select: { productId: true, quantity: true } } }
        }).catch(() => null);
    }
    
    // If order was found via stripePaymentId, we need to use its actual UUID
    if (order) {
        orderId = order.id;
    }

    if (!order) {
        logger.warn(`[PaymentV2] Legacy fallback: no Order for ref "${reference}"`);
        return;
    }
    
    if (order.paymentStatus === 'HELD' || order.status === 'PAID') {
        logger.info(`[PaymentV2] Legacy order ${orderId} already HELD/PAID — skipping`);
        return;
    }

    try {
        const paymentController = require('../controllers/paymentController');
        await paymentController.finalizeOrder(orderId, reference, amountNGN, order.buyerId);
    } catch (err) {
        logger.error(`[PaymentV2] Failed to finalize legacy order ${orderId}: ${err.message}`);
    }
}

exports.onChargeSuccess = onChargeSuccess;

