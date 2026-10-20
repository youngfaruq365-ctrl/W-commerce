'use strict';

/**
 * GPS Tracking Service — Phase 17
 *
 * Central coordinator for the real-time GPS + status update pipeline.
 * All functions here are called from socketService (GPS events) or
 * deliveryService (status transitions).
 *
 * Architecture:
 *
 *   Courier device
 *     │  courier:location (Socket.IO every 5s)
 *     ▼
 *   socketService.js
 *     ├─ updates CourierProfile.currentLat/Lng (hot path)
 *     ├─ calls gpsTrackingService.broadcastToFoRooms() ← THIS FILE
 *     │    └─ io.to(`delivery:${assignmentId}`)
 *     │         .emit('delivery:location', { lat, lng, ... })
 *     └─ buffers into Redis Stream (trackingBufferService)
 *
 *   Courier device
 *     │  POST /api/v1/delivery/:id/status
 *     ▼
 *   deliveryService.updateDeliveryStatus()
 *     ├─ validates transition (deliveryStateMachine)
 *     ├─ writes DeliveryTrackingEvent row
 *     ├─ calls gpsTrackingService.broadcastStatusUpdate() ← THIS FILE
 *     │    ├─ io.to(`delivery:${assignmentId}`)
 *     │    │    .emit('delivery:status_update', { status, lat, lng, ... })
 *     │    └─ notificationV2.notify(buyerId, ...)  (key milestones only)
 *     └─ optionally updates FulfillmentOrder status
 *
 * Room naming:
 *   `delivery:{assignmentId}` — buyer, seller, and courier all join this room
 *
 * Buyer joins via:
 *   socket.emit('tracking:join', { assignmentId })
 *   → server calls socket.join(`delivery:${assignmentId}`) after verifying ownership
 *
 * REST endpoint for initial state:
 *   GET /api/v1/tracking/:assignmentId
 *   → returns assignment + last 50 tracking events + current courier location
 */

const prisma         = require('../../utils/prismaClient');
const logger         = require('../../utils/logger');
const notificationV2 = require('../notificationV2Service');

// Singleton io reference — set once by socketService at startup
let _io = null;

function setIo(io) {
    _io = io;
}

function getIo() {
    return _io;
}

// ─── Milestone statuses that trigger buyer notifications ─────────────────────

const BUYER_NOTIFY_MILESTONES = new Set([
    'EN_ROUTE_TO_PICKUP',
    'PICKED_UP',
    'IN_TRANSIT',
    'ARRIVED_AT_DESTINATION',
    'DELIVERY_VERIFICATION',
    'DELIVERED',
    'FAILED',
    'CANCELLED',
]);

const STATUS_LABELS = {
    EN_ROUTE_TO_PICKUP:      'Your courier is heading to pick up your order',
    PICKED_UP:               'Your order has been picked up by the courier 🚚',
    IN_TRANSIT:              'Your order is on the way!',
    ARRIVED_AT_DESTINATION:  'Your courier has arrived at your location 📍',
    DELIVERY_VERIFICATION:   'Your courier is verifying the delivery',
    DELIVERED:               'Your order has been delivered ✅',
    FAILED:                  'Delivery attempt failed — we will reach out',
    CANCELLED:               'Delivery has been cancelled',
};

// ─── 1. Broadcast GPS location to delivery room ───────────────────────────────

/**
 * broadcastGpsToRoom
 *
 * Called by socketService for each courier:location event.
 * Emits to the `delivery:{assignmentId}` room for all FO-based active assignments.
 *
 * @param {string} courierUserId   — socket.user.id
 * @param {{ lat, lng, accuracy, speed, heading, timestamp }} point
 */
