const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');

class MarketplaceAnalyticsService {
    async trackEvent({ userId = null, eventType, entityType, entityId, metadata = null }) {
        try {
            if (!eventType || !entityType || !entityId) {
                return null;
            }

            return await prisma.marketplaceAnalyticsEvent.create({
                data: {
                    userId: userId || null,
                    eventType,
                    entityType,
                    entityId,
                    metadata: metadata ? JSON.stringify(metadata) : null
                }
            });
        } catch (error) {
            logger.error(`Marketplace analytics trackEvent error: ${error.message}`);
            return null;
        }
    }

    async trackDealClick(dealId, userId = null, metadata = {}) {
        await this.trackEvent({
            userId,
            eventType: 'deal_click',
            entityType: 'FLASH_DEAL',
            entityId: dealId,
            metadata
        });

        await prisma.flashDeal.updateMany({
            where: { id: dealId },
            data: { clicks: { increment: 1 } }
        });
    }

    async trackDealConversion(dealId, userId = null, revenue = 0, metadata = {}) {
        await this.trackEvent({
            userId,
            eventType: 'deal_conversion',
            entityType: 'FLASH_DEAL',
            entityId: dealId,
            metadata: { ...metadata, revenue }
        });

        await prisma.flashDeal.updateMany({
            where: { id: dealId },
            data: {
                conversions: { increment: 1 },
                revenue: { increment: Number(revenue || 0) }
            }
        });
    }

    async trackRecommendationAction({ userId = null, productId, surface, action }) {
        return this.trackEvent({
            userId,
            eventType: `recommendation_${action}`,
            entityType: 'PRODUCT',
            entityId: productId,
            metadata: { surface }
        });
    }

    async getDealPerformance(dealId) {
        const deal = await prisma.flashDeal.findUnique({
            where: { id: dealId },
            include: {
                product: {
                    select: {
                        title: true,
                        price: true
                    }
                }
            }
        });

        if (!deal) {
            return null;
        }

        const ctr = deal.viewerCount > 0 ? (deal.clicks / deal.viewerCount) * 100 : 0;
        const conversionRate = deal.clicks > 0 ? (deal.conversions / deal.clicks) * 100 : 0;

        return {
            id: deal.id,
            title: deal.promoTitle || deal.product.title,
            promoType: deal.promoType,
            clicks: deal.clicks,
            conversions: deal.conversions,
            revenue: Number(deal.revenue || 0),
            viewerCount: deal.viewerCount,
            ctr: Number(ctr.toFixed(2)),
            conversionRate: Number(conversionRate.toFixed(2))
        };
    }
}

module.exports = new MarketplaceAnalyticsService();
