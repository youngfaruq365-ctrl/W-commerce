const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');
const cacheService = require('./cacheService');
const promoCampaignService = require('./promoCampaignService');
const analyticsService = require('../analytics/marketplaceAnalyticsService');
const notificationEngine = require('../notifications/marketplaceNotificationEngine');
const { buildDealCountdownText } = require('../models/marketplaceIntelligenceModel');

function dealPriceFromProductPrice(price, discount) {
    const basePrice = Number(price || 0);
    return Number((basePrice * (1 - (Number(discount || 0) / 100))).toFixed(2));
}

class FlashDealService {
    async activateExpiredDeals() {
        try {
            const now = new Date();
            await promoCampaignService.syncCampaignStatuses();

            const dealsToActivate = await prisma.flashDeal.findMany({
                where: {
                    isActive: false,
                    startDate: { lte: now },
                    endDate: { gt: now }
                },
                include: {
                    product: {
                        select: {
                            price: true
                        }
                    }
                }
            });

            for (const deal of dealsToActivate) {
                const flashPrice = dealPriceFromProductPrice(deal.product.price, deal.discount);

                await prisma.flashDeal.update({
                    where: { id: deal.id },
                    data: { isActive: true }
                });

                await prisma.product.update({
                    where: { id: deal.productId },
                    data: {
                        isFlashSale: true,
                        flashPrice,
                        flashEndsAt: deal.endDate
                    }
                });

                await notificationEngine.notifySellerFollowersAboutDeal({
                    ...deal,
                    promoTitle: deal.promoTitle,
                    sellerId: deal.sellerId
                });
            }

            if (dealsToActivate.length > 0) {
                await cacheService.invalidateActiveDealsCache();
            }

            return dealsToActivate.length;
        } catch (error) {
            logger.error(`FlashDealService activateExpiredDeals error: ${error.message}`);
            return 0;
        }
    }

    async deactivateExpiredDeals() {
        try {
            const now = new Date();
            const dealsToDeactivate = await prisma.flashDeal.findMany({
                where: {
                    isActive: true,
                    endDate: { lte: now }
                },
                include: {
                    product: { select: { id: true, title: true, price: true } }
                }
            });

            for (const deal of dealsToDeactivate) {
                // Check if another deal is still active for this product
                const stillActiveDeal = await prisma.flashDeal.findFirst({
                    where: {
                        productId: deal.productId,
                        id: { not: deal.id },
                        isActive: true,
                        endDate: { gt: now }
                    },
                    orderBy: { endDate: 'asc' },
                    include: { product: { select: { price: true } } }
                });

                // Reset product flash sale flags if no other deal is active
                if (stillActiveDeal) {
                    await prisma.product.update({
                        where: { id: deal.productId },
                        data: {
                            isFlashSale: true,
                            flashPrice: dealPriceFromProductPrice(stillActiveDeal.product.price, stillActiveDeal.discount),
                            flashEndsAt: stillActiveDeal.endDate
                        }
                    });
                } else {
                    await prisma.product.update({
                        where: { id: deal.productId },
                        data: {
                            isFlashSale: false,
                            flashPrice: null,
                            flashEndsAt: null
                        }
                    });
                }

                // Delete the expired deal record immediately
                await prisma.flashDeal.delete({ where: { id: deal.id } });

                // Notify the seller that their deal has expired and was removed
                try {
                    const dealLabel = deal.promoTitle || deal.product?.title || 'Your deal';
                    const promoTypeLabel = deal.promoType === 'FESTIVAL_PROMO' ? 'Festival Promo'
                        : deal.promoType === 'WEEKEND_PROMO' ? 'Weekend Promo'
                        : 'Flash Deal';
                    await notificationEngine.sendMultiChannelNotification({
                        userId: deal.sellerId,
                        title: `⏰ ${promoTypeLabel} Ended & Removed`,
                        body: `Your ${promoTypeLabel} "${dealLabel}" has expired and been removed from the storefront. Create a new deal to keep your products featured.`,
                        type: 'ALERT',
                        linkUrl: '/seller-dashboard.html?tab=flash',
                        channels: ['in_app', 'email']
                    });
                    logger.info(`[FlashDeal] Notified seller ${deal.sellerId} — deal "${deal.id}" expired & deleted`);
                } catch (notifyErr) {
                    logger.warn(`[FlashDeal] Failed to notify seller for expired deal ${deal.id}: ${notifyErr.message}`);
                }
            }

            if (dealsToDeactivate.length > 0) {
                await cacheService.invalidateActiveDealsCache();
                logger.info(`[FlashDeal] Removed ${dealsToDeactivate.length} expired deal(s)`);
            }

            return dealsToDeactivate.length;
        } catch (error) {
            logger.error(`FlashDealService deactivateExpiredDeals error: ${error.message}`);
            return 0;
        }
    }

