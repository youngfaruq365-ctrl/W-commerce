'use strict';

/**
 * Fulfillment Service — Phase 14
 *
 * Guarded state machine for seller-side order management.
 *
 * State Machine (seller controls):
 *
 *   PENDING
 *     │  (payment confirmed → auto-advance to SELLER_REVIEW via paymentV2Service)
 *     ▼
 *   SELLER_REVIEW  ──accept()──▶  ACCEPTED
 *                  ──reject()──▶  REJECTED (terminal)
 *                  ──cancel()──▶  CANCELLED (terminal)
 *     │
 *   ACCEPTED ──startPreparing()──▶  PREPARING
 *
 *   PREPARING ──markPacked()──▶  PACKED
 *
 *   PACKED ──requestCourier()──▶  AWAITING_COURIER
 *          (also creates Package record via packageService — Phase 15)
 *
 *   AWAITING_COURIER ──handover()──▶  HANDED_TO_COURIER
 *
 *   HANDED_TO_COURIER → (courier system takes over — Phase 16)
 *
 * Rules:
 *   • Only the seller who owns the FulfillmentOrder can transition it
 *   • Each transition validates the current status before applying
 *   • All transitions emit domain events via eventBus
 *   • Buyer and seller are notified via notificationV2 on key transitions
 */

const prisma            = require('../utils/prismaClient');
const logger            = require('../utils/logger');
const notificationV2    = require('./notificationV2Service');
const packageService    = require('./packageService');                          // Phase 15: auto-create package on mark_packed
const courierOfferSvc   = require('./delivery/courierOfferService');            // Phase 16: dispatch engine

// ─── Allowed transitions map ──────────────────────────────────────────────────
// Maps current status → array of { action, nextStatus }
const TRANSITIONS = {
    PENDING:          [{ action: 'seller_review',   nextStatus: 'SELLER_REVIEW'     }],
    SELLER_REVIEW:    [
        { action: 'accept',          nextStatus: 'ACCEPTED'          },
        { action: 'reject',          nextStatus: 'REJECTED'          },
        { action: 'cancel',          nextStatus: 'CANCELLED'         },
    ],
    ACCEPTED:         [{ action: 'start_preparing', nextStatus: 'PREPARING'         }],
    PREPARING:        [{ action: 'mark_packed',      nextStatus: 'PACKED'            }],
    PACKED:           [{ action: 'request_courier',  nextStatus: 'AWAITING_COURIER'  }],
    AWAITING_COURIER: [
        { action: 'handover',         nextStatus: 'HANDED_TO_COURIER' },
        { action: 'retry_dispatch',   nextStatus: 'AWAITING_COURIER' }
    ],
};

// Terminal statuses — no further transitions
const TERMINAL_STATUSES = new Set(['HANDED_TO_COURIER', 'REJECTED', 'CANCELLED', 'DELIVERED', 'COMPLETED', 'REFUNDED']);

// ─── Core transition engine ───────────────────────────────────────────────────

/**
 * transition
 *
 * Validates and applies a single state transition on a FulfillmentOrder.
 *
 * @param {object} opts
 * @param {string} opts.fulfillmentOrderId
 * @param {string} opts.sellerId              — must match FO.sellerId
 * @param {string} opts.action                — e.g. 'accept', 'mark_packed'
 * @param {object} [opts.data]                — extra fields to write (e.g. notes)
 * @returns {Promise<FulfillmentOrder>}
 */
async function transition({ fulfillmentOrderId, sellerId, action, data = {} }) {
    const fo = await prisma.fulfillmentOrder.findUnique({
        where: { id: fulfillmentOrderId },
        include: {
            items:   { include: { product: { select: { title: true } } } },
            buyer:   { select: { id: true, email: true, fullName: true } },
            seller:  { select: { id: true, email: true, fullName: true } },
            marketplaceOrder: { select: { id: true } },
        },
    });

    if (!fo) {
        throw Object.assign(new Error('Fulfillment order not found.'), { statusCode: 404 });
    }
    if (fo.sellerId !== sellerId) {
        throw Object.assign(new Error('Access denied — this order belongs to another seller.'), { statusCode: 403 });
    }
    if (TERMINAL_STATUSES.has(fo.status)) {
        throw Object.assign(
            new Error(`Order is already in terminal state "${fo.status}" and cannot be transitioned.`),
            { statusCode: 409 }
        );
    }

    const allowed = TRANSITIONS[fo.status] || [];
    const transition = allowed.find(t => t.action === action);

    if (!transition) {
        const validActions = allowed.map(t => t.action).join(', ') || 'none';
        throw Object.assign(
            new Error(`Cannot "${action}" from status "${fo.status}". Valid actions: ${validActions}`),
            { statusCode: 422 }
        );
    }

    const nextStatus = transition.nextStatus;
    const now        = new Date();

    // Build the status-specific timestamp fields
    const timestampFields = _timestampsForStatus(nextStatus, now);

    // Apply transition
    const updated = await prisma.fulfillmentOrder.update({
        where: { id: fulfillmentOrderId },
        data:  {
            status: nextStatus,
            ...timestampFields,
            ...data,
        },
        include: {
            items:   { include: { product: { select: { id: true, title: true } } } },
            buyer:   { select: { id: true, fullName: true } },
            seller:  { select: { id: true, fullName: true } },
        },
    });

    logger.info(
        `[Fulfillment] FO ${fulfillmentOrderId}: ${fo.status} → ${nextStatus}` +
        ` | seller=${sellerId} | action=${action}`
    );

    // Domain event (non-blocking)
    _emitEvent(`FULFILLMENT_${action.toUpperCase().replace(/-/g, '_')}`, fo, nextStatus, sellerId);

    // Notifications (non-blocking)
    _notifyTransition(fo, nextStatus, action).catch(e =>
        logger.error(`[Fulfillment] Notify error: ${e.message}`)
    );

    return updated;
}

