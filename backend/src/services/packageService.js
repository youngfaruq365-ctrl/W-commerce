'use strict';

/**
 * Package Service — Phase 8
 *
 * Manages the physical package lifecycle for a FulfillmentOrder,
 * from creation by the seller through every custody handoff until delivery.
 *
 * Key design decisions:
 *  1. ONE package per FulfillmentOrder (created when seller confirms packing)
 *  2. CustodyEvent rows are IMMUTABLE — never updated, never deleted
 *  3. Every handoff requires verification (QR scan, OTP, or photo)
 *  4. Package status is derived from the latest CustodyEvent (denormalized for query speed)
 *  5. Condition DAMAGED/TAMPERED events automatically open a DomainEvent for dispute handling
 *
 * Custody chain:
 *   SYSTEM:CREATE → SELLER:PACK → COURIER:PICKUP → [STATION:RECEIVE → COURIER:COLLECT] → BUYER:RECEIVE
 *
 * Barcode format: GX-PKG-{6 random alphanumeric}  (e.g. GX-PKG-A7B2X9)
 * QR code:        JSON string { packageId, barcode, foId } — rendered by frontend
 */

const crypto       = require('crypto');
const prisma       = require('../utils/prismaClient');
const logger       = require('../utils/logger');
const domainEvents = require('./domainEventService');

// ─── Constants ────────────────────────────────────────────────────────────────

const PACKAGE_STATUSES = {
    CREATED:          'CREATED',
    PACKED:           'PACKED',
    HANDED_TO_COURIER:'HANDED_TO_COURIER',
    IN_TRANSIT:       'IN_TRANSIT',
    AT_STATION:       'AT_STATION',
    OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
    DELIVERED:        'DELIVERED',
    LOST:             'LOST',
    DAMAGED:          'DAMAGED',
};

const CONDITION = { GOOD: 'GOOD', DAMAGED: 'DAMAGED', TAMPERED: 'TAMPERED', MISSING: 'MISSING' };

// ─── Barcode generator ────────────────────────────────────────────────────────

function _generateBarcode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusing I, O, 0, 1
    let suffix  = '';
    for (let i = 0; i < 6; i++) {
        suffix += chars[Math.floor(Math.random() * chars.length)];
    }
    return `GX-PKG-${suffix}`;
}

function _generateQrPayload(packageId, barcode, fulfillmentOrderId) {
    return JSON.stringify({ packageId, barcode, fulfillmentOrderId, v: 1 });
}

function _hashVerificationCode(code) {
    return crypto.createHash('sha256').update(String(code)).digest('hex').substring(0, 16);
}

// ─── Create Package ───────────────────────────────────────────────────────────

/**
 * Called when a seller marks an order as packed (via fulfillmentService.markPacked).
 * Creates the Package record and logs the first CustodyEvent (SYSTEM → SELLER).
 *
 * @param {string}  fulfillmentOrderId
 * @param {string}  sellerId
 * @param {Object}  details              — { weightKg, dimensions, description, fragile, packingNote, sealPhotoUrl }
 * @param {boolean} [skipFoStatusUpdate] — if true, skip the internal FO status update (FulfillmentService owns the state)
 */
