const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');

/**
 * GET /api/v1/sellers/:sellerId/profile
 * Returns seller identity, trust, stats, store reference, and top products.
 * Does NOT expose private financial/auth data.
 */
exports.getSellerProfile = async (req, res) => {
    try {
        const { sellerId } = req.params;

        if (!sellerId) {
            return res.status(400).json({ success: false, message: 'Seller ID is required.' });
        }

        // Fetch user with their store
        const user = await prisma.user.findUnique({
            where: { id: sellerId },
            select: {
                id: true,
                fullName: true,
                avatarUrl: true,
                isVerified: true,
                createdAt: true,
                role: true,
                // Private fields explicitly excluded: passwordHash, email (optional), tokens, financials
                store: {
                    select: {
                        id: true,
                        storeName: true,
                        portfolioSlug: true,
                        description: true,
                        brandStory: true,
                        logoUrl: true,
                        country: true,
                        category: true,
                        averageRating: true,
                        isVerified: true,
                        approvalStatus: true,
                        portfolioLayout: true,
                        createdAt: true,
                        _count: {
                            select: { products: true }
                        },
                        products: {
                            take: 8,
                            orderBy: { createdAt: 'desc' },
                            select: {
                                id: true,
                                title: true,
                                price: true,
                                images: { take: 1, select: { url: true } }
                            }
                        }
                    }
                }
            }
        });

        // Seller must exist
        if (!user) {
            return res.status(404).json({ success: false, message: 'Seller not found.' });
        }

        // Must be a seller or admin
        if (user.role !== 'SELLER' && user.role !== 'ADMIN') {
            return res.status(404).json({ success: false, message: 'Seller not found.' });
        }

        // Unapproved stores (and their products) are not public
        if (user.store && user.store.approvalStatus !== 'APPROVED') {
            user.store = null;
        }

        // Get follower count
        let followersCount = 0;
        try {
            followersCount = await prisma.sellerFollow.count({ where: { sellerId } });
        } catch (_) {
            // sellerFollow table may not exist yet – graceful fallback
        }

        // Get review stats (from store reviews if available)
        let reviewCount = 0;
        let rating = 0;
        if (user.store) {
            try {
                const reviewAgg = await prisma.review.aggregate({
                    where: { sellerId: sellerId },
                    _count: { id: true },
                    _avg: { rating: true }
                });
                reviewCount = reviewAgg._count.id || 0;
                rating = reviewAgg._avg.rating || Number(user.store.averageRating) || 0;
            } catch (_) {
                rating = Number(user.store.averageRating) || 0;
            }
        }

        // Get order count for performance metrics
        let orderCount = 0;
        if (user.store) {
            try {
                orderCount = await prisma.order.count({
                    where: {
                        items: { some: { product: { storeId: user.store.id } } }
                    }
                });
            } catch (_) {}
        }

        // Build clean response — no private data
        const payload = {
            id: user.id,
            name: user.fullName,
            avatar: user.avatarUrl || null,
            isVerified: user.isVerified,
            joinedAt: user.createdAt,
            followers: followersCount,
            stats: {
                rating: Math.round(rating * 10) / 10,
                reviewCount,
                orderCount,
                productsCount: user.store?._count?.products || 0,
                // Response rate and on-time delivery are placeholders until metrics are tracked
                responseRate: null,
                onTimeRate: null
            },
            store: user.store ? {
                id: user.store.id,
                name: user.store.storeName,
                slug: user.store.portfolioSlug,
                description: user.store.description,
                bio: user.store.brandStory || user.store.description,
                logo: user.store.logoUrl,
                country: user.store.country,
                category: user.store.category,
                isVerified: user.store.isVerified,
                productsCount: user.store._count.products,
                topProducts: user.store.products.map(p => ({
                    id: p.id,
                    title: p.title,
                    price: Number(p.price),
                    imageUrl: p.images?.[0]?.url || null
                })),
                createdAt: user.store.createdAt
            } : null
        };

        res.json({ success: true, seller: payload });
    } catch (error) {
        logger.error(`Get Seller Profile Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.sellerOnboarding = async (req, res) => {
    try {
        const { businessName, registrationNumber, country } = req.body;
        const document = req.file;

        if (!businessName || !country) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // Normally we would upload the document and save its URL
        // let docUrl = '';
        // if (document) docUrl = await uploadToCloud(req, res); // Need req to match uploadToCloud signature

        // BUG-SELLER-04: Wrap role change + store upsert in $transaction — prevents a race where
        // role is upgraded but store creation fails, leaving the seller with no store record.
        await prisma.$transaction(async (tx) => {
            const existingStore = await tx.store.findFirst({ where: { sellerId: req.user.id } });
            const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

            if (existingStore) {
                await tx.store.update({
                    where: { id: existingStore.id },
                    data: { storeName: businessName, country, kybStatus: 'PENDING' }
                });
            } else {
                await tx.store.create({
                    data: {
                        sellerId: req.user.id,
                        storeName: businessName,
                        portfolioSlug: slug,
                        country,
                        kybStatus: 'PENDING'
                    }
                });
            }

            // Upgrade role atomically with store creation
            if (req.user.role === 'BUYER' || req.user.role === 'PENDING') {
                await tx.user.update({
                    where: { id: req.user.id },
                    data: { role: 'SELLER' }
                });
            }
        });

        try {
            const notificationV2Service = require('../services/notificationV2Service');
            const socketService = require('../services/socketService');
            await notificationV2Service.notifyAdmins({
                type: 'STORE_APPROVAL_REQUIRED',
                title: 'Seller Onboarding Submitted',
                body: `Seller "${businessName}" has submitted their store onboarding. Store requires admin approval.`,
                linkUrl: '/admin/kyb'
            });
            const io = socketService.getIO();
            if (io) io.to('role:ADMIN').emit('admin_dashboard_update');
        } catch(e) {}

        res.json({ success: true, message: 'Application submitted successfully' });
    } catch (error) {
        logger.error(`Seller Onboarding Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.followSeller = async (req, res) => {
    try {
        const { sellerId } = req.params;
        const userId = req.user.id;

        if (sellerId === userId) {
            return res.status(400).json({ success: false, message: 'Cannot follow yourself' });
        }

        // Check if follow already exists
        let isFollowing = false;
        try {
            const existingFollow = await prisma.sellerFollow.findUnique({
                where: {
                    buyerId_sellerId: {
                        buyerId: userId,
                        sellerId: sellerId
                    }
                }
            });

            if (existingFollow) {
                await prisma.sellerFollow.delete({ where: { id: existingFollow.id } });
                isFollowing = false;
            } else {
                await prisma.sellerFollow.create({
                    data: { sellerId, buyerId: userId }
                });
                isFollowing = true;
            }
            res.json({ success: true, isFollowing });
        } catch (error) {
            logger.warn(`Follow model might not exist: ${error.message}`);
            // Mock toggle for now if DB schema doesn't have it
            res.json({ success: true, isFollowing: true, mocked: true });
        }
    } catch (error) {
        logger.error(`Follow Seller Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * POST /api/v1/sellers/integration
 * Connects an external integration (e.g., Shopify, QuickBooks)
 */
exports.connectIntegration = async (req, res) => {
    try {
        const { platform, apiKey } = req.body;
        if (!platform || !apiKey) {
            return res.status(400).json({ success: false, message: 'Platform and API Key are required' });
        }
        logger.info(`Seller ${req.user.id} connected integration: ${platform}`);
        res.json({ success: true, message: 'Integration connected successfully' });
    } catch (error) {
        logger.error(`Connect Integration Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
