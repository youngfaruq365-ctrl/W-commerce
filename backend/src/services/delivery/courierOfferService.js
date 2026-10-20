'use strict';

/**
 * Courier Offer Service — Phase 16
 *
 * Bridges the FulfillmentOrder dispatch world to the existing DeliveryAssignment
 * + DeliveryOffer machinery.
 *
 * Flow triggered by fulfillmentService.requestCourier():
 *
 *   1. createAssignmentForFulfillmentOrder(foId)
 *      → Creates a DeliveryAssignment linked to the FulfillmentOrder
 *      → Creates DeliveryStop rows (PICKUP = seller address, DROPOFF = buyer address)
 *
 *   2. dispatchToNextCourier(assignmentId)
 *      → Delegates to existing dispatchScoringService.rankCouriers() for scoring
 *      → Picks best uncontacted courier
 *      → Creates DeliveryOffer (TTL 90 seconds)
 *      → Emits Socket.IO event via dispatchEvents so courier app shows offer modal
 *
 *   3. Courier actions (HTTP endpoints on /api/v1/courier/offers):
 *      GET  /               → list my pending offers
 *      POST /:id/accept     → accept offer (atomic, prevents double-assignment)
 *      POST /:id/decline    → decline offer (triggers re-dispatch to next courier)
 *
 *   4. Expiry cron (outboxRetryJob every 5 min):
 *      → expireStaleOffers() marks OFFERED→EXPIRED
 *      → orphaned assignments re-dispatched via dispatchToNextCourier()
 *
 * State machine for DeliveryOffer:
 *   OFFERED → ACCEPTED  (courier accepted before TTL)
 *           → REJECTED  (courier declined)
 *           → EXPIRED   (TTL elapsed, re-dispatch)
 *           → CANCELLED (assignment cancelled or another courier accepted)
 */

const prisma              = require('../../utils/prismaClient');
const logger              = require('../../utils/logger');
const dispatchScoring     = require('./dispatchScoringService');
const { dispatchEvents }  = require('./dispatchService');
const notificationV2      = require('../notificationV2Service');

const OFFER_TTL_SECONDS   = 90; // 90 seconds for courier to respond
const MAX_DISPATCH_ROUNDS = 10; // max couriers to try per assignment before giving up

// ─── 1. Create DeliveryAssignment for a FulfillmentOrder ─────────────────────

/**
 * createAssignmentForFulfillmentOrder
 *
 * Called by fulfillmentService.requestCourier() immediately after the FO
 * transitions to AWAITING_COURIER.
 *
 * Reads seller store location and buyer delivery address from the FO and creates
 * a DeliveryAssignment + PICKUP/DROPOFF stops so the dispatch scorer can use
 * real coordinates without extra joins.
 *
 * @param {string} fulfillmentOrderId
 * @returns {Promise<DeliveryAssignment>}
 */
