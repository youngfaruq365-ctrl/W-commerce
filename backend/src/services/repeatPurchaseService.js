const prisma = require('../utils/prismaClient');
const RecommendationService = require('./recommendationService');

function daysBetween(left, right) {
    const diff = Math.abs(new Date(left).getTime() - new Date(right).getTime());
    return diff / (1000 * 60 * 60 * 24);
}

function formatSuggestion(product, lastPurchasedAt, avgIntervalDays, lastOrderId) {
    const daysSinceLastPurchase = Math.max(0, Math.round(daysBetween(new Date(), lastPurchasedAt)));
    const recommendedOnDay = Math.max(7, Math.round(avgIntervalDays - 5));
    const daysUntilReminder = Math.max(recommendedOnDay - daysSinceLastPurchase, 0);

    return {
        productId: product.id,
        lastOrderId,
        title: product.title,
        primaryImage: product.images?.[0]?.url || null,
        lastPurchasedAt,
        averageIntervalDays: Math.round(avgIntervalDays),
        recommendedOnDay,
        daysSinceLastPurchase,
        daysUntilReminder,
        isDue: daysSinceLastPurchase >= recommendedOnDay,
        ctaLabel: daysSinceLastPurchase >= recommendedOnDay ? 'Buy again now' : `Buy again in ${daysUntilReminder} day${daysUntilReminder === 1 ? '' : 's'}`,
        reminderText: `You bought this ${daysSinceLastPurchase} day${daysSinceLastPurchase === 1 ? '' : 's'} ago`
    };
}

class RepeatPurchaseService {
    async getBuyAgainSuggestions(buyerId, limit = 6) {
        const orders = await prisma.order.findMany({
            where: {
                buyerId,
                status: { in: ['DELIVERED', 'COMPLETED'] }
            },
            include: {
                items: {
                    include: {
                        product: {
                            include: {
                                store: true,
                                images: {
                                    where: { isPrimary: true },
                                    orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
                                    take: 1
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 40
        });

        const buckets = new Map();

        for (const order of orders) {
            for (const item of order.items) {
                if (!item.product) continue;
                const key = item.product.productGroupId || item.product.id;
                if (!buckets.has(key)) {
                    buckets.set(key, {
                        product: item.product,
                        purchases: []
                    });
                }
                buckets.get(key).purchases.push({
                    orderId: order.id,
                    createdAt: order.deliveredAt || order.createdAt
                });
            }
        }

        const suggestions = [];

        for (const bucket of buckets.values()) {
            const purchases = bucket.purchases
                .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

            if (purchases.length === 0) continue;

            const lastPurchasedAt = purchases[purchases.length - 1].createdAt;
            const intervals = [];
            for (let i = 1; i < purchases.length; i++) {
                intervals.push(daysBetween(purchases[i].createdAt, purchases[i - 1].createdAt));
            }

            const avgIntervalDays = intervals.length > 0
                ? intervals.reduce((sum, value) => sum + value, 0) / intervals.length
                : Math.max(daysBetween(new Date(), lastPurchasedAt), 21);

            const suggestion = formatSuggestion(bucket.product, lastPurchasedAt, avgIntervalDays, purchases[purchases.length - 1].orderId);
            const comparison = await RecommendationService.getComparison(bucket.product.id);
            suggestion.alternativeSellers = (comparison?.products || [])
                .filter((product) => product.id !== bucket.product.id)
                .slice(0, 3)
                .map((product) => ({
                    id: product.id,
                    title: product.title,
                    storeName: product.store?.storeName || 'Verified Seller',
                    price: Number(product.displayPrice || product.price || 0),
                    rating: Number(product.sellerRating || product.store?.averageRating || 0),
                    deliveryDays: Number(product.estimatedDeliveryDays || product.store?.defaultDeliveryDays || 5),
                    smartHighlights: product.smartHighlights || []
                }));

            suggestions.push(suggestion);
        }

        return suggestions
            .sort((a, b) => {
                if (a.isDue !== b.isDue) return a.isDue ? -1 : 1;
                return b.daysSinceLastPurchase - a.daysSinceLastPurchase;
            })
            .slice(0, limit);
    }

    async getDueReminderPayloads() {
        const buyers = await prisma.order.findMany({
            where: {
                status: { in: ['DELIVERED', 'COMPLETED'] }
            },
            distinct: ['buyerId'],
            select: { buyerId: true }
        });

        const reminders = [];

        for (const buyer of buyers) {
            const suggestions = await this.getBuyAgainSuggestions(buyer.buyerId, 4);
            suggestions
                .filter((suggestion) => suggestion.isDue)
                .forEach((suggestion) => {
                    reminders.push({
                        buyerId: buyer.buyerId,
                        productTitle: suggestion.title,
                        reminderText: suggestion.reminderText
                    });
                });
        }

        return reminders;
    }
}

module.exports = new RepeatPurchaseService();
