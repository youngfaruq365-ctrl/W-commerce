'use strict';

/**
 * Checkout V2 Controller — Multi-Seller Order Architecture (Phase 4)
 *
 * Routes
 *   POST /api/v1/checkout              — Initiate checkout (create MarketplaceOrder)
 *   GET  /api/v1/checkout/:id          — Fetch a MarketplaceOrder by ID (buyer/admin)
 *   GET  /api/v1/checkout/:id/fulfillment — List FulfillmentOrders for a MarketplaceOrder
 *   GET  /api/v1/checkout/my-orders    — List buyer's MarketplaceOrders (paginated)
 */

const checkoutV2Service = require('../services/checkoutV2Service');
const prisma            = require('../utils/prismaClient');
const logger            = require('../utils/logger');

// ─── POST /api/v1/checkout ────────────────────────────────────────────────────

exports.createCheckout = async (req, res) => {
    try {
        const buyerId = req.user.id;

        const {
            idempotencyKey,
            promoCode,
            paymentMethod,
            paymentReference,
            addressId,
            addressData,
            notes,
            items,          // optional: explicit item list (bypasses cart)
        } = req.body;

        // fromCart = true when no explicit items are provided
        const fromCart = !items || items.length === 0;

        const result = await checkoutV2Service.processCheckoutV2({
            buyerId,
            idempotencyKey,
            promoCodeStr:     promoCode,
            paymentMethod,
            paymentReference,
            addressId,
            addressData,
            notes,
            fromCart,
            items:            fromCart ? undefined : items,
        });

        // 201 for new order, 200 for idempotent replay
        const statusCode = result.isReplay ? 200 : 201;

        let bankDetails = null;
        if (result.marketplaceOrder.paymentMethod === 'BANK_TRANSFER' || result.marketplaceOrder.paymentMethod === 'direct_bank') {
            const firstFo = result.fulfillmentOrders[0];
            if (firstFo && firstFo.sellerId) {
                const store = await prisma.store.findUnique({ where: { sellerId: firstFo.sellerId } });
                if (store) {
                    bankDetails = {
                        bankName: store.bankName,
                        accountNumber: store.accountNumber,
                        accountName: store.accountName,
                        bankCode: store.bankCode
                    };
                }
            }
        }

        return res.status(statusCode).json({
            success: true,
            isReplay: result.isReplay ?? false,
            marketplaceOrder:  result.marketplaceOrder,
            fulfillmentOrders: result.fulfillmentOrders,
            summary:           result.summary,
            bankDetails:       bankDetails,
        });

    } catch (err) {
        logger.error(`[CheckoutV2] createCheckout error: ${err.message}`);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || 'Checkout failed. Please try again.',
        });
    }
};

// ─── GET /api/v1/checkout/my-orders ──────────────────────────────────────────

