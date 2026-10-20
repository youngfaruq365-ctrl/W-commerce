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
let _pushService = null;
function getPushService() {
    if (!_pushService) _pushService = require('./pushService');
    return _pushService;
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
                linkUrl:    payload.linkUrl || payload.actionUrl || null
            },
        });

        // Emit real-time in-app notification via socket
        const socketService = require('./socketService');
        const io = socketService.getIO();
        if (io) {
            io.to(String(userId)).emit('notification', notification);
        }

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

    const uniqueIds = [...new Set(userIds.filter(id => id && id !== 'PLATFORM').map(String))];
    if (uniqueIds.length === 0) return;

    // Only columns that exist on the Notification model (id, userId, title, body, type, isRead, linkUrl, data).
    const extra = {};
    if (payload.orderId)  extra.orderId  = payload.orderId;
    if (payload.metadata) extra.metadata = payload.metadata;
    const data = Object.keys(extra).length ? JSON.stringify(extra) : null;

    try {
        // Individual creates (not createMany) so we get the created rows back and can push each over the socket.
        const created = await Promise.all(uniqueIds.map(userId =>
            prisma.notification.create({
                data: {
                    userId,
                    type:    payload.type,
                    title:   payload.title,
                    body:    payload.body,
                    linkUrl: payload.linkUrl || payload.actionUrl || null,
                    data,
                },
            }).catch(err => {
                logger.error(`[NotificationV2] notifyMany row failed for ${userId}: ${err.message}`);
                return null;
            })
        ));

        try {
            const io = require('./socketService').getIO();
            if (io) {
                created.filter(Boolean).forEach(n => io.to(String(n.userId)).emit('notification', n));
            }
        } catch (_) { /* socket not ready */ }

        logger.info(`[NotificationV2] Batch notified ${created.filter(Boolean).length} users: ${payload.type}`);
    } catch (err) {
        logger.error(`[NotificationV2] notifyMany failed: ${err.message}`);
    }
}

/**
 * Notify every ADMIN user (in-app + live socket push).
 */
async function notifyAdmins(payload) {
    try {
        const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
        await notifyMany(admins.map(a => a.id), payload);
    } catch (err) {
        logger.error(`[NotificationV2] notifyAdmins failed: ${err.message}`);
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
        select: { email: true, phone: true, fullName: true, notificationPrefs: true, pushSubscription: true },
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
            await getPushService().sendPushNotification(notification.userId, {
                title: notification.title,
                body: notification.body,
                data: {
                    actionUrl: notification.actionUrl,
                    type: notification.type
                }
            });
        }

        // Mark as delivered (no-op since Notification schema has no deliveredAt)
        // await prisma.notification.update({ where: { id: notification.id }, data: {} }).catch(() => {});

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

async function createWorkflowNotifications({ userId, orderId = null, message, type, channels = ['in_app'] }) {
    const created = [];
    for (const channel of [...new Set(channels)]) {
        const notification = await notify(userId, {
            type,
            title: type === 'repeat_purchase_reminder' ? 'Reorder Reminder' : (type === 'followed_seller_flash_deal' ? 'Flash Deal Alert' : 'Notification'),
            body: message,
            channel,
            orderId
        });
        if (notification) created.push(notification);
    }
    return created;
}

async function sendRepeatPurchaseReminder({ userId, productTitle, orderId = null }) {
    return createWorkflowNotifications({
        userId,
        orderId,
        message: `${productTitle} may be running low. Reorder now before stock tightens.`,
        type: 'repeat_purchase_reminder',
        channels: ['in_app', 'email', 'push']
    });
}

async function sendFollowedSellerDealAlert({ userId, productTitle, orderId = null }) {
    return createWorkflowNotifications({
        userId,
        orderId,
        message: `${productTitle} just went live from a seller you follow.`,
        type: 'followed_seller_flash_deal',
        channels: ['in_app', 'email', 'push']
    });
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
    notify,
    notifyMany,
    notifyAdmins,
    getUserNotifications,
    markRead,
    markAllRead,
    getUnreadCount,
    createWorkflowNotifications,
    sendRepeatPurchaseReminder,
    sendFollowedSellerDealAlert,
};
