const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');
const {
    calculateBestValueScore,
    getUrgencyBadge,
    normalizeText,
    parseJsonList,
    priceToNumber
} = require('../models/marketplaceIntelligenceModel');

function getDisplayPrice(product) {
    return product.isFlashSale && product.flashPrice ? priceToNumber(product.flashPrice) : priceToNumber(product.price);
}

function getPrimaryImage(product) {
    return product.images?.find((image) => image.isPrimary)?.url || product.images?.[0]?.url || null;
}

function getStoreRating(product) {
    return Number(product.store?.averageRating || product.rating || 0);
}

function getDeliveryDays(product) {
    return Number(product.estimatedDeliveryDays || product.store?.defaultDeliveryDays || 5);
}

function buildDeliveryMessage(product) {
    const days = getDeliveryDays(product);
    if (days <= 2) {
        return 'Fastest delivery in your area';
    }
    return `${days} day delivery estimate`;
}

function overlapScore(left = [], right = []) {
    if (!left.length || !right.length) return 0;
    const rightSet = new Set(right);
    return left.filter((item) => rightSet.has(item)).length;
}

function baseInclude() {
    return {
        store: true,
        images: {
            orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }]
        },
        reviews: {
            select: {
                rating: true
            }
        }
    };
}

function decorateProduct(product, referenceProduct = null) {
    const displayPrice = getDisplayPrice(product);
    const smartHighlights = [];
    const urgencyBadge = getUrgencyBadge(product.stock);
    const sellerRating = getStoreRating(product);
    const bestValueScore = calculateBestValueScore({
        price: displayPrice,
        rating: sellerRating,
        deliveryDays: getDeliveryDays(product)
    });

    if (sellerRating >= 4.6 || sellerRating >= 4.8) {
        smartHighlights.push('TOP_RATED');
    }

    if (getDeliveryDays(product) <= 2) {
        smartHighlights.push('FASTEST_DELIVERY');
    }

    if (referenceProduct) {
        const referencePrice = getDisplayPrice(referenceProduct);
        if (displayPrice < referencePrice) {
            smartHighlights.push('BEST_PRICE_CANDIDATE');
        }
    }

    return {
        ...product,
        displayPrice,
        primaryImage: getPrimaryImage(product),
        urgencyBadge,
        deliveryMessage: buildDeliveryMessage(product),
        sellerRating,
        bestValueScore,
        smartHighlights
    };
}

