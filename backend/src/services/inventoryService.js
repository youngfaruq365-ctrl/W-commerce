const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');
const notificationService = require('./notificationService');

class InventoryService {
    /**
     * Check product stock levels and update urgency flags
     * Called after stock changes (order creation, product update, cancellation)
     */
    async updateProductUrgency(productId) {
        try {
            const product = await prisma.product.findUnique({
                where: { id: productId },
                include: { store: true }
            });

            if (!product) return;

            const lowStockThreshold = product.lowStockThreshold || 5;
            const stock = product.stock;
            let urgencyLevel = 'NORMAL';
            let urgencyScore = 0;

            if (stock === 0) {
                urgencyLevel = 'CRITICAL';
                urgencyScore = 100;
            } else if (stock <= Math.floor(lowStockThreshold * 0.25)) {
                urgencyLevel = 'CRITICAL';
                urgencyScore = 90;
            } else if (stock <= Math.floor(lowStockThreshold * 0.5)) {
                urgencyLevel = 'HIGH';
                urgencyScore = 70;
            } else if (stock < lowStockThreshold) {
                urgencyLevel = 'MEDIUM';
                urgencyScore = 50;
            }

            // Update ProductUrgency (upsert)
            await prisma.productUrgency.upsert({
                where: { productId },
                update: {
                    stockLevel: stock,
                    urgencyLevel,
                    urgencyScore,
                    lastCalculatedAt: new Date()
                },
                create: {
                    productId,
                    stockLevel: stock,
                    urgencyLevel,
                    urgencyScore,
                    lastCalculatedAt: new Date()
                }
            });

            // Update product urgency fields
            await prisma.product.update({
                where: { id: productId },
                data: {
                    urgencyLevel,
                    isUrgencyBannerVisible: urgencyLevel !== 'NORMAL'
                }
            });

            // Notify seller if stock is low or critical
            if (stock <= lowStockThreshold && product.store) {
                const existingAlert = await prisma.notification.findFirst({
                    where: {
                        userId: product.store.sellerId,
                        title: 'Low Stock Alert',
                        body: { contains: product.title }
                    },
                    orderBy: { createdAt: 'desc' }
                });

                // Avoid spamming: only notify if last alert > 24h ago
                const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                if (!existingAlert || new Date(existingAlert.createdAt) < oneDayAgo) {
                    await prisma.notification.create({
                        data: {
                            userId: product.store.sellerId,
                            title: urgencyLevel === 'CRITICAL' ? '🚨 Critical Stock!' : '⚠️ Low Stock',
                            body: `"${product.title}" has only ${stock} units remaining. Restock soon to avoid lost sales.`,
                            type: 'ALERT',
                            linkUrl: `/seller-dashboard.html?tab=products`
                        }
                    });
                }
            }

            logger.info(`[INVENTORY] Product ${productId} urgency set to ${urgencyLevel} (stock: ${stock})`);

        } catch (error) {
            logger.error(`[INVENTORY] Failed to update urgency for ${productId}: ${error.message}`);
        }
    }

    /**
     * Process restock notifications for a product when it comes back in stock
     */
    async processRestock(productId) {
        try {
            const product = await prisma.product.findUnique({
                where: { id: productId },
                include: { store: true }
            });
            if (!product) return;

            // Get all active restock subscriptions for this product
            const subscriptions = await prisma.restockNotification.findMany({
                where: {
                    productId,
                    isNotified: false
                },
                include: { buyer: true }
            });

            const notifyPromises = [];
            for (const sub of subscriptions) {
                // Create buyer notification
                notifyPromises.push(
                    prisma.buyerNotification.create({
                        data: {
                            userId: sub.buyerId,
                            message: `✅ "${product.title}" is back in stock! Only ${product.stock} left.`,
                            type: 'product_availability',
                            channel: 'in_app'
                        }
                    })
                );
                // Mark as notified
                notifyPromises.push(
                    prisma.restockNotification.update({
                        where: { id: sub.id },
                        data: { isNotified: true, notifiedAt: new Date() }
                    })
                );
            }

            await Promise.all(notifyPromises);
            logger.info(`[INVENTORY] Sent ${subscriptions.length} restock notifications for product ${productId}`);

        } catch (error) {
            logger.error(`[INVENTORY] Restock processing error for ${productId}: ${error.message}`);
        }
    }