exports.getMyOrders = async (req, res) => {
    try {
        const buyerId = req.user.id;
        const page    = Math.max(1, parseInt(req.query.page  || '1',  10));
        const limit   = Math.min(50, parseInt(req.query.limit || '20', 10));
        const skip    = (page - 1) * limit;

        const [orders, total] = await Promise.all([
            prisma.marketplaceOrder.findMany({
                where: { buyerId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    fulfillmentOrders: {
                        include: {
                            items: {
                                include: {
                                    product: {
                                        select: {
                                            id: true, title: true, price: true,
                                            images: { where: { isPrimary: true }, take: 1 },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            }),
            prisma.marketplaceOrder.count({ where: { buyerId } }),
        ]);

        return res.json({
            success: true,
            orders,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        });

    } catch (err) {
        logger.error(`[CheckoutV2] getMyOrders error: ${err.message}`);
        return res.status(500).json({ success: false, message: 'Failed to fetch orders.' });
    }
};

// ─── GET /api/v1/checkout/:id ─────────────────────────────────────────────────

exports.getMarketplaceOrder = async (req, res) => {
    try {
        const buyerId = req.user.id;
        const { id }  = req.params;

        const order = await prisma.marketplaceOrder.findUnique({
            where: { id },
            include: {
                fulfillmentOrders: {
                    include: {
                        items: {
                            include: {
                                product: {
                                    select: {
                                        id: true, title: true, price: true,
                                        images: { where: { isPrimary: true }, take: 1 },
                                    },
                                },
                            },
                        },
                    },
                },
                shippingAddress: true,
                promoCode: { select: { code: true, discountType: true, discountValue: true } },
            },
        });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }

        // Buyers can only see their own orders; admins can see all
        if (order.buyerId !== buyerId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        return res.json({ success: true, order });

    } catch (err) {
        logger.error(`[CheckoutV2] getMarketplaceOrder error: ${err.message}`);
        return res.status(500).json({ success: false, message: 'Failed to fetch order.' });
    }
};

// ─── GET /api/v1/checkout/:id/fulfillment ────────────────────────────────────

exports.getFulfillmentOrders = async (req, res) => {
    try {
        const buyerId = req.user.id;
        const { id }  = req.params;

        // Verify ownership first
        const parent = await prisma.marketplaceOrder.findUnique({
            where: { id },
            select: { buyerId: true },
        });

        if (!parent) {
            return res.status(404).json({ success: false, message: 'Marketplace order not found.' });
        }

        const isOwnerOrAdmin = parent.buyerId === buyerId || req.user.role === 'ADMIN';
        const isSellerOfOrder = req.user.role === 'SELLER'; // will narrow filter below

        if (!isOwnerOrAdmin && !isSellerOfOrder) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        const whereClause = { marketplaceOrderId: id };
        // Sellers only see their own fulfillment orders
        if (isSellerOfOrder && !isOwnerOrAdmin) {
            whereClause.sellerId = buyerId;
        }

        const fulfillmentOrders = await prisma.fulfillmentOrder.findMany({
            where: whereClause,
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                id: true, title: true, price: true, weightKg: true,
                                images: { where: { isPrimary: true }, take: 1 },
                            },
                        },
                    },
                },
            },
        });

        return res.json({ success: true, fulfillmentOrders });

    } catch (err) {
        logger.error(`[CheckoutV2] getFulfillmentOrders error: ${err.message}`);
        return res.status(500).json({ success: false, message: 'Failed to fetch fulfillment orders.' });
    }
};

// ─── GET /api/v1/checkout/seller/queue ───────────────────────────────────────
// Returns all FulfillmentOrders assigned to the authenticated seller

exports.getSellerQueue = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const page     = Math.max(1, parseInt(req.query.page   || '1',  10));
        const limit    = Math.min(50, parseInt(req.query.limit  || '20', 10));
        const status   = req.query.status; // optional filter

        const where = { sellerId, ...(status ? { status } : {}) };

        const [orders, total] = await Promise.all([
            prisma.fulfillmentOrder.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip:  (page - 1) * limit,
                take:  limit,
                include: {
                    marketplaceOrder: {
                        select: { id: true, buyerId: true, paymentStatus: true, currency: true },
                    },
                    items: {
                        include: {
                            product: {
                                select: {
                                    id: true, title: true, sku: true,
                                    images: { where: { isPrimary: true }, take: 1 },
                                },
                            },
                        },
                    },
                },
            }),
            prisma.fulfillmentOrder.count({ where }),
        ]);

        return res.json({
            success: true,
            orders,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        });

    } catch (err) {
        logger.error(`[CheckoutV2] getSellerQueue error: ${err.message}`);
        return res.status(500).json({ success: false, message: 'Failed to fetch seller queue.' });
    }
};

// ─── PATCH /api/v1/checkout/fulfillment/:foId/status ─────────────────────────
// Seller advances a FulfillmentOrder through its lifecycle

const FULFILLMENT_TRANSITIONS = {
    PENDING:           ['CONFIRMED', 'CANCELLED'],
    CONFIRMED:         ['PACKED',    'CANCELLED'],
    PACKED:            ['READY_TO_SHIP'],
    READY_TO_SHIP:     ['SHIPPED'],
    SHIPPED:           ['IN_TRANSIT'],
    IN_TRANSIT:        ['OUT_FOR_DELIVERY'],
    OUT_FOR_DELIVERY:  ['DELIVERED'],
    DELIVERED:         ['COMPLETED'],
    COMPLETED:         [],
    CANCELLED:         [],
    REFUNDED:          [],
};