async function broadcastGpsToRoom(courierUserId, point) {
    if (!_io) return;

    try {
        // Find active FO-based assignments for this courier
        const profile = await prisma.courierProfile.findUnique({
            where:   { userId: courierUserId },
            select:  { id: true },
        });
        if (!profile) return;

        const assignments = await prisma.deliveryAssignment.findMany({
            where: {
                courierId:          profile.id,
                OR: [
                    { fulfillmentOrderId: { not: null } },
                    { orderId: { not: null } }
                ],
                status: {
                    in: ['ASSIGNED', 'COURIER_ACCEPTED', 'EN_ROUTE_TO_PICKUP',
                         'ARRIVED_AT_PICKUP', 'PICKED_UP', 'IN_TRANSIT',
                         'ARRIVED_AT_DESTINATION', 'DELIVERY_VERIFICATION'],
                },
            },
            select: { id: true },
        });

        for (const { id: assignmentId } of assignments) {
            _io.to(`delivery:${assignmentId}`).emit('delivery:location', {
                assignmentId,
                lat:       point.lat,
                lng:       point.lng,
                accuracy:  point.accuracy || null,
                speed:     point.speed    || null,
                heading:   point.heading  || null,
                timestamp: point.timestamp || Date.now(),
            });
        }
    } catch (e) {
        logger.warn(`[GPSTracking] broadcastGpsToRoom error: ${e.message}`);
    }
}

// ─── 2. Broadcast status update to delivery room ─────────────────────────────

/**
 * broadcastStatusUpdate
 *
 * Called by deliveryService.updateDeliveryStatus() after a successful transition.
 * Emits to the delivery room and sends buyer notifications for key milestones.
 *
 * @param {string} assignmentId
 * @param {string} newStatus
 * @param {{ lat, lng, metadata }} context
 */
async function broadcastStatusUpdate(assignmentId, newStatus, context = {}) {
    if (!_io && !BUYER_NOTIFY_MILESTONES.has(newStatus)) return;

    try {
        // Get assignment with FO buyer/seller
        const assignment = await prisma.deliveryAssignment.findUnique({
            where:   { id: assignmentId },
            select: {
                id:                 true,
                fulfillmentOrderId: true,
                orderId:            true,
                order: {
                    select: {
                        buyerId:  true,
                        sellerId: true,
                    },
                },
            },
        });
        if (!assignment) return;

        // 1. Emit to delivery room (buyer + seller + courier all in room)
        if (_io) {
            _io.to(`delivery:${assignmentId}`).emit('delivery:status_update', {
                assignmentId,
                status:    newStatus,
                lat:       context.lat    || null,
                lng:       context.lng    || null,
                timestamp: new Date().toISOString(),
                metadata:  context.metadata || null,
            });
        }

        // 2. Push notification for key milestones (buyer)
        const buyerId = assignment.order?.buyerId;
        if (BUYER_NOTIFY_MILESTONES.has(newStatus) && buyerId) {
            const label = STATUS_LABELS[newStatus] || `Delivery status: ${newStatus}`;
            notificationV2.notify(buyerId, {
                type:      'DELIVERY_UPDATE',
                title:     'Delivery Update 📦',
                body:      label,
                actionUrl: `/orders/track/${assignmentId}`,
            }).catch(() => {});
        }

        // 3. When DELIVERED: update FulfillmentOrder or Order status to DELIVERED
        if (newStatus === 'DELIVERED') {
            if (assignment.fulfillmentOrderId) {
                await prisma.fulfillmentOrder.update({
                    where: { id: assignment.fulfillmentOrderId },
                    data:  { status: 'DELIVERED' },
                }).catch(e => logger.warn(`[GPSTracking] FO DELIVERED update: ${e.message}`));
            } else if (assignment.orderId) {
                await prisma.order.update({
                    where: { id: assignment.orderId },
                    data:  { status: 'DELIVERED' },
                }).catch(e => logger.warn(`[GPSTracking] Legacy Order DELIVERED update: ${e.message}`));
            }
        }

        // 4. When FAILED/CANCELLED: update FulfillmentOrder or Order accordingly
        if (['FAILED', 'CANCELLED'].includes(newStatus)) {
            if (assignment.fulfillmentOrderId) {
                await prisma.fulfillmentOrder.update({
                    where: { id: assignment.fulfillmentOrderId },
                    data:  { status: newStatus === 'FAILED' ? 'CANCELLED' : 'CANCELLED' },
                }).catch(e => logger.warn(`[GPSTracking] FO ${newStatus} update: ${e.message}`));
            } else if (assignment.orderId) {
                await prisma.order.update({
                    where: { id: assignment.orderId },
                    data:  { status: newStatus === 'FAILED' ? 'CANCELLED' : 'CANCELLED' },
                }).catch(e => logger.warn(`[GPSTracking] Legacy Order ${newStatus} update: ${e.message}`));
            }
        }

    } catch (e) {
        logger.error(`[GPSTracking] broadcastStatusUpdate error: ${e.message}`);
    }
}

