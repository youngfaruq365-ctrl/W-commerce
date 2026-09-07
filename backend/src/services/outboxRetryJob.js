'use strict';

/**
 * Outbox Retry Job — Phase 10
 *
 * Two cron jobs registered with CronJobManager:
 *
 * 1. outbox-notification-retry (every 5 min)
 *    Picks up PENDING/FAILED rows from NotificationOutbox and re-attempts
 *    channel delivery (email, SMS, push). Marks COMPLETED on success, FAILED
 *    after MAX_ATTEMPTS exhausted.
 *
 * 2. outbox-domain-event-retry (every 10 min)
 *    Picks up FAILED rows from DomainEvent (handlers that threw) and
 *    re-dispatches them via domainEventService.retryFailedEvents().
 *
 * Both jobs use CronJobManager's distributed lock so they only run on
 * one instance in a multi-server deployment.
 */

const prisma          = require('../utils/prismaClient');
const logger          = require('../utils/logger');
const domainEvents    = require('./domainEventService');
const inventory       = require('./inventoryService');                          // Phase 13
const courierOffers   = require('./delivery/courierOfferService');              // Phase 16

const MAX_NOTIFICATION_ATTEMPTS = 5;

// ─── Notification Outbox Processor ───────────────────────────────────────────

async function processNotificationOutbox() {
    const rows = await prisma.notificationOutbox.findMany({
        where: {
            status:   { in: ['PENDING', 'FAILED'] },
            attempts: { lt: MAX_NOTIFICATION_ATTEMPTS },
        },
        orderBy: { createdAt: 'asc' },
        take: 50,
    });

    if (rows.length === 0) return { processed: 0, failed: 0 };

    logger.info(`[OutboxRetry] Processing ${rows.length} notification outbox items`);

    let processed = 0;
    let failed    = 0;

    for (const row of rows) {
        // Mark as PROCESSING
        await prisma.notificationOutbox.update({
            where: { id: row.id },
            data: {
                status:        'PROCESSING',
                lastAttemptAt: new Date(),
                attempts:      { increment: 1 },
            },
        }).catch(() => {});

        try {
            const payload = JSON.parse(row.payload || '{}');
            await _dispatchOutboxItem(row.eventType, payload);

            await prisma.notificationOutbox.update({
                where: { id: row.id },
                data:  { status: 'COMPLETED' },
            }).catch(() => {});

            processed++;

        } catch (err) {
            logger.error(`[OutboxRetry] Failed outbox item ${row.id}: ${err.message}`);

            const nextAttempts = (row.attempts || 0) + 1;
            const exhausted    = nextAttempts >= MAX_NOTIFICATION_ATTEMPTS;

            await prisma.notificationOutbox.update({
                where: { id: row.id },
                data: {
                    status: exhausted ? 'FAILED' : 'PENDING',
                    error:  err.message?.substring(0, 500),
                },
            }).catch(() => {});

            failed++;
        }
    }

    logger.info(`[OutboxRetry] Notification outbox: ${processed} processed, ${failed} failed`);
    return { processed, failed };
}

// ─── Outbox item dispatcher ───────────────────────────────────────────────────

async function _dispatchOutboxItem(eventType, payload) {
    // Lazy-load channel services
    if (eventType === 'NOTIFICATION_EMAIL_FAILED') {
        const emailService = require('./emailService');
        if (!payload.title || !payload.body) throw new Error('Missing email payload fields');

        // Re-fetch user contact from DB in case payload is stale
        const user = await prisma.user.findUnique({
            where:  { id: payload.userId },
            select: { email: true, fullName: true },
        });
        if (!user?.email) throw new Error(`No email for user ${payload.userId}`);

        await emailService.sendEmail({
            to:      user.email,
            subject: payload.title,
            text:    payload.body,
            html:    `<p>${payload.body}</p>${payload.actionUrl
                ? `<p><a href="${payload.actionUrl}">View Details</a></p>`
                : ''}`,
        });

        // Update the original Notification row as delivered
        if (payload.notificationId) {
            await prisma.notification.update({
                where: { id: payload.notificationId },
                data:  { deliveredAt: new Date() },
            }).catch(() => {});
        }
        return;
    }

    if (eventType === 'NOTIFICATION_SMS_FAILED') {
        const smsService = require('./smsService');
        const user = await prisma.user.findUnique({
            where:  { id: payload.userId },
            select: { phone: true },
        });
        if (!user?.phone) throw new Error(`No phone for user ${payload.userId}`);

        await smsService.sendSMS({
            to:   user.phone,
            body: `${payload.title}: ${payload.body}`,
        });

        if (payload.notificationId) {
            await prisma.notification.update({
                where: { id: payload.notificationId },
                data:  { deliveredAt: new Date() },
            }).catch(() => {});
        }
        return;
    }

    // Unknown outbox type — mark as completed to avoid infinite retry
    logger.warn(`[OutboxRetry] Unknown outbox eventType "${eventType}" — skipping`);
}

// ─── Domain Event Retrier ─────────────────────────────────────────────────────

async function retryFailedDomainEvents() {
    const result = await domainEvents.retryFailedEvents(3);
    if (result.retried > 0) {
        logger.info(`[OutboxRetry] Domain event retry: ${result.retried}/${result.total} retried`);
    }
    return result;
}

// ─── Cron Registration ────────────────────────────────────────────────────────

function registerOutboxJobs(cronJobManager) {
    // Job 1: Notification outbox retry — every 5 minutes
    cronJobManager.register(
        'outbox-notification-retry',
        '*/5 * * * *',
        async () => {
            return processNotificationOutbox();
        },
        {
            lockExpiry: 60,
            runOnStartup: false,
        }
    );

    // Job 2: Domain event retry — every 10 minutes
    // Disabled temporarily to prevent server crash (Model DomainEvent missing)
    // cronJobManager.register(
    //     'outbox-domain-event-retry',
    //     '*/10 * * * *',
    //     async () => {
    //         return retryFailedDomainEvents();
    //     },
    //     {
    //         lockExpiry: 120,
    //         runOnStartup: false,
    //     }
    // );

    // Job 3: Inventory reservation reclaim — every 5 minutes (Phase 13)
    // Disabled temporarily to prevent server crash (Model InventoryReservation missing)
    // cronJobManager.register(
    //     'inventory-reservation-reclaim',
    //     '*/5 * * * *',
    //     async () => {
    //         return inventory.reclaimExpiredReservations();
    //     },
    //     {
    //         lockExpiry: 60,
    //         runOnStartup: false,
    //     }
    // );

    // Job 4: Delivery offer expiry + re-dispatch — every 5 minutes (Phase 16)
    // Disabled temporarily to prevent server crash (Model CourierOffer missing)
    // cronJobManager.register(
    //     'courier-offer-expiry',
    //     '*/5 * * * *',
    //     async () => {
    //         return courierOffers.expireStaleOffersAndRedispatch();
    //     },
    //     {
    //         lockExpiry: 60,
    //         runOnStartup: false,
    //     }
    // );

    logger.info('[OutboxRetry] Outbox retry jobs registered ✅');
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
    registerOutboxJobs,
    processNotificationOutbox,
    retryFailedDomainEvents,
};
