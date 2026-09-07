'use strict';

/**
 * Unified Notification Service V2 — Phase 9
 *
 * The single point of truth for all notification creation.
 * Uses the unified `Notification` model (replaces BuyerNotification for new code).
 *
 * Architecture:
 *   1. `notify(userId, payload)` — create a Notification row (in-app guaranteed)
 *   2. `dispatch(notification)` — attempt multi-channel delivery (email/SMS/push)
 *   3. Outbox pattern: failed channel deliveries are written to NotificationOutbox
 *      for retry by the cron job (Phase 10).
 *
 * All domain event handlers in domainEventHandlers.js now call this service.
 *
 * Migration Strategy:
 *   - New code: use notificationV2.notify()
 *   - Legacy code (BuyerNotification): unchanged for now — migrated in Phase 9b
 *   - Both tables coexist; the frontend reads from Notification for new flows
 *
 * Supported types (conventional, not enforced):
 *   ORDER_CREATED, ORDER_CANCELLED, ORDER_EXPIRED
 *   PAYMENT_CONFIRMED, PAYMENT_FAILED
 *   FULFILLMENT_CONFIRMED, FULFILLMENT_PACKED, FULFILLMENT_SHIPPED, FULFILLMENT_DELIVERED
 *   ESCROW_RELEASED, ESCROW_DISPUTED
 *   PACKAGE_CREATED, PACKAGE_DELIVERED, PACKAGE_CONDITION_ISSUE
 *   DISPUTE_OPENED, DISPUTE_RESOLVED
 *   REFUND_ISSUED
 *   REVIEW_RECEIVED
 *   FLASH_DEAL_EXPIRING
 */

const prisma         = require('../utils/prismaClient');
const logger         = require('../utils/logger');

// Lazy-load channel services to avoid circular deps at startup
let _emailService = null;
let _smsService   = null;
function getEmailService() {
    if (!_emailService) _emailService = require('./emailService');
    return _emailService;
}
function getSmsService() {
    if (!_smsService) _smsService = require('./smsService');
    return _smsService;
}

// ─── Core Notify ─────────────────────────────────────────────────────────────

/**
 * Create a notification for a user.
 * Always persists the in-app notification, then attempts multi-channel delivery.
 *
 * @param {string} userId
 * @param {Object} payload
 * @param {string} payload.type           — notification type constant
 * @param {string} payload.title          — notification title (bold text)
 * @param {string} payload.body           — notification body text
 * @param {string} [payload.channel]      — 'in_app' | 'email' | 'sms' | 'push' (default: in_app)
 * @param {string} [payload.actionUrl]    — relative path or deep link
 * @param {string} [payload.linkUrl]      — legacy compat (same as actionUrl)
 * @param {string} [payload.imageUrl]     — optional image
 * @param {string} [payload.orderId]      — associated order ID
 * @param {Object} [payload.metadata]     — arbitrary JSON context
 * @param {Date}   [payload.expiresAt]    — auto-hide after this time
 * @returns {Promise<Notification>}
 */
async function notify(userId, payload) {
    if (!userId || !payload?.type || !payload?.title || !payload?.body) {
        logger.warn('[NotificationV2] notify() called with missing required fields');
        return null;
    }

    // Skip platform sentinel (used by domainEventHandlers for admin)
    if (userId === 'PLATFORM') {
        logger.info(`[NotificationV2] PLATFORM notification: ${payload.title}`);
        try {
            const admins = await prisma.user.findMany({
                where: { role: 'ADMIN' },
                select: { id: true }
            });
            if (admins.length > 0) {
                const adminIds = admins.map(a => a.id);
                await notifyMany(adminIds, payload);
            }
        } catch (error) {
            logger.error(`[NotificationV2] Failed to fan out PLATFORM notification to admins: ${error.message}`);
        }
        return null;
    }

    try {
        const notification = await prisma.notification.create({
            data: {
                userId,
                type:       payload.type,
                title:      payload.title,
                body:       payload.body,
                channel:    payload.channel    || 'in_app',
                actionUrl:  payload.actionUrl  || payload.linkUrl || null,
                linkUrl:    payload.linkUrl    || payload.actionUrl || null,
                imageUrl:   payload.imageUrl   || null,
                orderId:    payload.orderId    || null,
                metadata:   payload.metadata
                    ? JSON.stringify(payload.metadata)
                    : null,
                expiresAt:  payload.expiresAt  || null,
            },
        });

        // Attempt multi-channel delivery asynchronously
        _dispatchChannels(notification, payload).catch(err => {
            logger.error(`[NotificationV2] Channel dispatch failed: ${err.message}`);
        });

        return notification;

    } catch (err) {
        logger.error(`[NotificationV2] Failed to create notification for ${userId}: ${err.message}`);
        return null;  // never throw — notification failure must not crash business logic
    }
}

/**
 * Batch notify multiple users with the same payload.
 * Useful for broadcast events (e.g. flash deal alerts to followers).
 *
 * @param {string[]} userIds
 * @param {Object} payload — same as notify()
 */
