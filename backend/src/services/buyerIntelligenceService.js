const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');
const {
    computeBuyerIntelligence,
    parseJsonList,
    priceToNumber,
    serializeJsonList
} = require('../models/marketplaceIntelligenceModel');

function buildFavoriteCategories(orderItems) {
    const categoryCounts = new Map();
    orderItems.forEach((item) => {
        const category = item.product?.category;
        if (!category) return;
        categoryCounts.set(category, (categoryCounts.get(category) || 0) + item.quantity);
    });

    return [...categoryCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([category]) => category);
}

function buildSellerActionSuggestions(profile) {
    const suggestions = [];

    if (profile.labels.includes('repeat buyer')) {
        suggestions.push('Offer a repeat buyer discount on the next purchase.');
    }

    if (profile.labels.includes('bulk buyer')) {
        suggestions.push('Create a bulk quote with wholesale pricing and faster follow-up.');
    }

    if (profile.labels.includes('high-value buyer')) {
        suggestions.push('Prioritize concierge support and early access to premium deals.');
    }

    if (suggestions.length === 0) {
        suggestions.push('Nurture this buyer with category-specific recommendations.');
    }

    return suggestions;
}

class BuyerIntelligenceService {
    async refreshProfilesForSeller(sellerId) {
        try {
            const orders = await prisma.order.findMany({
                where: {
                    items: {
                        some: {
                            product: {
                                store: {
                                    sellerId
                                }
                            }
                        }
                    }
                },
                include: {
                    buyer: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true,
                            phone: true
                        }
                    },
                    items: {
                        include: {
                            product: {
                                select: {
                                    id: true,
                                    title: true,
                                    category: true,
                                    storeId: true
                                }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            const grouped = new Map();

            orders.forEach((order) => {
                if (!grouped.has(order.buyerId)) {
                    grouped.set(order.buyerId, {
                        buyer: order.buyer,
                        orders: [],
                        spend: 0,
                        itemUnits: 0,
                        sellerItems: []
                    });
                }

                const entry = grouped.get(order.buyerId);
                const sellerItems = order.items.filter((item) => item.product?.storeId);
                const orderSpend = sellerItems.reduce((sum, item) => sum + (priceToNumber(item.priceAtTime) * item.quantity), 0);

                entry.orders.push(order);
                entry.spend += orderSpend;
                entry.itemUnits += sellerItems.reduce((sum, item) => sum + item.quantity, 0);
                entry.sellerItems.push(...sellerItems);
            });

            const profiles = [];

            for (const [buyerId, entry] of grouped.entries()) {
                const totalOrders = entry.orders.length;
                const totalSpend = Number(entry.spend.toFixed(2));
                const averageOrderValue = totalOrders > 0 ? Number((totalSpend / totalOrders).toFixed(2)) : 0;
                const favoriteCategories = buildFavoriteCategories(entry.sellerItems);
                const intelligence = computeBuyerIntelligence({
                    totalOrders,
                    totalSpend,
                    averageOrderValue,
                    bulkUnits: entry.itemUnits
                });

                const profile = await prisma.buyerSellerProfile.upsert({
                    where: {
                        sellerId_buyerId: {
                            sellerId,
                            buyerId
                        }
                    },
                    update: {
                        totalOrders,
                        totalSpend,
                        repeatOrders: Math.max(totalOrders - 1, 0),
                        averageOrderValue,
                        lastOrderAt: entry.orders[0]?.createdAt || null,
                        favoriteCategories: serializeJsonList(favoriteCategories),
                        intelligenceLabels: serializeJsonList(intelligence.labels),
                        intelligenceScore: intelligence.score
                    },
                    create: {
                        sellerId,
                        buyerId,
                        totalOrders,
                        totalSpend,
                        repeatOrders: Math.max(totalOrders - 1, 0),
                        averageOrderValue,
                        lastOrderAt: entry.orders[0]?.createdAt || null,
                        favoriteCategories: serializeJsonList(favoriteCategories),
                        intelligenceLabels: serializeJsonList(intelligence.labels),
                        intelligenceScore: intelligence.score
                    }
                });

                profiles.push({
                    ...profile,
                    buyer: entry.buyer,
                    favoriteCategories,
                    intelligenceLabels: intelligence.labels,
                    suggestedActions: buildSellerActionSuggestions({
                        labels: intelligence.labels
                    })
                });
            }

            return profiles.sort((a, b) => b.intelligenceScore - a.intelligenceScore);
        } catch (error) {
            logger.error(`Buyer intelligence refresh error: ${error.message}`);
            return [];
        }
    }

    async getSellerBuyerInsights(sellerId) {
        const profiles = await this.refreshProfilesForSeller(sellerId);

        const repeatCustomers = profiles.filter((profile) => profile.intelligenceLabels.includes('repeat buyer'));
        const highValueBuyers = profiles.filter((profile) => profile.intelligenceLabels.includes('high-value buyer'));
        const bulkOpportunities = profiles.filter((profile) => profile.intelligenceLabels.includes('bulk buyer'));

        return {
            profiles,
            repeatCustomers,
            highValueBuyers,
            bulkOpportunities,
            bestBuyers: profiles.slice(0, 5)
        };
    }

    async getBuyerProfileForSeller(sellerId, buyerId) {
        await this.refreshProfilesForSeller(sellerId);

        const profile = await prisma.buyerSellerProfile.findUnique({
            where: {
                sellerId_buyerId: {
                    sellerId,
                    buyerId
                }
            }
        });

        if (!profile) {
            return null;
        }

        return {
            ...profile,
            totalSpend: priceToNumber(profile.totalSpend),
            averageOrderValue: priceToNumber(profile.averageOrderValue),
            favoriteCategories: parseJsonList(profile.favoriteCategories),
            intelligenceLabels: parseJsonList(profile.intelligenceLabels),
            suggestedActions: buildSellerActionSuggestions({
                labels: parseJsonList(profile.intelligenceLabels)
            })
        };
    }
}

module.exports = new BuyerIntelligenceService();
