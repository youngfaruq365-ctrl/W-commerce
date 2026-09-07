const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');
const emailService = require('./emailService');
const smsService = require('./smsService');

class NotificationService {
    constructor() {
        this.channels = {
            in_app: this.sendInApp.bind(this),
            email: this.sendEmail.bind(this),
            sms: this.sendSMS.bind(this),
            push: this.sendPush.bind(this)
        };
    }

    /**
     * Create a notification for a buyer
     * @param {Object} params - Notification parameters
     * @param {string} params.userId - Buyer ID
     * @param {string} [params.orderId] - Order ID (optional)
     * @param {string} params.message - Notification message
     * @param {string} params.type - Notification type (order_due, delivery_update, product_availability)
     * @param {string} [params.channel] - Delivery channel (defaults to 'in_app')
     */
    async createNotification({ userId, orderId, message, type, channel = 'in_app' }) {
        try {
            // Get buyer's notification preferences
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { notificationPrefs: true }
            });

            let prefs = { in_app: true };
            try {
                prefs = user?.notificationPrefs ? JSON.parse(user.notificationPrefs) : { in_app: true };
            } catch (e) {
                logger.warn(`Invalid notification prefs for user ${userId}: ${e.message}`);
            }

            // Check if channel is enabled for this buyer
            if (!prefs[channel]) {
                logger.info(`Channel ${channel} disabled for user ${userId}, skipping notification`);
                return null;
            }

            // Create notification
            const notification = await prisma.buyerNotification.create({
                data: {
                    userId,
                    orderId,
                    message,
                    type,
                    channel
                },
                include: {
                    user: {
                        select: {
                            email: true,
                            phone: true,
                            fullName: true
                        }
                    }
                }
            });

            // Attempt delivery
            try {
                await this.deliverNotification(notification);
            } catch (error) {
                logger.error(`Failed to deliver notification ${notification.id}: ${error.message}`);
            }