// ─── 3. Handle tracking:join from buyer/seller socket ────────────────────────

/**
 * handleTrackingJoin
 *
 * Called inside socket.on('tracking:join') in socketService.
 * Verifies the user is authorized for this assignment then joins the delivery room.
 *
 * @param {object} socket        — Socket.IO socket (with socket.user)
 * @param {string} assignmentId
 */
async function handleTrackingJoin(socket, assignmentId) {
    try {
        const userId = socket.user.id;
        const role   = socket.user.role;

        const assignment = await prisma.deliveryAssignment.findUnique({
            where:   { id: assignmentId },
            include: {
                order:   { select: { buyerId: true, sellerId: true } },
                courier: { select: { userId: true } },
            },
        });

        if (!assignment) {
            socket.emit('tracking:error', { message: 'Assignment not found.' });
            return;
        }

        const buyerId    = assignment.order?.buyerId;
        const sellerId   = assignment.order?.sellerId;
        const courierUid = assignment.courier?.userId;
        const isAdmin    = ['ADMIN', 'SUPER_ADMIN', 'DISPATCH_ADMIN'].includes(role);

        const authorized =
            isAdmin ||
            userId === buyerId   ||
            userId === sellerId  ||
            userId === courierUid;

        if (!authorized) {
            socket.emit('tracking:error', { message: 'Access denied.' });
            return;
        }

        const room = `delivery:${assignmentId}`;
        socket.join(room);
        logger.info(`[GPSTracking] ${userId} joined room ${room}`);

        // Send current state snapshot on join
        const latest = await prisma.deliveryTrackingEvent.findFirst({
            where:   { assignmentId },
            orderBy: { createdAt: 'desc' },
        });

        const courierLocation = assignment.courier
            ? await prisma.courierProfile.findUnique({
                where:  { userId: courierUid },
                select: { currentLat: true, currentLng: true, lastLocationAt: true },
              })
            : null;

        socket.emit('tracking:joined', {
            assignmentId,
            status:          assignment.status,
            latestEvent:     latest,
            courierLocation: courierLocation || null,
        });

    } catch (e) {
        logger.error(`[GPSTracking] handleTrackingJoin error: ${e.message}`);
        socket.emit('tracking:error', { message: 'Failed to join tracking room.' });
    }
}

// ─── 4. REST: get tracking snapshot ──────────────────────────────────────────

/**
 * getTrackingSnapshot
 *
 * Returns assignment + last 50 tracking events + courier current location.
 * Used by the buyer tracking page on initial load (before Socket.IO connects).
 *
 * @param {string} assignmentId
 * @param {string} userId
 */
async function getTrackingSnapshot(assignmentId, userId) {
    const assignment = await prisma.deliveryAssignment.findUnique({
        where: { id: assignmentId },
        include: {
            order: {
                select: {
                    buyerId:  true,
                    sellerId: true,
                    items:    { include: { product: { select: { title: true, images: { take: 1 } } } } },
                },
            },
            courier: {
                select: {
                    userId: true,
                    user:   { select: { fullName: true } },
                    rating: true,
                    currentLat:     true,
                    currentLng:     true,
                    lastLocationAt: true,
                    activeVehicle:  { select: { type: true, plateNumber: true, color: true } },
                },
            },
            trackingEvents: {
                orderBy: { createdAt: 'desc' },
                take:    50,
            },
            stops: true,
        },
    });

    if (!assignment) {
        throw Object.assign(new Error('Assignment not found.'), { statusCode: 404 });
    }

    // Authorization — buyer, seller, or courier can view tracking
    const buyerId  = assignment.order?.buyerId;
    const sellerId = assignment.order?.sellerId;
    const isAdmin  = false; // role not available here; checked at route level if needed
    if (userId !== buyerId && userId !== sellerId && userId !== assignment.courier?.userId) {
        throw Object.assign(new Error('Access denied.'), { statusCode: 403 });
    }

    return assignment;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
    setIo,
    getIo,
    broadcastGpsToRoom,
    broadcastStatusUpdate,
    handleTrackingJoin,
    getTrackingSnapshot,
    BUYER_NOTIFY_MILESTONES,
    STATUS_LABELS,
};
