const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');
const flashDealService = require('../services/flashDealService');
const promoCampaignService = require('../services/promoCampaignService');

function priceToNumber(value) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
}

function buildDealMeta(deal) {
    const originalPrice = priceToNumber(deal.product?.price);
    const dealPrice = Number((originalPrice * (1 - (Number(deal.discount || 0) / 100))).toFixed(2));
    const timeLeft = Math.max(0, new Date(deal.endDate).getTime() - Date.now());
    const stockLeft = deal.maxStock == null ? null : Math.max(0, Number(deal.maxStock) - Number(deal.soldCount || 0));

    return {
        ...deal,
        originalPrice,
        dealPrice,
        timeLeft,
        stockLeft,
        countdownText: `Ends in ${Math.floor(timeLeft / (1000 * 60 * 60))}h ${Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))}m`,
        isExpiringSoon: timeLeft > 0 && timeLeft <= (24 * 60 * 60 * 1000)
    };
}

async function getOwnedProduct(productId, sellerId) {
    return prisma.product.findFirst({
        where: {
            id: productId,
            store: {
                sellerId
            }
        },
        include: {
            store: true,
            images: true
        }
    });
}

exports.createFlashDeal = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const {
            productId,
            discount,
            startDate,
            endDate,
            maxStock,
            promoType = 'FLASH_DEAL',
            promoTitle,
            bannerImage,
            targetRegion = 'NG',
            isFeatured = false,
            priority = 0
        } = req.body;

        const numericDiscount = Number(discount);
        if (!productId || !Number.isFinite(numericDiscount) || numericDiscount <= 0 || numericDiscount > 95) {
            return res.status(400).json({ success: false, message: 'A valid product and discount are required.' });
        }

        const product = await getOwnedProduct(productId, sellerId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found or not owned by seller.' });
        }

        const startsAt = startDate ? new Date(startDate) : new Date();
        const endsAt = endDate ? new Date(endDate) : new Date(Date.now() + (72 * 60 * 60 * 1000));

        if (endsAt <= startsAt) {
            return res.status(400).json({ success: false, message: 'End date must be after start date.' });
        }

        const overlappingDeal = await prisma.flashDeal.findFirst({
            where: {
                productId,
                sellerId,
                OR: [
                    {
                        startDate: { lte: endsAt },
                        endDate: { gte: startsAt }
                    }
                ]
            }
        });

        if (overlappingDeal) {
            return res.status(400).json({ success: false, message: 'There is already an overlapping deal for this product.' });
        }

        const campaign = await promoCampaignService.ensureCampaignForDeal({
            createdById: sellerId,
            title: promoTitle || `${product.title} ${promoType.replace(/_/g, ' ')}`,
            promoType,
            bannerImage,
            startDate: startsAt,
            endDate: endsAt,
            audienceScope: req.user.role === 'ADMIN' ? 'PLATFORM' : 'SELLER',
            targetRegion
        });

        const flashDealData = {
            campaignId: campaign?.id || null,
            discount: numericDiscount,
            promoType,
            promoTitle: promoTitle || product.title,
            bannerImage: bannerImage || product.images?.[0]?.url || null,
            startDate: startsAt,
            endDate: endsAt,
            maxStock: maxStock ? Number(maxStock) : null,
            isActive: startsAt <= new Date() && endsAt > new Date(),
            isFeatured: Boolean(isFeatured),
            targetRegion,
            priority: Number(priority || 0)
        };

        const flashDeal = await prisma.flashDeal.upsert({
            where: {
                sellerId_productId: {
                    sellerId,
                    productId
                }
            },
            update: flashDealData,
            create: {
                productId,
                sellerId,
                ...flashDealData
            },
            include: {
                product: {
                    include: {
                        store: true,
                        images: true
                    }
                },
                campaign: true
            }
        });

        res.status(201).json({
            success: true,
            flashDeal: buildDealMeta(flashDeal),
            seasonalSuggestions: flashDealService.getSeasonalSuggestions(targetRegion)
        });
    } catch (error) {
        logger.error(`Create Flash Deal Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getSellerFlashDeals = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { status = 'all' } = req.query;
        const now = new Date();

        const where = { sellerId };
        if (status === 'active') {
            where.isActive = true;
            where.endDate = { gt: now };
        } else if (status === 'upcoming') {
            where.startDate = { gt: now };
        } else if (status === 'expired') {
            where.endDate = { lte: now };
        }

        const flashDeals = await prisma.flashDeal.findMany({
            where,
            include: {
                product: {
                    include: {
                        store: true,
                        images: true,
                        reviews: {
                            select: { rating: true }
                        }
                    }
                },
                campaign: true
            },
            orderBy: [
                { priority: 'desc' },
                { createdAt: 'desc' }
            ]
        });

        res.json({
            success: true,
            flashDeals: flashDeals.map(buildDealMeta),
            seasonalSuggestions: flashDealService.getSeasonalSuggestions('NG')
        });
    } catch (error) {
        logger.error(`Get Seller Flash Deals Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.updateFlashDeal = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { id } = req.params;
        const existingDeal = await prisma.flashDeal.findFirst({
            where: { id, sellerId },
            include: { campaign: true }
        });

        if (!existingDeal) {
            return res.status(404).json({ success: false, message: 'Flash deal not found.' });
        }

        const data = {};
        if (req.body.discount !== undefined) data.discount = Number(req.body.discount);
        if (req.body.startDate) data.startDate = new Date(req.body.startDate);
        if (req.body.endDate) data.endDate = new Date(req.body.endDate);
        if (req.body.maxStock !== undefined) data.maxStock = req.body.maxStock === null || req.body.maxStock === '' ? null : Number(req.body.maxStock);
        if (req.body.promoType) data.promoType = String(req.body.promoType);
        if (req.body.promoTitle !== undefined) data.promoTitle = String(req.body.promoTitle || '');
        if (req.body.bannerImage !== undefined) data.bannerImage = req.body.bannerImage || null;
        if (req.body.targetRegion !== undefined) data.targetRegion = req.body.targetRegion || null;
        if (req.body.isFeatured !== undefined) data.isFeatured = Boolean(req.body.isFeatured);
        if (req.body.priority !== undefined) data.priority = Number(req.body.priority || 0);

        const updated = await prisma.flashDeal.update({
            where: { id },
            data,
            include: {
                product: {
                    include: {
                        store: true,
                        images: true,
                        reviews: {
                            select: { rating: true }
                        }
                    }
                },
                campaign: true
            }
        });

        if (updated.campaignId) {
            await prisma.promoCampaign.updateMany({
                where: { id: updated.campaignId },
                data: {
                    title: updated.promoTitle || existingDeal.campaign?.title || updated.product.title,
                    promoType: updated.promoType,
                    bannerImage: updated.bannerImage,
                    startDate: updated.startDate,
                    endDate: updated.endDate,
                    targetRegion: updated.targetRegion
                }
            });
        }

        res.json({ success: true, flashDeal: buildDealMeta(updated) });
    } catch (error) {
        logger.error(`Update Flash Deal Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.deleteFlashDeal = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { id } = req.params;

        const existingDeal = await prisma.flashDeal.findFirst({
            where: { id, sellerId }
        });

        if (!existingDeal) {
            return res.status(404).json({ success: false, message: 'Flash deal not found.' });
        }

        await prisma.flashDeal.delete({ where: { id } });
        res.json({ success: true, message: 'Flash deal deleted successfully.' });
    } catch (error) {
        logger.error(`Delete Flash Deal Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getActiveFlashDeals = async (req, res) => {
    try {
        const limit = Number(req.query.limit || 12);
        const flashDeals = await prisma.flashDeal.findMany({
            where: {
                isActive: true,
                endDate: { gt: new Date() }
            },
            include: {
                product: {
                    include: {
                        store: true,
                        images: true,
                        reviews: {
                            select: { rating: true }
                        }
                    }
                },
                campaign: true
            },
            orderBy: [
                { priority: 'desc' },
                { discount: 'desc' },
                { createdAt: 'desc' }
            ],
            take: limit
        });

        res.json({
            success: true,
            flashDeals: flashDeals.map(buildDealMeta),
            campaigns: await promoCampaignService.getHomepageCampaigns(6)
        });
    } catch (error) {
        logger.error(`Get Active Flash Deals Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getDealsStats = async (req, res) => {
    try {
        const stats = await flashDealService.getFlashDealsStats();
        res.json({ success: true, stats });
    } catch (error) {
        logger.error(`Get Deals Stats Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getFlashDeal = async (req, res) => {
    try {
        const { id } = req.params;
        const flashDeal = await prisma.flashDeal.findUnique({
            where: { id },
            include: {
                product: {
                    include: {
                        store: true,
                        images: true,
                        reviews: true
                    }
                },
                seller: {
                    select: {
                        id: true,
                        fullName: true,
                        avatarUrl: true
                    }
                },
                campaign: true
            }
        });

        if (!flashDeal) {
            return res.status(404).json({ success: false, message: 'Flash deal not found.' });
        }

        res.json({
            success: true,
            flashDeal: buildDealMeta(flashDeal)
        });
    } catch (error) {
        logger.error(`Get Flash Deal Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.trackFlashDealView = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.flashDeal.updateMany({
            where: { id },
            data: { viewerCount: { increment: 1 } }
        });
        res.json({ success: true });
    } catch (error) {
        logger.error(`Track Flash Deal View Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.trackFlashDealClick = async (req, res) => {
    try {
        const { id } = req.params;
        await flashDealService.trackDealClick(id, req.user?.id || null, {
            source: req.body.source || 'deals_page'
        });
        res.json({ success: true });
    } catch (error) {
        logger.error(`Track Flash Deal Click Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.recordFlashDealSale = async (req, res) => {
    try {
        const { id } = req.params;
        const quantity = Number(req.body.quantity || 1);
        const revenue = Number(req.body.revenue || 0);

        await prisma.flashDeal.updateMany({
            where: { id },
            data: {
                soldCount: { increment: quantity },
                conversions: { increment: 1 },
                revenue: { increment: revenue }
            }
        });

        await flashDealService.trackDealConversion(id, req.user?.id || null, revenue, {
            quantity
        });

        res.json({ success: true });
    } catch (error) {
        logger.error(`Record Flash Deal Sale Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getDealsForPagination = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 12,
            sort = 'createdAt',
            order = 'desc',
            status = 'all',
            search = ''
        } = req.query;

        const offset = (Number(page) - 1) * Number(limit);
        const now = new Date();
        const where = {};

        if (status === 'active') {
            where.isActive = true;
            where.endDate = { gt: now };
        } else if (status === 'upcoming') {
            where.startDate = { gt: now };
        } else if (status === 'expired') {
            where.endDate = { lte: now };
        } else {
            where.endDate = { gt: now };
        }

        if (search) {
            where.OR = [
                { promoTitle: { contains: search } },
                { product: { title: { contains: search } } },
                { campaign: { title: { contains: search } } }
            ];
        }

        const allowedSorts = new Set(['createdAt', 'startDate', 'endDate', 'discount', 'priority']);
        const orderBy = {};
        orderBy[allowedSorts.has(sort) ? sort : 'createdAt'] = order === 'asc' ? 'asc' : 'desc';

        const [deals, total] = await Promise.all([
            prisma.flashDeal.findMany({
                where,
                include: {
                    product: {
                        include: {
                            store: true,
                            images: true,
                            reviews: {
                                select: { rating: true }
                            }
                        }
                    },
                    campaign: true
                },
                orderBy,
                skip: offset,
                take: Number(limit)
            }),
            prisma.flashDeal.count({ where })
        ]);

        res.json({
            success: true,
            deals: deals.map(buildDealMeta),
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.max(1, Math.ceil(total / Number(limit)))
            }
        });
    } catch (error) {
        logger.error(`Get Deals For Pagination Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getSeasonalSuggestions = async (req, res) => {
    try {
        const region = req.query.region || 'NG';
        res.json({
            success: true,
            suggestions: flashDealService.getSeasonalSuggestions(region)
        });
    } catch (error) {
        logger.error(`Get Seasonal Suggestions Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
