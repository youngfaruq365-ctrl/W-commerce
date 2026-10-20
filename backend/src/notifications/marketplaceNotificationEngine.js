const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');

class MarketplaceNotificationEngine {
    async sendMultiChannelNotification({
        userId,
        title,
        body,
        type = 'INFO',
        linkUrl = null,
        data = null,
        orderId = null,
        buyerNotificationType = null,
        channels = ['in_app']
    }) {
        const uniqueChannels = [...new Set(Array.isArray(channels) ? channels : ['in_app'])];

        const created = [];
        for (const channel of uniqueChannels) {
            if (channel === 'in_app') {
                created.push(await prisma.notification.create({
                    data: {
                        userId,
                        title,
                        body,
                        type,
                        linkUrl,
                        data: data ? (typeof data === 'string' ? data : JSON.stringify(data)) : null
                    }
                }));
            }

            if (buyerNotificationType) {
                created.push(await prisma.buyerNotification.create({
                    data: {
                        userId,
                        orderId,
                        message: body,
                        type: buyerNotificationType,
                        channel
                    }
                }));
            }
        }

        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    email: true,
                    phone: true,
                    fullName: true
                }
            });

            if (user?.email && uniqueChannels.includes('email')) {
                await emailService.sendOrderStatusUpdate(user.email, user.fullName || 'Customer', orderId || 'GlobalX', title, null);
            }

            if (user?.phone && uniqueChannels.includes('sms')) {
                await smsService.sendOrderStatusUpdate(user.phone, orderId || 'GlobalX', title);
            }
        } catch (error) {
            logger.error(`Marketplace notification channel delivery error: ${error.message}`);
        }

        return created;
    }

    async notifySellerFollowersAboutDeal(deal) {
        const followers = await prisma.sellerFollow.findMany({
            where: { sellerId: deal.sellerId },
            select: { buyerId: true }
        });

        if (followers.length === 0) {
            return 0;
        }

        for (const follower of followers) {
            await this.sendMultiChannelNotification({
                userId: follower.buyerId,
                title: deal.promoTitle || 'New seller deal',
                body: `${deal.promoTitle || 'A seller you follow'} is now live. Limited stock and limited time.`,
                type: 'ALERT',
                linkUrl: `/product.html?id=${deal.productId}`,
                buyerNotificationType: 'flash_deal_followed_seller',
                channels: ['in_app', 'email']
            });
        }

        return followers.length;
    }

    async notifyPackingEscalation({ buyerId, sellerId, orderId }) {
        await this.sendMultiChannelNotification({
            userId: buyerId,
            title: 'Issue escalated to dispute center',
            body: `Order #${String(orderId).substring(0, 8)} has been escalated because the seller did not respond within 24 hours.`,
            type: 'ALERT',
            linkUrl: `/dispute.html?orderId=${orderId}`,
            orderId,
            buyerNotificationType: 'packing_escalated',
            channels: ['in_app', 'email']
        });

        await this.sendMultiChannelNotification({
            userId: sellerId,
            title: 'Packing issue escalated',
            body: `Order #${String(orderId).substring(0, 8)} has been escalated to dispute review.`,
            type: 'ALERT',
            linkUrl: `/seller-dashboard.html?tab=packing`,
            orderId,
            buyerNotificationType: 'packing_escalated',
            channels: ['in_app']
        });
    }
}

module.exports = new MarketplaceNotificationEngine();
