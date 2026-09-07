const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');

exports.getPromotions = async (req, res) => {
    try {
        // 1. Get the nearest active flash sale for the hero timer
        const nearestFlashSale = await prisma.product.findFirst({
            where: {
                isFlashSale: true,
                flashEndsAt: {
                    gt: new Date()
                }
            },
            orderBy: {
                flashEndsAt: 'asc'
            },
            select: {
                title: true,
                flashEndsAt: true,
                flashPrice: true,
                price: true,
                images: true
            }
        });

        // 2. Fetch live activity logs (simulated or real from DB)
        // Let's get recent pool joins and orders
        const recentPoolJoins = await prisma.poolParticipant.findMany({
            take: 3,
            orderBy: { joinedAt: 'desc' },
            include: {
                user: { select: { fullName: true } },
                pool: { include: { product: { select: { title: true } } } }
            }
        });

        const recentOrders = await prisma.order.findMany({
            take: 3,
            orderBy: { createdAt: 'desc' },
            include: {
                buyer: { select: { fullName: true } }
            }
        });

        const activityLogs = [
            ...recentPoolJoins.map(p => `New member ${p.user.fullName} joined "${p.pool.product.title}" pool`),
            ...recentOrders.map(o => `New order placed by ${o.buyer.fullName} from ${o.currency}`)
        ];

        // Shuffle activity logs a bit or just take the top ones
        const tickerMessages = activityLogs.length > 0 ? activityLogs : [
            'GlobalX Market: Real-time commerce active',
            'Secure payments enabled via escrow'
        ];

        // 3. Get highly rated products for featured deals
        const featuredDeals = await prisma.product.findMany({
            take: 5,
            where: { rating: { gte: 4.5 } },
            include: { images: { where: { isPrimary: true }, take: 1 } },
            orderBy: { viewCount: 'desc' }
        });

        res.json({
            success: true,
            heroPromotion: nearestFlashSale ? {
                title: nearestFlashSale.title,
                endsAt: nearestFlashSale.flashEndsAt,
                discountPrice: nearestFlashSale.flashPrice,
                originalPrice: nearestFlashSale.price,
                image: (nearestFlashSale.images && nearestFlashSale.images.length > 0 && nearestFlashSale.images[0].url)
                    ? nearestFlashSale.images[0].url
                    : 'marketplace_hero_product_1769792272597.webp'
            } : null,
            tickerMessages,
            featuredDeals
        });

    } catch (error) {
        logger.error(`Marketing API Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to fetch promotions' });
    }
};

exports.createCampaign = async (req, res) => {
    try {
        const { name, budget } = req.body;
        logger.info(`Seller ${req.user.id} created campaign ${name} with budget ${budget}`);
        res.json({ success: true, message: 'Campaign launched successfully' });
    } catch (error) {
        logger.error(`Marketing API Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