exports.updateFulfillmentStatus = async (req, res) => {
    try {
        const sellerId   = req.user.id;
        const { foId }   = req.params;
        const { status, trackingNumber, carrier } = req.body;

        if (!status) {
            return res.status(400).json({ success: false, message: 'New status is required.' });
        }

        const fo = await prisma.fulfillmentOrder.findUnique({ where: { id: foId } });

        if (!fo) {
            return res.status(404).json({ success: false, message: 'Fulfillment order not found.' });
        }

        // Auth: only the seller or admin
        if (fo.sellerId !== sellerId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        const current  = fo.status;
        const allowed  = FULFILLMENT_TRANSITIONS[current] || [];
        const newStatus = status.toUpperCase();

        if (!allowed.includes(newStatus)) {
            return res.status(422).json({
                success: false,
                message: `Cannot transition FulfillmentOrder from ${current} to ${newStatus}.`,
                allowedTransitions: allowed,
            });
        }

        // Build update payload
        const updateData = { status: newStatus };
        if (trackingNumber) updateData.trackingNumber = trackingNumber;
        if (carrier)        updateData.carrier = carrier;

        const now = new Date();
        switch (newStatus) {
            case 'PACKED':           updateData.packedAt        = now; break;
            case 'READY_TO_SHIP':    updateData.readyToShipAt   = now; break;
            case 'DELIVERED':        updateData.deliveredAt     = now;
                                     // Escrow: release 48 h after delivery
                                     updateData.escrowReleaseAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
                                     break;
            case 'COMPLETED':        // set by escrow cron in Phase 6
                                     break;
            default:                 break;
        }

        const updated = await prisma.fulfillmentOrder.update({
            where: { id: foId },
            data:  updateData,
        });

        // Roll up MarketplaceOrder status from its children (async, non-blocking)
        _rollupMarketplaceStatus(fo.marketplaceOrderId).catch(e =>
            logger.error(`[CheckoutV2] Status rollup failed: ${e.message}`)
        );

        return res.json({ success: true, fulfillmentOrder: updated });

    } catch (err) {
        logger.error(`[CheckoutV2] updateFulfillmentStatus error: ${err.message}`);
        return res.status(500).json({ success: false, message: 'Failed to update fulfillment status.' });
    }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Derive the MarketplaceOrder.status from the statuses of all its FulfillmentOrders.
 * Runs outside the main transaction (fire-and-forget in the controller).
 */
async function _rollupMarketplaceStatus(marketplaceOrderId) {
    const fos = await prisma.fulfillmentOrder.findMany({
        where: { marketplaceOrderId },
        select: { status: true },
    });

    if (!fos.length) return;

    const statuses = fos.map(f => f.status);
    const all      = v => statuses.every(s => s === v);
    const any      = v => statuses.some(s => s === v);
    const allIn    = (...vs) => statuses.every(s => vs.includes(s));

    let marketplaceStatus;
    if (all('COMPLETED'))              marketplaceStatus = 'COMPLETED';
    else if (all('CANCELLED'))         marketplaceStatus = 'CANCELLED';
    else if (all('REFUNDED'))          marketplaceStatus = 'REFUNDED';
    else if (all('DELIVERED') || allIn('DELIVERED', 'COMPLETED')) marketplaceStatus = 'FULLY_DELIVERED';
    else if (any('DELIVERED'))         marketplaceStatus = 'PARTIALLY_DELIVERED';
    else if (all('SHIPPED') || allIn('SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY')) marketplaceStatus = 'FULLY_SHIPPED';
    else if (any('SHIPPED'))           marketplaceStatus = 'PARTIALLY_SHIPPED';
    else if (any('CANCELLED') || any('REFUNDED')) marketplaceStatus = 'PARTIALLY_CANCELLED';
    else if (any('PACKED') || any('READY_TO_SHIP')) marketplaceStatus = 'PROCESSING';
    else                               return; // no change needed

    await prisma.marketplaceOrder.update({
        where: { id: marketplaceOrderId },
        data:  { status: marketplaceStatus },
    });
}

// ─── POST /api/v1/checkout/initiate  (Phase 11) ───────────────────────────────
//
// Step 1 of the two-step checkout:
//   Groups cart items by seller, calculates per-seller totals, validates stock —
//   WITHOUT writing to DB. Returns a sessionToken + full grouped breakdown
//   so the frontend can render a seller-grouped confirmation screen.

exports.initiateCheckout = async (req, res) => {
    try {
        const buyerId = req.user.id;
        const {
            promoCode,
            paymentMethod,
            addressId,
            addressData,
            notes,
            items,   // optional explicit item list; if omitted reads from cart
        } = req.body;

        const fromCart = !items || items.length === 0;

        const result = await checkoutV2Service.previewCheckout({
            buyerId,
            promoCodeStr: promoCode,
            paymentMethod,
            addressId,
            addressData,
            notes,
            fromCart,
            items: fromCart ? undefined : items,
        });

        return res.json({
            success:      true,
            sessionToken: result.sessionToken,
            expiresAt:    result.expiresAt,
            session:      result.session,
        });

    } catch (err) {
        logger.error(`[CheckoutV2] initiateCheckout error: ${err.message}`);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || 'Failed to initiate checkout.',
        });
    }
};

