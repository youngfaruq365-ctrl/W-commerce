const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');
const buyerIntelligenceService = require('../services/buyerIntelligenceService');
const sellerAnalyticsService = require('../services/sellerAnalyticsService');

const statsCache = { data: null, lastFetch: 0 };

async function getSellerStore(sellerId) {
    return prisma.store.findUnique({
        where: { sellerId }
    });
}

async function getSellerOrders(storeId, sellerId, filters = {}) {
    const fulfillmentWhere = {
        sellerId: sellerId,
        paymentStatus: { in: ['PAID', 'HELD', 'COMPLETED', 'RELEASED'] }
    };
    const legacyWhere = {
        items: { some: { product: { store: { sellerId: sellerId } } } },
        paymentStatus: { in: ['PAID', 'HELD', 'COMPLETED', 'RELEASED'] }
    };

    if (filters.createdAt) {
        fulfillmentWhere.createdAt = filters.createdAt;
        legacyWhere.createdAt = filters.createdAt;
    }

    const [fulfillmentOrders, legacyOrders] = await Promise.all([
        prisma.fulfillmentOrder.findMany({
            where: fulfillmentWhere,
            include: {
                buyer: {
                    select: { id: true, fullName: true, email: true }
                },
                items: {
                    include: {
                        product: {
                            include: {
                                images: { where: { isPrimary: true }, take: 1, select: { url: true } }
                            }
                        }
                    }
                }
            }
        }),
        prisma.order.findMany({
            where: legacyWhere,
            include: {
                buyer: {
                    select: { id: true, fullName: true, email: true }
                },
                items: {
                    include: {
                        product: {
                            include: {
                                images: { where: { isPrimary: true }, take: 1, select: { url: true } }
                            }
                        }
                    }
                }
            }
        })
    ]);

    const normalizedLegacy = legacyOrders.map(order => {
        const storeItems = order.items.filter(item => item.product?.storeId === storeId);
        const sellerAmount = storeItems.reduce((sum, item) => sum + (Number(item.priceAtTime || 0) * item.quantity), 0);
        return {
            ...order,
            buyer: order.buyer,
            sellerAmount: sellerAmount,
            items: storeItems
        };
    });

    return [...fulfillmentOrders, ...normalizedLegacy].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getSellerItemTotal(order, storeId) {
    return Number(order.sellerAmount || order.grandTotal || 0);
}

function computeDailyViews(views, days = 7) {
    const buckets = Array.from({ length: days }, () => 0);
    const now = Date.now();

    views.forEach((view) => {
        const diffDays = Math.floor((now - new Date(view.createdAt).getTime()) / (24 * 60 * 60 * 1000));
        if (diffDays >= 0 && diffDays < days) {
            const index = days - 1 - diffDays;
            buckets[index] += 1;
        }
    });

    return buckets;
}

exports.getSellerAnalytics = async (req, res) => {
    try {
        const store = await getSellerStore(req.user.id);
        if (!store) {
            return res.status(404).json({ success: false, message: 'Store not found' });
        }


        const [perf, orders, totalProducts, totalInquiries, activeDeals, storeProducts] = await Promise.all([
            sellerAnalyticsService.getSellerPerformance(req.user.id),
            getSellerOrders(store.id, req.user.id),
            prisma.product.count({ where: { storeId: store.id } }),
            prisma.message.count({
                where: {
                    recipientId: req.user.id,
                    sender: { role: 'BUYER' }
                }
            }),
            prisma.flashDeal.findMany({
                where: {
                    sellerId: req.user.id,
                    isActive: true,
                    endDate: { gt: new Date() }
                },
                select: {
                    id: true,
                    clicks: true,
                    conversions: true,
                    revenue: true
                }
            }),
            prisma.product.findMany({
                where: { storeId: store.id },
                select: { id: true, viewCount: true }
            })
        ]);
        
        const productIds = storeProducts.map((product) => product.id);
        const sevenDaysAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
        const views = await prisma.pageView.findMany({
            where: {
                productId: { in: productIds },
                createdAt: { gte: sevenDaysAgo }
            },
            select: { createdAt: true }
        });

        const allTimeViews = storeProducts.reduce((sum, product) => sum + Number(product.viewCount || 0), 0);
        const conversionRate = allTimeViews > 0 ? ((perf.totalOrders / allTimeViews) * 100).toFixed(2) : '0.00';
        const dealRevenue = activeDeals.reduce((sum, deal) => sum + Number(deal.revenue || 0), 0);
        const dealClicks = activeDeals.reduce((sum, deal) => sum + Number(deal.clicks || 0), 0);
        const dealConversions = activeDeals.reduce((sum, deal) => sum + Number(deal.conversions || 0), 0);

        let weeklySales = 0;
        orders.forEach(order => {
             if (order.createdAt >= sevenDaysAgo && ['PAID', 'PACKED', 'CONFIRMED', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'].includes(order.status)) {
                  weeklySales += getSellerItemTotal(order, store.id);
             }
        });

        res.json({
            success: true,
            analytics: {
                totalRevenue: perf.totalRevenue,
                totalOrders: orders.length,
                totalProducts,
                totalViews: allTimeViews,
                totalInquiries,
                repeatBuyers: perf.repeatBuyers,
                weeklySales,
                avgRating: perf.averageRating,
                dailyViews: computeDailyViews(views),
                conversionRate: `${conversionRate}%`,
                trustScore: store.trustScore,
                trustScoreDisplay: (Number(store.trustScore || 0) / 10).toFixed(1),
                performanceScore: store.performanceScore,
                sellerLevel: store.sellerTier,
                kybStatus: store.isVerified ? 'APPROVED' : 'PENDING',
                dealRevenue,
                dealClicks,
                dealConversions
            }
        });
    } catch (error) {
        logger.error(`Analytics Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getTopProducts = async (req, res) => {
    try {
        const store = await getSellerStore(req.user.id);
        if (!store) {
            return res.status(404).json({ success: false, message: 'Store not found' });
        }

        const products = await prisma.product.findMany({
            where: { storeId: store.id },
            include: {
                fulfillmentItems: {
                    include: {
                        fulfillmentOrder: {
                            select: { paymentStatus: true }
                        }
                    }
                },
                orderItems: {
                    include: {
                        order: {
                            select: { paymentStatus: true }
                        }
                    }
                },
                images: {
                    where: { isPrimary: true },
                    take: 1,
                    select: { url: true }
                }
            }
        });

        const productStats = products.map((product) => {
            const validItems = (product.fulfillmentItems || []).filter(item => 
                ['PAID', 'HELD', 'COMPLETED', 'RELEASED'].includes(item.fulfillmentOrder?.paymentStatus)
            );
            const validLegacyItems = (product.orderItems || []).filter(item => 
                ['PAID', 'HELD', 'COMPLETED', 'RELEASED'].includes(item.order?.paymentStatus)
            );
            
            const totalSold = validItems.reduce((sum, item) => sum + item.quantity, 0) + 
                              validLegacyItems.reduce((sum, item) => sum + item.quantity, 0);
            const revenue = validItems.reduce((sum, item) => sum + (Number(item.priceAtTime || 0) * item.quantity), 0) + 
                            validLegacyItems.reduce((sum, item) => sum + (Number(item.priceAtTime || 0) * item.quantity), 0);

            return {
                id: product.id,
                title: product.title,
                totalSold,
                revenue,
                stock: product.stock,
                views: product.viewCount,
                image: product.images[0]?.url || null
            };
        }).sort((a, b) => b.revenue - a.revenue);

        res.json({
            success: true,
            products: productStats.slice(0, 10)
        });
    } catch (error) {
        logger.error(`Top Products Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getSalesByPeriod = async (req, res) => {
    try {
        const { period = '7d' } = req.query;
        const store = await getSellerStore(req.user.id);
        if (!store) {
            return res.status(404).json({ success: false, message: 'Store not found' });
        }

        const now = new Date();
        const startDate = new Date();
        let groupBy = 'day';

        if (period === '24h') {
            startDate.setHours(now.getHours() - 24);
            groupBy = 'hour';
        } else if (period === '30d') {
            startDate.setDate(now.getDate() - 30);
        } else if (period === '90d') {
            startDate.setDate(now.getDate() - 90);
        } else {
            startDate.setDate(now.getDate() - 7);
        }

        const orders = await getSellerOrders(store.id, req.user.id, {
            createdAt: { gte: startDate }
        });

        const salesByDate = {};
        orders.forEach((order) => {
            const key = groupBy === 'hour'
                ? new Date(order.createdAt).toISOString().slice(0, 13)
                : new Date(order.createdAt).toISOString().slice(0, 10);

            if (!salesByDate[key]) {
                salesByDate[key] = { orders: 0, revenue: 0 };
            }

            salesByDate[key].orders += 1;
            salesByDate[key].revenue += getSellerItemTotal(order, store.id);
        });

        res.json({
            success: true,
            period,
            salesByDate
        });
    } catch (error) {
        logger.error(`Sales By Period Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getCustomerInsights = async (req, res) => {
    try {
        const insights = await buyerIntelligenceService.getSellerBuyerInsights(req.user.id);
        const totalCustomers = insights.profiles.length;
        const returningCustomers = insights.repeatCustomers.length;
        const totalRevenue = insights.profiles.reduce((sum, profile) => sum + Number(profile.totalSpend || 0), 0);
        const avgOrderValue = totalCustomers > 0
            ? (insights.profiles.reduce((sum, profile) => sum + Number(profile.averageOrderValue || 0), 0) / totalCustomers).toFixed(2)
            : '0.00';
        const retentionRate = totalCustomers > 0 ? ((returningCustomers / totalCustomers) * 100).toFixed(1) : '0.0';

        res.json({
            success: true,
            insights: {
                totalCustomers,
                returningCustomers,
                newCustomers: Math.max(totalCustomers - returningCustomers, 0),
                avgOrderValue,
                retentionRate: `${retentionRate}%`,
                bestBuyers: insights.bestBuyers.slice(0, 5).map((profile) => ({
                    buyerId: profile.buyerId,
                    name: profile.buyer?.fullName || profile.buyer?.email || 'Buyer',
                    intelligenceScore: profile.intelligenceScore,
                    intelligenceLabels: profile.intelligenceLabels
                }))
            }
        });
    } catch (error) {
        logger.error(`Customer Insights Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getWeeklySummary = async (req, res) => {
    try {
        const store = await getSellerStore(req.user.id);
        if (!store) {
            return res.status(404).json({ success: false, message: 'Store not found' });
        }

        const now = new Date();
        const weekAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
        const twoWeeksAgo = new Date(Date.now() - (14 * 24 * 60 * 60 * 1000));

        const [thisWeekOrders, lastWeekOrders, reviews, pendingOrders] = await Promise.all([
            getSellerOrders(store.id, { createdAt: { gte: weekAgo } }),
            getSellerOrders(store.id, { createdAt: { gte: twoWeeksAgo, lt: weekAgo } }),
            prisma.review.findMany({
                where: {
                    product: { storeId: store.id }
                },
                select: { rating: true }
            }),
            Promise.all([
                prisma.fulfillmentOrder.count({
                    where: {
                        sellerId: req.user.id,
                        status: { in: ['PENDING', 'CONFIRMED', 'SHIPPED', 'PACKED', 'SELLER_REVIEW'] },
                        paymentStatus: { in: ['HELD', 'PAID', 'RELEASED'] }
                    }
                }),
                prisma.order.count({
                    where: {
                        items: { some: { product: { store: { sellerId: req.user.id } } } },
                        status: { in: ['PENDING', 'CONFIRMED', 'SHIPPED', 'PACKED', 'SELLER_REVIEW'] },
                        paymentStatus: { in: ['HELD', 'PAID', 'RELEASED'] }
                    }
                })
            ]).then(([fCount, oCount]) => fCount + oCount)
        ]);

        const thisWeekRevenue = thisWeekOrders.reduce((sum, order) => sum + getSellerItemTotal(order, store.id), 0);
        const lastWeekRevenue = lastWeekOrders.reduce((sum, order) => sum + getSellerItemTotal(order, store.id), 0);
        const thisWeekOrderCount = thisWeekOrders.length;
        const lastWeekOrderCount = lastWeekOrders.length;
        const revenueChange = lastWeekRevenue > 0 ? (((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100).toFixed(1) : (thisWeekRevenue > 0 ? '100.0' : '0.0');
        const ordersChange = lastWeekOrderCount > 0 ? (((thisWeekOrderCount - lastWeekOrderCount) / lastWeekOrderCount) * 100).toFixed(1) : (thisWeekOrderCount > 0 ? '100.0' : '0.0');

        const productSales = new Map();
        const buyerCounts = new Map();

        thisWeekOrders.forEach((order) => {
            buyerCounts.set(order.buyerId, (buyerCounts.get(order.buyerId) || 0) + 1);
            order.items
                .filter((item) => item.product?.storeId === store.id)
                .forEach((item) => {
                    if (!productSales.has(item.productId)) {
                        productSales.set(item.productId, {
                            title: item.product.title,
                            revenue: 0,
                            quantity: 0,
                            image: item.product.images?.[0]?.url || null
                        });
                    }
                    const entry = productSales.get(item.productId);
                    entry.revenue += Number(item.priceAtTime || 0) * item.quantity;
                    entry.quantity += item.quantity;
                });
        });

        const topProducts = [...productSales.values()]
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5)
            .map((product) => ({
                title: product.title,
                revenue: product.revenue.toFixed(2),
                quantity: product.quantity,
                image: product.image
            }));

        const avgRating = reviews.length > 0 ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1) : '0.0';
        const repeatBuyers = [...buyerCounts.values()].filter((count) => count > 1).length;

        res.json({
            success: true,
            weeklySummary: {
                totalSales: thisWeekRevenue.toFixed(2),
                totalOrders: thisWeekOrderCount,
                revenueChange: `${revenueChange}%`,
                ordersChange: `${ordersChange}%`,
                topProducts,
                repeatBuyers,
                avgRating,
                pendingOrders,
                period: {
                    start: weekAgo.toISOString(),
                    end: now.toISOString()
                }
            }
        });
    } catch (error) {
        logger.error(`Weekly Summary Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getPerformanceAlerts = async (req, res) => {
    try {
        const store = await getSellerStore(req.user.id);
        if (!store) {
            return res.status(404).json({ success: false, message: 'Store not found' });
        }

        const performance = await sellerAnalyticsService.getSellerPerformance(req.user.id, '30d');

        const alerts = [];
        const products = await prisma.product.findMany({
            where: { storeId: store.id },
            select: {
                id: true,
                title: true,
                stock: true,
                viewCount: true
            }
        });

        const lowStock = products.filter((product) => product.stock > 0 && product.stock <= 5);
        const outOfStock = products.filter((product) => product.stock === 0);

        if (outOfStock.length > 0) {
            alerts.push({
                type: 'OUT_OF_STOCK',
                severity: 'MEDIUM',
                title: 'Out of stock products',
                message: `${outOfStock.length} product(s) are out of stock and costing you conversions.`,
                createdAt: new Date().toISOString()
            });
        }

        if (lowStock.length > 0) {
            alerts.push({
                type: 'LOW_STOCK',
                severity: 'LOW',
                title: 'Low stock warning',
                message: `${lowStock.length} product(s) have fewer than 6 units remaining.`,
                createdAt: new Date().toISOString()
            });
        }

        const [oldFulfillmentOrders, oldLegacyOrders] = await Promise.all([
            prisma.fulfillmentOrder.count({
                where: {
                    sellerId: req.user.id,
                    status: { in: ['PENDING', 'CONFIRMED', 'SELLER_REVIEW'] },
                    paymentStatus: { in: ['HELD', 'PAID', 'RELEASED'] },
                    createdAt: { lt: new Date(Date.now() - (48 * 60 * 60 * 1000)) }
                }
            }),
            prisma.order.count({
                where: {
                    items: { some: { product: { store: { sellerId: req.user.id } } } },
                    status: { in: ['PENDING', 'CONFIRMED', 'SELLER_REVIEW'] },
                    paymentStatus: { in: ['HELD', 'PAID', 'RELEASED'] },
                    createdAt: { lt: new Date(Date.now() - (48 * 60 * 60 * 1000)) }
                }
            })
        ]);
        const oldPendingOrders = oldFulfillmentOrders + oldLegacyOrders;

        if (oldPendingOrders > 0) {
            alerts.push({
                type: 'PENDING_ORDERS',
                severity: 'MEDIUM',
                title: 'Orders need attention',
                message: `${oldPendingOrders} order(s) have been waiting for more than 48 hours.`,
                createdAt: new Date().toISOString()
            });
        }

        const activeDeals = await prisma.flashDeal.findMany({
            where: {
                sellerId: req.user.id,
                isActive: true,
                endDate: { gt: new Date() }
            }
        });

        const weakDeals = activeDeals.filter((deal) => Number(deal.clicks || 0) > 20 && Number(deal.conversions || 0) === 0);
        if (weakDeals.length > 0) {
            alerts.push({
                type: 'LOW_DEAL_CONVERSION',
                severity: 'LOW',
                title: 'Deals need optimization',
                message: `${weakDeals.length} active deal(s) are getting clicks without conversions.`,
                createdAt: new Date().toISOString()
            });
        }

        if (performance.decliningSales) {
            alerts.push({
                type: 'LOW_PERFORMANCE',
                severity: 'HIGH',
                title: 'Sales are declining',
                message: `Revenue trend is down ${Math.abs(Number(performance.revenueTrendPercent || 0)).toFixed(1)}% versus the previous window.`,
                createdAt: new Date().toISOString()
            });
        }

        if (performance.responseRate < 70) {
            alerts.push({
                type: 'LOW_RESPONSE',
                severity: 'HIGH',
                title: 'Improve response time',
                message: `Response rate is ${Number(performance.responseRate || 0).toFixed(1)}% with average replies taking ${performance.avgResponseMinutes} minutes.`,
                createdAt: new Date().toISOString()
            });
        }

        if (performance.bestProduct?.title) {
            alerts.push({
                type: 'TOP_PRODUCT',
                severity: 'LOW',
                title: 'Boost your top product',
                message: `"${performance.bestProduct.title}" is your strongest seller right now.`,
                createdAt: new Date().toISOString()
            });
        }

        res.json({
            success: true,
            alerts
        });
    } catch (error) {
        logger.error(`Performance Alerts Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getPerformanceMetrics = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { period } = req.query;
        const data = await sellerAnalyticsService.getSellerPerformance(sellerId, period || '30d');
        res.json({ success: true, data });
    } catch (error) {
        if (error.message === 'Store not found') {
            return res.status(404).json({ success: false, message: 'Store not found' });
        }
        logger.error(`Performance Metrics Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.generateInsights = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const insights = await sellerAnalyticsService.generateInsights(sellerId);
        res.json({ success: true, insights });
    } catch (error) {
        if (error.message === 'Store not found') {
            return res.status(404).json({ success: false, message: 'Store not found' });
        }
        logger.error(`Generate Insights Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.updatePerformanceScore = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const score = await sellerAnalyticsService.updatePerformanceScore(sellerId);
        res.json({ success: true, score });
    } catch (error) {
        if (error.message === 'Store not found') {
            return res.status(404).json({ success: false, message: 'Store not found' });
        }
        logger.error(`Update Performance Score Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getActiveCarts = async (req, res) => {
    try {
        const store = await getSellerStore(req.user.id);
        if (!store) {
            return res.status(404).json({ success: false, message: 'Store not found' });
        }

        const cartItems = await prisma.cartItem.findMany({
            where: {
                product: {
                    storeId: store.id
                }
            },
            include: {
                product: {
                    select: {
                        id: true,
                        title: true,
                        price: true,
                        images: {
                            where: { isPrimary: true },
                            take: 1,
                            select: { url: true }
                        }
                    }
                },
                cart: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                fullName: true,
                                email: true,
                                avatarUrl: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                cart: { updatedAt: 'desc' }
            }
        });

        res.json({
            success: true,
            activeCarts: cartItems
        });
    } catch (error) {
        logger.error(`Active Carts Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

