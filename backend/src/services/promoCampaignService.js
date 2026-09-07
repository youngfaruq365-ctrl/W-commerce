const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');
const { LOCAL_SEASONAL_CAMPAIGNS, PROMO_TYPES } = require('../models/marketplaceIntelligenceModel');

class PromoCampaignService {
    getSeasonalCampaignSuggestions(region = 'NG') {
        return LOCAL_SEASONAL_CAMPAIGNS.filter((campaign) => campaign.targetRegion === 'GLOBAL' || campaign.targetRegion === region);
    }

    async ensureCampaignForDeal({ createdById, title, promoType, bannerImage, startDate, endDate, audienceScope = 'SELLER', seasonTag = null, targetRegion = 'NG', autoSuggested = false }) {
        try {
            return await prisma.promoCampaign.create({
                data: {
                    createdById,
                    title,
                    promoType: promoType || PROMO_TYPES.FLASH_DEAL,
                    bannerImage: bannerImage || null,
                    startDate,
                    endDate,
                    audienceScope,
                    seasonTag,
                    targetRegion,
                    autoSuggested
                }
            });
        } catch (error) {
            logger.error(`Ensure campaign for deal error: ${error.message}`);
            return null;
        }
    }

    async syncCampaignStatuses() {
        const now = new Date();

        await prisma.promoCampaign.updateMany({
            where: {
                startDate: { lte: now },
                endDate: { gt: now }
            },
            data: { status: 'ACTIVE' }
        });

        await prisma.promoCampaign.updateMany({
            where: {
                endDate: { lte: now }
            },
            data: { status: 'EXPIRED' }
        });
    }

    async getHomepageCampaigns(limit = 6) {
        await this.syncCampaignStatuses();
        return prisma.promoCampaign.findMany({
            where: {
                status: 'ACTIVE'
            },
            orderBy: [
                { priority: 'desc' },
                { startDate: 'asc' }
            ],
            take: limit
        });
    }
}

module.exports = new PromoCampaignService();