class RecommendationService {
    static async getRecommendationSignals(userId, browsingHistory = [], cartProductIds = []) {
        const signals = {
            categoryWeights: new Map(),
            tagWeights: new Map(),
            productGroupIds: new Set(),
            skus: new Set(),
            excludeIds: new Set([...browsingHistory, ...cartProductIds])
        };

        const idsToHydrate = [...new Set([...browsingHistory, ...cartProductIds])];
        const historyProducts = idsToHydrate.length > 0
            ? await prisma.product.findMany({
                where: {
                    id: { in: idsToHydrate }
                },
                select: {
                    id: true,
                    category: true,
                    tags: true,
                    productGroupId: true,
                    sku: true
                }
            })
            : [];

        historyProducts.forEach((product) => {
            signals.categoryWeights.set(product.category, (signals.categoryWeights.get(product.category) || 0) + 4);
            parseJsonList(product.tags).forEach((tag) => {
                const normalizedTag = normalizeText(tag);
                if (normalizedTag) {
                    signals.tagWeights.set(normalizedTag, (signals.tagWeights.get(normalizedTag) || 0) + 3);
                }
            });

            if (product.productGroupId) signals.productGroupIds.add(product.productGroupId);
            if (product.sku) signals.skus.add(product.sku);
        });

        if (userId) {
            const [interactions, buyerOrders, cart] = await Promise.all([
                prisma.buyerProductInteraction.findMany({
                    where: { userId },
                    include: {
                        product: {
                            select: {
                                id: true,
                                category: true,
                                tags: true,
                                productGroupId: true,
                                sku: true
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 30
                }),
                prisma.order.findMany({
                    where: { buyerId: userId },
                    include: {
                        items: {
                            include: {
                                product: {
                                    select: {
                                        id: true,
                                        category: true,
                                        tags: true,
                                        productGroupId: true,
                                        sku: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 10
                }),
                prisma.cart.findUnique({
                    where: { userId },
                    include: {
                        items: {
                            include: {
                                product: {
                                    select: {
                                        id: true,
                                        category: true,
                                        tags: true,
                                        productGroupId: true,
                                        sku: true
                                    }
                                }
                            }
                        }
                    }
                })
            ]);

            interactions.forEach((interaction) => {
                if (!interaction.product) return;
                const weight = Math.max(interaction.weight || 1, 1);
                signals.categoryWeights.set(interaction.product.category, (signals.categoryWeights.get(interaction.product.category) || 0) + weight);
                parseJsonList(interaction.product.tags).forEach((tag) => {
                    const normalizedTag = normalizeText(tag);
                    if (normalizedTag) {
                        signals.tagWeights.set(normalizedTag, (signals.tagWeights.get(normalizedTag) || 0) + weight);
                    }
                });

                if (interaction.product.productGroupId) signals.productGroupIds.add(interaction.product.productGroupId);
                if (interaction.product.sku) signals.skus.add(interaction.product.sku);
                signals.excludeIds.add(interaction.product.id);
            });

            buyerOrders.forEach((order) => {
                order.items.forEach((item) => {
                    if (!item.product) return;
                    signals.categoryWeights.set(item.product.category, (signals.categoryWeights.get(item.product.category) || 0) + 5);
                    parseJsonList(item.product.tags).forEach((tag) => {
                        const normalizedTag = normalizeText(tag);
                        if (normalizedTag) {
                            signals.tagWeights.set(normalizedTag, (signals.tagWeights.get(normalizedTag) || 0) + 4);
                        }
                    });

                    if (item.product.productGroupId) signals.productGroupIds.add(item.product.productGroupId);
                    if (item.product.sku) signals.skus.add(item.product.sku);
                    signals.excludeIds.add(item.product.id);
                });
            });

            cart?.items?.forEach((item) => {
                if (!item.product) return;
                signals.categoryWeights.set(item.product.category, (signals.categoryWeights.get(item.product.category) || 0) + 6);
                parseJsonList(item.product.tags).forEach((tag) => {
                    const normalizedTag = normalizeText(tag);
                    if (normalizedTag) {
                        signals.tagWeights.set(normalizedTag, (signals.tagWeights.get(normalizedTag) || 0) + 5);
                    }
                });

                if (item.product.productGroupId) signals.productGroupIds.add(item.product.productGroupId);
                if (item.product.sku) signals.skus.add(item.product.sku);
                signals.excludeIds.add(item.product.id);
            });
        }

        return signals;
    }

    static scoreCandidate(product, signals) {
        const categoryScore = signals.categoryWeights.get(product.category) || 0;
        const tagScore = overlapScore(parseJsonList(product.tags).map(normalizeText), [...signals.tagWeights.keys()]);
        const groupScore = product.productGroupId && signals.productGroupIds.has(product.productGroupId) ? 22 : 0;
        const skuScore = product.sku && signals.skus.has(product.sku) ? 16 : 0;
        const ratingBonus = getStoreRating(product) * 6;
        const deliveryBonus = Math.max(8 - getDeliveryDays(product), 0) * 2;
        const flashBonus = product.isFlashSale ? 8 : 0;

        return categoryScore + (tagScore * 5) + groupScore + skuScore + ratingBonus + deliveryBonus + flashBonus;
    }

    static async getRecommendations(userId, browsingHistory = [], limit = 8, cartProductIds = []) {
        try {
            const signals = await this.getRecommendationSignals(userId, browsingHistory, cartProductIds);
            const preferredCategories = [...signals.categoryWeights.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([category]) => category);

            const products = await prisma.product.findMany({
                where: {
                    stock: { gt: 0 }, store: { approvalStatus: 'APPROVED' }, isArchived: false,
                    ...(signals.excludeIds.size > 0 ? { id: { notIn: [...signals.excludeIds] } } : {}),
                    ...(preferredCategories.length > 0 ? {
                        OR: [
                            { category: { in: preferredCategories } },
                            { productGroupId: { in: [...signals.productGroupIds] } },
                            { sku: { in: [...signals.skus] } }
                        ]
                    } : {})
                },
                include: baseInclude(),
                take: Math.max(limit * 3, 12),
                orderBy: [
                    { rating: 'desc' },
                    { createdAt: 'desc' }
                ]
            });

            const ranked = products
                .map((product) => ({
                    ...decorateProduct(product),
                    recommendationReason: 'Recommended for you',
                    score: this.scoreCandidate(product, signals)
                }))
                .sort((a, b) => b.score - a.score)
                .slice(0, limit);

            return ranked;
        } catch (error) {
            logger.error(`Recommendation service getRecommendations error: ${error.message}`);
            return this.getFallbackRecommendations(limit);
        }
    }

    static async getSameProductAlternatives(productId, limit = 8) {
        const referenceProduct = await prisma.product.findUnique({
            where: { id: productId },
            include: baseInclude()
        });

        if (!referenceProduct) return [];

        const normalizedTitle = referenceProduct.normalizedTitle || normalizeText(referenceProduct.title);
        const firstThreeTitleTokens = normalizedTitle.split(' ').slice(0, 3).join(' ');

        const alternatives = await prisma.product.findMany({
            where: {
                id: { not: productId },
                stock: { gt: 0 }, store: { approvalStatus: 'APPROVED' }, isArchived: false,
                OR: [
                    referenceProduct.productGroupId ? { productGroupId: referenceProduct.productGroupId } : undefined,
                    referenceProduct.sku ? { sku: referenceProduct.sku } : undefined,
                    { normalizedTitle: normalizedTitle || undefined },
                    { title: { contains: firstThreeTitleTokens || referenceProduct.title } }
                ].filter(Boolean)
            },
            include: baseInclude(),
            take: limit * 2,
            orderBy: [
                { price: 'asc' },
                { rating: 'desc' }
            ]
        });

        return alternatives
            .map((product) => ({
                ...decorateProduct(product, referenceProduct),
                recommendationReason: 'Other sellers',
                valueScore: calculateBestValueScore({
                    price: getDisplayPrice(product),
                    rating: getStoreRating(product),
                    deliveryDays: getDeliveryDays(product)
                })
            }))
            .sort((a, b) => {
                if (a.productGroupId && b.productGroupId && a.productGroupId === referenceProduct.productGroupId && b.productGroupId !== referenceProduct.productGroupId) return -1;
                if (b.productGroupId && a.productGroupId && b.productGroupId === referenceProduct.productGroupId && a.productGroupId !== referenceProduct.productGroupId) return 1;
                return getDisplayPrice(a) - getDisplayPrice(b);
            })
            .slice(0, limit);
    }

    static async getSimilarProducts(productId, limit = 8) {
        try {
            const referenceProduct = await prisma.product.findUnique({
                where: { id: productId },
                include: baseInclude()
            });

            if (!referenceProduct) {
                return [];
            }

            const referenceTags = parseJsonList(referenceProduct.tags).map(normalizeText);
            const candidates = await prisma.product.findMany({
                where: {
                    id: { not: productId },
                    stock: { gt: 0 }, store: { approvalStatus: 'APPROVED' }, isArchived: false,
                    category: referenceProduct.category
                },
                include: baseInclude(),
                take: limit * 3,
                orderBy: [
                    { createdAt: 'desc' },
                    { rating: 'desc' }
                ]
            });

            return candidates
                .map((product) => {
                    const tagScore = overlapScore(referenceTags, parseJsonList(product.tags).map(normalizeText));
                    const titleScore = normalizeText(product.title).includes(normalizeText(referenceProduct.title).split(' ')[0]) ? 4 : 0;

                    return {
                        ...decorateProduct(product, referenceProduct),
                        recommendationReason: 'Similar products',
                        score: tagScore * 6 + titleScore + getStoreRating(product) + Math.max(8 - getDeliveryDays(product), 0)
                    };
                })
                .sort((a, b) => b.score - a.score)
                .slice(0, limit);
        } catch (error) {
            logger.error(`Recommendation service getSimilarProducts error: ${error.message}`);
            return [];
        }
    }

    static async getPeopleAlsoBought(productId, limit = 8) {
        try {
            const ordersWithProduct = await prisma.orderItem.findMany({
                where: { productId },
                select: { orderId: true },
                take: 100
            });

            const orderIds = ordersWithProduct.map((item) => item.orderId);
            if (orderIds.length === 0) {
                return [];
            }

            const relatedItems = await prisma.orderItem.findMany({
                where: {
                    orderId: { in: orderIds },
                    productId: { not: productId }
                },
                select: {
                    productId: true,
                    quantity: true
                }
            });

            const frequencyMap = new Map();
            relatedItems.forEach((item) => {
                frequencyMap.set(item.productId, (frequencyMap.get(item.productId) || 0) + item.quantity);
            });

            const topProductIds = [...frequencyMap.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, limit * 2)
                .map(([productId]) => productId);

            const products = await prisma.product.findMany({
                where: {
                    id: { in: topProductIds },
                    stock: { gt: 0 }, store: { approvalStatus: 'APPROVED' }, isArchived: false
                },
                include: baseInclude()
            });

            return products
                .map((product) => ({
                    ...decorateProduct(product),
                    recommendationReason: 'Frequently bought together',
                    score: frequencyMap.get(product.id) || 0
                }))
                .sort((a, b) => b.score - a.score)
                .slice(0, limit);
        } catch (error) {
            logger.error(`Recommendation service getPeopleAlsoBought error: ${error.message}`);
            return [];
        }
    }

    static async getRecentlyViewed(browsingHistory, limit = 8) {
        if (!Array.isArray(browsingHistory) || browsingHistory.length === 0) {
            return [];
        }

        try {
            const products = await prisma.product.findMany({
                where: {
                    id: { in: browsingHistory.slice(0, limit) },
                    stock: { gt: 0 }, store: { approvalStatus: 'APPROVED' }, isArchived: false
                },
                include: baseInclude()
            });

            const byId = new Map(products.map((product) => [product.id, decorateProduct(product)]));
            return browsingHistory
                .slice(0, limit)
                .map((id) => byId.get(id))
                .filter(Boolean)
                .map((product) => ({
                    ...product,
                    recommendationReason: 'Recently viewed'
                }));
        } catch (error) {
            logger.error(`Recommendation service getRecentlyViewed error: ${error.message}`);
            return [];
        }
    }

    static async getComparison(productId) {
        const referenceProduct = await prisma.product.findUnique({
            where: { id: productId },
            include: baseInclude()
        });

        if (!referenceProduct) {
            return null;
        }

        const alternatives = await this.getSameProductAlternatives(productId, 10);
        const comparisonSet = [decorateProduct(referenceProduct), ...alternatives];

        const bestPrice = [...comparisonSet].sort((a, b) => getDisplayPrice(a) - getDisplayPrice(b))[0];
        const fastestDelivery = [...comparisonSet].sort((a, b) => getDeliveryDays(a) - getDeliveryDays(b))[0];
        const highestRated = [...comparisonSet].sort((a, b) => getStoreRating(b) - getStoreRating(a))[0];
        const bestValue = [...comparisonSet].sort((a, b) => b.bestValueScore - a.bestValueScore)[0];

        const annotateHighlight = (product, key) => {
            const match = comparisonSet.find((candidate) => candidate.id === product?.id);
            if (!match) return;
            if (!match.smartHighlights.includes(key)) {
                match.smartHighlights.push(key);
            }
        };

        annotateHighlight(bestPrice, 'BEST_PRICE');
        annotateHighlight(fastestDelivery, 'FASTEST_DELIVERY');
        annotateHighlight(highestRated, 'TOP_RATED');
        annotateHighlight(bestValue, 'BEST_VALUE');

        return {
            referenceProductId: referenceProduct.id,
            groupLabel: referenceProduct.productGroupId || referenceProduct.sku || referenceProduct.title,
            bestPriceSeller: bestPrice?.store?.storeName || 'N/A',
            bestPriceAmount: bestPrice ? getDisplayPrice(bestPrice) : null,
            fastestDeliverySeller: fastestDelivery?.store?.storeName || 'N/A',
            fastestDeliveryDays: fastestDelivery ? getDeliveryDays(fastestDelivery) : null,
            highestRatedSeller: highestRated?.store?.storeName || 'N/A',
            highestRatedValue: highestRated ? getStoreRating(highestRated) : null,
            bestValueSeller: bestValue?.store?.storeName || 'N/A',
            bestValueScore: bestValue?.bestValueScore || null,
            products: comparisonSet
        };
    }

    static async getRecommendationBundle(productId, userId = null, browsingHistory = [], cartProductIds = []) {
        const [comparison, similarProducts, complementaryItems, personalized] = await Promise.all([
            this.getComparison(productId),
            this.getSimilarProducts(productId, 10),
            this.getPeopleAlsoBought(productId, 10),
            this.getRecommendations(userId, browsingHistory, 10, cartProductIds)
        ]);

        return {
            comparison,
            otherSellers: comparison?.products?.filter((product) => product.id !== productId) || [],
            similarProducts,
            complementaryItems,
            personalized
        };
    }

    static async getFallbackRecommendations(limit = 8) {
        const products = await prisma.product.findMany({
            where: {
                stock: { gt: 0 }, store: { approvalStatus: 'APPROVED' }, isArchived: false
            },
            include: baseInclude(),
            take: limit,
            orderBy: [
                { rating: 'desc' },
                { createdAt: 'desc' }
            ]
        });

        return products.map((product) => ({
            ...decorateProduct(product),
            recommendationReason: 'Trending now'
        }));
    }

    static async trackUserInteraction(userId, productId, action, metadata = {}) {
        if (!userId || !productId || !action) {
            return null;
        }

        try {
            return await prisma.buyerProductInteraction.create({
                data: {
                    userId,
                    productId,
                    interactionType: String(action).toUpperCase(),
                    weight: metadata.weight || 1,
                    source: metadata.source || null,
                    metadata: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null
                }
            });
        } catch (error) {
            logger.error(`Recommendation trackUserInteraction error: ${error.message}`);
            return null;
        }
    }
}

module.exports = RecommendationService;