// ─── Timestamp helper ─────────────────────────────────────────────────────────

function _timestampsForStatus(status, now) {
    // These timestamps do not exist on FulfillmentOrder schema in V2.
    return {};
}

// ─── Public transition actions ────────────────────────────────────────────────

/** Move to SELLER_REVIEW (called automatically on charge.success) */
async function advanceToReview(fulfillmentOrderId) {
    const fo = await prisma.fulfillmentOrder.findUnique({ where: { id: fulfillmentOrderId } });
    if (!fo || fo.status !== 'PENDING') return;
    await prisma.fulfillmentOrder.update({
        where: { id: fulfillmentOrderId },
        data:  { status: 'SELLER_REVIEW' },
    });
    logger.info(`[Fulfillment] FO ${fulfillmentOrderId}: PENDING → SELLER_REVIEW (auto on payment)`);
    _emitEvent('FULFILLMENT_SELLER_REVIEW', fo, 'SELLER_REVIEW', 'SYSTEM');
}

/** Seller accepts the order */
async function accept({ fulfillmentOrderId, sellerId, estimatedPackingMinutes }) {
    return transition({
        fulfillmentOrderId, sellerId, action: 'accept',
        data: {},
    });
}

/** Seller rejects the order (must provide reason) */
async function reject({ fulfillmentOrderId, sellerId, reason }) {
    if (!reason?.trim()) {
        throw Object.assign(new Error('A rejection reason is required.'), { statusCode: 400 });
    }
    return transition({
        fulfillmentOrderId, sellerId, action: 'reject',
        data: {}, // delayReason removed as it does not exist on FulfillmentOrder
    });
}

/** Seller starts preparing items */
async function startPreparing({ fulfillmentOrderId, sellerId }) {
    return transition({ fulfillmentOrderId, sellerId, action: 'start_preparing' });
}

/** Seller marks items as packed — also auto-creates the Package record (Phase 15) */
async function markPacked({ fulfillmentOrderId, sellerId, notes, packageDetails = {} }) {
    // 1. Advance fulfillment state machine: PREPARING → PACKED
    const fo = await transition({
        fulfillmentOrderId, sellerId, action: 'mark_packed',
        data: {},
    });

    // 2. Auto-create Package record with barcode/QR (non-fatal if already exists)
    let pkg = null;
    try {
        pkg = await packageService.createPackage(
            fulfillmentOrderId,
            sellerId,
            packageDetails,
            true,  // skipFoStatusUpdate — fulfillmentService already set PACKED
        );
        logger.info(`[Fulfillment] Package auto-created: ${pkg.barcode} for FO ${fulfillmentOrderId}`);
    } catch (pkgErr) {
        // Non-fatal: package creation failure does not roll back the PACKED status
        logger.error(`[Fulfillment] Package creation failed for FO ${fulfillmentOrderId}: ${pkgErr.message}`);
    }

    return { ...fo, package: pkg };
}

/** Seller requests courier pickup — creates DeliveryAssignment and dispatches (Phase 16) */
async function requestCourier({ fulfillmentOrderId, sellerId }) {
    const fo = await transition({ fulfillmentOrderId, sellerId, action: 'request_courier' });

    // Phase 16: Create DeliveryAssignment and immediately dispatch to best courier
    // Await synchronously here to report errors back to the caller
    const assignment = await courierOfferSvc.createAssignmentForFulfillmentOrder(fulfillmentOrderId);
    await courierOfferSvc.dispatchToNextCourier(assignment.id);

    return fo;
}

