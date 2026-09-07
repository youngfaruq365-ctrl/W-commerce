const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');
const notificationService = require('./notificationService');
const inventoryService = require('./inventoryService');

class WishlistService {
    /**
     * Add product to buyer's wishlist
     */
    async addToWishlist(buyerId, productId, priority = 'MEDIUM', targetPrice = null) {
        const existing = await prisma.wishlist.findUnique({
            where: { buyerId_productId: { buyerId, productId } }
        });
        if (existing) {
            return { success: false, message: 'Already in wishlist' };
        }

        const wishlist = await prisma.wishlist.create({
            data: {
                buyerId,
                productId,
                priority,
                targetPrice: targetPrice ? parseFloat(targetPrice) : null
            }
        });

        // Analytics event
        await this.trackEvent(buyerId, 'WISHLIST_ADD', productId);

        return { success: true, wishlist };
    }

    /**
     * Remove from wishlist
     */
    async removeFromWishlist(buyerId, productId) {
        await prisma.wishlist.deleteMany({
            where: { buyerId, productId }
        });
        return { success: true };
    }

    /**
     * Get buyer's wishlist with product details and price drop alerts
     */
    async getWishlist(buyerId) {
        const items = await prisma.wishlist.findMany({
            where: { buyerId },
            include: {
                product: {
                    include: {
                        store: { select: { storeName: true } },
                        images: { where: { isPrimary: true }, take: 1 }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Enrich items with price drop info
        const enriched = items.map(item => {
            const product = item.product;
            return {
                ...item,
                priceDrop: null, // Could compute if targetPrice set and current price lower
                inStock: product.stock > 0,
                isLowStock: product.stock < (product.lowStockThreshold || 5)
            };
        });

        return enriched;
    }

    /**
     * Check price drops and restock for wishlist items (cron)
     */
    async checkWishlistAlerts() {
        const wishlistItems = await prisma.wishlist.findMany({
            where: {
                priceDropAlertEnabled: true
            },
            include: { product: true, buyer: true }
        });

        const notifications = [];

        for (const item of wishlistItems) {
            const product = item.product;
            if (!product) continue;

            // Price drop alert
            if (item.targetPrice && product.price <= item.targetPrice) {
                const lastNotified = item.lastPriceNotifiedAt;
                const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                if (!lastNotified || lastNotified < oneWeekAgo) {
                    notifications.push(
                        prisma.notification.create({
                            data: {
                                userId: item.buyerId,
                                title: '💰 Price Drop Alert',
                                body: `Great news! ${product.title} is now $${product.price} (target: $${item.targetPrice})`,
                                type: 'ALERT',
                                linkUrl: `/product.html?id=${product.id}`
                            }
                        })
                    );
                    await prisma.wishlist.update({
                        where: { id: item.id },
                        data: { lastPriceNotifiedAt: new Date() }
                    });
                }
            }

            // Back in stock alert (handled separately when restock event occurs)
            // Could add logic: if item was out of stock and now in stock, send notification
        }

        await Promise.all(notifications);
        logger.info(`[WISHLIST] Sent ${notifications.length} price drop notifications`);
    }

    /**
     * Conversion tracking: when wishlist item is added to cart or purchased
     */
    async trackConversion(wishlistId, eventType = 'CART') {
        const now = new Date();
        const update = eventType === 'CART' ? { addedToCartAt: now } : { purchasedAt: now };
        await prisma.wishlist.update({
            where: { id: wishlistId },
            data: update
        });
    }

    /**
     * Track analytics event
     */
    async trackEvent(userId, eventType, productId) {
        await prisma.marketplaceAnalyticsEvent.create({
            data: {
                userId,
                eventType,
                entityType: 'PRODUCT',
                entityId: productId
            }
        });
    }
}

module.exports = new WishlistService();