async function createAssignmentForFulfillmentOrder(fulfillmentOrderId) {
    // Idempotent: return existing if already created
    const existing = await prisma.deliveryAssignment.findFirst({
        where: { fulfillmentOrderId },
    });
    if (existing) {
        logger.info(`[CourierOffer] Assignment already exists for FO ${fulfillmentOrderId}: ${existing.id}`);
        return existing;
    }

    const fo = await prisma.fulfillmentOrder.findUnique({
        where: { id: fulfillmentOrderId },
        include: {
            seller: { 
                select: { 
                    id: true, 
                    fullName: true,
                    addresses: { where: { isDefault: true }, take: 1 }
                } 
            },
            buyer:  { select: { id: true, fullName: true } },
            marketplaceOrder: {
                select: {
                    deliveryAddress: true,
                    grandTotal:      true,
                },
            },
            items: {
                select: { quantity: true, product: { select: { weightKg: true } } },
            },
        },
    });

    if (!fo) {
        throw Object.assign(new Error('FulfillmentOrder not found.'), { statusCode: 404 });
    }

    // Delivery address from MarketplaceOrder (JSON string or object)
    let dropoffAddress = 'Lagos, Nigeria';
    let dropoffLat     = null;
    let dropoffLng     = null;
    try {
        const addr = typeof fo.marketplaceOrder?.deliveryAddress === 'string'
            ? JSON.parse(fo.marketplaceOrder.deliveryAddress)
            : fo.marketplaceOrder?.deliveryAddress;
        if (addr) {
            dropoffAddress = addr.fullAddress || addr.address || addr.street || dropoffAddress;
            dropoffLat     = addr.lat  ? parseFloat(addr.lat)  : null;
            dropoffLng     = addr.lng  ? parseFloat(addr.lng)  : null;
        }
    } catch { /* address not parseable — use defaults */ }

    // Seller store coordinates (if available on their CourierProfile / Store)
    // For now we use null — dispatcher will use courier GPS proximity to FO seller
    const pickupLat = null;
    const pickupLng = null;
    let pickupAddress = `Seller: ${fo.seller.fullName}`;
    if (fo.seller.addresses && fo.seller.addresses.length > 0) {
        const addr = fo.seller.addresses[0];
        pickupAddress = `${addr.street || ''} ${addr.city || ''} ${addr.state || ''} ${addr.country || ''}`.trim();
    }

    const totalWeightKg = fo.items.reduce(
        (sum, item) => sum + ((item.product.weightKg || 0.5) * item.quantity),
        0
    );

    const { randomUUID, randomInt } = require('crypto');
    const deliveryPin = randomInt(1000, 10000).toString();
    const pickupQrCode = randomUUID();

    const assignment = await prisma.$transaction(async (tx) => {
        const created = await tx.deliveryAssignment.create({
            data: {
                orderId:            fo.orderId,
                fulfillmentOrderId,
                status:             'PENDING',
                pickupLat,
                pickupLng,
                dropoffLat,
                dropoffLng,
                estimatedDistance:  null,
                customerDeliveryFee: Number(fo.shippingCost) || 0,
                pricingSnapshot:    JSON.stringify({ shippingCost: fo.shippingCost, weightKg: totalWeightKg }),
                pickupQrCode,
                deliveryPin,
            },
        });

        // Create PICKUP stop (seller location)
        await tx.deliveryStop.create({
            data: {
                routeId:     '00000000-0000-0000-0000-000000000000', // placeholder — no route yet
                assignmentId: created.id,
                type:         'PICKUP',
                address:      pickupAddress,
                lat:          pickupLat,
                lng:          pickupLng,
                sequence:     0,
            },
        });

        // Create DROPOFF stop (buyer address)
        await tx.deliveryStop.create({
            data: {
                routeId:     '00000000-0000-0000-0000-000000000000',
                assignmentId: created.id,
                type:         'DROPOFF',
                address:      dropoffAddress,
                lat:          dropoffLat,
                lng:          dropoffLng,
                sequence:     1,
            },
        });

        return created;
    });

    logger.info(`[CourierOffer] DeliveryAssignment ${assignment.id} created for FO ${fulfillmentOrderId}`);
    return assignment;
}

// ─── 2. Dispatch to next eligible courier ────────────────────────────────────

/**
 * dispatchToNextCourier
 *
 * Scores ONLINE couriers, excludes those already offered this assignment,
 * creates a DeliveryOffer for the top scorer, and fires a Socket.IO event
 * so the courier app shows the offer modal.
 *
 * @param {string} assignmentId
 * @returns {Promise<DeliveryOffer|null>}  null if no eligible couriers
 */
