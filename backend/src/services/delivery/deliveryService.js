'use strict';
// src/backend/services/delivery/deliveryService.js

const prisma          = require('../../utils/prismaClient');            // shared client
const { validateTransition, mapToOrderStatus } = require('./deliveryStateMachine.js');
const { calculateDistanceMeters }              = require('../../utils/geoUtils.js');
const gpsTracking     = require('./gpsTrackingService');                 // Phase 17
const logger          = require('../../utils/logger');

const updateDeliveryStatus = async (assignmentId, newStatus, context = {}) => {
    const { lat, lng, metadata, courierId, proofUrl, accuracy } = context;

    // ── Phase 1: Core status transition (transactional) ────────────────────────
    const result = await prisma.$transaction(async (tx) => {
        const assignment = await tx.deliveryAssignment.findUnique({
            where: { id: assignmentId },
            include: { order: true, stops: true }
        });

        if (!assignment) {
            throw new Error(`DeliveryAssignment ${assignmentId} not found`);
        }

        if (courierId && assignment.courierId !== courierId) {
            throw new Error(`Unauthorized: Courier does not own this assignment`);
        }

        validateTransition(assignment.status, newStatus);

        // Geofence Validation
        if (newStatus === 'ARRIVED_AT_PICKUP' || newStatus === 'ARRIVED_AT_DESTINATION') {
            const stopType = newStatus === 'ARRIVED_AT_PICKUP' ? 'PICKUP' : 'DROPOFF';
            const targetStop = assignment.stops.find(s => s.type === stopType);

            if (targetStop && targetStop.lat && targetStop.lng) {
                if (!lat || !lng) {
                    throw new Error(`Geofence rejection: Missing courier coordinates.`);
                }
                const distance = calculateDistanceMeters(lat, lng, targetStop.lat, targetStop.lng);
                
                if (distance !== null) {
                    if (accuracy && accuracy > 100) {
                        throw new Error(`GPS accuracy too poor (${accuracy}m). Cannot verify arrival.`);
                    }
                    if (distance > 200) {
                        throw new Error(`Geofence rejection: Courier is ${Math.round(distance)}m away from ${stopType}.`);
                    }
                }
            }
        }

        await tx.deliveryAssignment.update({
            where: { id: assignmentId },
            data: { status: newStatus }
        });

        await tx.deliveryTrackingEvent.create({
            data: {
                assignmentId,
                status: newStatus,
                lat: lat || null,
                lng: lng || null,
                metadata: metadata ? JSON.stringify(metadata) : null
            }
        });

        // Phase 17: legacy Order status sync
        if (assignment.orderId) {
            const nextOrderStatus = mapToOrderStatus(newStatus);
            if (nextOrderStatus && assignment.order && nextOrderStatus !== assignment.order.status) {
                await tx.order.update({
                    where: { id: assignment.orderId },
                    data: { status: nextOrderStatus }
                });
            }
        }

        if (newStatus === 'DELIVERED' && proofUrl) {
            await tx.deliveryProof.create({
                data: { assignmentId, type: 'PHOTO', proofUrl }
            });
        }

        // Store the pricingSnapshot if missing (needed by Phase 2 earning calc below)
        if (newStatus === 'DELIVERED' && assignment.courierId && !assignment.pricingSnapshot) {
            const earningsService = require('./earningsService');
            const distanceKm = assignment.estimatedDistance || 0;
            const calc = earningsService.calculateDeliveryFee(distanceKm);
            await tx.deliveryAssignment.update({
                where: { id: assignmentId },
                data: {
                    customerDeliveryFee: calc.amount,
                    pricingSnapshot: JSON.stringify(calc.snapshot)
                }
            });
        }

        // Notification outbox — failure here should NOT roll back the status update,
        // so we catch it silently inside the transaction.
        try {
            await tx.notificationOutbox.create({
                data: {
                    eventType: 'delivery.status.updated',
                    payload: JSON.stringify({
                        assignmentId,
                        orderId: assignment.orderId,
                        newStatus,
                        courierId: assignment.courierId
                    }),
                    status: 'PENDING'
                }
            });
        } catch (e) {
            logger.warn(`[DeliveryService] notificationOutbox.create failed (non-fatal): ${e.message}`);
        }

        return tx.deliveryAssignment.findUnique({ where: { id: assignmentId } });
    });

    // ── Phase 2: Courier earning — runs AFTER the transaction commits ──────────
    // Moving this to happen upon COURIER_ACCEPTED in deliveryController.js
    // to satisfy new requirements. 
    /*
    if (newStatus === 'DELIVERED' && result?.courierId) {
        try {
            const existing = await prisma.courierEarning.findUnique({
                where: { assignmentId }
            });

            if (!existing) {
                const earningsService = require('./earningsService');
                const snap = result.pricingSnapshot
                    ? (() => { try { return JSON.parse(result.pricingSnapshot); } catch { return {}; } })()
                    : {};

                let deliveryFeeAmount = Number(snap.baseFee || 0) + (Number(snap.distanceKm || 0) * Number(snap.perKm || 0));
                if (isNaN(deliveryFeeAmount) || deliveryFeeAmount === 0) {
                    deliveryFeeAmount = Number(snap.amount || result.customerDeliveryFee || 500);
                }

                const reference = (typeof earningsService.generateReference === 'function')
                    ? earningsService.generateReference()
                    : require('crypto').randomUUID();

                await prisma.courierEarning.create({
                    data: {
                        reference,
                        courierId: result.courierId,
                        assignmentId,
                        type: 'DELIVERY_FEE',
                        amount: deliveryFeeAmount,
                        currency: 'NGN',
                        status: 'CLEARED',
                        clearedAt: new Date(),
                        description: `Delivery for Order #${(result.orderId || result.fulfillmentOrderId || 'UNKNOWN').slice(-6)}`
                    }
                });
                logger.info(`[DeliveryService] CourierEarning created for assignment ${assignmentId}, amount=${deliveryFeeAmount}`);

                // Increment Courier's User Balance
                const profile = await prisma.courierProfile.findUnique({ where: { id: result.courierId } });
                if (profile && profile.userId) {
                    await prisma.user.update({
                        where: { id: profile.userId },
                        data: { balance: { increment: deliveryFeeAmount } }
                    });
                }
            }
        } catch (e) {
            // Log but do NOT throw — earning failure must not un-deliver the order
            logger.error(`[DeliveryService] CourierEarning.create failed (will need manual reconciliation): ${e.message}`);
        }
    }
    */

    // Phase 17: broadcast status update (non-blocking)
    gpsTracking.broadcastStatusUpdate(assignmentId, newStatus, { lat, lng, metadata })
        .catch(e => logger.warn(`[DeliveryService] broadcastStatusUpdate: ${e.message}`));

    return result;
};

module.exports = {
    updateDeliveryStatus
};
