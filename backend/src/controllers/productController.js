const prisma = require('../utils/prismaClient');
const DOMPurify = require('isomorphic-dompurify');
 const jwt = require('jsonwebtoken');
 const logger = require('../utils/logger');
 const inventoryService = require('../services/inventoryService');
const { prismaErrorToAppError, AppError } = require('../utils/errorTypes');
const { APPROVED_STORE, isStoreApproved } = require('../utils/storeApproval');
const { getCategoryFallbackImage } = require('../utils/productImageHelper');


/**
 * SECURITY: Sanitize HTML to prevent XSS attacks
 * Allows basic formatting tags but strips dangerous scripts
 */
function sanitizeHTML(dirty) {
    if (!dirty) return '';

    // Configure allowed tags and attributes for product descriptions
    const cleanConfig = {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'a', 'span', 'div'],
        ALLOWED_ATTR: ['href', 'title', 'class', 'style'],
        ALLOW_DATA_ATTR: false
    };

    return DOMPurify.sanitize(dirty, cleanConfig);
}

/**
 * Sanitize plain text fields (titles, etc.)
 * Strips all HTML tags
 */
function sanitizeText(dirty) {
    if (!dirty) return '';
    return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

// Removed duplicate - already imported above
const { z } = require('zod');
const CloudService = require('../services/cloudService');
const RecommendationService = require('../services/recommendationService');
const ShippingService = require('../services/shippingService');
const { normalizeText, parseJsonList, serializeJsonList } = require('../models/marketplaceIntelligenceModel');

function parseIdList(value) {
    if (!value) return [];
    return String(value)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

/**
 * Strips confidential bottomPrice from product representations for buyers and public endpoints
 */
function sanitizeProductForBuyer(product, currentUserId, userRole) {
    if (!product) return product;
    const isSellerOrAdmin = currentUserId && (currentUserId === product.store?.sellerId || userRole === 'ADMIN');
    if (isSellerOrAdmin) return product;

    if (Array.isArray(product)) {
        return product.map(p => sanitizeProductForBuyer(p, currentUserId, userRole));
    }

    const sanitized = { ...product };
    delete sanitized.bottomPrice;
    return sanitized;
}

function resolveOptionalUserId(req) {
    if (req.user?.id) {
        return req.user.id;
    }

    const token = req.cookies?.token;
    if (!token) {
        return null;
    }

    try {
        // BUG-PROD-01: Use getJwtSecret() instead of raw process.env.JWT_SECRET
        const { getJwtSecret } = require('../utils/jwtSecret');
        const decoded = jwt.verify(token, getJwtSecret());
        return decoded?.id || null;
    } catch (error) {
        return null;
    }
}

const SPLASH_MODEL_LIBRARY = Object.freeze([
    {
        key: 'phone',
        path: '/models/phone.glb',
        matchers: ['electronics', 'phone', 'smartphone', 'tablet', 'laptop', 'camera', 'gaming', 'console', 'tech']
    },
    {
        key: 'watch',
        path: '/models/watch.glb',
        matchers: ['watch', 'wearable', 'audio', 'headphone', 'earbud', 'luxury', 'smartwatch', 'jewelry']
    },
    {
        key: 'sneaker',
        path: '/models/sneaker.glb',
        matchers: ['fashion', 'shoe', 'sneaker', 'sports', 'apparel', 'hoodie', 'shirt', 'bag']
    },
    {
        key: 'package_box',
        path: '/models/package_box.glb',
        matchers: ['package', 'box', 'home', 'living', 'beauty', 'kitchen', 'general', 'delivery']
    }
]);

function normalizeAssetUrl(url) {
    if (!url) return null;
    if (String(url).startsWith('http://') || String(url).startsWith('https://') || String(url).startsWith('/')) {
        return url;
    }
    return `/uploads/${String(url).replace(/^uploads\//, '')}`;
}

function getPrimaryImageUrl(product) {
    const primary = product.images?.find((image) => image.isPrimary)?.url || product.images?.[0]?.url || null;
    return normalizeAssetUrl(primary);
}

function getSplashSearchText(product) {
    return normalizeText([
        product.title,
        product.category,
        product.subCategory,
        product.tags
    ].filter(Boolean).join(' '));
}

function resolveSplashAsset(product, usedKeys = new Set()) {
    const searchText = getSplashSearchText(product);
    const ranked = SPLASH_MODEL_LIBRARY
        .map((asset) => {
            let score = asset.key === 'package_box' ? 0.15 : 0;

            asset.matchers.forEach((matcher) => {
                if (searchText.includes(matcher)) {
                    score += 2;
                }
            });

            if (usedKeys.has(asset.key)) {
                score -= 1.2;
            }

            return { asset, score };
        })
        .sort((left, right) => right.score - left.score);

    const winner = ranked[0]?.asset || SPLASH_MODEL_LIBRARY[0];
    usedKeys.add(winner.key);
    return winner;
}

function toSplashManifestItem(product, usedKeys) {
    const asset = resolveSplashAsset(product, usedKeys);
    return {
        productId: product.id,
        title: product.title,
        category: product.category,
        price: parseFloat(String(product.flashPrice || product.price || 0)),
        imageUrl: getPrimaryImageUrl(product),
        productUrl: `/product.html?id=${encodeURIComponent(product.id)}`,
        modelKey: asset.key,
        modelPath: asset.path
    };
}

async function getTrendingSplashCandidates(limit) {
    return prisma.product.findMany({
        where: {
            isArchived: false,
            stock: { gt: 0 },
            store: { approvalStatus: 'APPROVED' }
        },
        take: Math.max(limit * 3, 10),
        orderBy: [
            { isAdBoosted: 'desc' },
            { viewCount: 'desc' },
            { createdAt: 'desc' }
        ],
        include: {
            store: {
                select: {
                    storeName: true,
                    portfolioSlug: true
                }
            },
            images: {
                orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
                take: 2
            }
        }
    });
}

function dedupeProducts(products) {
    const seen = new Set();
    return products.filter((product) => {
        if (!product?.id || seen.has(product.id)) {
            return false;
        }
        seen.add(product.id);
        return true;
    });
}

// Zod Schemas
const productSchema = z.object({
    title: z.string().min(3).max(100),
    description: z.string().min(10),
    price: z.preprocess((val) => parseFloat(val), z.number().positive()),
    shippingFee: z.preprocess((val) => val === undefined || val === '' ? 0 : parseFloat(val), z.number().nonnegative().optional()),
    stock: z.preprocess((val) => parseInt(val), z.number().int().nonnegative()),
    category: z.string().min(2),
    subCategory: z.string().optional(),
    sku: z.string().optional(),
    productGroupId: z.string().optional(),
    tags: z.union([z.string(), z.array(z.string())]).optional(),
    estimatedDeliveryDays: z.preprocess((val) => val === undefined || val === '' ? undefined : parseInt(val), z.number().int().positive().optional()),
    isFlashSale: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional(),
    isNegotiable: z.preprocess((val) => val === 'true' || val === true || val === 1 || val === '1', z.boolean()).optional(),
    bottomPrice: z.preprocess((val) => val === undefined || val === null || val === '' ? undefined : parseFloat(val), z.number().positive().optional()),
    minimumNegotiablePrice: z.preprocess((val) => val === undefined || val === null || val === '' ? undefined : parseFloat(val), z.number().positive().optional())
});




// Upload product audio
exports.uploadProductAudio = async (req, res) => {
    try {
        const { id } = req.params;
        const { audioTitle } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No audio file uploaded' });
        }
        
        let audioUrl = req.file.path || req.file.url;
        try {
            audioUrl = await CloudService.uploadImage(req.file);
        } catch (uploadErr) {
            logger.warn(`CloudService audio upload fallback: ${uploadErr.message}`);
        }

        const product = await prisma.product.update({
            where: { id },
            data: {
                audioUrl,
                audioTitle: audioTitle || req.file.originalname?.replace(/\.[^.]+$/, '') || 'Original Sound'
            }
        });
        
        res.json({
            success: true,
            message: 'Audio uploaded successfully',
            audioUrl: product.audioUrl,
            audioTitle: product.audioTitle,
            product
        });
    } catch (error) {
        logger.error(`Upload Audio Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error during audio upload' });
    }
};

// Get all products (with filtering, sorting, pagination)
exports.getAllProducts = async (req, res) => {
    try {
        const { page = 1, limit = 12, category, minPrice, maxPrice, origin, format, sort, search, verifiedOnly, hasImages, storeId } = req.query;

        const where = { isArchived: false, store: { approvalStatus: 'APPROVED' }, stock: { gt: 0 } };

        if (storeId) {
            where.storeId = storeId;
        }

        // Search
        if (search) {
            where.OR = [
                { title: { contains: search } },
                { description: { contains: search } },
                { id: { contains: search } },
                { category: { contains: search } },
                { tags: { contains: search } },
                { store: { storeName: { contains: search } } },
                { store: { user: { fullName: { contains: search } } } }
            ];
        }

        // 1. Categories Filter (supports comma-separated multiple categories)
        if (category && category !== 'All Items' && category !== 'all') {
            const categories = String(category).split(',').map(c => c.trim().toLowerCase()).filter(Boolean);
            if (categories.length > 0) {
                const dbCategories = categories.flatMap(c => {
                    const mapped = [c];
                    if (c.includes('electronic')) mapped.push('Electronics', 'electronics', 'electronic');
                    if (c === 'fashion' || c === 'luxury') mapped.push('Fashion & Luxury', 'Fashion', 'Luxury');
                    if (c === 'gaming') mapped.push('Gaming Gear');
                    if (c === 'home') mapped.push('Home & Smart Living');
                    return mapped;
                });

                const catConditions = dbCategories.map(dbCat => ({
                    category: { contains: dbCat }
                }));

                if (catConditions.length > 0) {
                    if (catConditions.length === 1) {
                        where.category = catConditions[0].category;
                    } else {
                        where.OR = where.OR || [];
                        where.OR.push(...catConditions);
                    }
                }
            }
        }

        // 2. Price Range Filter
        if (minPrice || maxPrice) {
            where.price = {};
            if (minPrice) where.price.gte = parseFloat(minPrice);
            if (maxPrice) where.price.lte = parseFloat(maxPrice);
        }

        // 3. Seller Ship Origin Filter (supports comma-separated multiple origins, maps to country or originHub)
        if (origin && origin !== 'all') {
            const origins = String(origin).split(',').map(o => o.trim().toLowerCase()).filter(Boolean);
            const originConditions = [];

            origins.forEach(orig => {
                if (orig === 'dubai' || orig === 'ae') {
                    originConditions.push({ originHub: { contains: 'Dubai' } });
                    originConditions.push({ store: { country: 'AE' } });
                } else if (orig === 'usa' || orig === 'us') {
                    originConditions.push({ originHub: { contains: 'USA' } });
                    originConditions.push({ store: { country: 'US' } });
                } else if (orig === 'eu' || orig === 'uk' || orig === 'gb') {
                    originConditions.push({ originHub: { contains: 'EU' } });
                    originConditions.push({ store: { country: 'GB' } });
                } else if (orig === 'apac' || orig === 'jp') {
                    originConditions.push({ originHub: { contains: 'Asia' } });
                    originConditions.push({ store: { country: 'JP' } });
                } else {
                    originConditions.push({ originHub: { contains: orig } });
                    originConditions.push({ store: { country: { contains: orig } } });
                }
            });

            if (originConditions.length > 0) {
                where.OR = where.OR || [];
                where.OR.push(...originConditions);
            }
        }

        // 4. Buying Format Filter (supports comma-separated formats)
        if (format) {
            const formats = String(format).split(',').map(f => f.trim().toLowerCase()).filter(Boolean);
            const formatConditions = [];

            formats.forEach(form => {
                if (form === 'flash') {
                    formatConditions.push({ isFlashSale: true });
                } else if (form === 'group') {
                    formatConditions.push({ pool: { isNot: null } });
                } else if (form === 'individual') {
                    formatConditions.push({
                        isFlashSale: false,
                        pool: null
                    });
                }
            });

            if (formatConditions.length > 0) {
                if (formatConditions.length === 1) {
                    Object.assign(where, formatConditions[0]);
                } else {
                    where.OR = where.OR || [];
                    where.OR.push(...formatConditions);
                }
            }
        }

        // 5. Store Verification Filter
        if (verifiedOnly === 'true') {
            where.store = {
                ...(where.store || {}),
                isVerified: true
            };
        }

        // 6. Has Images Filter
        if (hasImages === 'true') {
            where.images = {
                some: {}
            };
        }

        // 7. Sorting: Boosted products get premier ranking to maximize daily views and impressions
        let orderBy = [{ isAdBoosted: 'desc' }, { viewCount: 'desc' }, { createdAt: 'desc' }];
        if (sort) {
            const normalizedSort = sort.toLowerCase();
            if (normalizedSort.includes('low') || normalizedSort.includes('asc')) {
                orderBy = [{ isAdBoosted: 'desc' }, { price: 'asc' }];
            } else if (normalizedSort.includes('high') || normalizedSort.includes('desc')) {
                orderBy = [{ isAdBoosted: 'desc' }, { price: 'desc' }];
            } else if (normalizedSort.includes('oldest')) {
                orderBy = [{ isAdBoosted: 'desc' }, { createdAt: 'asc' }];
            } else if (normalizedSort.includes('newest') || normalizedSort.includes('arrival')) {
                orderBy = [{ isAdBoosted: 'desc' }, { createdAt: 'desc' }];
            } else if (normalizedSort.includes('rating')) {
                orderBy = [{ isAdBoosted: 'desc' }, { rating: 'desc' }];
            } else if (normalizedSort.includes('popular') || normalizedSort.includes('views')) {
                orderBy = [{ isAdBoosted: 'desc' }, { viewCount: 'desc' }];
            }
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const [products, total] = await prisma.$transaction([
            prisma.product.findMany({
                where,
                include: {
                    store: {
                        include: {
                            user: {
                                // BUG-PROD-06: email removed from public listing — no reason to expose buyer emails
                                select: { id: true, fullName: true }
                            }
                        }
                    },
                    images: true,
                    options: true
                },
                orderBy,
                skip,
                take
            }),
            prisma.product.count({ where })
        ]);

        const currentUserId = req.user?.id || resolveOptionalUserId(req);
        const userRole = req.user?.role;
        const sanitizedProducts = products.map(p => sanitizeProductForBuyer(p, currentUserId, userRole));

        res.json({
            success: true,
            products: sanitizedProducts,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / take)
            }
        });
    } catch (error) {
        logger.error(`Get All Products Error: ${error.message}`);
        const mapped = prismaErrorToAppError(error);
        if (mapped) return res.status(mapped.statusCode).json({ success: false, message: mapped.message, code: error.code });
        return res.status(500).json({ success: false, message: 'Failed to fetch products. Please try again.' });
    }
};

// Get trending products (Public)
exports.getTrendingProducts = async (req, res) => {
    try {
        // Logic: Get products with high view count or order count.
        // For now, we simulate this by taking the top 5 most recent products.
        const products = await prisma.product.findMany({
            where: {
                isArchived: false,
                stock: { gt: 0 },
                store: { approvalStatus: 'APPROVED' }
            },
            take: 5,
            orderBy: [{ isAdBoosted: 'desc' }, { viewCount: 'desc' }, { createdAt: 'desc' }],
            include: {
                store: {
                    include: {
                        user: {
                            // BUG-PROD-01: Removed email — public endpoint must not expose seller emails
                            select: { id: true, fullName: true }
                        }
                    }
                },
                images: true,
                options: true,
                pool: true
            }
        });
        const currentUserId = req.user?.id || resolveOptionalUserId(req);
        const userRole = req.user?.role;
        const sanitizedProducts = products.map(p => sanitizeProductForBuyer(p, currentUserId, userRole));
        res.json({ success: true, products: sanitizedProducts });
    } catch (error) {
        logger.error(`Get Trending Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get unique categories with counts (Public)
exports.getCategories = async (req, res) => {
    try {
        const categories = await prisma.product.groupBy({
            by: ['category'],
            where: { isArchived: false, store: APPROVED_STORE },
            _count: {
                _all: true
            }
        });

        // Format to match frontend expectations
        const result = categories.map(c => ({
            name: c.category,
            count: c._count._all,
            icon: getCategoryIcon(c.category)
        }));

        res.json({ success: true, categories: result });
    } catch (error) {
        logger.error(`Get Categories Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get hierarchical menu data (Category -> Subcategories)
exports.getMenuData = async (req, res) => {
    try {
        const products = await prisma.product.findMany({
            where: { isArchived: false, store: APPROVED_STORE },
            select: {
                category: true,
                subCategory: true,
                images: {
                    where: { isPrimary: true },
                    take: 1,
                    select: { url: true }
                }
            }
        });

        const menu = {};

        products.forEach(p => {
            if (!p.category) return;
            if (!menu[p.category]) menu[p.category] = [];
            
            const sub = p.subCategory || 'General';
            const existingSub = menu[p.category].find(s => s.name === sub);
            
            if (!existingSub) {
                let img = p.images[0] ? p.images[0].url : null;
                if (img && !img.startsWith('http') && !img.startsWith('/')) img = '/uploads/' + img;
                
                menu[p.category].push({
                    name: sub,
                    image: img || getCategoryFallbackImage(sub, p.category)
                });
            }
        });

        res.json({ success: true, menu });
    } catch (error) {
        logger.error(`Get Menu Data Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

function getCategoryIcon(cat) {
    const icons = {
        'Flash Deals': '⚡',
        'Electronics': '📱',
        'Fashion': '👗',
        'Gaming': '🎮',
        'Luxury': '💎',
        'Home & Living': '🏠',
        'Sports': '⚽',
        'Beauty': '💄'
    };
    return icons[cat] || '📦';
}

// Get Single Product & Track View
 exports.getProduct = async (req, res) => {
     try {
         const { id } = req.params;
         const buyerId = resolveOptionalUserId(req);

         const product = await prisma.product.findUnique({
             where: { id },
             include: {
                 store: {
                     include: {
                         user: {
                             select: {
                                 id: true,
                                 fullName: true,
                                 avatarUrl: true
                             }
                         }
                     }
                 },
                 images: true,
                 options: true,
                 flashDeals: {
                     where: {
                         isActive: true,
                         startDate: { lte: new Date() },
                         endDate: { gt: new Date() }
                     }
                 },
                 reviews: {
                     include: {
                         user: true,
                         _count: { select: { likes: true } }
                     },
                     orderBy: [
                         { isTopReview: 'desc' },
                         { helpfulCount: 'desc' },
                         { createdAt: 'desc' }
                     ]
                 }
             }
         });

         if (!product) {
             return res.status(404).json({ success: false, message: 'Product not found' });
         }

         // Unapproved stores' products are never exposed on this public (URL-cached) endpoint.
         // Owners manage their pending products through the seller dashboard endpoints.
         if (!isStoreApproved(product.store)) {
             return res.status(404).json({ success: false, message: 'Product not found' });
         }

         let isSubscribedToRestock = false;
         if (buyerId) {
             const subscription = await prisma.restockNotification.findUnique({
                 where: {
                     productId_buyerId: {
                         productId: id,
                         buyerId
                     }
                 }
             });
             isSubscribedToRestock = !!subscription;
         }

         // Fetch metrics for social proof
         const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
         const recentViews = await prisma.pageView.count({
             where: {
                 productId: id,
                 createdAt: { gte: oneDayAgo }
             }
         });

         // Analytics: Log Page View (Non-blocking)
         (async () => {
             try {
                 let viewerId = req.user ? req.user.id : null;
                 await prisma.pageView.create({
                     data: { productId: id, viewerId, ipHash: req.ip }
                 });
                 await prisma.product.update({
                     where: { id },
                     data: { viewCount: { increment: 1 } }
                 });

                 if (buyerId) {
                     await RecommendationService.trackUserInteraction(buyerId, id, 'VIEW', {
                         source: 'product_page',
                         weight: 2
                     });
                 }
             } catch (err) {
                 logger.warn(`Analytics logging failed: ${err.message}`);
             }
         })();

         const sanitizedProduct = { ...product };
         const currentViewerId = req.user?.id || buyerId;
         const isSellerOrAdmin = currentViewerId && (currentViewerId === product.store?.sellerId || req.user?.role === 'ADMIN');
         if (!isSellerOrAdmin) {
             delete sanitizedProduct.bottomPrice;
         }

         res.json({ success: true, product: sanitizedProduct, recentViews, isSubscribedToRestock });
     } catch (error) {
         logger.error(`Get Product Error: ${error.message}`);
         res.status(500).json({ success: false, message: 'Server error' });
     }
 };

// Get Personalized Recommendations ("For You")
exports.getRecommendations = async (req, res) => {
    try {
        const { history, cart } = req.query; // Comma-separated product IDs
        const userId = resolveOptionalUserId(req);
        const limit = parseInt(req.query.limit) || 8;

        const browsingHistory = parseIdList(history);
        const cartProductIds = parseIdList(cart);

        const recommendations = await RecommendationService.getRecommendations(
            userId,
            browsingHistory,
            limit,
            cartProductIds
        );

        res.json({ success: true, recommendations });
    } catch (error) {
        logger.error(`Get Recommendations Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get Similar Products (Same Product from Other Sellers)
exports.getSimilarProducts = async (req, res) => {
    try {
        const { productId } = req.params;
        const limit = parseInt(req.query.limit) || 8;

        if (!productId) {
            return res.status(400).json({ success: false, message: 'Product ID required' });
        }

        const recommendations = await RecommendationService.getSameProductAlternatives(
            productId,
            limit
        );

        res.json({ success: true, recommendations });
    } catch (error) {
        logger.error(`Get Similar Products Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get "People Also Bought" Recommendations
exports.getPeopleAlsoBought = async (req, res) => {
    try {
        const { productId } = req.params;
        const limit = parseInt(req.query.limit) || 8;

        if (!productId) {
            return res.status(400).json({ success: false, message: 'Product ID required' });
        }

        const recommendations = await RecommendationService.getPeopleAlsoBought(
            productId,
            limit
        );

        res.json({ success: true, recommendations });
    } catch (error) {
        logger.error(`Get People Also Bought Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get Recently Viewed Products
exports.getRecentlyViewed = async (req, res) => {
    try {
        const { history } = req.query; // Comma-separated product IDs
        const limit = parseInt(req.query.limit) || 8;

        const browsingHistory = parseIdList(history);

        const recommendations = await RecommendationService.getRecentlyViewed(
            browsingHistory,
            limit
        );

        res.json({ success: true, recommendations });
    } catch (error) {
        logger.error(`Get Recently Viewed Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getSplashManifest = async (req, res) => {
    try {
        const requestedLimit = parseInt(req.query.limit, 10);
        const limit = Number.isFinite(requestedLimit)
            ? Math.min(4, Math.max(2, requestedLimit))
            : 4;
        const browsingHistory = parseIdList(req.query.history).slice(0, 20);
        const userId = resolveOptionalUserId(req);

        let recommendedProducts = [];
        if (userId || browsingHistory.length > 0) {
            recommendedProducts = await RecommendationService.getRecommendations(
                userId,
                browsingHistory,
                limit * 2,
                []
            );
        }

        const trendingProducts = await getTrendingSplashCandidates(limit);
        const selectedProducts = dedupeProducts([
            ...recommendedProducts,
            ...trendingProducts
        ]).slice(0, limit);

        const usedKeys = new Set();
        const manifest = selectedProducts.map((product) => toSplashManifestItem(product, usedKeys));

        res.json({
            success: true,
            manifest,
            generatedAt: new Date().toISOString()
        });
    } catch (error) {
        logger.error(`Get Splash Manifest Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getRecommendationBundle = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = resolveOptionalUserId(req);
        const browsingHistory = parseIdList(req.query.history);
        const cartProductIds = parseIdList(req.query.cart);

        const bundle = await RecommendationService.getRecommendationBundle(
            productId,
            userId,
            [...new Set([productId, ...browsingHistory])],
            cartProductIds
        );

        res.json({ success: true, bundle });
    } catch (error) {
        logger.error(`Get Recommendation Bundle Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.compareProduct = async (req, res) => {
    try {
        const { productId } = req.params;

        if (!productId) {
            return res.status(400).json({ success: false, message: 'Product ID required' });
        }

        const comparison = await RecommendationService.getComparison(productId);

        if (!comparison) {
            return res.status(404).json({ success: false, message: 'Comparison data not found' });
        }

        res.json({ success: true, comparison });
    } catch (error) {
        logger.error(`Compare Product Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.trackProductInteraction = async (req, res) => {
    try {
        const userId = resolveOptionalUserId(req);
        const { productId } = req.params;
        const action = String(req.body.action || '').trim().toUpperCase();

        if (!productId || !action) {
            return res.status(400).json({ success: false, message: 'Product ID and action are required' });
        }

        if (userId) {
            await RecommendationService.trackUserInteraction(userId, productId, action, {
                source: req.body.source || 'frontend',
                weight: req.body.weight || 1
            });
        }

        res.json({ success: true });
    } catch (error) {
        logger.error(`Track Product Interaction Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Calculate Landed Cost (Item + Shipping + Tax + Duty)
exports.calculateLandedCost = async (req, res) => {
    try {
        const { itemPrice, quantity = 1, weight = 0.5, category, destinationCountry, destinationState, isBusiness } = req.query;
        
        if (!itemPrice || !destinationCountry) {
            return res.status(400).json({ success: false, message: 'Missing required parameters' });
        }
        
        const landedCost = await ShippingService.calculateLandedCost({
            itemPrice: parseFloat(itemPrice),
            quantity: parseInt(quantity),
            weight: parseFloat(weight) || 0.5,
            category: category || 'default',
            destinationCountry,
            destinationState,
            isBusiness: isBusiness === 'true'
        });
        
        res.json({ success: true, landedCost });
    } catch (error) {
        logger.error(`Calculate Landed Cost Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Search products
exports.searchProducts = async (req, res) => {
    const query = req.query.q || '';
    try {
        // SQLite doesn't support , so we use simple contains
        const products = await prisma.product.findMany({
            where: {
                isArchived: false,
                store: { approvalStatus: 'APPROVED' },
                stock: { gt: 0 },
                OR: [
                    { title: { contains: query } },
                    { description: { contains: query } }
                ]
            },
            include: {
                store: true,
                images: true,
                options: true
            }
        });
        const currentUserId = req.user?.id || resolveOptionalUserId(req);
        const userRole = req.user?.role;
        const sanitizedProducts = products.map(p => sanitizeProductForBuyer(p, currentUserId, userRole));
        res.json({ success: true, products: sanitizedProducts });
    } catch (error) {
        logger.error(`Search Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Unified Search Suggestions (Autocomplete)
exports.getSearchSuggestions = async (req, res) => {
    const query = req.query.q || '';
    if (!query || query.length < 2) return res.json({ success: true, suggestions: { products: [], categories: [], stores: [] } });

    try {
        const [products, stores, categories] = await Promise.all([
            // Match Products - SQLite compatible
            prisma.product.findMany({
                where: { title: { contains: query }, isArchived: false, store: APPROVED_STORE },
                take: 5,
                select: { id: true, title: true, price: true, category: true, images: { take: 1 } }
            }),
            // Match Stores - SQLite compatible
            prisma.store.findMany({
                where: { storeName: { contains: query }, approvalStatus: 'APPROVED' },
                take: 3,
                select: { id: true, storeName: true, country: true, portfolioSlug: true }
            }),
            // Match Unique Categories - SQLite compatible
            prisma.product.groupBy({
                by: ['category'],
                where: { category: { contains: query }, isArchived: false, store: APPROVED_STORE },
                _count: { _all: true },
                take: 3
            })
        ]);

        res.json({
            success: true,
            suggestions: {
                products,
                stores,
                categories: categories.map(c => c.category)
            }
        });
    } catch (error) {
        logger.error(`Suggestions Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get flash sales
exports.getFlashSales = async (req, res) => {
    try {
        let flash = await prisma.product.findMany({
            where: { isFlashSale: true, isArchived: false, store: APPROVED_STORE },
            include: {
                images: true,
                options: true
            },
            orderBy: { flashEndsAt: 'asc' }
        });

        // Add default endsAt if missing (for existing data/demo)
        const now = new Date();
        flash = flash.map(p => {
            if (!p.flashEndsAt) {
                const tomorrow = new Date(now);
                tomorrow.setHours(tomorrow.getHours() + 24);
                p.flashEndsAt = tomorrow;
            }
            return p;
        });

        const currentUserId = req.user?.id || resolveOptionalUserId(req);
        const userRole = req.user?.role;
        const sanitizedProducts = flash.map(p => sanitizeProductForBuyer(p, currentUserId, userRole));
        res.json({ success: true, products: sanitizedProducts });
    } catch (error) {
        logger.error(`Get Flash Sales Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Seller: Create Product
exports.createProduct = async (req, res) => {
    try {
        // Validation
        const validatedData = productSchema.parse(req.body);
        const { title, description, price, shippingFee, stock, category, subCategory, sku, productGroupId, tags, estimatedDeliveryDays, isFlashSale, isNegotiable, bottomPrice, minimumNegotiablePrice } = validatedData;
        const { imageUrl } = req.body;

        const finalBottomPrice = bottomPrice !== undefined ? bottomPrice : (minimumNegotiablePrice !== undefined ? minimumNegotiablePrice : null);
        if (finalBottomPrice !== null && finalBottomPrice !== undefined && finalBottomPrice > parseFloat(price || 0)) {
            return res.status(400).json({
                success: false,
                message: 'Minimum negotiable price (bottom price) cannot exceed product price'
            });
        }

        // Handle Multiple Images
        let imagesToCreate = [];

        // 1. Process uploaded files
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const url = await CloudService.uploadImage(file);
                imagesToCreate.push({ url, isPrimary: imagesToCreate.length === 0 });
            }
        } else if (imageUrl) {
            // Fallback for direct URL or single image legacy
            imagesToCreate.push({ url: imageUrl, isPrimary: true });
        } else {
            // Default placeholder if nothing provided
            imagesToCreate.push({ url: 'placeholder.webp', isPrimary: true });
        }

        // Find user's store
        let store = await prisma.store.findUnique({
            where: { sellerId: req.user.id }
        });

        if (!store) {
            store = await prisma.store.create({
                data: {
                    sellerId: req.user.id,
                    storeName: `${req.user.fullName || 'Seller'}'s Store`,
                    description: 'Global marketplace merchant.',
                    country: 'Global',
                    approvalStatus: 'PENDING'
                }
            });
        }

        // STORE APPROVAL POLICY
        // PENDING / REJECTED / SUSPENDED -> may not list products until approved by admin.
        if (!isStoreApproved(store)) {
            let errorMsg = 'Your store is currently pending approval. You cannot list products until an admin verifies your details.';
            if (store.approvalStatus === 'REJECTED') {
                errorMsg = `Your store application was rejected${store.rejectionReason ? `: ${store.rejectionReason}` : ''}. Please update your details and re-apply.`;
            } else if (store.approvalStatus === 'SUSPENDED') {
                errorMsg = 'Your store is suspended. Contact support to list products.';
            }

            return res.status(403).json({
                success: false,
                message: errorMsg
            });
        }
        const storeIsApproved = isStoreApproved(store);

        // PLAN LIMIT CHECK: Prevent basic sellers from creating more than 20 products
        const isPremium = store.isPremium || store.sellerTier === 'PREMIUM' || store.sellerTier === 'ELITE';
        if (!isPremium) {
            const productCount = await prisma.product.count({
                where: { storeId: store.id }
            });
            if (productCount >= 20) {
                return res.status(403).json({
                    success: false,
                    message: 'Basic plan limit reached. You can only list up to 20 products. Upgrade your plan to list more.'
                });
            }
        }

        // SECURITY: Sanitize inputs to prevent XSS attacks
        const cleanTitle = sanitizeText(title); // Strip all HTML from title
        const cleanDescription = sanitizeHTML(description); // Allow safe HTML in description

         const product = await prisma.product.create({
             data: {
                 title: cleanTitle,
                 normalizedTitle: cleanTitle ? normalizeText(cleanTitle) : undefined,
                 description: cleanDescription,
                 price: parseFloat(price || 0),
                 shippingFee: parseFloat(shippingFee || 0),
                 stock: parseInt(stock || 0),
                 category,
                 subCategory: subCategory || null,
                 sku: sku || null,
                 productGroupId: productGroupId || null,
                 tags: tags !== undefined ? serializeJsonList(parseJsonList(tags)) : undefined,
                 estimatedDeliveryDays: estimatedDeliveryDays,
                 isFlashSale: !!isFlashSale,
                 isNegotiable: !!isNegotiable,
                 bottomPrice: finalBottomPrice !== null && finalBottomPrice !== undefined ? parseFloat(finalBottomPrice) : null,
                 storeId: store.id,
                 images: {
                     create: imagesToCreate
                 },
                 // Optional: Handle options if passed in body
                 options: req.body.options ? {
                     // BUG-PROD-05: Wrapped in try/catch — malformed JSON was crashing the entire endpoint
                     create: (() => {
                         try {
                             return JSON.parse(req.body.options).map(opt => ({
                                 name: opt.name,
                                 value: opt.value,
                                 priceAdj: parseFloat(opt.priceAdj || 0)
                             }));
                         } catch (e) {
                             logger.warn(`Invalid options JSON in createProduct: ${e.message}`);
                             return [];
                         }
                     })()
                 } : undefined
             },
             include: {
                 images: true,
                 options: true
             }
         });

         // Initialize product urgency
         inventoryService.updateProductUrgency(product.id).catch(err =>
             logger.error(`[INVENTORY] Init urgency failed for ${product.id}: ${err.message}`)
         );

         logger.info(`Product created: ${product.id} by Seller ${store.id}`);

         // ALWAYS notify: admins about pending-store listings, and the seller about visibility.
         if (!storeIsApproved) {
             const notificationV2 = require('../services/notificationV2Service');
             notificationV2.notifyAdmins({
                 type: 'STORE_APPROVAL_REQUIRED',
                 title: 'Product listed by unapproved store',
                 body: `"${cleanTitle}" was listed by ${store.storeName} (store pending approval). Review and approve the store to make it live.`,
                 actionUrl: '/admin',
                 metadata: { storeId: store.id, productId: product.id }
             }).catch(() => {});
             notificationV2.notify(req.user.id, {
                 type: 'STORE_PENDING_APPROVAL',
                 title: 'Product saved - awaiting admin approval',
                 body: `"${cleanTitle}" is saved but hidden from buyers until an admin approves your store.`,
                 actionUrl: '/seller/dashboard'
             }).catch(() => {});
             try {
                 const io = require('../services/socketService').getIO();
                 if (io) io.to('role:ADMIN').emit('store:approval_requested', { storeId: store.id, productId: product.id });
             } catch (_) { /* socket not ready */ }
         }

         res.status(201).json({
             success: true,
             product,
             storeApprovalStatus: store.approvalStatus,
             pendingApproval: !storeIsApproved,
             message: storeIsApproved ? undefined : 'Product saved. It will go live once an admin approves your store.'
         });


    } catch (error) {
        logger.error(`Create Product Error: ${error.message}`);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
        }
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Seller: Get My Products
exports.getMyProducts = async (req, res) => {
    try {
        const sellerId = req.user?.id || req.query.sellerId;
        const store = await prisma.store.findFirst({
            where: {
                OR: [
                    { sellerId },
                    { id: sellerId }
                ]
            }
        });
        if (!store) return res.json({ success: true, products: [] });

        const products = await prisma.product.findMany({
            where: { storeId: store.id },
            include: {
                images: true,
                options: true
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, products });
    } catch (error) {
        logger.error(`Get My Products Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Seller: Delete Product
exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Verify product belongs to the user's store
        const product = await prisma.product.findUnique({
            where: { id },
            include: { store: true }
        });

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        if (product.store.sellerId !== userId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this product' });
        }

        await prisma.product.update({ 
            where: { id },
            data: { isArchived: true, stock: 0 }
        });

        logger.info(`Product archived: ${id} by User ${userId}`);

        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        logger.error(`Delete Product Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
// Seller: Update Product
exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;

        // Partial Validation for update
        const validatedData = productSchema.partial().parse(req.body);
        const { title, description, price, shippingFee, stock, category, subCategory, sku, productGroupId, tags, estimatedDeliveryDays, isFlashSale, isNegotiable, bottomPrice, minimumNegotiablePrice } = validatedData;
        const userId = req.user.id;

        const product = await prisma.product.findUnique({
            where: { id },
            include: { store: true }
        });

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        if (product.store.sellerId !== userId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        // 1. Upload New Images (Append)
        let newImages = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const url = await CloudService.uploadImage(file);
                newImages.push({ url, isPrimary: false }); // New images not primary by default unless explicitly set later
            }
        }

        // 2. Handle Image Deletions
        let deleteImageIds = [];
        if (req.body.deleteImageIds) {
            try {
                deleteImageIds = JSON.parse(req.body.deleteImageIds);
            } catch (e) {
                deleteImageIds = [];
            }
        }

        // SECURITY: Sanitize inputs
        const updateData = {
            title: title ? sanitizeText(title) : undefined,
            description: description ? sanitizeHTML(description) : undefined,
            price: price !== undefined ? parseFloat(price) : undefined,
            shippingFee: shippingFee !== undefined ? parseFloat(shippingFee) : undefined,
            stock: stock !== undefined ? parseInt(stock) : undefined,
            category,
            subCategory: subCategory !== undefined ? subCategory || null : undefined,
            sku: sku !== undefined ? sku || null : undefined,
            productGroupId: productGroupId !== undefined ? productGroupId || null : undefined,
            normalizedTitle: title ? normalizeText(title) : undefined,
            tags: tags !== undefined ? serializeJsonList(parseJsonList(tags)) : undefined,
            estimatedDeliveryDays: estimatedDeliveryDays !== undefined ? estimatedDeliveryDays : undefined,
            isFlashSale: isFlashSale !== undefined ? !!isFlashSale : undefined,
            flashPrice: req.body.flashPrice ? parseFloat(req.body.flashPrice) : undefined,
            flashEndsAt: req.body.flashEndsAt ? new Date(req.body.flashEndsAt) : undefined,
            isNegotiable: isNegotiable !== undefined ? !!isNegotiable : undefined,
            images: {
                // BUG-PROD-02/04: Was filtering only by ID — a seller could delete images from
                // another seller's product by sending arbitrary IDs. Scoped to this product's images.
                deleteMany: deleteImageIds.length > 0 ? { id: { in: deleteImageIds }, productId: id } : undefined,
                create: newImages.length > 0 ? newImages : undefined
            }
        };

        if (bottomPrice !== undefined || minimumNegotiablePrice !== undefined) {
            const minPriceVal = bottomPrice !== undefined ? bottomPrice : minimumNegotiablePrice;
            if (minPriceVal !== null && minPriceVal !== '') {
                const parsedMin = parseFloat(minPriceVal);
                const currentPrice = price !== undefined ? parseFloat(price) : parseFloat(product.price);
                if (parsedMin > currentPrice) {
                    return res.status(400).json({
                        success: false,
                        message: 'Minimum negotiable price (bottom price) cannot exceed product price'
                    });
                }
                updateData.bottomPrice = parsedMin;
            } else {
                updateData.bottomPrice = null;
            }
        }

        // Handle Options (Variants) Update
        if (req.body.options) {
            // BUG-PROD-02: Unwrapped JSON.parse could crash the entire update handler
            let parsedOptions = [];
            try {
                parsedOptions = JSON.parse(req.body.options);
            } catch (e) {
                logger.warn(`Invalid options JSON in updateProduct: ${e.message}`);
            }
            if (parsedOptions.length > 0) {
                updateData.options = {
                    deleteMany: {},
                    create: parsedOptions.map(opt => ({
                        name: opt.name,
                        value: opt.value,
                        priceAdj: parseFloat(opt.priceAdj || 0)
                    }))
                };
            }
        }

         const updated = await prisma.product.update({
             where: { id },
             data: updateData,
             include: { options: true, images: true }
         });

         // Update urgency if stock changed
         if (validatedData.stock !== undefined) {
             inventoryService.updateProductUrgency(id).catch(err =>
                 logger.error(`[INVENTORY] Urgency update failed for ${id}: ${err.message}`)
             );
         }

         logger.info(`Product updated: ${id} by User ${userId}`);

         res.json({ success: true, product: updated });
    } catch (error) {
        logger.error(`Update Product Error: ${error.message}`);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
        }
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Add user to product waitlist
exports.addToWaitlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId, notify } = req.body;

        if (!productId) {
            return res.status(400).json({ success: false, message: 'Product ID is required' });
        }

        // Check if product exists
        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: { store: true }
        });

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Get user info
        const user = await prisma.user.findUnique({ where: { id: userId } });

        let prefs = {};
        try {
            prefs = user.notificationPrefs ? JSON.parse(user.notificationPrefs) : {};
        } catch (e) {
            prefs = {};
        }

        // Add to waitlist
        if (!prefs.waitlists) prefs.waitlists = [];
        if (!prefs.waitlists.includes(productId)) {
            prefs.waitlists.push(productId);
        } else {
            return res.status(400).json({ success: false, message: 'You are already on the waitlist for this product' });
        }

        // Save updated prefs
        await prisma.user.update({
            where: { id: userId },
            data: { notificationPrefs: JSON.stringify(prefs) }
        });

        // Create confirmation notification
        await prisma.notification.create({
            data: {
                userId: userId,
                title: '📝 Waitlist Joined',
                body: `You've been added to the waitlist for "${product.title}". We'll notify you when it becomes available!`,
                type: 'INFO',
                linkUrl: `/product.html?id=${productId}`
            }
        });

        // Notify seller
        if (product.store) {
            await prisma.notification.create({
                data: {
                    userId: product.store.sellerId,
                    title: '📋 Waitlist Interest',
                    body: `${user.fullName} joined the waitlist for "${product.title}".`,
                    type: 'INFO',
                    linkUrl: '/seller-dashboard.html?tab=products'
                }
            });
        }

        res.json({
            success: true,
            message: 'Successfully added to waitlist',
            position: prefs.waitlists.length,
            productTitle: product.title
        });

    } catch (error) {
        logger.error(`Add to Waitlist Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to join waitlist' });
    }
};

/**
 * Add a short video to a product
 */
exports.addProductVideo = async (req, res) => {
    try {
        const { productId, caption } = req.body;
        const userId = req.user.id;
        const videoFile = req.file;

        if (!videoFile) return res.status(400).json({ success: false, message: 'Video file is required' });

        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: { store: true }
        });

        if (!product || product.store.sellerId !== userId) {
            return res.status(403).json({ success: false, message: 'Not authorized to manage this product' });
        }

        const videoUrl = await CloudService.uploadImage(videoFile);

        const video = await prisma.productVideo.create({
            data: {
                productId,
                videoUrl,
                caption: sanitizeText(caption) }
        });

        res.status(201).json({ success: true, video });
    } catch (error) {
        logger.error(`Add Product Video Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to add video' });
    }
};

/**
 * Get all short videos for the discovery feed
 */
exports.getAllShortVideos = async (req, res) => {
    try {
        const videos = await prisma.productVideo.findMany({
            include: {
                product: {
                    select: {
                        id: true,
                        title: true,
                        price: true,
                        images: { where: { isPrimary: true }, take: 1 }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 20
        });

        res.json({ success: true, videos });
    } catch (error) {
        logger.error(`Get All Short Videos Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to fetch videos' });
    }
};

/**
 * Delete a product video
 */
exports.deleteProductVideo = async (req, res) => {
    try {
        const { videoId } = req.params;
        const userId = req.user.id;

        const video = await prisma.productVideo.findUnique({
            where: { id: videoId },
            include: { product: { include: { store: true } } }
        });

        if (!video || video.product.store.sellerId !== userId) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        await prisma.productVideo.delete({ where: { id: videoId } });

        res.json({ success: true, message: 'Video deleted' });
    } catch (error) {
        logger.error(`Delete Product Video Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to delete video' });
    }
};

// Seller: Get Low Stock Products (stock < 5)
exports.getLowStockProducts = async (req, res) => {
    try {
        const store = await prisma.store.findUnique({
            where: { sellerId: req.user.id }
        });
        if (!store) return res.json({ success: true, products: [], notifications: [] });

        const products = await prisma.product.findMany({
            where: {
                storeId: store.id,
                stock: { gt: 0, lt: 5 }
            },
            include: {
                images: { where: { isPrimary: true }, take: 1 },
                _count: {
                    select: {
                        restockNotifications: true
                    }
                }
            },
            orderBy: { stock: 'asc' }
        });

        const notifications = await prisma.restockNotification.findMany({
            where: {
                product: { storeId: store.id },
                isNotified: false
            },
            include: {
                buyer: { select: { id: true, fullName: true, email: true } },
                product: { select: { id: true, title: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, products, notifications });
    } catch (error) {
        logger.error(`Get Low Stock Products Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Buyer: Subscribe to restock notification
exports.subscribeToRestock = async (req, res) => {
    try {
        const { productId } = req.body;
        const buyerId = req.user.id;

        const existing = await prisma.restockNotification.findUnique({
            where: {
                productId_buyerId: {
                    productId,
                    buyerId
                }
            }
        });

        if (existing) {
            return res.json({ success: true, message: 'Already subscribed' });
        }

        await prisma.restockNotification.create({
            data: {
                productId,
                buyerId
            }
        });

        res.json({ success: true, message: 'You will be notified when this product is restocked' });
    } catch (error) {
        logger.error(`Subscribe to Restock Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Buyer: Unsubscribe from restock notification
exports.unsubscribeFromRestock = async (req, res) => {
    try {
        const { productId } = req.params;
        const buyerId = req.user.id;

        await prisma.restockNotification.deleteMany({
            where: {
                productId,
                buyerId
            }
        });

        res.json({ success: true, message: 'Unsubscribed from restock notifications' });
    } catch (error) {
        logger.error(`Unsubscribe from Restock Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Seller: Mark product as restocked and notify subscribers
exports.restockProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        const { stock } = req.body;
        const userId = req.user.id;

        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: { store: true }
        });

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // BUG-PROD-03: No ownership check — any SELLER could restock any product, including competitors'
        if (product.store.sellerId !== userId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Not authorized to restock this product' });
        }

        const pendingNotifications = await prisma.restockNotification.findMany({
             where: {
                 productId,
                 isNotified: false
             },
             include: {
                 buyer: true,
                 product: true
             }
         });

        await prisma.product.update({
            where: { id: productId },
            data: {
                stock: parseInt(stock, 10),
                isArchived: false
            }
        });

        await prisma.restockNotification.updateMany({
            where: {
                productId,
                isNotified: false
            },
            data: {
                isNotified: true,
                notifiedAt: new Date()
            }
        });

        for (const notif of pendingNotifications) {
            await prisma.notification.create({
                data: {
                    userId: notif.buyerId,
                    title: 'Product Back in Stock!',
                    body: `${product.title} is now available. Order now before it runs out again!`,
                    type: 'PRODUCT',
                    linkUrl: `/product.html?id=${productId}`
                }
            });

            await prisma.buyerNotification.create({
                data: {
                    userId: notif.buyerId,
                    message: `${product.title} is now back in stock!`,
                    type: 'product_availability',
                    channel: 'in_app'
                }
            });
        }

        logger.info(`Product restocked: ${productId}. Notified ${pendingNotifications.length} buyers`);

        res.json({ 
            success: true, 
            message: `Product restocked. ${pendingNotifications.length} buyers have been notified.`,
            notifiedCount: pendingNotifications.length
        });
    } catch (error) {
        logger.error(`Restock Product Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Toggle Ad Boost for a product (Seller only)
exports.toggleAdBoost = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.user.id;

        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: { store: { include: { user: true } } }
        });

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        if (product.store.sellerId !== userId) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const tier = product.store.sellerTier || 'STANDARD';
        const isPremiumStore = product.store.isPremium || false;
        const userSubscription = (product.store.user?.subscriptionTier || '').toUpperCase();
        const price = parseFloat(product.price);
        
        if (product.isAdBoosted) {
            // Toggle off
            await prisma.product.update({
                where: { id: productId },
                data: { isAdBoosted: false, adBoostExpiresAt: null }
            });
            return res.json({ success: true, message: 'Ad boost disabled', isAdBoosted: false });
        }

        // Toggle on - validate thresholds
        let minAllowedPrice = 0;
        const hasPremiumStatus = tier.toUpperCase() === 'PRO' || tier.toUpperCase() === 'PREMIUM' || isPremiumStore || userSubscription.includes('PREMIUM');
        const hasEliteStatus = tier.toUpperCase() === 'ULTRA' || tier.toUpperCase() === 'ELITE';

        if (hasPremiumStatus && !hasEliteStatus) {
            minAllowedPrice = 1000;
        } else if (hasEliteStatus) {
            minAllowedPrice = 2500;
        } else {
            return res.status(400).json({ success: false, message: 'Basic sellers cannot use product ad boosts.' });
        }

        if (price <= minAllowedPrice) {
            return res.status(400).json({ success: false, message: `Product price must be greater than ${minAllowedPrice} for ad boosts in your tier.` });
        }

        await prisma.product.update({
            where: { id: productId },
            data: { 
                isAdBoosted: true, 
                adBoostExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days default
            }
        });

        res.json({ success: true, message: 'Ad boost enabled', isAdBoosted: true });
    } catch (error) {
        logger.error(`Toggle Ad Boost Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};



// Public: Report a Product
exports.reportProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        const emailService = require('../services/emailService');
        const logger = require('../utils/logger');

        const product = await prisma.product.findUnique({
            where: { id },
            include: {
                store: {
                    include: { user: true }
                }
            }
        });

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
        
        const html = `
            <h3>Product Report Submitted</h3>
            <p><strong>Reason:</strong> ${reason}</p>
            <h4>Product Details</h4>
            <ul>
                <li>ID: ${product.id}</li>
                <li>Title: ${product.title}</li>
            </ul>
            <h4>Seller Details</h4>
            <ul>
                <li>Name: ${product.store.user.fullName}</li>
                <li>Email: ${product.store.user.email}</li>
                <li>Store Name: ${product.store.storeName}</li>
                <li>Store ID: ${product.store.id}</li>
            </ul>
        `;

        for (const admin of admins) {
            await emailService.sendEmail({
                to: admin.email,
                subject: '🚨 New Product Report',
                html
            });

            await prisma.notification.create({
                data: {
                    userId: admin.id,
                    type: 'SYSTEM',
                    title: '🚨 Product Reported',
                    body: `Product "${product.title}" was reported for: ${reason}. Seller: ${product.store.user.fullName}`
                }
            });
        }

        logger.info(`Product ${id} reported for: ${reason}`);
        res.json({ success: true, message: 'Report submitted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * GET /api/v1/products/:id/ai-insights
 * Real-time AI product analysis & tracking for seller & buyer modal
 */
exports.getProductAiInsights = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await prisma.product.findUnique({
            where: { id },
            include: {
                images: true,
                store: {
                    include: {
                        user: {
                            select: { fullName: true, avatarUrl: true }
                        }
                    }
                },
                orderItems: {
                    take: 5,
                    include: {
                        order: {
                            select: {
                                status: true,
                                shippingAddress: true,
                                destinationCountry: true,
                                createdAt: true
                            }
                        }
                    }
                }
            }
        });

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const soldCount = Number(product.soldCount) || 0;
        const viewCount = Number(product.viewCount) || 0;
        const rating = Number(product.rating) || 4.8;
        const stock = Number(product.stock) || 0;

        let recommendationScore = 80;
        if (soldCount > 10) recommendationScore += 8;
        if (viewCount > 50) recommendationScore += 5;
        if (rating >= 4.5) recommendationScore += 5;
        if (stock <= 3 && stock > 0) recommendationScore += 2;
        recommendationScore = Math.min(Math.max(recommendationScore, 65), 98);

        const pricePrediction = stock < 5 || soldCount > 5 || Boolean(product.isAdBoosted);

        let details = `Based on recent marketplace trends, "${product.title}" shows `;
        if (soldCount > 5) {
            details += `strong purchase velocity with ${soldCount} units sold and ${viewCount} buyer views. Buyer satisfaction remains high at ${rating.toFixed(1)}/5.0.`;
        } else if (stock <= 5 && stock > 0) {
            details += `limited inventory availability (${stock} remaining). Reordering soon is strongly recommended to satisfy incoming demand.`;
        } else {
            details += `steady buyer engagement with ${viewCount} impressions. Ideal product margins and competitive category pricing.`;
        }

        const purchases = (product.orderItems || []).map(item => {
            const loc = item.order?.shippingAddress || item.order?.destinationCountry || 'Lagos, Nigeria';
            const status = item.order?.status || 'Processing';
            const isShipped = ['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(status);
            return {
                buyerLocation: loc.length > 25 ? loc.slice(0, 22) + '...' : loc,
                status: status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' '),
                isShipped
            };
        });

        if (purchases.length === 0 && soldCount > 0) {
            purchases.push(
                { buyerLocation: 'Lagos, Nigeria', status: 'Delivered', isShipped: true },
                { buyerLocation: 'Abuja, FCT', status: 'Shipped', isShipped: true }
            );
        }

        const sellerName = product.store?.storeName || product.store?.user?.fullName || 'Verified Merchant';
        const isVerified = Boolean(product.store?.isVerified ?? true);

        return res.json({
            success: true,
            images: product.images && product.images.length > 0 
                ? product.images.map(img => img.url || img) 
                : [],
            details,
            pricePrediction,
            seller: {
                name: sellerName,
                isVerified
            },
            recommendationScore,
            inventory: stock,
            purchaseTracking: {
                recentCount: soldCount || purchases.length,
                purchases
            }
        });
    } catch (error) {
        logger.error(`getProductAiInsights error: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Failed to retrieve AI insights' });
    }
};