async function dispatchToNextCourier(assignmentId) {
    const assignment = await prisma.deliveryAssignment.findUnique({
        where: { id: assignmentId },
        include: { stops: true },
    });

    if (!assignment) {
        logger.error(`[CourierOffer] Assignment ${assignmentId} not found for dispatch`);
        return null;
    }

    if (!['PENDING', 'UNASSIGNED'].includes(assignment.status)) {
        logger.info(`[CourierOffer] Assignment ${assignmentId} status=${assignment.status} — skip dispatch`);
        return null;
    }

    // Use pickup stop for proximity scoring
    const pickupStop = assignment.stops?.find(s => s.type === 'PICKUP');
    const requirements = {
        pickupLat:           pickupStop?.lat  ?? assignment.pickupLat  ?? 6.5244, // Lagos default
        pickupLng:           pickupStop?.lng  ?? assignment.pickupLng  ?? 3.3792,
        requiredVehicleType: null,
        capacityKg:          null,
    };

    // Rank ONLINE couriers
    const ranked = await dispatchScoring.rankCouriers(requirements);

    // Exclude couriers already offered this assignment
    const previous = await prisma.deliveryOffer.findMany({
        where:  { assignmentId },
        select: { courierId: true },
    });

    // Guard: cap dispatch rounds
    if (previous.length >= MAX_DISPATCH_ROUNDS) {
        logger.warn(`[CourierOffer] Assignment ${assignmentId} exhausted ${MAX_DISPATCH_ROUNDS} couriers — needs admin review`);
        await prisma.deliveryAssignment.update({
            where: { id: assignmentId },
            data:  { status: 'CANCELLED' },
        });
        return null;
    }

    const excluded = new Set(previous.map(o => o.courierId));
    const best     = ranked.find(c => !excluded.has(c.courierId));

    if (!best) {
        logger.warn(`[CourierOffer] No eligible couriers for assignment ${assignmentId} (${ranked.length} online, all excluded)`);
        return null;
    }

    // Create offer
    const expiresAt = new Date(Date.now() + OFFER_TTL_SECONDS * 1000);
    const offer = await prisma.deliveryOffer.create({
        data: {
            assignmentId,
            courierId:   best.courierId,
            status:      'PENDING',
            expiresAt,
        },
        include: {
            assignment: { include: { stops: true } },
            courier:    { select: { userId: true } },
        },
    });

    logger.info(
        `[CourierOffer] Offer ${offer.id} → courier ${best.courierId}` +
        ` | score=${Math.round(best.score)} | TTL=${OFFER_TTL_SECONDS}s`
    );

    // Fire Socket.IO event for the courier app
    dispatchEvents.emit('delivery:offer', {
        userId: offer.courier?.userId,
        offer,
    });

    // Also send in-app notification (non-blocking)
    notificationV2.notify(offer.courier?.userId, {
        type:      'DELIVERY_OFFER',
        title:     'New Delivery Offer 🚚',
        body:      `A delivery is ready for pickup near you. You have ${OFFER_TTL_SECONDS} seconds to respond.`,
        actionUrl: `/courier/offers/${offer.id}`,
    }).catch(() => {});

    return offer;
}

// ─── 3. Courier: accept offer ─────────────────────────────────────────────────

/**
 * acceptOffer
 *
 * Atomically accepts a DeliveryOffer. Marks offer ACCEPTED, assigns courier to
 * the DeliveryAssignment, cancels all other OFFERED rows for the same assignment,
 * and advances the FulfillmentOrder to HANDED_TO_COURIER.
 *
 * @param {string} offerId
 * @param {string} courierId   — CourierProfile.id
 * @returns {Promise<DeliveryOffer>}
 */
async function acceptOffer(offerId, courierId) {
    return prisma.$transaction(async (tx) => {
        const offer = await tx.deliveryOffer.findUnique({
            where:   { id: offerId },
            include: { assignment: { include: { fulfillmentOrder: true } } },
        });

        if (!offer)                        throw Object.assign(new Error('Offer not found.'), { statusCode: 404 });
        if (offer.courierId !== courierId) throw Object.assign(new Error('This offer was not sent to you.'), { statusCode: 403 });
        if (offer.status !== 'PENDING')   throw Object.assign(new Error(`Offer is no longer available (${offer.status}).`), { statusCode: 409 });
        if (new Date() > offer.expiresAt)  throw Object.assign(new Error('Offer has expired.'), { statusCode: 409 });

        const assignmentStatus = offer.assignment?.status;
        if (!['PENDING', 'UNASSIGNED'].includes(assignmentStatus)) {
            throw Object.assign(new Error('This delivery has already been assigned.'), { statusCode: 409 });
        }

        // Accept offer
        const accepted = await tx.deliveryOffer.update({
            where: { id: offerId },
            data:  { status: 'ACCEPTED' },
        });

        // Assign courier to DeliveryAssignment
        await tx.deliveryAssignment.update({
            where: { id: offer.assignmentId },
            data:  { courierId, status: 'ASSIGNED' },
        });

        // Cancel all other pending offers for this assignment
        await tx.deliveryOffer.updateMany({
            where: { assignmentId: offer.assignmentId, id: { not: offerId }, status: 'PENDING' },
            data:  { status: 'REJECTED' },
        });

        // If linked to a FulfillmentOrder, advance it to HANDED_TO_COURIER
        if (offer.assignment?.fulfillmentOrderId) {
            await tx.fulfillmentOrder.update({
                where: { id: offer.assignment.fulfillmentOrderId },
                data:  { status: 'HANDED_TO_COURIER' },
            });
            logger.info(
                `[CourierOffer] FO ${offer.assignment.fulfillmentOrderId} → HANDED_TO_COURIER` +
                ` | courier=${courierId}`
            );
        }

        return accepted;
    });
}