// ─── POST /api/v1/checkout/confirm  (Phase 11) ────────────────────────────────
//
// Step 2: buyer has reviewed the grouped session and confirmed.
// Commits the MarketplaceOrder + FulfillmentOrders to the DB,
// clears the session, and returns the created order for payment redirect.

exports.confirmCheckout = async (req, res) => {
    try {
        const { sessionToken, idempotencyKey } = req.body;

        if (!sessionToken) {
            return res.status(400).json({ success: false, message: 'sessionToken is required.' });
        }

        // Generate idempotency key if client didn't provide one
        const iKey = idempotencyKey ||
            `ck-${req.user.id.slice(0, 8)}-${Date.now()}`;

        const result = await checkoutV2Service.confirmCheckout(sessionToken, iKey);

        let bankDetails = null;
        if (result.marketplaceOrder.paymentMethod === 'BANK_TRANSFER' || result.marketplaceOrder.paymentMethod === 'direct_bank') {
            const firstFo = result.fulfillmentOrders[0];
            if (firstFo && firstFo.sellerId) {
                const store = await prisma.store.findUnique({ where: { sellerId: firstFo.sellerId } });
                if (store) {
                    bankDetails = {
                        bankName: store.bankName,
                        accountNumber: store.accountNumber,
                        accountName: store.accountName,
                        bankCode: store.bankCode
                    };
                }
            }
        }

        return res.status(201).json({
            success:           true,
            isReplay:          result.isReplay ?? false,
            marketplaceOrder:  result.marketplaceOrder,
            fulfillmentOrders: result.fulfillmentOrders,
            summary:           result.summary,
            bankDetails:       bankDetails,
        });

    } catch (err) {
        logger.error(`[CheckoutV2] confirmCheckout error: ${err.message}`);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || 'Failed to confirm checkout.',
        });
    }
};

// ─── POST /api/v1/checkout/:id/upload-proof ─────────────────────────────────

exports.uploadProof = async (req, res) => {
    try {
        const { id: orderId } = req.params;
        const buyerId = req.user.id;

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const order = await prisma.marketplaceOrder.findUnique({
            where: { id: orderId },
            include: { fulfillmentOrders: { include: { items: true } } }
        });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Marketplace order not found' });
        }
        if (order.buyerId !== buyerId) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        const proofUrl = `/uploads/${req.file.filename}`;

        const updated = await prisma.marketplaceOrder.update({
            where: { id: orderId },
            data: {
                paymentStatus: 'PENDING_VERIFICATION',
                paymentReference: proofUrl
            }
        });

        await prisma.fulfillmentOrder.updateMany({
             where: { marketplaceOrderId: orderId },
             data: { paymentStatus: 'PENDING_VERIFICATION' }
        });

        // Task 14: Clear the purchased items from the buyer's cart now that proof is uploaded
        const productIds = order.fulfillmentOrders.flatMap(fo => fo.items.map(i => i.productId));
        const cart = await prisma.cart.findUnique({ where: { userId: buyerId } });
        if (cart && productIds.length > 0) {
            await prisma.cartItem.deleteMany({
                where: {
                    cartId: cart.id,
                    productId: { in: productIds }
                }
            });
        }

        return res.json({ success: true, order: updated, proofUrl });
    } catch (err) {
        logger.error(`[CheckoutV2] uploadProof error: ${err.message}`);
        return res.status(500).json({ success: false, message: 'Failed to upload proof.' });
    }
};