/** Seller retries courier pickup dispatch */
async function retryDispatch({ fulfillmentOrderId, sellerId }) {
    const fo = await transition({ fulfillmentOrderId, sellerId, action: 'retry_dispatch' });
    
    // Await synchronously here to report errors back to the caller
    const assignment = await courierOfferSvc.createAssignmentForFulfillmentOrder(fulfillmentOrderId);
    await courierOfferSvc.dispatchToNextCourier(assignment.id);
    
    return fo;
}

/** Seller confirms package handed to courier */
async function handover({ fulfillmentOrderId, sellerId, trackingNumber, carrier }) {
    return transition({
        fulfillmentOrderId, sellerId, action: 'handover',
        data: {
            ...(trackingNumber ? { trackingNumber } : {}),
            ...(carrier        ? { carrier }        : {}),
        },
    });
}

// ─── Notification helper ──────────────────────────────────────────────────────

async function _notifyTransition(fo, nextStatus, action) {
    const shortId = fo.id.substring(0, 8).toUpperCase();
    const marketplaceOrderId = fo.marketplaceOrder?.id || fo.marketplaceOrderId;

    const buyerMessages = {
        ACCEPTED:          { title: 'Order Accepted ✅', body: `Seller is preparing your items for order #${shortId}.` },
        REJECTED:          { title: 'Order Rejected ❌', body: `Unfortunately the seller rejected order #${shortId}. A refund will be processed.` },
        PACKED:            { title: 'Order Packed 📦',   body: `Your items for order #${shortId} have been packed and are ready for courier pickup.` },
        AWAITING_COURIER:  { title: 'Awaiting Courier 🚚', body: `Order #${shortId} is waiting for courier pickup.` },
        HANDED_TO_COURIER: { title: 'Order Dispatched 🚀', body: `Order #${shortId} has been handed to the courier and is on its way!` },
    };

    const msg = buyerMessages[nextStatus];
    if (msg) {
        await notificationV2.notify(fo.buyerId, {
            type:      `ORDER_${nextStatus}`,
            title:     msg.title,
            body:      msg.body,
            actionUrl: `/orders/${marketplaceOrderId}`,
            orderId:   marketplaceOrderId,
        }).catch(() => {});
    }

    // Seller: confirm their own action on key transitions
    const sellerMessages = {
        ACCEPTED:  { title: 'Order Confirmed',    body: `You accepted order #${shortId}. Start preparing the items.` },
        CANCELLED: { title: 'Order Cancelled',    body: `Order #${shortId} has been cancelled.` },
    };
    const sellerMsg = sellerMessages[nextStatus];
    if (sellerMsg) {
        await notificationV2.notify(fo.sellerId, {
            type:      `SELLER_ORDER_${nextStatus}`,
            title:     sellerMsg.title,
            body:      sellerMsg.body,
            actionUrl: `/seller/orders/${fo.id}`,
        }).catch(() => {});
    }
}

// ─── Event helper ─────────────────────────────────────────────────────────────

function _emitEvent(eventType, fo, nextStatus, actorId) {
    setImmediate(() => {
        try {
            require('./eventBus').emit(
                eventType,
                'FulfillmentOrder',
                fo.id,
                {
                    marketplaceOrderId: fo.marketplaceOrderId,
                    sellerId:           fo.sellerId,
                    buyerId:            fo.buyerId,
                    previousStatus:     fo.status,
                    nextStatus,
                    actorId,
                },
                { id: actorId, type: actorId === 'SYSTEM' ? 'SYSTEM' : 'SELLER' }
            ).catch(() => {});
        } catch { /* eventBus not yet initialized */ }
    });
}

// ─── Package lookup ───────────────────────────────────────────────────────────

/**
 * getPackageForOrder
 *
 * Returns the Package (with QR code + barcode) for a FulfillmentOrder.
 * Accessible by seller or buyer who own the FO.
 */
async function getPackageForOrder({ fulfillmentOrderId, userId }) {
    const fo = await prisma.fulfillmentOrder.findUnique({
        where: { id: fulfillmentOrderId },
        select: { sellerId: true, buyerId: true },
    });
    if (!fo) throw Object.assign(new Error('Fulfillment order not found.'), { statusCode: 404 });
    if (fo.sellerId !== userId && fo.buyerId !== userId) {
        throw Object.assign(new Error('Access denied.'), { statusCode: 403 });
    }
    const pkg = await packageService.getPackageByFulfillmentOrder(fulfillmentOrderId);
    if (!pkg) throw Object.assign(new Error('Package not yet created for this order.'), { statusCode: 404 });
    return pkg;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
    advanceToReview,
    accept,
    reject,
    startPreparing,
    markPacked,
    requestCourier,
    retryDispatch,
    handover,
    getPackageForOrder,     // Phase 15
    // Expose internals for testing
    transition,
    TRANSITIONS,
    TERMINAL_STATUSES,
};