async function createPackage(fulfillmentOrderId, sellerId, details = {}, skipFoStatusUpdate = false) {
    // Verify the seller owns this FulfillmentOrder
    const fo = await prisma.fulfillmentOrder.findUnique({
        where:  { id: fulfillmentOrderId },
        select: { id: true, sellerId: true, buyerId: true, status: true, package: { select: { id: true } } },
    });

    if (!fo) throw Object.assign(new Error('Fulfillment order not found.'), { statusCode: 404 });
    if (fo.sellerId !== sellerId) throw Object.assign(new Error('Access denied.'), { statusCode: 403 });
    if (fo.package) {
        logger.info(`[PackageService] Package already exists for FO ${fulfillmentOrderId}`);
        return fo.package;
    }
    // Accept PREPARING (called from fulfillmentService before status is committed), CONFIRMED, or PACKED
    if (!['CONFIRMED', 'PACKED', 'PREPARING'].includes(fo.status)) {
        throw Object.assign(
            new Error(`Cannot create package for FO in status "${fo.status}". Must be CONFIRMED, PREPARING, or PACKED.`),
            { statusCode: 409 }
        );
    }

    // Generate unique barcode (retry if collision)
    let barcode;
    for (let i = 0; i < 5; i++) {
        barcode = _generateBarcode();
        const existing = await prisma.package.findUnique({ where: { barcode }, select: { id: true } });
        if (!existing) break;
        if (i === 4) throw new Error('Failed to generate unique barcode after 5 attempts.');
    }

    const pkg = await prisma.$transaction(async (tx) => {
        // Create the package
        const created = await tx.package.create({
            data: {
                fulfillmentOrderId,
                barcode,
                qrCode:      _generateQrPayload('PENDING', barcode, fulfillmentOrderId),
                weightKg:    details.weightKg    || null,
                dimensions:  details.dimensions  ? JSON.stringify(details.dimensions) : null,
                description: details.description || null,
                fragile:     details.fragile     || false,
                packingNote: details.packingNote  || null,
                sealPhotoUrl:details.sealPhotoUrl || null,
                status:      PACKAGE_STATUSES.CREATED,
            },
        });

        // Update the qrCode now that we have the package ID
        const updatedQr = _generateQrPayload(created.id, barcode, fulfillmentOrderId);
        await tx.package.update({ where: { id: created.id }, data: { qrCode: updatedQr } });

        // Initial custody event: SYSTEM → SELLER
        await tx.custodyEvent.create({
            data: {
                packageId:          created.id,
                fromPartyType:      'SYSTEM',
                fromPartyId:        null,
                toPartyType:        'SELLER',
                toPartyId:          sellerId,
                verificationMethod: 'SYSTEM',
                condition:          CONDITION.GOOD,
                notes:              'Package created by seller at packing confirmation.',
            },
        });

        // Phase 15: Only update FO status if caller hasn't already done it
        // (fulfillmentService.markPacked() manages the state machine itself)
        if (!skipFoStatusUpdate) {
            await tx.fulfillmentOrder.update({
                where: { id: fulfillmentOrderId },
                data: { status: 'PACKED', packedAt: new Date() },
            });
        }

        return { ...created, qrCode: updatedQr };
    });

    // Emit domain event (non-blocking)
    await domainEvents.emit(
        'PACKAGE_CREATED',
        'Package',
        pkg.id,
        { fulfillmentOrderId, sellerId, barcode, buyerId: fo.buyerId },
        { id: sellerId, type: 'USER' }
    ).catch(e => logger.error(`[PackageService] DomainEvent failed: ${e.message}`));

    logger.info(`[PackageService] Package created: ${barcode} for FO ${fulfillmentOrderId}`);
    return pkg;
}

// ─── Record Custody Transfer ──────────────────────────────────────────────────

/**
 * Record a physical handoff between parties.
 * This is called at every scan point: seller hands to courier, courier to station, etc.
 *
 * @param {string} packageId
 * @param {Object} transfer — {
 *   fromPartyType, fromPartyId,
 *   toPartyType, toPartyId,
 *   verificationMethod, verificationCode,
 *   lat, lng, locationName,
 *   condition, conditionNote, photoUrl,
 *   notes, metadata
 * }
 * @param {string} actorId — who is recording this transfer
 */
