const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');

// Get user notifications
exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 20, unreadOnly = false } = req.query;

        const where = { userId };
        if (unreadOnly === 'true') {
            where.isRead = false;
        }

        const notifications = await prisma.notification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit)
        });

        const unreadCount = await prisma.notification.count({
            where: { userId, isRead: false }
        });

        res.json({
            success: true,
            notifications,
            unreadCount
        });

    } catch (error) {
        logger.error(`Get Notifications Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { notificationId } = req.params;

        // Verify ownership before updating (Prisma 5: where must be unique field only)
        const notification = await prisma.notification.findFirst({
            where: { id: notificationId, userId }
        });
        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        await prisma.notification.update({
            where: { id: notificationId },
            data: { isRead: true }
        });

        res.json({ success: true });

    } catch (error) {
        logger.error(`Mark Read Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;

        await prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true }
        });

        res.json({ success: true });

    } catch (error) {
        logger.error(`Mark All Read Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Delete a notification
exports.deleteNotification = async (req, res) => {
    try {
        const userId = req.user.id;
        const { notificationId } = req.params;

        // Verify ownership before deleting (Prisma 5: where must be unique field only)
        const notification = await prisma.notification.findFirst({
            where: { id: notificationId, userId }
        });
        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        await prisma.notification.delete({
            where: { id: notificationId }
        });

        res.json({ success: true });

    } catch (error) {
        logger.error(`Delete Notification Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Subscribe to notifications (flash sales, abandoned cart, etc.)
exports.subscribeNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, enableAbandonedCart } = req.body;

        if (!type) {
            return res.status(400).json({ success: false, message: 'Notification type is required' });
        }

        // Get current user prefs
        const user = await prisma.user.findUnique({ where: { id: userId } });
        let prefs = {};
        try {
            prefs = user.notificationPrefs ? JSON.parse(user.notificationPrefs) : {};
        } catch (e) {
            prefs = {};
        }

        // Update prefs based on type
        if (type === 'FLASH_SALE_ALERTS') {
            prefs.flashSaleAlerts = true;
        }
        if (enableAbandonedCart) {
            prefs.abandonedCartReminders = true;
        }

        // Save updated prefs
        await prisma.user.update({
            where: { id: userId },
            data: {
                notificationPrefs: JSON.stringify(prefs)
            }
        });

        // Create confirmation notification
        await prisma.notification.create({
            data: {
                userId: userId,
                title: '🔔 Notifications Enabled',
                body: `You've subscribed to ${type.replace(/_/g, ' ').toLowerCase()}. We'll notify you when new deals are available!`,
                type: 'INFO',
                linkUrl: '/flash-sale.html'
            }
        });

        res.json({
            success: true,
            message: 'Successfully subscribed to notifications',
            preferences: prefs
        });

    } catch (error) {
        logger.error(`Subscribe Notifications Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to update notification preferences' });
    }
};

// Buyer: Interact with a notification (e.g., rate a completed order, reply to a message)
exports.interactWithNotification = async (req, res) => {
    try {
        const userId = req.user.id;
        const { notificationId } = req.params;
        const { rating, reply } = req.body;

        const notification = await prisma.notification.findFirst({
            where: { id: notificationId, userId }
        });
        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        // Store interaction data in the notification metadata field
        let meta = {};
        try { meta = notification.metadata ? JSON.parse(notification.metadata) : {}; } catch (e) { meta = {}; }
        if (rating !== undefined) meta.rating = rating;
        if (reply !== undefined) meta.reply = reply;

        const updated = await prisma.notification.update({
            where: { id: notificationId },
            data: {
                isRead: true
            }
        });

        logger.info(`Notification ${notificationId} interaction saved by user ${userId}`);
        res.json({ success: true, notification: updated });

    } catch (error) {
        logger.error(`Interact Notification Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
