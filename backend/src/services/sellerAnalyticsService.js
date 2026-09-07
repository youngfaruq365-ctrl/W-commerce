const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');
const sellerTrustService = require('./sellerTrustService');

function resolveWindow(period = '30d') {
    const endDate = new Date();
    const startDate = new Date(endDate);

    if (period === '7d') startDate.setDate(startDate.getDate() - 7);
    else if (period === '90d') startDate.setDate(startDate.getDate() - 90);
    else if (period === '365d' || period === '1y') startDate.setFullYear(startDate.getFullYear() - 1);
    else startDate.setDate(startDate.getDate() - 30);

    const previousStart = new Date(startDate);
    previousStart.setTime(startDate.getTime() - (endDate.getTime() - startDate.getTime()));

    return {
        startDate,
        endDate,
        previousStart
    };
}

function getSellerItemTotal(order, storeId) {
    return order.items
        .filter((item) => item.product?.storeId === storeId)
        .reduce((sum, item) => sum + (Number(item.priceAtTime || 0) * item.quantity), 0);
}

function average(values = []) {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length;
}

function round(value, precision = 1) {
    const factor = Math.pow(10, precision);
    return Math.round((Number(value) || 0) * factor) / factor;
}

class SellerAnalyticsService {
    async collectSellerContext(sellerId, period = '30d') {
        const store = await prisma.store.findUnique({
            where: { sellerId }
        });

        if (!store) {
            return null;
        }

        const { startDate, endDate, previousStart } = resolveWindow(period);
        const baseOrderWhere = {
            items: {
                some: {
                    product: { storeId: store.id }
                }
            }
        };

        const fulfillmentWhere = { sellerId: store.sellerId };
        const [
            orders, previousOrders, pendingOrders, 
            fulfillmentOrders, previousFulfillmentOrders, pendingFulfillmentOrders,
            reviews, disputes, topProductGroups, topFulfillmentProductGroups, buyerMessages, sellerReplies
        ] = await Promise.all([
            prisma.order.findMany({
                where: {
                    ...baseOrderWhere,
                    createdAt: { gte: startDate, lte: endDate }
                },
                include: {
                    buyer: {
                        select: { id: true, fullName: true }
                    },
                    items: {
                        where: {
                            product: { storeId: store.id }
                        },
                        include: {
                            product: {
                                select: { id: true, title: true, storeId: true }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.order.findMany({
                where: {
                    ...baseOrderWhere,
                    createdAt: { gte: previousStart, lt: startDate }
                },
                include: {
                    buyer: {
                        select: { id: true }
                    },
                    items: {
                        where: {
                            product: { storeId: store.id }
                        },
                        include: {
                            product: {
                                select: { id: true, title: true, storeId: true }
                            }
                        }
                    }
                }
            }),
            prisma.order.count({
                where: {
                    ...baseOrderWhere,
                    status: { in: ['PENDING', 'PAID', 'PACKED', 'CONFIRMED', 'SHIPPED'] }
                }
            }),
            prisma.review.findMany({
                where: {
                    product: { storeId: store.id }
                },
                select: { rating: true }
            }),
            prisma.dispute.findMany({
                where: {
                    sellerId,
                    createdAt: { gte: startDate, lte: endDate }
                },
                select: { createdAt: true }
            }),
            prisma.orderItem.groupBy({
                by: ['productId'],
                where: {
                    product: { storeId: store.id },
                    order: {
                        createdAt: { gte: startDate, lte: endDate },
                        status: { in: ['PAID', 'PACKED', 'CONFIRMED', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'] }
                    }
                },
                _sum: { quantity: true },
                orderBy: {
                    _sum: { quantity: 'desc' }
                },
                take: 1
            }),
            prisma.message.findMany({
                where: {
                    recipientId: sellerId,
                    sender: { role: 'BUYER' },
                    createdAt: { gte: startDate, lte: endDate }
                },
                select: { id: true, createdAt: true }
            }),
            prisma.message.findMany({
                where: {
                    senderId: sellerId,
                    responseTimeMinutes: { not: null },
                    createdAt: { gte: startDate, lte: endDate }
                },
                select: { responseTimeMinutes: true, createdAt: true }
            }),
            prisma.fulfillmentOrder.findMany({
                where: { ...fulfillmentWhere, createdAt: { gte: startDate, lte: endDate } },
                include: { buyer: { select: { id: true, fullName: true } }, items: { include: { product: { select: { id: true, title: true, storeId: true } } } } },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.fulfillmentOrder.findMany({
                where: { ...fulfillmentWhere, createdAt: { gte: previousStart, lt: startDate } },
                include: { buyer: { select: { id: true } }, items: { include: { product: { select: { id: true, title: true, storeId: true } } } } }
            }),
            prisma.fulfillmentOrder.count({
                where: { ...fulfillmentWhere, status: { in: ['PENDING', 'PAID', 'PACKED', 'CONFIRMED', 'SHIPPED'] } }
            }),
            prisma.fulfillmentItem.groupBy({
                by: ['productId'],
                where: { fulfillmentOrder: { sellerId: store.sellerId, createdAt: { gte: startDate, lte: endDate }, status: { in: ['PAID', 'PACKED', 'CONFIRMED', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'] } } },
                _sum: { quantity: true },
                orderBy: { _sum: { quantity: 'desc' } },
                take: 1
            })
        ]);

        function mapFulfillmentToLegacy(fo) {
            return {
                id: fo.id, buyerId: fo.buyerId, createdAt: fo.createdAt,
                status: fo.status === 'DELIVERED' ? 'DELIVERED' : fo.status,
                buyer: fo.buyer, deliveredAt: fo.deliveredAt, isDeliveryDelayed: false,
                items: fo.items.map(item => ({
                    id: item.id, productId: item.productId, quantity: item.quantity,
                    priceAtTime: item.priceAtTime, product: item.product
                }))
            };
        }

        const mergedOrders = [...orders, ...fulfillmentOrders.map(mapFulfillmentToLegacy)].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
        const mergedPreviousOrders = [...previousOrders, ...previousFulfillmentOrders.map(mapFulfillmentToLegacy)];
        const totalPendingOrders = pendingOrders + pendingFulfillmentOrders;
        
        let mergedTopGroup = topProductGroups;
        if (topFulfillmentProductGroups.length > 0) {
            if (topProductGroups.length === 0 || topFulfillmentProductGroups[0]._sum.quantity > topProductGroups[0]._sum.quantity) {
                mergedTopGroup = topFulfillmentProductGroups;
            }
        }

        const fulfilledOrders = mergedOrders.filter((order) => ['PAID', 'PACKED', 'CONFIRMED', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'].includes(order.status));
        const totalSales = round(fulfilledOrders.reduce((sum, order) => sum + getSellerItemTotal(order, store.id), 0), 2);
        const totalOrders = fulfilledOrders.length;
        const buyerSpend = new Map();
        const buyerOrderCounts = new Map();

        fulfilledOrders.forEach((order) => {
            buyerSpend.set(order.buyerId, (buyerSpend.get(order.buyerId) || 0) + getSellerItemTotal(order, store.id));
            buyerOrderCounts.set(order.buyerId, (buyerOrderCounts.get(order.buyerId) || 0) + 1);
        });

        const repeatBuyers = [...buyerOrderCounts.values()].filter((count) => count > 1).length;

        const uniqueBuyerIds = [...new Set(fulfilledOrders.map((order) => order.buyerId))];
        const repeatBuyerRate = uniqueBuyerIds.length > 0 ? (repeatBuyers / uniqueBuyerIds.length) * 100 : 0;
        const averageRating = reviews.length > 0 ? average(reviews.map((review) => review.rating)) : Number(store.averageRating || 0);

        const deliveredOrders = fulfilledOrders.filter((order) => order.deliveredAt);
        const onTimeDeliveryRate = deliveredOrders.length > 0
            ? (deliveredOrders.filter((order) => !order.isDeliveryDelayed).length / deliveredOrders.length) * 100
            : Number(store.onTimeDeliveryRate || 0);

        const shippingDurations = deliveredOrders
            .filter((order) => order.deliveredAt && order.createdAt)
            .map((order) => (new Date(order.deliveredAt).getTime() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24));

        const averageShippingDays = shippingDurations.length > 0 ? average(shippingDurations) : Number(store.defaultDeliveryDays || 5);
        const disputeRate = totalOrders > 0 ? (disputes.length / totalOrders) * 100 : 0;

        const revenuePrevious = mergedPreviousOrders
            .filter((order) => ['PAID', 'PACKED', 'CONFIRMED', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'].includes(order.status))
            .reduce((sum, order) => sum + getSellerItemTotal(order, store.id), 0);
        const decliningSales = revenuePrevious > 0 && totalSales < (revenuePrevious * 0.85);

        const responseRate = buyerMessages.length > 0
            ? Math.min(100, (sellerReplies.length / buyerMessages.length) * 100)
            : 100;
        const avgResponseMinutes = sellerReplies.length > 0
            ? average(sellerReplies.map((reply) => reply.responseTimeMinutes))
            : Number(store.avgResponseMinutes || 45);

        const buyerIdsLastWeek = new Set(mergedOrders
            .filter((order) => new Date(order.createdAt) >= new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)))
            .map((order) => order.buyerId));
        const buyersPrevWeek = new Set(mergedPreviousOrders.map((order) => order.buyerId));
        const lostBuyersThisWeek = [...buyersPrevWeek].filter((buyerId) => !buyerIdsLastWeek.has(buyerId)).length;

        const topBuyerEntry = [...buyerSpend.entries()]
            .sort((a, b) => b[1] - a[1])[0];
        const topBuyer = topBuyerEntry
            ? mergedOrders.find((order) => order.buyerId === topBuyerEntry[0])?.buyer?.fullName || 'Top buyer'
            : null;

        let bestProduct = null;
        if (mergedTopGroup[0]?.productId) {
            const product = await prisma.product.findUnique({
                where: { id: mergedTopGroup[0].productId },
                select: { id: true, title: true }
            });
            if (product) {
                bestProduct = {
                    id: product.id,
                    title: product.title,
                    quantitySold: mergedTopGroup[0]._sum.quantity || 0
                };
            }
        }

        const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
        const revenueTrendPercent = revenuePrevious > 0
            ? ((totalSales - revenuePrevious) / revenuePrevious) * 100
            : (totalSales > 0 ? 100 : 0);

        const performanceScore = Math.max(0, Math.min(100, Math.round(
            (Math.min(100, averageRating * 20) * 0.28) +
            (Math.min(100, onTimeDeliveryRate) * 0.20) +
            (Math.min(100, responseRate) * 0.14) +
            (sellerTrustService.responseTimeScore(avgResponseMinutes) * 0.10) +
            ((100 - Math.min(disputeRate * 8, 100)) * 0.10) +
            (Math.min(repeatBuyerRate, 100) * 0.08) +
            (Math.max(0, Math.min(revenueTrendPercent + 50, 100)) * 0.10)
        )));

        const trustScore = sellerTrustService.calculateTrustScore({
            averageRating,
            onTimeDeliveryRate,
            disputeRate,
            avgResponseMinutes,
            responseRate,
            performanceScore,
            isVerified: store.isVerified
        });
        const sellerLevel = sellerTrustService.deriveSellerLevel({
            trustScore,
            performanceScore,
            isVerified: store.isVerified
        });

        return {
            store,
            orders,
            previousOrders,
            pendingOrders,
            totalSales,
            totalOrders,
            repeatBuyers,
            repeatBuyerRate: round(repeatBuyerRate, 1),
            averageRating: round(averageRating, 2),
            averageOrderValue: round(averageOrderValue, 2),
            onTimeDeliveryRate: round(onTimeDeliveryRate, 1),
            averageShippingDays: round(averageShippingDays, 1),
            disputeRate: round(disputeRate, 2),
            responseRate: round(responseRate, 1),
            avgResponseMinutes: round(avgResponseMinutes, 0),
            performanceScore,
            trustScore,
            sellerLevel,
            revenueTrendPercent: round(revenueTrendPercent, 1),
            decliningSales,
            lostBuyersThisWeek,
            topBuyer: topBuyer ? {
                name: topBuyer,
                totalSpent: round(topBuyerEntry?.[1] || 0, 2)
            } : null,
            bestProduct,
            lowResponseRate: responseRate < 70
        };
    }

    async getSellerPerformance(sellerId, period = '30d') {
        try {
            const metrics = await this.collectSellerContext(sellerId, period);
            if (!metrics) {
                throw new Error('Store not found');
            }

            return {
                totalRevenue: metrics.totalSales,
                totalOrders: metrics.totalOrders,
                repeatBuyers: metrics.repeatBuyers,
                averageRating: metrics.averageRating,
                pendingOrders: metrics.pendingOrders,
                repeatBuyerRate: metrics.repeatBuyerRate,
                averageOrderValue: metrics.averageOrderValue,
                onTimeDeliveryRate: metrics.onTimeDeliveryRate,
                averageShippingDays: metrics.averageShippingDays,
                disputeRate: metrics.disputeRate,
                responseRate: metrics.responseRate,
                avgResponseMinutes: metrics.avgResponseMinutes,
                performanceScore: metrics.performanceScore,
                trustScore: metrics.trustScore,
                sellerLevel: metrics.sellerLevel,
                decliningSales: metrics.decliningSales,
                lostBuyersThisWeek: metrics.lostBuyersThisWeek,
                revenueTrendPercent: metrics.revenueTrendPercent,
                topBuyer: metrics.topBuyer,
                bestProduct: metrics.bestProduct,
                alerts: [
                    metrics.decliningSales ? 'Improve conversion on your best-performing listings.' : null,
                    metrics.lowResponseRate ? 'Improve response time to keep buyers engaged.' : null,
                    metrics.bestProduct ? `Boost your top product: ${metrics.bestProduct.title}.` : null
                ].filter(Boolean)
            };
        } catch (error) {
            logger.error(`[ANALYTICS] Error for seller ${sellerId}: ${error.message}`);
            throw error;
        }
    }

    async updatePerformanceScore(sellerId) {
        const metrics = await this.collectSellerContext(sellerId, '30d');
        if (!metrics) {
            throw new Error('Store not found');
        }

        await prisma.store.update({
            where: { sellerId },
            data: {
                performanceScore: metrics.performanceScore,
                totalSales: metrics.totalSales,
                totalOrders: metrics.totalOrders,
                repeatBuyerRate: metrics.repeatBuyerRate,
                trustScore: metrics.trustScore,
                sellerTier: metrics.sellerLevel,
                avgResponseMinutes: metrics.avgResponseMinutes,
                topSellingProductId: metrics.bestProduct?.id || null,
                topSellingProductName: metrics.bestProduct?.title || null,
                hasPendingAlerts: metrics.decliningSales || metrics.lowResponseRate,
                alertMessage: metrics.lowResponseRate
                    ? 'Improve response time to retain more buyers.'
                    : (metrics.decliningSales ? 'Sales are trending down. Promote your best product this week.' : null),
                lastAlertAt: metrics.decliningSales || metrics.lowResponseRate ? new Date() : null
            }
        });

        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        await prisma.sellerPerformance.upsert({
            where: {
                sellerId_periodType_periodStart: {
                    sellerId,
                    periodType: 'MONTHLY',
                    periodStart
                }
            },
            update: {
                totalRevenue: metrics.totalSales,
                totalOrders: metrics.totalOrders,
                repeatBuyerRate: metrics.repeatBuyerRate,
                buyerSatisfactionScore: metrics.averageRating,
                onTimeDeliveryRate: metrics.onTimeDeliveryRate,
                averageShippingDays: Math.round(metrics.averageShippingDays),
                disputeRate: metrics.disputeRate,
                averageResponseMinutes: metrics.avgResponseMinutes,
                responseRate: metrics.responseRate,
                trustScore: metrics.trustScore,
                hasNegativeTrend: metrics.decliningSales,
                requiresAttention: metrics.lowResponseRate || metrics.decliningSales,
                alertMessage: metrics.lowResponseRate
                    ? 'Response rate is dropping below target.'
                    : (metrics.decliningSales ? 'Sales declined versus the previous period.' : null)
            },
            create: {
                sellerId,
                periodType: 'MONTHLY',
                periodStart,
                periodEnd,
                totalRevenue: metrics.totalSales,
                totalOrders: metrics.totalOrders,
                totalItemsSold: metrics.orders.reduce((sum, order) => {
                    return sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
                }, 0),
                averageOrderValue: metrics.averageOrderValue,
                newBuyers: Math.max(metrics.totalOrders - metrics.repeatBuyers, 0),
                returningBuyers: metrics.repeatBuyers,
                repeatBuyerRate: metrics.repeatBuyerRate,
                buyerSatisfactionScore: metrics.averageRating,
                onTimeDeliveryRate: metrics.onTimeDeliveryRate,
                averageShippingDays: Math.round(metrics.averageShippingDays),
                disputeRate: metrics.disputeRate,
                averageResponseMinutes: metrics.avgResponseMinutes,
                responseRate: metrics.responseRate,
                trustScore: metrics.trustScore,
                ratingTrend: metrics.decliningSales ? 'DOWN' : 'STABLE',
                hasNegativeTrend: metrics.decliningSales,
                requiresAttention: metrics.lowResponseRate || metrics.decliningSales,
                alertMessage: metrics.lowResponseRate
                    ? 'Response rate is dropping below target.'
                    : (metrics.decliningSales ? 'Sales declined versus the previous period.' : null)
            }
        });

        return {
            score: metrics.performanceScore,
            trustScore: metrics.trustScore,
            sellerLevel: metrics.sellerLevel
        };
    }

    async generateInsights(sellerId) {
        const metrics = await this.collectSellerContext(sellerId, '30d');
        if (!metrics) return [];

        const insights = [
            metrics.bestProduct ? {
                type: 'OPPORTUNITY',
                category: 'PRODUCT',
                priority: 'HIGH',
                title: 'Your best product is winning',
                description: `"${metrics.bestProduct.title}" is leading your store with ${metrics.bestProduct.quantitySold} units sold in the active period.`,
                suggestedAction: 'Boost your top product with a featured placement or flash deal.'
            } : null,
            metrics.topBuyer ? {
                type: 'TREND',
                category: 'CUSTOMER',
                priority: 'MEDIUM',
                title: 'Top buyer spend detected',
                description: `${metrics.topBuyer.name} spent $${metrics.topBuyer.totalSpent.toFixed(2)} with your store.`,
                suggestedAction: 'Send a personalized follow-up or loyalty incentive to retain this buyer.'
            } : null,
            metrics.lostBuyersThisWeek > 0 ? {
                type: 'RISK',
                category: 'CUSTOMER',
                priority: 'HIGH',
                title: 'You lost buyers this week',
                description: `${metrics.lostBuyersThisWeek} buyer${metrics.lostBuyersThisWeek === 1 ? '' : 's'} from the previous cycle did not return this week.`,
                suggestedAction: 'Improve follow-up timing and highlight replenishment offers before demand drops.'
            } : null,
            metrics.decliningSales ? {
                type: 'RISK',
                category: 'SALES',
                priority: 'HIGH',
                title: 'Sales are declining',
                description: `Revenue is down ${Math.abs(metrics.revenueTrendPercent).toFixed(1)}% versus the previous comparison window.`,
                suggestedAction: 'Refresh merchandising, pricing, and response speed on your highest-intent listings.'
            } : null,
            metrics.lowResponseRate ? {
                type: 'ACTION_ITEM',
                category: 'OPERATIONS',
                priority: 'HIGH',
                title: 'Response rate needs attention',
                description: `Your response rate is ${metrics.responseRate.toFixed(1)}% with an average response time of ${metrics.avgResponseMinutes} minutes.`,
                suggestedAction: 'Use quick replies and keep reply times under 60 minutes to improve conversion.'
            } : null
        ].filter(Boolean);

        for (const insight of insights) {
            const existing = await prisma.sellerInsight.findFirst({
                where: {
                    sellerId,
                    title: insight.title
                }
            });

            if (existing) {
                await prisma.sellerInsight.update({
                    where: { id: existing.id },
                    data: {
                        ...insight,
                        isRead: false,
                        dismissedAt: null
                    }
                });
            } else {
                await prisma.sellerInsight.create({
                    data: {
                        sellerId,
                        ...insight
                    }
                });
            }
        }

        return insights;
    }
}

module.exports = new SellerAnalyticsService();
