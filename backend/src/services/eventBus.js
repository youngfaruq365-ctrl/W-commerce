'use strict';

/**
 * Event Bus — Phase 10
 *
 * A thin facade that unifies in-process and Redis Pub/Sub event dispatch.
 *
 * Architecture:
 *
 *   DEV  (no REDIS_URL):
 *     emit() → domainEventService.emit() → in-process handlers (synchronous-ish)
 *
 *   PROD (REDIS_URL set):
 *     emit() → domainEventService.emit() → DomainEvent persisted → Redis PUBLISH
 *     Redis subscriber → receives message → calls registered consumers
 *
 * This means:
 *   • DomainEvent table is ALWAYS written (the DB is the source of truth)
 *   • Redis is the delivery transport in production (fan-out, multi-instance)
 *   • If Redis is down, events still run in-process (graceful degradation)
 *
 * Consumer interface:
 *   eventBus.subscribe('ORDER_CREATED', async (event) => { ... });
 *
 * Built-in consumers registered at startup (see registerBuiltinConsumers()):
 *   • NotificationConsumer  — creates Notification rows from events
 *   • DomainEventRetrier    — retries FAILED DomainEvent records
 *
 * Channel naming convention: marketplace:events:{eventType}
 * Broadcast channel:         marketplace:events:*
 */

const domainEvents   = require('./domainEventService');
const logger         = require('../utils/logger');

const CHANNEL_PREFIX = 'marketplace:events';
const BROADCAST_CHAN = `${CHANNEL_PREFIX}:broadcast`;

// ─── State ────────────────────────────────────────────────────────────────────

let _publisher   = null;  // Redis client for PUBLISH
let _subscriber  = null;  // Dedicated Redis client for SUBSCRIBE
let _useRedis    = false;
let _initialized = false;

// In-memory consumer registry (used in dev + as fallback)
// Map<eventType | '*', Array<{name, handler}>>
const _consumers = new Map();
const _wildcardConsumers = [];

// ─── Initialization ───────────────────────────────────────────────────────────

/**
 * Initialize the event bus.
 * Call this once at server startup AFTER Redis is ready.
 *
 * @param {Object} [redisManager] — the app's singleton redisManager instance
 */
async function initialize(redisManager) {
    if (_initialized) return;
    _initialized = true;

    const redisClient = redisManager?.client;

    if (redisClient && redisManager?.isConnected) {
        try {
            // Create a dedicated pub client (separate from the main client)
            _publisher = redisClient.duplicate
                ? await redisClient.duplicate().connect().catch(() => null)
                : redisClient;

            // Create a dedicated sub client
            _subscriber = redisClient.duplicate
                ? await redisClient.duplicate().connect().catch(() => null)
                : null;

            if (_publisher && _subscriber) {
                _useRedis = true;
                await _setupRedisSubscriber();
                logger.info('[EventBus] Initialized with Redis Pub/Sub backend ✅');
            } else {
                logger.warn('[EventBus] Redis client duplication failed — falling back to in-process dispatch');
            }
        } catch (err) {
            logger.warn(`[EventBus] Redis setup failed, using in-process: ${err.message}`);
        }
    } else {
        logger.info('[EventBus] Initialized with in-process dispatch (no Redis)');
    }
}

// ─── Emit ─────────────────────────────────────────────────────────────────────

/**
 * Emit a domain event through the bus.
 *
 * @param {string} eventType     — e.g. 'ORDER_CREATED'
 * @param {string} aggregateType — e.g. 'MarketplaceOrder'
 * @param {string} aggregateId   — the entity's ID
 * @param {Object} payload       — event-specific data
 * @param {Object} [actor]       — { id, type }
 * @param {Object} [tx]          — optional Prisma transaction client
 */
async function emit(eventType, aggregateType, aggregateId, payload = {}, actor = null, tx = null) {
    // 1. Always persist to DomainEvent table first (source of truth)
    const event = await domainEvents.emit(
        eventType, aggregateType, aggregateId, payload, actor, tx
    );

    // 2. Publish to Redis if available (for multi-instance fan-out)
    if (_useRedis && _publisher) {
        const message = JSON.stringify({
            id:            event.id,
            eventType,
            aggregateType,
            aggregateId,
            payload,
            actorId:       actor?.id   || null,
            actorType:     actor?.type || 'SYSTEM',
            createdAt:     event.createdAt,
        });

        // Publish to type-specific channel AND broadcast channel
        await Promise.all([
            _publisher.publish(`${CHANNEL_PREFIX}:${eventType}`, message).catch(() => {}),
            _publisher.publish(BROADCAST_CHAN, message).catch(() => {}),
        ]);
    }
    // If no Redis — domainEventService already dispatched in-process handlers

    return event;
}

/**
 * Emit inside a Prisma transaction.
 */