    async resetViewerCounts() {
        try {
            await prisma.flashDeal.updateMany({
                data: { viewerCount: 0 }
            });
        } catch (error) {
            logger.error(`FlashDealService resetViewerCounts error: ${error.message}`);
        }
    }

    async getExpiringSoon(hours = 24) {
        const threshold = new Date(Date.now() + (hours * 60 * 60 * 1000));
        return prisma.flashDeal.findMany({
            where: {
                isActive: true,
                endDate: {
                    gt: new Date(),
                    lte: threshold
                }
            },
            include: {
                product: {
                    include: {
                        images: true,
                        store: true
                    }
                },
                seller: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true
                    }
                },
                campaign: true
            }
        });
    }

    async getDealsOfTheMonth() {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        return prisma.flashDeal.findMany({
            where: {
                startDate: { lte: end },
                endDate: { gte: start },
                promoType: {
                    in: ['DEAL_OF_MONTH', 'FLASH_DEAL', 'PLATFORM_CAMPAIGN', 'FESTIVAL_PROMO', 'WEEKEND_PROMO']
                }
            },
            include: {
                product: {
                    include: {
                        images: true,
                        store: true,
                        reviews: true
                    }
                },
                campaign: true
            },
            orderBy: [
                { priority: 'desc' },
                { discount: 'desc' },
                { createdAt: 'desc' }
            ]
        });
    }

    async getDealMetrics(dealId) {
        return analyticsService.getDealPerformance(dealId);
    }

    async getFlashDealsStats() {
        const now = new Date();
        const activeDeals = await prisma.flashDeal.findMany({
            where: {
                isActive: true,
                endDate: { gt: now }
            },
            include: {
                product: {
                    select: {
                        price: true
                    }
                }
            }
        });

        const totalSavings = activeDeals.reduce((sum, deal) => {
            return sum + (Number(deal.product.price || 0) * (Number(deal.discount || 0) / 100));
        }, 0);

        const expiringSoon = activeDeals.filter((deal) => (new Date(deal.endDate).getTime() - Date.now()) <= (24 * 60 * 60 * 1000)).length;
        const campaigns = await promoCampaignService.getHomepageCampaigns(8);

        return {
            activeDeals: activeDeals.length,
            expiringSoon,
            totalSavings: Number(totalSavings.toFixed(2)),
            activeCampaigns: campaigns.length
        };
    }

    async notifyExpiringDeals() {
        try {
            const expiringDeals = await this.getExpiringSoon(6);

            for (const deal of expiringDeals) {
                await notificationEngine.sendMultiChannelNotification({
                    userId: deal.sellerId,
                    title: 'Deal ending soon',
                    body: `${deal.promoTitle || deal.product.title} ${buildDealCountdownText(deal.endDate)}.`,
                    type: 'ALERT',
                    linkUrl: '/seller-dashboard.html?tab=flash',
                    buyerNotificationType: 'deal_expiring',
                    channels: ['in_app', 'email']
                });

                if (deal.isFeatured || deal.promoType !== 'FLASH_DEAL') {
                    await notificationEngine.notifySellerFollowersAboutDeal(deal);
                }
            }

            return expiringDeals.length;
        } catch (error) {
            logger.error(`FlashDealService notifyExpiringDeals error: ${error.message}`);
            return 0;
        }
    }

    async trackDealClick(dealId, userId = null, metadata = {}) {
        await prisma.flashDeal.updateMany({
            where: { id: dealId },
            data: { clicks: { increment: 1 } }
        });
        await analyticsService.trackDealClick(dealId, userId, metadata);
    }

    async trackDealConversion(dealId, userId = null, revenue = 0, metadata = {}) {
        await analyticsService.trackDealConversion(dealId, userId, revenue, metadata);
    }

    getSeasonalSuggestions(region = 'NG') {
        return promoCampaignService.getSeasonalCampaignSuggestions(region);
    }
}

module.exports = new FlashDealService();
