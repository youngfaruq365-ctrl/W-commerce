'use strict';

/**
 * Domain Event Service — Phase 7
 *
 * Central event bus for the marketplace platform.
 *
 * Architecture:
 *   1. Any service calls `emit(eventType, aggregate, payload, actor)`
 *   2. The event is persisted to the `DomainEvent` table (immutable log)
 *   3. Registered handlers are dispatched asynchronously (fire-and-forget)
 *   4. The event row is marked PROCESSED or FAILED with error details
 *
 * This replaces ad-hoc notification calls scattered across services.
 * Instead of:
 *   await prisma.notification.create(...)  // in paymentV2Service.js
 *   await prisma.notification.create(...)  // in earningsLedgerService.js
 *   await prisma.notification.create(...)  // in checkoutV2Controller.js
 *
 * Services can now just:
 *   await domainEvents.emit('ORDER_CREATED', 'MarketplaceOrder', orderId, payload, actor)
 *
 * And the notification handler (registered separately) picks it up.
 *
 * Benefits:
 *   • Single immutable audit trail of all state transitions
 *   • Loose coupling — services don't know about notification logic
 *   • Retry-able — failed events have status=FAILED and can be reprocessed
 *   • Queryable — "show me every event for FulfillmentOrder X"
 *
 * Event naming convention:
 *   {AGGREGATE}_{ACTION}
 *   ORDER_CREATED, ORDER_PAID, ORDER_CANCELLED, ORDER_EXPIRED
 *   FULFILLMENT_CONFIRMED, FULFILLMENT_PACKED, FULFILLMENT_SHIPPED, FULFILLMENT_DELIVERED
 *   PAYMENT_INITIALIZED, PAYMENT_CONFIRMED, PAYMENT_FAILED
 *   ESCROW_HELD, ESCROW_RELEASED, ESCROW_DISPUTED, ESCROW_REFUNDED
 *   USER_REGISTERED, USER_BANNED, USER_VERIFIED
 *   PRODUCT_CREATED, PRODUCT_UPDATED, PRODUCT_OUT_OF_STOCK
 *   DISPUTE_OPENED, DISPUTE_RESOLVED
 *   DELIVERY_ASSIGNED, DELIVERY_COMPLETED
 */

const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');

// ─── Handler Registry ─────────────────────────────────────────────────────────
//
// Handlers are registered at startup by other services.
// Each handler is { eventType: string | '*', handler: async (event) => void }
// '*' matches all events (useful for analytics/logging).

const handlers = new Map();   // eventType → Set<handlerFn>
const wildcardHandlers = [];  // handlers registered with '*'

/**
 * Register an event handler.
 *
 * @param {string}   eventType — e.g. 'ORDER_CREATED' or '*' for all
 * @param {Function} handlerFn — async (event: DomainEvent) => void
 * @param {string}   [name]    — optional handler name for logging
 */
function on(eventType, handlerFn, name = 'anonymous') {
    if (eventType === '*') {
        wildcardHandlers.push({ handler: handlerFn, name });
        logger.info(`[DomainEvents] Wildcard handler registered: ${name}`);
        return;
    }

    if (!handlers.has(eventType)) {
        handlers.set(eventType, []);
    }
    handlers.get(eventType).push({ handler: handlerFn, name });
    logger.info(`[DomainEvents] Handler registered: ${name} → ${eventType}`);
}

/**
 * Unregister all handlers for an event type (mainly for tests).
 */
function off(eventType) {
    if (eventType === '*') {
        wildcardHandlers.length = 0;
    } else {
        handlers.delete(eventType);
    }
}

// ─── Emit ─────────────────────────────────────────────────────────────────────

/**
 * Emit a domain event.
 *
 * @param {string} eventType     — e.g. 'ORDER_CREATED'
 * @param {string} aggregateType — e.g. 'MarketplaceOrder'
 * @param {string} aggregateId   — the entity's ID
 * @param {Object} payload       — event-specific data (will be JSON-stringified)
 * @param {Object} [actor]       — { id: string, type: 'USER'|'ADMIN'|'SYSTEM'|'CRON'|'WEBHOOK' }
 * @param {Object} [tx]          — optional Prisma transaction client (to persist atomically with the triggering mutation)
 * @returns {Promise<DomainEvent>} the persisted event row
 */