async function recordCustodyTransfer(packageId, transfer, actorId) {
    const pkg = await prisma.package.findUnique({
        where:   { id: packageId },
        include: { fulfillmentOrder: { select: { id: true, buyerId: true, sellerId: true } } },
    });

    if (!pkg) throw Object.assign(new Error('Package not found.'), { statusCode: 404 });
    if (['DELIVERED', 'LOST'].includes(pkg.status)) {
        throw Object.assign(
            new Error(`Package ${pkg.barcode} is already in terminal status "${pkg.status}".`),
            { statusCode: 409 }
        );
    }

    // Determine new package status from the transfer
    const newStatus = _inferPackageStatus(transfer.toPartyType, transfer.verificationMethod, pkg.status);
    const isConditionBad = [CONDITION.DAMAGED, CONDITION.TAMPERED, CONDITION.MISSING].includes(transfer.condition);

    const custodyEvent = await prisma.$transaction(async (tx) => {
        const event = await tx.custodyEvent.create({
            data: {
                packageId,
                fromPartyType:     transfer.fromPartyType     || null,
                fromPartyId:       transfer.fromPartyId       || null,
                toPartyType:       transfer.toPartyType,
                toPartyId:         transfer.toPartyId,
                verificationMethod:transfer.verificationMethod,
                verificationCode:  transfer.verificationCode
                    ? _hashVerificationCode(transfer.verificationCode)
                    : null,
                lat:               transfer.lat          || null,
                lng:               transfer.lng          || null,
                locationName:      transfer.locationName  || null,
                condition:         transfer.condition     || CONDITION.GOOD,
                conditionNote:     transfer.conditionNote || null,
                photoUrl:          transfer.photoUrl      || null,
                notes:             transfer.notes         || null,
                metadata:          transfer.metadata
                    ? JSON.stringify(transfer.metadata)
                    : null,
            },
        });

        // Update package status
        const updateData = {
            status: isConditionBad ? PACKAGE_STATUSES.DAMAGED : newStatus,
            ...(newStatus === PACKAGE_STATUSES.DELIVERED ? { } : {}),
        };

        await tx.package.update({ where: { id: packageId }, data: updateData });

        // Sync FulfillmentOrder delivery fields
        if (newStatus === PACKAGE_STATUSES.DELIVERED) {
            await tx.fulfillmentOrder.update({
                where: { id: pkg.fulfillmentOrderId },
                data: {
                    status:      'DELIVERED',
                    deliveredAt: new Date(),
                    // Trigger escrow release window: +48h from delivery
                    escrowReleaseAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
                },
            });
        }

        return event;
    });

    // Emit domain events
    const eventType = isConditionBad ? 'PACKAGE_CONDITION_ISSUE' : `PACKAGE_${newStatus}`;
    await domainEvents.emit(
        eventType,
        'Package',
        packageId,
        {
            fulfillmentOrderId: pkg.fulfillmentOrderId,
            barcode:            pkg.barcode,
            fromPartyType:      transfer.fromPartyType,
            toPartyType:        transfer.toPartyType,
            toPartyId:          transfer.toPartyId,
            condition:          transfer.condition || CONDITION.GOOD,
            newStatus,
            buyerId:            pkg.fulfillmentOrder.buyerId,
            sellerId:           pkg.fulfillmentOrder.sellerId,
        },
        { id: actorId, type: 'USER' }
    ).catch(e => logger.error(`[PackageService] DomainEvent failed: ${e.message}`));

    // If damaged/tampered — also emit FULFILLMENT_CONDITION_ISSUE for dispute system
    if (isConditionBad) {
        await domainEvents.emit(
            'DISPUTE_ELIGIBLE',
            'FulfillmentOrder',
            pkg.fulfillmentOrderId,
            { packageId, condition: transfer.condition, conditionNote: transfer.conditionNote },
            { id: actorId, type: 'USER' }
        ).catch(() => {});
    }

    logger.info(
        `[PackageService] Custody transfer: ${pkg.barcode} ${transfer.fromPartyType || 'SYSTEM'} → ${transfer.toPartyType} | status: ${newStatus}`
    );

    return custodyEvent;
}

// ─── Get Package Chain ────────────────────────────────────────────────────────

/**
 * Get the full chain-of-custody for a package (by packageId or barcode).
 */
async function getPackageChain(identifier) {
    const where = identifier.startsWith('GX-PKG-')
        ? { barcode: identifier }
        : { id: identifier };

    const pkg = await prisma.package.findUnique({
        where,
        include: {
            custodyEvents: { orderBy: { createdAt: 'asc' } },
            fulfillmentOrder: {
                select: {
                    id: true, status: true, paymentStatus: true,
                    buyer: { select: { id: true, fullName: true } },
                    seller: { select: { id: true, fullName: true, store: { select: { storeName: true } } } },
                },
            },
        },
    });

    if (!pkg) throw Object.assign(new Error('Package not found.'), { statusCode: 404 });
    return pkg;
}

/**
 * Get package by fulfillment order ID.
 */
async function getPackageByFulfillmentOrder(fulfillmentOrderId) {
    return prisma.package.findUnique({
        where: { fulfillmentOrderId },
        include: { custodyEvents: { orderBy: { createdAt: 'asc' } } },
    });
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function _inferPackageStatus(toPartyType, verificationMethod, currentStatus) {
    switch (toPartyType) {
        case 'COURIER':  return PACKAGE_STATUSES.HANDED_TO_COURIER;
        case 'STATION':  return PACKAGE_STATUSES.AT_STATION;
        case 'BUYER':    return PACKAGE_STATUSES.DELIVERED;
        default:         return currentStatus;  // no status change for unknown types
    }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
    createPackage,
    recordCustodyTransfer,
    getPackageChain,
    getPackageByFulfillmentOrder,
    PACKAGE_STATUSES,
    CONDITION,
};
