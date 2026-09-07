const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

/**
 * Create a notification for a buyer
 * This would typically be called by internal services
 */
exports.createNotification = async (req, res) => {
    try {
        const { userId, orderId, message, type, channel } = req.body;

        // Basic validation
        if (!userId || !message || !type) {
            return res.status(400).json({
                success: false,
                message: 'userId, message, and type are required'
            });
        }

        const notification = await notificationService.createNotification({
            userId,
            orderId,
            message,
            type,
            channel
        });

        res.json({
            success: true,
            notification: {
                id: notification.id,
                userId: notification.userId,
                message: notification.message,
                type: notification.type,
                channel: notification.channel,
                createdAt: notification.createdAt
            }
        });

    } catch (error) {
        logger.error(`Create Notification Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Mark notification as read
 */
exports.markAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user.id; // This should be the buyer, but for seller dashboard we'll handle differently

        // For seller dashboard, we need to verify the seller has access to this buyer's notifications
        const notification = await require('../utils/prismaClient').buyerNotification.findUnique({
            where: { id: notificationId },
            include: {
                user: {
                    select: {
                        orders: {
                            where: { sellerId: req.user.id },
                            select: { id: true },
                            take: 1
                        }
                    }
                }
            }
        });

        if (!notification || notification.user.orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found or access denied'
            });
        }

        await notificationService.markAsRead(notificationId, notification.userId);

        res.json({ success: true });

    } catch (error) {
        logger.error(`Mark As Read Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Mark all notifications as read for a buyer
 */
exports.markAllAsRead = async (req, res) => {
    try {
        const { buyerId } = req.params;
        const sellerId = req.user.id;

        // Verify seller has access to this buyer
        const buyerExists = await require('../utils/prismaClient').order.findFirst({
            where: {
                buyerId,
                sellerId
            }
        });

        if (!buyerExists) {
            return res.status(404).json({
                success: false,
                message: 'Buyer not found or access denied'
            });
        }

        await notificationService.markAllAsRead(buyerId);

        res.json({ success: true });

    } catch (error) {
        logger.error(`Mark All As Read Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Get real-time notification stream for seller
 * This would be used for WebSocket/SSE streaming
 */
exports.getNotificationStream = async (req, res) => {
    try {
        // This is a placeholder for WebSocket/SSE implementation
        // In a real implementation, this would establish a streaming connection

        res.json({
            success: true,
            message: 'Notification stream endpoint - implement WebSocket/SSE'
        });
    } catch (error) {
        logger.error(`Get Notification Stream Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Get notification statistics for seller dashboard
 */
exports.getSellerNotificationStats = async (req, res) => {
    try {
        const sellerId = req.user.id;

        const stats = await notificationService.getSellerNotificationStats(sellerId);

        res.json({
            success: true,
            stats
        });

    } catch (error) {
        logger.error(`Get Seller Notification Stats Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};