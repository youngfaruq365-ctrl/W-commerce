const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');
const notificationService = require('../services/notificationV2Service');
const buyerIntelligenceService = require('../services/buyerIntelligenceService');

function formatOrderForSeller(order, sellerId) {
    const sellerItems = order.items.filter((item) => item.product?.store?.sellerId === sellerId);
    const total = sellerItems.reduce((sum, item) => sum + (Number(item.priceAtTime || 0) * item.quantity), 0);

    return {
        id: order.id,
        date: order.createdAt,
        status: order.status,
        total,
        itemSummaries: sellerItems.map((item) => ({
            productId: item.product.id,
            title: item.product.title,
            quantity: item.quantity,
            price: Number(item.priceAtTime || 0),
            category: item.product.category,
            image: item.product.images?.[0]?.url || null
        }))
    };
}

exports.getSellerBuyers = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const insights = await buyerIntelligenceService.getSellerBuyerInsights(sellerId);

        const buyers = insights.profiles.map((profile) => ({
            buyerId: profile.buyerId,
            name: profile.buyer?.fullName || profile.buyer?.email || 'Buyer',
            email: profile.buyer?.email || '',
            phone: profile.buyer?.phone || '',
            totalSpent: Number(profile.totalSpend || 0),
            orderCount: profile.totalOrders,
            lastOrderDate: profile.lastOrderAt,
            favoriteCategories: profile.favoriteCategories || [],
            intelligenceScore: profile.intelligenceScore,
            intelligenceLabels: profile.intelligenceLabels || [],
            suggestedActions: profile.suggestedActions || []
        }));

        res.json({
            success: true,
            buyers,
            segments: {
                bestBuyers: insights.bestBuyers.map((profile) => profile.buyerId),
                repeatCustomers: insights.repeatCustomers.map((profile) => profile.buyerId),
                highValueBuyers: insights.highValueBuyers.map((profile) => profile.buyerId),
                bulkOpportunities: insights.bulkOpportunities.map((profile) => profile.buyerId)
            }
        });
    } catch (error) {
        logger.error(`Get Seller Buyers Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getBuyerOrders = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { buyerId } = req.params;
        const { limit = 20, offset = 0, status, startDate, endDate } = req.query;

        const where = {
            buyerId,
            items: {
                some: {
                    product: {
                        store: {
                            sellerId
                        }
                    }
                }
            }
        };

        if (status) where.status = status;
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        const [orders, total, intelligence] = await Promise.all([
            prisma.order.findMany({
                where,
                include: {
                    items: {
                        include: {
                            product: {
                                include: {
                                    store: true,
                                    images: {
                                        where: { isPrimary: true },
                                        select: { url: true },
                                        take: 1
                                    }
                                }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: Number(limit),
                skip: Number(offset)
            }),
            prisma.order.count({ where }),
            buyerIntelligenceService.getBuyerProfileForSeller(sellerId, buyerId)
        ]);

        res.json({
            success: true,
            orders: orders.map((order) => formatOrderForSeller(order, sellerId)),
            intelligence,
            pagination: {
                total,
                limit: Number(limit),
                offset: Number(offset)
            }
        });
    } catch (error) {
        logger.error(`Get Buyer Orders Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getBuyerNotifications = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { buyerId } = req.params;

        const buyerExists = await prisma.order.findFirst({
            where: {
                buyerId,
                items: {
                    some: {
                        product: {
                            store: {
                                sellerId
                            }
                        }
                    }
                }
            }
        });

        if (!buyerExists) {
            return res.status(404).json({
                success: false,
                message: 'Buyer not found or no orders with this seller'
            });
        }

        const { notifications, total } = await notificationService.getBuyerNotifications(buyerId, req.query);

        res.json({
            success: true,
            notifications: notifications.map((notification) => ({
                notificationId: notification.id,
                message: notification.message,
                type: notification.type,
                channel: notification.channel,
                readStatus: notification.readStatus,
                createdAt: notification.createdAt,
                deliveredAt: notification.deliveredAt,
                orderId: notification.orderId
            })),
            total
        });
    } catch (error) {
        logger.error(`Get Buyer Notifications Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.updateBuyerNotificationPrefs = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { buyerId } = req.params;
        const { preferences } = req.body;

        const buyerExists = await prisma.order.findFirst({
            where: {
                buyerId,
                items: {
                    some: {
                        product: {
                            store: {
                                sellerId
                            }
                        }
                    }
                }
            }
        });

        if (!buyerExists) {
            return res.status(404).json({
                success: false,
                message: 'Buyer not found or no orders with this seller'
            });
        }

        await notificationService.updateBuyerPreferences(buyerId, preferences);

        res.json({
            success: true,
            message: 'Notification preferences updated'
        });
    } catch (error) {
        logger.error(`Update Buyer Notification Prefs Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getBuyerIntelligence = async (req, res) => {
    try {
        const profile = await buyerIntelligenceService.getBuyerProfileForSeller(req.user.id, req.params.buyerId);
        if (!profile) {
            return res.status(404).json({ success: false, message: 'Buyer profile not found.' });
        }

        res.json({
            success: true,
            profile
        });
    } catch (error) {
        logger.error(`Get Buyer Intelligence Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getSellerBuyerSummary = async (req, res) => {
    try {
        const insights = await buyerIntelligenceService.getSellerBuyerInsights(req.user.id);

        res.json({
            success: true,
            summary: {
                totalBuyers: insights.profiles.length,
                repeatCustomers: insights.repeatCustomers.length,
                highValueBuyers: insights.highValueBuyers.length,
                bulkOpportunities: insights.bulkOpportunities.length,
                bestBuyers: insights.bestBuyers.slice(0, 5).map((profile) => ({
                    buyerId: profile.buyerId,
                    name: profile.buyer?.fullName || profile.buyer?.email || 'Buyer',
                    intelligenceScore: profile.intelligenceScore,
                    intelligenceLabels: profile.intelligenceLabels
                }))
            }
        });
    } catch (error) {
        logger.error(`Get Seller Buyer Summary Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.setDefaultAddress = async (req, res) => {
    try {
        const userId = req.user.id;
        const addressId = req.params.id || req.params.addressId;

        await prisma.address.updateMany({
            where: { userId },
            data: { isDefault: false }
        });

        await prisma.address.update({
            where: { id: addressId, userId },
            data: { isDefault: true }
        });

        res.json({
            success: true,
            message: 'Default address updated'
        });
    } catch (error) {
        logger.error(`Set Default Address Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