    /**
     * Subscribe to restock notifications
     */
    async subscribeToRestock(buyerId, productId) {
        // Upsert
        await prisma.restockNotification.upsert({
            where: {
                buyerId_productId: { buyerId, productId }
            },
            update: { isNotified: false },
            create: { buyerId, productId, isNotified: false }
        });
        return { success: true, message: 'Subscribed to restock alerts' };
    }
}

const inventoryServiceInstance = new InventoryService();
module.exports = inventoryServiceInstance;

// ─── Phase 13: Inventory Reservation ─────────────────────────────────────────
//
// Atomic stock reservation to prevent overselling on simultaneous checkout.
//
// Core pattern: conditional UPDATE (stock >= qty) is race-proof at DB level.
// MUST call reserve() inside a Prisma transaction (tx argument).
//
// State machine: ACTIVE -> DEDUCTED (payment confirmed)
//                       -> RELEASED (cancellation / payment failed)
//                       -> EXPIRED  (TTL cron reclaims stock)

const RESERVATION_TTL_MS = 30 * 60 * 1000; // 30 min — matches checkout session TTL

/**
 * reserve(tx, productId, quantity, fulfillmentOrderId?)
 *
 * Atomically decrements stock using updateMany with stock >= qty condition.
 * If the condition fails (count === 0), stock was insufficient — throws 409.
 * Must be called inside a Prisma transaction.
 *
 * @returns {Promise<InventoryReservation>}
 */
async function reserve(tx, productId, quantity, fulfillmentOrderId = null) {
    const updated = await tx.product.updateMany({
        where: { id: productId, stock: { gte: quantity } },
        data:  { stock: { decrement: quantity } },
    });

    if (updated.count === 0) {
        const product = await tx.product.findUnique({
            where:  { id: productId },
            select: { title: true, stock: true },
        });
        _emitEvent('INVENTORY_EXHAUSTED', 'Product', productId, {
            productId, requestedQty: quantity,
            availableStock: product?.stock ?? 0, fulfillmentOrderId,
        });
        const label = product?.title || productId;
        const avail = product?.stock ?? 0;
        throw Object.assign(
            new Error(
                avail > 0
                    ? `Insufficient stock for "${label}". Only ${avail} available (${quantity} requested).`
                    : `"${label}" is out of stock.`
            ),
            { statusCode: 409, productId, availableStock: avail }
        );
    }

    const reservation = await tx.inventoryReservation.create({
        data: {
            productId,
            fulfillmentOrderId: fulfillmentOrderId || null,
            quantity,
            status:    'ACTIVE',
            expiresAt: new Date(Date.now() + RESERVATION_TTL_MS),
        },
    });

    logger.debug(`[Inventory] Reserved ${quantity}x ${productId} → ${reservation.id}`);
    return reservation;
}

/**
 * release(reservationId)
 * Restores stock and marks reservation RELEASED. Safe to call on non-ACTIVE rows.
 */
async function release(reservationId) {
    const res = await prisma.inventoryReservation.findUnique({ where: { id: reservationId } });
    if (!res || res.status !== 'ACTIVE') {
        logger.info(`[Inventory] release: ${reservationId} is ${res?.status ?? 'not found'} — skip`);
        return;
    }
    await prisma.$transaction(async (tx) => {
        await tx.inventoryReservation.update({ where: { id: reservationId }, data: { status: 'RELEASED', releasedAt: new Date() } });
        await tx.product.update({ where: { id: res.productId }, data: { stock: { increment: res.quantity } } });
    });
    logger.info(`[Inventory] Released ${reservationId}: stock +${res.quantity} → product ${res.productId}`);
    _emitEvent('INVENTORY_RELEASED', 'InventoryReservation', reservationId, {
        productId: res.productId, quantity: res.quantity, fulfillmentOrderId: res.fulfillmentOrderId,
    });
}

/**
 * releaseForFulfillmentOrder(fulfillmentOrderId)
 * Releases all ACTIVE reservations for a cancelled FulfillmentOrder.
 */
