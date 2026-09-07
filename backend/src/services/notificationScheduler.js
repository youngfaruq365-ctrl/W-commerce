const prisma = require('../utils/prismaClient');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');
const repeatPurchaseService = require('./repeatPurchaseService');

class NotificationScheduler {
    /**
     * Check for orders due within the next 48 hours and create notifications
     */
    async checkOrderDueDates() {
        try {
            const now = new Date();
            const dueThreshold = new Date(now.getTime() + (48 * 60 * 60 * 1000)); // 48 hours from now

            // Find orders that are due within the threshold and haven't been notified recently
            const dueOrders = await prisma.order.findMany({
                where: {
                    status: {
                        in: ['PENDING', 'PAID', 'SHIPPED'] // Orders that are still active
                    },
                    escrowReleaseAt: {
                        lte: dueThreshold,
                        gt: now
                    }
                },
                include: {
                    buyer: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true
                        }
                    }
                }
            });

            logger.info(`Found ${dueOrders.length} orders due within 48 hours`);

            for (const order of dueOrders) {
                // Check if we've already notified about this order recently
                const existingNotification = await prisma.buyerNotification.findFirst({
                    where: {
                        userId: order.buyerId,
                        orderId: order.id,
                        type: 'order_due',
                        createdAt: {
                            gte: new Date(now.getTime() - (24 * 60 * 60 * 1000)) // Within last 24 hours
                        }
                    }
                });

                if (!existingNotification) {
                    const hoursUntilDue = Math.round((order.escrowReleaseAt.getTime() - now.getTime()) / (60 * 60 * 1000));
                    const message = `Your order #${order.id.substring(0, 8)} is due for release in ${hoursUntilDue} hours. Funds will be automatically released to the seller.`;

                    await notificationService.createNotification({
                        userId: order.buyerId,
                        orderId: order.id,
                        message,
                        type: 'order_due'
                    });

                    logger.info(`Created order due notification for order ${order.id}`);
                }
            }
        } catch (error) {
            logger.error(`Error checking order due dates: ${error.message}`);
        }
    }

    /**
     * Check for delivery status updates and create notifications
     */
    async checkDeliveryUpdates() {
        try {
            // Find recent tracking events that might need buyer notification
            const recentTrackingEvents = await prisma.trackingEvent.findMany({
                where: {
                    createdAt: {
                        gte: new Date(Date.now() - (60 * 60 * 1000)) // Last hour
                    }
                },
                include: {
                    order: {
                        include: {
                            buyer: {
                                select: {
                                    id: true,
                                    fullName: true,
                                    email: true
                                }
                            }
                        }
                    }
                }
            });

            for (const event of recentTrackingEvents) {
                const order = event.order;
                if (!order) continue;

                // Check if we've already notified about this specific status update
                const existingNotification = await prisma.buyerNotification.findFirst({
                    where: {
                        userId: order.buyerId,
                        orderId: order.id,
                        type: 'delivery_update',
                        message: {
                            contains: event.status // Simple check - in production might want more sophisticated matching
                        },
                        createdAt: {
                            gte: new Date(Date.now() - (24 * 60 * 60 * 1000)) // Within last 24 hours
                        }
                    }
                });

                if (!existingNotification) {
                    let message = `Order #${order.id.substring(0, 8)}: ${event.status}`;

                    if (event.location) {
                        message += ` - Location: ${event.location}`;
                    }

                    if (event.description) {
                        message += ` - ${event.description}`;
                    }

                    await notificationService.createNotification({
                        userId: order.buyerId,
                        orderId: order.id,
                        message,
                        type: 'delivery_update'
                    });

                    logger.info(`Created delivery update notification for order ${order.id}`);
                }
            }
        } catch (error) {
            logger.error(`Error checking delivery updates: ${error.message}`);
        }
    }

    /**
     * Check for product availability changes and notify interested buyers
     */
    async checkProductAvailability() {
        try {
            // This would be more complex in a real implementation
            // For now, just log that this feature is available
            logger.info('Product availability check - feature available for implementation');
        } catch (error) {
            logger.error(`Error checking product availability: ${error.message}`);
        }
    }

    /**
     * Remind buyers to replenish products they previously purchased.
     */
    async checkRepeatPurchaseReminders() {
        try {
            const reminders = await repeatPurchaseService.getDueReminderPayloads();

            for (const reminder of reminders) {
                const existingReminder = await prisma.buyerNotification.findFirst({
                    where: {
                        userId: reminder.buyerId,
                        type: 'repeat_purchase_reminder'
                    }
                });

                if (existingReminder) {
                    continue;
                }

                await notificationService.sendRepeatPurchaseReminder({
                    userId: reminder.buyerId,
                    productTitle: reminder.productTitle
                });
            }
        } catch (error) {
            logger.error(`Error checking repeat purchase reminders: ${error.message}`);
        }
    }

    /**
     * Run all notification checks
     */
    async runAllChecks() {
        logger.info('Running notification scheduler checks');

        await Promise.all([
            this.checkOrderDueDates(),
            this.checkDeliveryUpdates(),
            this.checkProductAvailability(),
            this.checkRepeatPurchaseReminders()
        ]);

        logger.info('Notification scheduler checks completed');
    }
}

module.exports = new NotificationScheduler();