            return notification;
        } catch (error) {
            logger.error(`Error creating notification: ${error.message}`);
            throw error;
        }
    }

    /**
     * Deliver notification through specified channel
     */
    async deliverNotification(notification) {
        const channelHandler = this.channels[notification.channel];
        if (!channelHandler) {
            throw new Error(`Unknown channel: ${notification.channel}`);
        }

        await channelHandler(notification);

        // Mark as delivered
        await prisma.buyerNotification.update({
            where: { id: notification.id },
            data: { deliveredAt: new Date() }
        });
    }

    /**
     * Send in-app notification
     */
    async sendInApp(notification) {
        // In-app notifications are stored in the database
        // Real-time delivery will be handled by WebSocket
        logger.info(`In-app notification sent: ${notification.id}`);
    }

    /**
     * Send email notification
     */
    async sendEmail(notification) {
        if (!notification.user?.email) {
            logger.info(`Email notification skipped: ${notification.id} has no recipient email`);
            return;
        }

        await emailService.sendOrderStatusUpdate(
            notification.user.email,
            notification.user.fullName || 'Customer',
            notification.orderId || 'GlobalX',
            notification.type,
            null
        );
        logger.info(`Email notification sent: ${notification.id} to ${notification.user.email}`);
    }

    /**
     * Send SMS notification
     */
    async sendSMS(notification) {
        if (!notification.user?.phone) {
            logger.info(`SMS notification skipped: ${notification.id} has no recipient phone`);
            return;
        }

        await smsService.sendOrderStatusUpdate(
            notification.user.phone,
            notification.orderId || 'GlobalX',
            notification.type
        );
        logger.info(`SMS notification sent: ${notification.id} to ${notification.user.phone}`);
    }

    /**
     * Send push notification
     */
    async sendPush(notification) {
        if (!notification.user?.deviceToken) {
            logger.info(`Push notification skipped: ${notification.id} has no device token`);
            return;
        }

        try {
            const webpush = require('web-push');
            
            // In a real application, VAPID keys would be configured in environment variables
            const publicVapidKey = process.env.VAPID_PUBLIC_KEY || 'dummy-public-key';
            const privateVapidKey = process.env.VAPID_PRIVATE_KEY || 'dummy-private-key';
            const subject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';
            
            if (publicVapidKey !== 'dummy-public-key' && privateVapidKey !== 'dummy-private-key') {
                webpush.setVapidDetails(subject, publicVapidKey, privateVapidKey);
            }
            
            let pushSubscription;
            try {
                // Assume deviceToken is stored as JSON string representing the push subscription
                pushSubscription = JSON.parse(notification.user.deviceToken);
            } catch (e) {
                // Fallback if it's not JSON
                logger.error(`Invalid device token format for user ${notification.userId}`);
                return;
            }

            const payload = JSON.stringify({
                title: 'Notification',
                body: notification.message
            });

            await webpush.sendNotification(pushSubscription, payload);
            logger.info(`Push notification sent: ${notification.id}`);
        } catch (error) {
            logger.error(`Failed to send push notification: ${error.message}`);
        }
    }

    /**
     * Get notifications for a buyer (with pagination)
     * @param {string} userId - Buyer ID
     * @param {Object} options - Query options
     */
    async getBuyerNotifications(userId, options = {}) {
        const { limit = 50, offset = 0, unreadOnly = false, type } = options;

        const where = { userId, isVisible: true };
        if (unreadOnly) where.readStatus = false;
        if (type) where.type = type;

        const [notifications, total] = await Promise.all([
            prisma.buyerNotification.findMany({
                where,
                include: {
                    order: {
                        select: {
                            id: true,
                            status: true,
                            totalAmount: true,
                            createdAt: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset
            }),
            prisma.buyerNotification.count({ where })
        ]);

        return { notifications, total };
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId, userId) {
        const notification = await prisma.buyerNotification.findFirst({
            where: { id: notificationId, userId }
        });

        if (!notification) {
            throw new Error('Notification not found');
        }

        return await prisma.buyerNotification.update({
            where: { id: notificationId },
            data: { readStatus: true, updatedAt: new Date() }
        });
    }

    /**
     * Mark all notifications as read for a buyer
     */
    async markAllAsRead(userId) {
        return await prisma.buyerNotification.updateMany({
            where: { userId, readStatus: false },
            data: { readStatus: true, updatedAt: new Date() }
        });
    }

    /**
     * Update buyer notification preferences
     */
    async updateBuyerPreferences(userId, preferences) {
        const currentPrefs = await prisma.user.findUnique({
            where: { id: userId },
            select: { notificationPrefs: true }
        });

        let prefs = {};
        try {
            prefs = currentPrefs?.notificationPrefs ? JSON.parse(currentPrefs.notificationPrefs) : {};
        } catch (e) {
            prefs = {};
        }

        // Update with new preferences
        Object.assign(prefs, preferences);

        return await prisma.user.update({
            where: { id: userId },
            data: { notificationPrefs: JSON.stringify(prefs) }
        });
    }

    async createWorkflowNotifications({ userId, orderId = null, message, type, channels = ['in_app'] }) {
        const created = [];
        for (const channel of [...new Set(channels)]) {
            const notification = await this.createNotification({
                userId,
                orderId,
                message,
                type,
                channel
            });

            if (notification) {
                created.push(notification);
            }
        }

        return created;
    }

    async sendRepeatPurchaseReminder({ userId, productTitle, orderId = null }) {
        return this.createWorkflowNotifications({
            userId,
            orderId,
            message: `${productTitle} may be running low. Reorder now before stock tightens.`,
            type: 'repeat_purchase_reminder',
            channels: ['in_app', 'email']
        });
    }

    async sendFollowedSellerDealAlert({ userId, productTitle, orderId = null }) {
        return this.createWorkflowNotifications({
            userId,
            orderId,
            message: `${productTitle} just went live from a seller you follow.`,
            type: 'followed_seller_flash_deal',
            channels: ['in_app', 'email']
        });
    }

    /**
     * Get notification statistics for a seller's buyers
     */
    async getSellerNotificationStats(sellerId) {
        // Get all buyers for this seller
        const buyerIds = await prisma.order.findMany({
            where: { sellerId },
            select: { buyerId: true },
            distinct: ['buyerId']
        }).then(orders => orders.map(o => o.buyerId));

        if (buyerIds.length === 0) {
            return { totalNotifications: 0, unreadCount: 0, buyersWithNotifications: 0 };
        }

        const [totalNotifications, unreadCount] = await Promise.all([
            prisma.buyerNotification.count({
                where: {
                    userId: { in: buyerIds },
                    isVisible: true
                }
            }),
            prisma.buyerNotification.count({
                where: {
                    userId: { in: buyerIds },
                    readStatus: false,
                    isVisible: true
                }
            })
        ]);

        return {
            totalNotifications,
            unreadCount,
            buyersWithNotifications: buyerIds.length
        };
    }
}

module.exports = new NotificationService();
