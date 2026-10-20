// backend/src/routes/homeDiscoveryRoutes.js
// Public, read-only endpoint powering the Home page discovery sections
// (seller stories, stores near you, community posts, collections) with REAL data.
const express = require('express');
const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');

const router = express.Router();

const DAY = 24 * 60 * 60 * 1000;
let cache = { at: 0, key: '', data: null };

router.get('/', async (req, res) => {
    const country = String(req.query.country || req.detectedRegion || '').toUpperCase();
    const key = country;
    if (cache.data && cache.key === key && Date.now() - cache.at < 60 * 1000) {
        return res.json({ success: true, ...cache.data });
    }

    const safe = (p, fallback) => p.catch(err => { logger.warn(`[HOME DISCOVERY] ${err.message}`); return fallback; });
    const activeStore = { approvalStatus: 'APPROVED' };

    try {
        const [storyPosts, stores, posts, categoryGroups] = await Promise.all([
            // Stories: sellers who posted in the last 48h (one bubble per seller)
            safe(prisma.feedPost.findMany({
                where: { status: 'ACTIVE', createdAt: { gte: new Date(Date.now() - 2 * DAY) } },
                orderBy: { createdAt: 'desc' },
                take: 40,
                select: { id: true, mediaUrl: true, createdAt: true, sellerId: true,
                    seller: { select: { id: true, fullName: true, avatarUrl: true, store: { select: { id: true, storeName: true, logoUrl: true } } } } },
            }), []),
            // Stores: approved stores, preferring the visitor's country
            safe(prisma.store.findMany({
                where: country && country !== 'GLOBAL' ? { ...activeStore, country } : activeStore,
                orderBy: [{ averageRating: 'desc' }, { totalOrders: 'desc' }],
                take: 8,
                select: { id: true, storeName: true, category: true, logoUrl: true, country: true,
                    averageRating: true, totalReviews: true, portfolioSlug: true, sellerId: true },
            }), []),
            // Community: latest active feed posts with engagement counts
            safe(prisma.feedPost.findMany({
                where: { status: 'ACTIVE' },
                orderBy: { createdAt: 'desc' },
                take: 6,
                select: { id: true, caption: true, mediaUrl: true, createdAt: true, productId: true,
                    seller: { select: { id: true, fullName: true, avatarUrl: true } },
                    product: { select: { id: true, title: true, category: true } },
                    _count: { select: { likes: true, comments: true } } },
            }), []),
            // Collections: biggest live product categories
            safe(prisma.product.groupBy({
                by: ['category'],
                where: { isArchived: false, stock: { gt: 0 } },
                _count: { _all: true },
                orderBy: { _count: { category: 'desc' } },
                take: 6,
            }), []),
        ]);

        // If no store in visitor's country, fall back to global top stores
        let finalStores = stores;
        if (finalStores.length === 0 && country && country !== 'GLOBAL') {
            finalStores = await safe(prisma.store.findMany({
                where: activeStore, orderBy: [{ averageRating: 'desc' }], take: 8,
                select: { id: true, storeName: true, category: true, logoUrl: true, country: true,
                    averageRating: true, totalReviews: true, portfolioSlug: true, sellerId: true },
            }), []);
        }

        const seen = new Set();
        const stories = [];
        for (const p of storyPosts) {
            if (seen.has(p.sellerId)) continue;
            seen.add(p.sellerId);
            stories.push({
                id: p.id,
                sellerId: p.sellerId,
                storeId: p.seller?.store?.id || null,
                name: p.seller?.store?.storeName || p.seller?.fullName || 'Seller',
                avatarUrl: p.seller?.store?.logoUrl || p.seller?.avatarUrl || null,
                mediaUrl: p.mediaUrl,
                createdAt: p.createdAt,
            });
            if (stories.length >= 12) break;
        }

        // Cover image per collection = newest product image in that category
        const collections = await Promise.all(categoryGroups.map(async g => {
            const img = await safe(prisma.productImage.findFirst({
                where: { product: { category: g.category, isArchived: false } },
                orderBy: { id: 'desc' },
                select: { url: true },
            }), null);
            return { category: g.category, items: g._count._all, coverUrl: img?.url || null };
        }));

        const data = {
            stories,
            stores: finalStores,
            posts: posts.map(p => ({
                id: p.id, caption: p.caption, mediaUrl: p.mediaUrl, createdAt: p.createdAt,
                productId: p.productId, product: p.product,
                author: { id: p.seller?.id, name: p.seller?.fullName || 'Seller', avatarUrl: p.seller?.avatarUrl || null },
                likes: p._count?.likes || 0, comments: p._count?.comments || 0,
            })),
            collections,
            country: country || null,
        };
        cache = { at: Date.now(), key, data };
        res.json({ success: true, ...data });
    } catch (err) {
        logger.error('[HOME DISCOVERY] failed:', err);
        res.status(500).json({ success: false, message: 'Failed to load discovery data' });
    }
});

module.exports = router;