async function emit(eventType, aggregateType, aggregateId, payload = {}, actor = null, tx = null) {
    const db = tx || prisma;

    // 1. Persist the event (immutable log if model exists)
    let event;
    if (db.domainEvent) {
        try {
            event = await db.domainEvent.create({
                data: {
                    eventType,
                    aggregateType,
                    aggregateId,
                    payload:   typeof payload === 'string' ? payload : JSON.stringify(payload),
                    actorId:   actor?.id   || null,
                    actorType: actor?.type || 'SYSTEM',
                    status:    'PENDING',
                },
            });
        } catch (err) {
            logger.error(`[DomainEvents] Failed to persist event ${eventType}: ${err.message}`);
        }
    }

    if (!event) {
        event = {
            id: `evt_mem_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            eventType,
            aggregateType,
            aggregateId,
            payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
            actorId: actor?.id || null,
            actorType: actor?.type || 'SYSTEM',
            status: 'PENDING',
            createdAt: new Date()
        };
    }

    // 2. Dispatch handlers asynchronously (fire-and-forget from the caller's perspective)
    _dispatchHandlers(event).catch(err => {
        logger.error(`[DomainEvents] Dispatch error for ${event.id}: ${err.message}`);
    });

    return event;
}

/**
 * Emit a domain event inside an existing Prisma transaction.
 * The event row is created atomically with the transaction, but handlers
 * are dispatched AFTER the transaction commits (via setImmediate).
 */
async function emitInTransaction(tx, eventType, aggregateType, aggregateId, payload = {}, actor = null) {
    let event;
    if (tx.domainEvent) {
        try {
            event = await tx.domainEvent.create({
                data: {
                    eventType,
                    aggregateType,
                    aggregateId,
                    payload:   typeof payload === 'string' ? payload : JSON.stringify(payload),
                    actorId:   actor?.id   || null,
                    actorType: actor?.type || 'SYSTEM',
                    status:    'PENDING',
                },
            });
        } catch (err) {
            logger.error(`[DomainEvents] Failed to persist event in tx ${eventType}: ${err.message}`);
        }
    }

    if (!event) {
        event = {
            id: `evt_mem_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            eventType,
            aggregateType,
            aggregateId,
            payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
            actorId: actor?.id || null,
            actorType: actor?.type || 'SYSTEM',
            status: 'PENDING',
            createdAt: new Date()
        };
    }

    // Schedule dispatch after the transaction commits
    setImmediate(() => {
        _dispatchHandlers(event).catch(err => {
            logger.error(`[DomainEvents] Post-tx dispatch error for ${event.id}: ${err.message}`);
        });
    });

    return event;
}

// ─── Internal dispatcher ──────────────────────────────────────────────────────

async function _dispatchHandlers(event) {
    const matchedHandlers = [
        ...(handlers.get(event.eventType) || []),
        ...wildcardHandlers,
    ];

    if (matchedHandlers.length === 0) {
        // No handlers — mark as processed immediately
        await prisma.domainEvent.update({
            where: { id: event.id },
            data:  { status: 'PROCESSED', processedAt: new Date() },
        }).catch(() => {});
        return;
    }

    // Mark as PROCESSING
    await prisma.domainEvent.update({
        where: { id: event.id },
        data:  { status: 'PROCESSING' },
    }).catch(() => {});

    // Parse payload back to object for handlers
    const eventWithPayload = {
        ...event,
        data: _safeParse(event.payload),
    };

    const errors = [];

    for (const { handler, name } of matchedHandlers) {
        try {
            await handler(eventWithPayload);
        } catch (err) {
            logger.error(`[DomainEvents] Handler "${name}" failed for ${event.eventType}/${event.id}: ${err.message}`);
            errors.push(`${name}: ${err.message}`);
        }
    }

    // Mark final status
    if (errors.length > 0) {
        await prisma.domainEvent.update({
            where: { id: event.id },
            data: {
                status:      'FAILED',
                error:       errors.join('; ').substring(0, 2000),
                processedAt: new Date(),
                retryCount:  { increment: 1 },
            },
        }).catch(() => {});
    } else {
        await prisma.domainEvent.update({
            where: { id: event.id },
            data: {
                status:      'PROCESSED',
                processedAt: new Date(),
            },
        }).catch(() => {});
    }
}

// ─── Query helpers ────────────────────────────────────────────────────────────

/**
 * Get the event history for an entity.
 * Used by admin panel, order detail views, and debugging.
 */
async function getEventsForAggregate(aggregateType, aggregateId, { limit = 50, offset = 0 } = {}) {
    return prisma.domainEvent.findMany({
        where: { aggregateType, aggregateId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
    });
}

/**
 * Retry all FAILED events (called by a cron job).
 */
async function retryFailedEvents(maxRetries = 3) {
    const failed = await prisma.domainEvent.findMany({
        where: {
            status:     'FAILED',
            retryCount: { lt: maxRetries },
        },
        orderBy: { createdAt: 'asc' },
        take: 100,
    });

    if (failed.length === 0) return { retried: 0 };

    logger.info(`[DomainEvents] Retrying ${failed.length} failed events`);

    let retried = 0;
    for (const event of failed) {
        try {
            await _dispatchHandlers(event);
            retried++;
        } catch (err) {
            logger.error(`[DomainEvents] Retry failed for ${event.id}: ${err.message}`);
        }
    }

    return { retried, total: failed.length };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _safeParse(str) {
    try {
        return JSON.parse(str);
    } catch {
        return {};
    }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
    emit,
    emitInTransaction,
    on,
    off,
    getEventsForAggregate,
    retryFailedEvents,
};