async function releaseForFulfillmentOrder(fulfillmentOrderId) {
    const rows = await prisma.inventoryReservation.findMany({
        where: { fulfillmentOrderId, status: 'ACTIVE' },
    });
    for (const r of rows) await release(r.id);
    if (rows.length) logger.info(`[Inventory] Released ${rows.length} reservations for FO ${fulfillmentOrderId}`);
}

/**
 * deduct(reservationId)
 * Marks reservation DEDUCTED. Stock already decremented at reserve() — no DB stock change.
 * Called after payment confirmation.
 */
async function deduct(reservationId) {
    const res = await prisma.inventoryReservation.findUnique({ where: { id: reservationId } });
    if (!res || res.status !== 'ACTIVE') {
        logger.warn(`[Inventory] deduct: ${reservationId} is ${res?.status ?? 'not found'} — skip`);
        return;
    }
    await prisma.inventoryReservation.update({
        where: { id: reservationId },
        data:  { status: 'DEDUCTED', deductedAt: new Date() },
    });
    logger.info(`[Inventory] Deducted ${reservationId}: product ${res.productId} qty=${res.quantity}`);
    _emitEvent('INVENTORY_DEDUCTED', 'InventoryReservation', reservationId, {
        productId: res.productId, quantity: res.quantity, fulfillmentOrderId: res.fulfillmentOrderId,
    });
}

/**
 * deductForFulfillmentOrder(fulfillmentOrderId)
 * Marks all ACTIVE reservations for a FO as DEDUCTED (on payment confirmed).
 */
async function deductForFulfillmentOrder(fulfillmentOrderId) {
    const rows = await prisma.inventoryReservation.findMany({
        where: { fulfillmentOrderId, status: 'ACTIVE' },
    });
    for (const r of rows) await deduct(r.id);
}

/**
 * reclaimExpiredReservations()
 * Cron task: finds ACTIVE reservations past TTL, restores stock, marks EXPIRED.
 * @returns {{ reclaimed: number }}
 */
async function reclaimExpiredReservations() {
    const expired = await prisma.inventoryReservation.findMany({
        where: { status: 'ACTIVE', expiresAt: { lt: new Date() } },
        take: 100,
    });
    if (!expired.length) return { reclaimed: 0 };

    let reclaimed = 0;
    for (const res of expired) {
        try {
            await prisma.$transaction(async (tx) => {
                await tx.inventoryReservation.update({ where: { id: res.id }, data: { status: 'EXPIRED', releasedAt: new Date() } });
                await tx.product.update({ where: { id: res.productId }, data: { stock: { increment: res.quantity } } });
            });
            reclaimed++;
        } catch (err) {
            logger.error(`[Inventory] reclaimExpired ${res.id}: ${err.message}`);
        }
    }
    if (reclaimed) logger.info(`[Inventory] Reclaimed ${reclaimed} expired reservations`);
    return { reclaimed };
}

function _emitEvent(eventType, aggregateType, aggregateId, payload) {
    setImmediate(() => {
        try {
            require('./eventBus').emit(eventType, aggregateType, aggregateId, payload, { id: 'SYSTEM', type: 'SYSTEM' }).catch(() => {});
        } catch { /* eventBus not yet initialized */ }
    });
}

// Attach reservation methods to exported instance for convenience
inventoryServiceInstance.reserve                   = reserve;
inventoryServiceInstance.release                   = release;
inventoryServiceInstance.releaseForFulfillmentOrder = releaseForFulfillmentOrder;
inventoryServiceInstance.deduct                    = deduct;
inventoryServiceInstance.deductForFulfillmentOrder = deductForFulfillmentOrder;
inventoryServiceInstance.reclaimExpiredReservations = reclaimExpiredReservations;

// Also export as named functions for direct import
module.exports.reserve                    = reserve;
module.exports.release                    = release;
module.exports.releaseForFulfillmentOrder  = releaseForFulfillmentOrder;
module.exports.deduct                     = deduct;
module.exports.deductForFulfillmentOrder  = deductForFulfillmentOrder;
module.exports.reclaimExpiredReservations  = reclaimExpiredReservations;