async function emitInTransaction(tx, eventType, aggregateType, aggregateId, payload = {}, actor = null) {
    const event = await domainEvents.emitInTransaction(
        tx, eventType, aggregateType, aggregateId, payload, actor
    );

    // Schedule Redis publish after tx commits
    if (_useRedis && _publisher) {
        setImmediate(() => {
            const message = JSON.stringify({
                id: event.id, eventType, aggregateType, aggregateId, payload,
                actorId: actor?.id || null, actorType: actor?.type || 'SYSTEM',
                createdAt: event.createdAt,
            });
            Promise.all([
                _publisher.publish(`${CHANNEL_PREFIX}:${eventType}`, message).catch(() => {}),
                _publisher.publish(BROADCAST_CHAN, message).catch(() => {}),
            ]);
        });
    }

    return event;
}

// ─── Subscribe ────────────────────────────────────────────────────────────────

/**
 * Register a consumer for a specific event type (or '*' for all).
 * In dev mode: called directly during in-process dispatch.
 * In prod mode: also registered as Redis subscriber.
 *
 * @param {string}   eventType — event type or '*'
 * @param {Function} handler   — async (event) => void
 * @param {string}   [name]    — consumer name for logging
 */
function subscribe(eventType, handler, name = 'anonymous') {
    // Register in the in-process handler registry
    domainEvents.on(eventType, handler, name);

    // Also register locally for Redis message routing
    if (eventType === '*') {
        _wildcardConsumers.push({ handler, name });
    } else {
        if (!_consumers.has(eventType)) _consumers.set(eventType, []);
        _consumers.get(eventType).push({ handler, name });
    }

    logger.debug(`[EventBus] Consumer registered: ${name} → ${eventType}`);
}

// ─── Redis subscriber setup ───────────────────────────────────────────────────

async function _setupRedisSubscriber() {
    if (!_subscriber) return;

    await _subscriber.pSubscribe(`${CHANNEL_PREFIX}:*`, async (message, channel) => {
        let parsed;
        try {
            parsed = JSON.parse(message);
        } catch {
            logger.warn(`[EventBus] Invalid Redis message on ${channel}`);
            return;
        }

        const eventType = parsed.eventType;
        const eventWithData = { ...parsed, data: parsed.payload };

        // Route to specific + wildcard consumers
        const matched = [
            ...(_consumers.get(eventType) || []),
            ..._wildcardConsumers,
        ];

        for (const { handler, name } of matched) {
            try {
                await handler(eventWithData);
            } catch (err) {
                logger.error(`[EventBus] Redis consumer "${name}" failed for ${eventType}: ${err.message}`);
            }
        }
    });

    logger.info(`[EventBus] Subscribed to Redis pattern: ${CHANNEL_PREFIX}:*`);
}

// ─── Built-in consumers ───────────────────────────────────────────────────────

/**
 * Register the platform's built-in consumers.
 * Called once after initialize().
 */
function registerBuiltinConsumers() {
    const notificationV2 = require('./notificationV2Service');

    // PACKAGE_CONDITION_ISSUE → notify buyer + seller
    subscribe('PACKAGE_CONDITION_ISSUE', async (event) => {
        const { buyerId, sellerId, barcode, condition, conditionNote } = event.data || {};
        if (buyerId) {
            await notificationV2.notify(buyerId, {
                type:      'PACKAGE_CONDITION_ISSUE',
                title:     `Package Condition Alert ⚠️`,
                body:      `Package ${barcode} was reported as ${condition}. ${conditionNote || ''}`,
                channel:   'in_app',
            });
        }
        if (sellerId) {
            await notificationV2.notify(sellerId, {
                type:      'PACKAGE_CONDITION_ISSUE',
                title:     `Your package was reported ${condition}`,
                body:      `Package ${barcode}: ${conditionNote || 'Condition issue reported by courier'}`,
                channel:   'in_app',
            });
        }
    }, 'package-condition-notifier');

    // DISPUTE_ELIGIBLE → log for admin review queue
    subscribe('DISPUTE_ELIGIBLE', async (event) => {
        logger.info(
            `[EventBus] DISPUTE_ELIGIBLE: FO ${event.aggregateId} — condition: ${event.data?.condition}`
        );
        // Phase 17 (Dispute OS) will register a real handler here
    }, 'dispute-eligible-logger');

    logger.info('[EventBus] Built-in consumers registered ✅');
}

// ─── Shutdown ─────────────────────────────────────────────────────────────────

async function shutdown() {
    if (_subscriber) {
        await _subscriber.quit().catch(() => {});
        _subscriber = null;
    }
    if (_publisher && _publisher !== _subscriber) {
        await _publisher.quit().catch(() => {});
        _publisher = null;
    }
    _useRedis = false;
    _initialized = false;
    logger.info('[EventBus] Shutdown complete');
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
    initialize,
    emit,
    emitInTransaction,
    subscribe,
    registerBuiltinConsumers,
    shutdown,
};