// ─── 4. Courier: decline offer ────────────────────────────────────────────────

/**
 * declineOffer
 *
 * Marks offer REJECTED and triggers re-dispatch to the next best courier.
 *
 * @param {string} offerId
 * @param {string} courierId
 * @param {string} [reason]
 */
async function declineOffer(offerId, courierId, reason = null) {
    const offer = await prisma.deliveryOffer.findUnique({ where: { id: offerId } });
    if (!offer)                        throw Object.assign(new Error('Offer not found.'), { statusCode: 404 });
    if (offer.courierId !== courierId) throw Object.assign(new Error('This offer was not sent to you.'), { statusCode: 403 });
    if (!['OFFERED'].includes(offer.status)) {
        throw Object.assign(new Error(`Cannot decline offer in status ${offer.status}.`), { statusCode: 409 });
    }

    await prisma.deliveryOffer.update({
        where: { id: offerId },
        data:  { status: 'REJECTED' },
    });

    logger.info(`[CourierOffer] Offer ${offerId} declined by courier ${courierId}`);

    // Immediately try next courier
    setImmediate(async () => {
        try {
            await dispatchToNextCourier(offer.assignmentId);
        } catch (e) {
            logger.error(`[CourierOffer] Re-dispatch after decline failed: ${e.message}`);
        }
    });
}

// ─── 5. List pending offers for a courier ────────────────────────────────────

/**
 * getMyOffers
 *
 * Returns OFFERED (non-expired) offers for a courier, with assignment + stop details.
 *
 * @param {string} courierId
 */
async function getMyOffers(courierId) {
    return prisma.deliveryOffer.findMany({
        where:   { courierId, status: 'OFFERED', expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
        include: {
            assignment: {
                include: {
                    stops:           true,
                    fulfillmentOrder: {
                        select: { id: true, grandTotal: true, shippingCost: true, items: { include: { product: { select: { title: true } } } } },
                    },
                },
            },
        },
    });
}

// ─── 6. Expiry cron ───────────────────────────────────────────────────────────

/**
 * expireStaleOffersAndRedispatch
 *
 * Called by outboxRetryJob every 5 minutes.
 * Expires OFFERED offers past TTL, then re-dispatches any orphaned PENDING assignments.
 *
 * @returns {{ expired: number, redispatched: number }}
 */
async function expireStaleOffersAndRedispatch() {
    // 1. Mark overdue OFFERED offers as EXPIRED
    const { count: expired } = await prisma.deliveryOffer.updateMany({
        where: { status: 'OFFERED', expiresAt: { lt: new Date() } },
        data:  { status: 'EXPIRED' },
    });

    if (expired) logger.info(`[CourierOffer] Expired ${expired} stale delivery offers`);

    // 2. Find PENDING assignments with no active OFFERED offer (orphaned)
    const orphaned = await prisma.deliveryAssignment.findMany({
        where: {
            status: 'PENDING',
            fulfillmentOrderId: { not: null },  // only FO-based assignments for now
            offers: {
                none: { status: 'OFFERED' },
            },
        },
        take: 20,
    });

    let redispatched = 0;
    for (const assignment of orphaned) {
        try {
            const offer = await dispatchToNextCourier(assignment.id);
            if (offer) redispatched++;
        } catch (e) {
            logger.error(`[CourierOffer] Re-dispatch ${assignment.id}: ${e.message}`);
        }
    }

    if (redispatched) logger.info(`[CourierOffer] Re-dispatched ${redispatched} orphaned assignments`);
    return { expired, redispatched };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
    createAssignmentForFulfillmentOrder,
    dispatchToNextCourier,
    acceptOffer,
    declineOffer,
    getMyOffers,
    expireStaleOffersAndRedispatch,
    OFFER_TTL_SECONDS,
};