async function notifyMany(userIds, payload) {
    if (!Array.isArray(userIds) || userIds.length === 0) return;

    // Use createMany for efficiency (no individual dispatch — fire via outbox cron)
    const rows = userIds
        .filter(id => id && id !== 'PLATFORM')
        .map(userId => ({
            userId,
            type:      payload.type,
            title:     payload.title,
            body:      payload.body,
            channel:   payload.channel   || 'in_app',
            actionUrl: payload.actionUrl || payload.linkUrl || null,
            linkUrl:   payload.linkUrl   || payload.actionUrl || null,
            imageUrl:  payload.imageUrl  || null,
            orderId:   payload.orderId   || null,
            metadata:  payload.metadata ? JSON.stringify(payload.metadata) : null,
            expiresAt: payload.expiresAt || null,
        }));

    if (rows.length === 0) return;

    try {
        await prisma.notification.createMany({ data: rows, skipDuplicates: false });
        logger.info(`[NotificationV2] Batch notified ${rows.length} users: ${payload.type}`);
    } catch (err) {
        logger.error(`[NotificationV2] notifyMany failed: ${err.message}`);
    }
}

// ─── Read/Mark operations ─────────────────────────────────────────────────────

/**
 * Get a user's notifications (paginated, newest first).
 */
async function getUserNotifications(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
    const where = {
        userId,
        ...(unreadOnly ? { isRead: false } : {}),
    };

    const [notifications, total, unreadCount] = await Promise.all([
        prisma.notification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take:    Math.min(50, limit),
            skip:    (page - 1) * limit,
        }),
        prisma.notification.count({ where }),
        prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return { notifications, total, unreadCount, page, limit };
}

/**
 * Mark a single notification as read.
 */
async function markRead(notificationId, userId) {
    return prisma.notification.updateMany({
        where: { id: notificationId, userId },
        data:  { isRead: true, readAt: new Date() },
    });
}

/**
 * Mark all notifications as read for a user.
 */
async function markAllRead(userId) {
    return prisma.notification.updateMany({
        where: { userId, isRead: false },
        data:  { isRead: true, readAt: new Date() },
    });
}

/**
 * Get unread count only (for notification bell badge).
 */
async function getUnreadCount(userId) {
    return prisma.notification.count({
        where: {
            userId,
            isRead: false,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
    });
}

// ─── Channel dispatchers ──────────────────────────────────────────────────────

async function _dispatchChannels(notification, payload) {
    const channel = notification.channel;

    if (channel === 'in_app') return;  // already persisted, no further action

    // Fetch user contact details
    const user = await prisma.user.findUnique({
        where:  { id: notification.userId },
        select: { email: true, phone: true, fullName: true, notificationPrefs: true, deviceToken: true },
    }).catch(() => null);

    if (!user) return;

    // Check user prefs
    let prefs = {};
    try {
        prefs = user.notificationPrefs ? JSON.parse(user.notificationPrefs) : {};
    } catch { prefs = {}; }

    try {
        if (channel === 'email' && user.email && prefs.email !== false) {
            await getEmailService().sendEmail({
                to:      user.email,
                subject: notification.title,
                text:    notification.body,
                html:    `<p>${notification.body}</p>${notification.actionUrl
                    ? `<p><a href="${notification.actionUrl}">View Details</a></p>`
                    : ''}`,
            });
        }

        if (channel === 'sms' && user.phone && prefs.sms !== false) {
            await getSmsService().sendSMS({
                to:   user.phone,
                body: `${notification.title}: ${notification.body}`,
            });
        }

        if (channel === 'push') {
            if (!user.deviceToken) {
                logger.debug(`[NotificationV2] Push skipped: user ${notification.userId} has no device token`);
            } else {
                const webpush = require('web-push');
                const publicVapidKey = process.env.VAPID_PUBLIC_KEY || 'dummy-public-key';
                const privateVapidKey = process.env.VAPID_PRIVATE_KEY || 'dummy-private-key';
                const subject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';
                
                if (publicVapidKey !== 'dummy-public-key' && privateVapidKey !== 'dummy-private-key') {
                    webpush.setVapidDetails(subject, publicVapidKey, privateVapidKey);
                }

                let pushSubscription;
                try {
                    pushSubscription = JSON.parse(user.deviceToken);
                } catch (e) {
                    logger.error(`[NotificationV2] Invalid device token format for user ${notification.userId}`);
                    pushSubscription = null;
                }

                if (pushSubscription) {
                    const payload = JSON.stringify({
                        title: notification.title,
                        body: notification.body,
                        actionUrl: notification.actionUrl
                    });

                    await webpush.sendNotification(pushSubscription, payload);
                    logger.debug(`[NotificationV2] Push notification sent to ${notification.userId}`);
                }
            }
        }

        // Mark as delivered
        await prisma.notification.update({
            where: { id: notification.id },
            data:  { deliveredAt: new Date() },
        }).catch(() => {});

    } catch (err) {
        logger.error(`[NotificationV2] Channel "${channel}" delivery failed for ${notification.id}: ${err.message}`);

        // Write to outbox for retry
        await prisma.notificationOutbox.create({
            data: {
                eventType: `NOTIFICATION_${channel.toUpperCase()}_FAILED`,
                payload:   JSON.stringify({
                    notificationId: notification.id,
                    userId:         notification.userId,
                    channel,
                    title:          notification.title,
                    body:           notification.body,
                    actionUrl:      notification.actionUrl,
                }),
                status: 'PENDING',
            },
        }).catch(() => {});
    }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
    notify,
    notifyMany,
    getUserNotifications,
    markRead,
    markAllRead,
    getUnreadCount,
};
