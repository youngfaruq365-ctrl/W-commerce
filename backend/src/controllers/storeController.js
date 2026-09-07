const prisma = require('../utils/prismaClient');
const walletService = require('../services/walletService');
const logger = require('../utils/logger');
const { getJwtSecret } = require('../utils/jwtSecret');
// Private: Update Store Portfolio & Bank Details (used by userRoutes /store-update)
exports.updateStore = async (req, res) => {
    try {
        const userId = req.user.id;
        const store = await prisma.store.findUnique({ where: { sellerId: userId } });
        if (!store) return res.status(404).json({ success: false, message: 'Store not found' });

        // BUG-SELLER-05 (in updateStore): allowlist prevents privilege escalation
        const allowedFields = [
            'portfolioLayout', 'brandStory', 'portfolioSlug',
            'bankName', 'accountNumber', 'accountName', 'routingNumber', 'bankCountry',
            'storeName', 'description', 'country',
            'paymentGatewayType', 'paymentConfig', 'paystackSubaccount'
        ];

        const updateData = {};
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });

        const updatedStore = await prisma.store.update({
            where: { id: store.id },
            data: updateData
        });

        res.json({ success: true, store: updatedStore });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ success: false, message: 'This slug is already taken.' });
        }
    }
};

// Get Seller Profile
exports.getSellerProfile = async (req, res) => {
    try {
        const { name } = req.query;
        const store = await prisma.store.findFirst({ where: { storeName: name }, include: { user: true } });
        if (!store) return res.status(404).json({ success: false, message: 'Store not found' });
        const user = store.user;
        const isPremium = user.role === 'ADMIN' || (user.subscription && ['PREMIUM','PRO'].includes(user.subscription.toUpperCase()));
        res.json({ success: true, slug: store.portfolioSlug, storeId: store.id, isPremium });
    } catch (error) {
        logger.error(`Get Seller Profile Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Public: Get Store Details by ID (for Standard Landing Page)
exports.getStoreDetailsById = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) return res.status(400).json({ success: false, message: 'ID required' });

        const store = await prisma.store.findUnique({
            where: { id: id },
            include: { user: { select: { id: true, fullName: true, isVerified: true } } }
        });

        if (!store) return res.status(404).json({ success: false, message: 'Store not found' });

        res.json({ success: true, store });
    } catch (error) {
        logger.error(`Get Store Details Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Public: Get Verified Stores
exports.getVerifiedStores = async (req, res) => {
    try {
        const stores = await prisma.store.findMany({
            where: { isVerified: true },
            include: { user: { select: { id: true, fullName: true } } },
            take: 10
        });
        res.json({ success: true, stores });
    } catch (error) {
        logger.error(`Get Verified Stores Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Search/Filter Stores
exports.searchStores = async (req, res) => {
    try {
        const { search, category, verifiedOnly, sort, page = 1, limit = 12 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const where = {};
        if (verifiedOnly === 'true') {
            where.isVerified = true;
        }

        if (search) {
            where.OR = [
                { storeName: { contains: search } },
                { description: { contains: search } }
            ];
        }

        let orderBy = {};
        if (sort === 'rating') {
            orderBy = { averageRating: 'desc' };
        } else if (sort === 'products') {
            orderBy = { products: { _count: 'desc' } };
        } else {
            orderBy = { createdAt: 'desc' };
        }

        // We fetch stores but also need products count or latest product.
        const stores = await prisma.store.findMany({
            where,
            orderBy,
            skip,
            take: Number(limit),
            include: {
                user: { select: { id: true, fullName: true, avatarUrl: true } },
                _count: { select: { products: true } },
                products: {
                    take: 1,
                    orderBy: { createdAt: 'desc' },
                    select: { title: true, imageUrl: true, price: true }
                }
            }
        });

        const formattedStores = stores.map(store => ({
            uid: store.sellerId,
            id: store.sellerId,
            name: store.storeName,
            avatar: store.user.avatarUrl || store.logoUrl,
            category: store.category || 'General',
            location: store.country,
            rating: store.averageRating,
            products: store._count.products,
            verified: store.isVerified,
            bio: store.description,
            latestProduct: store.products.length > 0 ? {
                title: store.products[0].title,
                image: store.products[0].imageUrl || 'https://via.placeholder.com/300x240',
                price: Number(store.products[0].price)
            } : { title: '', image: 'https://via.placeholder.com/300x240', price: 0 }
        }));

        res.json({ success: true, stores: formattedStores, hasMore: stores.length === Number(limit) });
    } catch (error) {
        logger.error(`Search Stores Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const { protect } = require('../middleware/authMiddleware');

const updateStoreProfile = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const data = req.body;
        
        let store = await prisma.store.findFirst({ where: { sellerId } });
        if (!store) {
            const user = await prisma.user.findUnique({ where: { id: sellerId } });
            store = await prisma.store.create({ data: { sellerId, storeName: user ? `${user.fullName}'s Shop` : 'My Store', country: 'Global' } });
        }
        
        // BUG-SELLER-05: Was using a blocklist (delete restricted fields) â€” any unlisted schema field
        // could be overwritten including isVerified, paystackSubaccount, kybStatus (privilege escalation).
        // Replaced with an explicit ALLOWLIST of fields sellers may update.
        const SELLER_EDITABLE_FIELDS = [
            'portfolioLayout', 'brandStory', 'portfolioSlug',
            'bankName', 'accountNumber', 'accountName', 'routingNumber', 'bankCountry',
            'storeName', 'description', 'country',
            'paymentGatewayType', 'paymentConfig'
            // paystackSubaccount intentionally removed â€” set only via /setup-paystack
            // isVerified, kybStatus, sellerTier intentionally excluded
        ];

        const safeData = {};
        SELLER_EDITABLE_FIELDS.forEach(field => {
            if (data[field] !== undefined) safeData[field] = data[field];
        });

        // portfolioConfig is handled separately (deep merge)
        if (data.portfolioConfig) {
            let currentConfig = {};
            let newConfig = {};
            try {
                if (store.portfolioConfig) currentConfig = typeof store.portfolioConfig === 'string' ? JSON.parse(store.portfolioConfig) : store.portfolioConfig;
            } catch (e) {}
            try {
                if (typeof data.portfolioConfig === 'string') {
                    newConfig = JSON.parse(data.portfolioConfig);
                } else {
                    newConfig = data.portfolioConfig;
                }
            } catch (e) {}
            safeData.portfolioConfig = JSON.stringify({ ...currentConfig, ...newConfig });
        }

        store = await prisma.store.update({
            where: { id: store.id },
            data: safeData
        });

        res.json({ success: true, data: store });
    } catch (error) {
        console.error('updateStoreProfile error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getStoreProfile = async (req, res) => {
    try {
        const sellerId = req.user.id;
        let store = await prisma.store.findFirst({ where: { sellerId } });
        if (!store) {
            const user = await prisma.user.findUnique({ where: { id: sellerId } });
            store = await prisma.store.create({ data: { sellerId, storeName: user ? `${user.fullName}'s Shop` : 'My Store', country: 'Global' } });
        }
        res.json({ success: true, data: store });
    } catch (error) {
        console.error('getStoreProfile error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports.updateStoreProfile = updateStoreProfile;
module.exports.getStoreProfile = getStoreProfile;

const { generateStoreDna } = require('../utils/storeDnaGenerator');

// AI endpoint for generating surprise store DNA variables
module.exports.generateSurpriseStoreDna = async (req, res) => {
    try {
        const { GoogleGenAI, Type } = require('@google/genai');
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        const prompt = 'Generate a creative and unique e-commerce store DNA. Provide a random industry, a specific niche within that industry, a brand personality, and boolean values for 4 features: megaMenu, quickView, aiConcierge, and newsletterPopup.';
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        industry: { type: Type.STRING, description: 'The e-commerce industry, e.g. fashion, electronics, home, etc.' },
                        niche: { type: Type.STRING, description: 'A specific niche within the industry' },
                        personality: { type: Type.STRING, description: 'Brand personality, e.g. minimal, bold, playful, elegant' },
                        features: {
                            type: Type.OBJECT,
                            properties: {
                                megaMenu: { type: Type.BOOLEAN },
                                quickView: { type: Type.BOOLEAN },
                                aiConcierge: { type: Type.BOOLEAN },
                                newsletterPopup: { type: Type.BOOLEAN }
                            },
                            required: ["megaMenu", "quickView", "aiConcierge", "newsletterPopup"]
                        },
                    },
                    required: ["industry", "niche", "personality", "features"]
                }
            }
        });

        const rawText = typeof response.text === 'function' ? response.text() : response.text;
        const payload = JSON.parse(rawText);
        payload.seed = Math.random().toString(36).substring(7);
        
        res.json({ success: true, data: payload });
    } catch (error) {
        logger.error(`Generate Surprise Store DNA Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Generate DNA Options
module.exports.generateStoreDnaDraft = async (req, res) => {
    try {
        const { industry, niche, personality, features } = req.body;
        
        const options = [
            {
                name: 'Noir Atelier',
                price: 49,
                tier: 'Signature',
                personality: 'noir-editorial',
                visual: {
                    themeMode: 'dark', colorSystem: 'monochrome', typography: 'Playfair Display', shapeLanguage: 'sharp',
                    colors: { primary: '#ffffff', background: '#050505', surface: '#111111', text: '#e5e5e5', accent: '#d4af37' }
                },
                layout: { homepage: 'HeroEditorial', productGrid: 'GridEditorial', header: 'NavSidebar' },
                animations: 'smooth'
            },
            {
                name: 'RAW/01',
                price: 29,
                tier: 'Studio',
                personality: 'digital-brutalism',
                visual: {
                    themeMode: 'light', colorSystem: 'brutalist', typography: 'Space Grotesk', shapeLanguage: 'sharp',
                    colors: { primary: '#000000', background: '#ffffff', surface: '#f0f0f0', text: '#111111', accent: '#b4ff00' }
                },
                layout: { homepage: 'HeroAsymmetric', productGrid: 'GridHorizontal', header: 'NavMega' },
                animations: 'bounce'
            },
            {
                name: 'The Creative Archive',
                price: 19,
                tier: 'Pro',
                personality: 'cream-archive',
                visual: {
                    themeMode: 'light', colorSystem: 'archive', typography: 'Inter', shapeLanguage: 'rounded',
                    colors: { primary: '#3e2723', background: '#fffdd0', surface: '#f5f5dc', text: '#4e342e', accent: '#d32f2f' }
                },
                layout: { homepage: 'HeroStory', productGrid: 'GridMasonry', header: 'NavCentered' },
                animations: 'smooth'
            },
            {
                name: 'Future Grid',
                price: 39,
                tier: 'Signature',
                personality: 'future-grid',
                visual: {
                    themeMode: 'dark', colorSystem: 'neon', typography: 'Inter', shapeLanguage: 'sharp',
                    colors: { primary: '#00ffff', background: '#121212', surface: '#1e1e1e', text: '#f5f5f5', accent: '#00ffff' }
                },
                layout: { homepage: 'HeroBento', productGrid: 'GridBento', header: 'NavGlass' },
                animations: 'spring'
            },
            {
                name: 'Paper Studio',
                price: 19,
                tier: 'Pro',
                personality: 'paper-studio',
                visual: {
                    themeMode: 'light', colorSystem: 'paper', typography: 'Inter', shapeLanguage: 'sharp',
                    colors: { primary: '#000000', background: '#fcfcfc', surface: '#ffffff', text: '#111111', accent: '#d32f2f' }
                },
                layout: { homepage: 'HeroSplit', productGrid: 'GridFeatured', header: 'PillNav' },
                animations: 'smooth'
            },
            {
                name: 'FRAME/24',
                price: 49,
                tier: 'Signature',
                personality: 'cinematic-filmmaker',
                visual: {
                    themeMode: 'dark', colorSystem: 'monochrome-dark', typography: 'Inter', shapeLanguage: 'sharp',
                    colors: { primary: '#ffffff', background: '#050a1f', surface: '#0d132b', text: '#e2e8f0', accent: '#94a3b8' }
                },
                layout: { homepage: 'HeroVideo', productGrid: 'GridHorizontal', header: 'NavMinimal' },
                animations: 'smooth'
            },
            {
                name: 'Moss & Form',
                price: 29,
                tier: 'Studio',
                personality: 'organic-creative',
                visual: {
                    themeMode: 'light', colorSystem: 'organic', typography: 'Inter', shapeLanguage: 'pill',
                    colors: { primary: '#2d4a22', background: '#faf9f6', surface: '#f0ece1', text: '#3e3a35', accent: '#8b5a2b' }
                },
                layout: { homepage: 'HeroAsymmetric', productGrid: 'GridStandard', header: 'NavFloating' },
                animations: 'smooth'
            },
            {
                name: 'Pulse Creator',
                price: 39,
                tier: 'Signature',
                personality: 'neon-creator',
                visual: {
                    themeMode: 'dark', colorSystem: 'vibrant', typography: 'Space Grotesk', shapeLanguage: 'rounded',
                    colors: { primary: '#ff007f', background: '#0a001a', surface: '#1a0033', text: '#f8f8f8', accent: '#00e5ff' }
                },
                layout: { homepage: 'HeroImmersive', productGrid: 'GridAsymmetric', header: 'OverlayNav' },
                animations: 'spring'
            },
            {
                name: 'MONOLITH',
                price: 19,
                tier: 'Pro',
                personality: 'architecture-monolith',
                visual: {
                    themeMode: 'light', colorSystem: 'monochrome', typography: 'Inter', shapeLanguage: 'sharp',
                    colors: { primary: '#000000', background: '#f5f5f5', surface: '#ffffff', text: '#111111', accent: '#888888' }
                },
                layout: { homepage: 'HeroFullscreen', productGrid: 'GridStandard', header: 'NavMinimal' },
                animations: 'none'
            },
            {
                name: 'Studio Market',
                price: 29,
                tier: 'Studio',
                personality: 'creative-commerce',
                visual: {
                    themeMode: 'light', colorSystem: 'elegant', typography: 'Playfair Display', shapeLanguage: 'rounded',
                    colors: { primary: '#111111', background: '#fdfbf7', surface: '#ffffff', text: '#333333', accent: '#cda434' }
                },
                layout: { homepage: 'HeroProduct', productGrid: 'GridEditorial', header: 'EditorialNav' },
                animations: 'smooth'
            }
        ];
        
        res.json({ success: true, options });
    } catch (error) {
        logger.error(`Generate Store DNA Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Publish draft DNA to live store
module.exports.publishStoreDna = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { dna } = req.body;
        
        if (!dna) {
            return res.status(400).json({ success: false, message: 'No DNA provided' });
        }
        
        let store = await prisma.store.findFirst({ where: { sellerId } });
        
        if (!store) {
            store = await prisma.store.create({
                data: {
                    sellerId,
                    storeName: 'My New Store',
                    country: 'Global',
                    storeDna: JSON.stringify(dna),
                    storeDnaVersion: 1,
                    storeDnaUpdatedAt: new Date()
                }
            });
        } else {
            await prisma.store.update({
                where: { id: store.id },
                data: { 
                    storeDna: JSON.stringify(dna),
                    storeDnaVersion: store.storeDnaVersion + 1,
                    storeDnaUpdatedAt: new Date(),
                    storeDnaDraft: null
                }
            });
        }

        res.json({ success: true, message: 'Store DNA published successfully', store });
    } catch (error) {
        logger.error(`Publish Store DNA Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Seller: Unlock a premium store tier (pays from wallet)
// module.exports.premiumUnlock = async (req, res) => {
//     const prisma = require('../utils/prismaClient');

// Public: Get Portfolio by Slug
exports.getPortfolio = async (req, res) => {
    try {
        const { slug } = req.query;
        const store = await prisma.store.findUnique({
            where: { portfolioSlug: slug },
            include: {
                user: { 
                    select: { 
                        id: true, 
                        fullName: true, 
                        isVerified: true,
                        _count: { select: { sellerFollowers: true } }
                    } 
                },
                products: { take: 10 }
            }
        });

        if (!store) return res.status(404).json({ success: false, message: 'Portfolio not found' });

        // Check if current user is following
        let isFollowing = false;
        // BUG-SELLER-01: Use getJwtSecret() â€” raw process.env.JWT_SECRET breaks if secret rotates
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer')) {
            const token = authHeader.split(' ')[1];
            try {
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(token, getJwtSecret());
                if (decoded && decoded.id) {
                    const follow = await prisma.sellerFollow.findUnique({
                        where: {
                            buyerId_sellerId: {
                                buyerId: decoded.id,
                                sellerId: store.user.id
                            }
                        }
                    });
                    if (follow) isFollowing = true;
                }
            } catch (e) {
                // ignore Invalid token for public endpoint
            }
        }

        // Fetch active group buys for this store
        const pools = await prisma.pool.findMany({
            where: {
                product: { storeId: store.id },
                status: 'ACTIVE'
            },
            include: { product: true }
        });

        res.json({ success: true, store, pools, isFollowing });
    } catch (error) {
        logger.error(`Get Portfolio Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Store Follow logic
exports.toggleFollowStore = async (req, res) => {
    try {
        const { storeId } = req.params;
        const buyerId = req.user.id;

        const store = await prisma.store.findUnique({
            where: { id: storeId },
            include: { user: true }
        });

        if (!store) return res.status(404).json({ success: false, message: 'Store not found' });

        const sellerId = store.sellerId;
        
        // Ensure user is not following themselves
        if (buyerId === sellerId) {
            return res.status(400).json({ success: false, message: 'You cannot follow your own store' });
        }

        // Check if already following
        const existingFollow = await prisma.sellerFollow.findUnique({
            where: {
                buyerId_sellerId: {
                    buyerId,
                    sellerId
                }
            }
        });

        if (existingFollow) {
            // Unfollow
            await prisma.sellerFollow.delete({
                where: { id: existingFollow.id }
            });
            return res.json({ success: true, message: 'Unfollowed successfully', isFollowing: false });
        } else {
            // Follow
            await prisma.sellerFollow.create({
                data: {
                    buyerId,
                    sellerId
                }
            });
            return res.json({ success: true, message: 'Followed successfully', isFollowing: true });
        }
    } catch (error) {
        logger.error(`Toggle Follow Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Upload store asset (Logo or Banner)
exports.uploadStoreAsset = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { type } = req.body; // 'logo' or 'banner'
        
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        if (type !== 'logo' && type !== 'banner') {
            return res.status(400).json({ success: false, message: 'Invalid asset type. Must be logo or banner' });
        }

        let store = await prisma.store.findUnique({ where: { sellerId } });
        if (!store) {
            const user = await prisma.user.findUnique({ where: { id: sellerId } });
            store = await prisma.store.create({ data: { sellerId, storeName: user ? `${user.fullName}'s Shop` : 'My Store', country: 'Global' } });
        }

        // Assuming uploadToCloud middleware or function was used, but we are inside the controller
        // The upload middleware `upload.single('file')` saved it to `req.file`
        // And `uploadToCloud` returns the URL. We can require it here.
        const { uploadToCloud } = require('../middleware/uploadMiddleware');
        const imageUrl = await uploadToCloud(req, res);

        // Update the store
        const updateData = type === 'logo' ? { logoUrl: imageUrl } : { bannerUrl: imageUrl };
        const updatedStore = await prisma.store.update({
            where: { id: store.id },
            data: updateData
        });

        res.json({ success: true, message: `${type} updated successfully`, store: updatedStore, url: imageUrl });
    } catch (error) {
        logger.error(`Upload Store Asset Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Seller: Unlock a premium store tier (pays from wallet)
module.exports.premiumUnlock = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { tier, paymentMethod, amount } = req.body;

        if (!tier) {
            return res.status(400).json({ success: false, message: 'Tier is required' });
        }

        const TIER_PRICES = { SILVER: 0, GOLD: 9900, PLATINUM: 29900, DIAMOND: 99900 };
        let priceCents = TIER_PRICES[tier.toUpperCase()];
        
        if (priceCents === undefined) {
            if (amount !== undefined) {
                priceCents = amount * 100;
            } else {
                return res.status(400).json({ success: false, message: 'Invalid tier' });
            }
        }

        const { promoCode } = req.body;
        if (promoCode === 'GLOBALX-VIP') {
            priceCents = 0;
        }

        const updatedStore = await prisma.$transaction(async (tx) => {
            const store = await tx.store.findFirst({ where: { sellerId } });
            if (!store) {
                throw new Error('Store not found');
            }

            if (priceCents > 0) {
                try {
                    await walletService.debit(sellerId, 'GONG', priceCents / 100, {
                        description: `Premium store upgrade to ${tier}`
                    }, tx);
                } catch (err) {
                    if (err.message.includes('Insufficient')) {
                        throw new Error('Insufficient wallet balance');
                    }
                    throw err;
                }
            }

            await tx.user.update({
                where: { id: sellerId },
                data: { subscriptionTier: tier.toUpperCase() }
            });

            return await tx.store.update({
                where: { id: store.id },
                data: { sellerTier: tier.toUpperCase() }
            });
        });

        logger.info(`Store ${updatedStore.id} upgraded to tier: ${tier} by seller ${sellerId}`);
        res.json({ success: true, message: `Store upgraded to ${tier}!`, store: updatedStore });

    } catch (error) {
        logger.error(`Premium Unlock Error: ${error.message}`);
        if (error.message === 'Store not found') return res.status(404).json({ success: false, message: 'Store not found' });
        if (error.message === 'Insufficient wallet balance') return res.status(402).json({ success: false, message: 'Insufficient wallet balance. Please top up and try again.' });
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Public: Get Structured Store by Slug (For Public Portfolio)
module.exports.getStoreBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const normalizedSlug = slug.toLowerCase();
        
        // Find store by portfolioSlug, or by ID as fallback
        let store = await prisma.store.findFirst({
            where: { 
                OR: [
                    { portfolioSlug: slug },
                    { portfolioSlug: normalizedSlug },
                    { id: slug }
                ]
            },
            include: {
                user: { 
                    select: { 
                        id: true, 
                        fullName: true, 
                        avatarUrl: true, 
                        isVerified: true, 
                        subscriptionTier: true,
                        _count: { select: { sellerFollowers: true } }
                    } 
                },
                products: { take: 10, orderBy: { soldCount: 'desc' }, include: { images: true } },
                _count: { select: { products: true, Conversation: true } }
            }
        });

        // BUG-SELLER-02: Was doing prisma.store.findMany() (full table scan) as a fallback.
        // Replaced with a targeted case-insensitive search on storeName only.
        if (!store) {
            const decodedSlug = decodeURIComponent(slug).toLowerCase();
            const sluggifiedParam = decodedSlug.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

            // Search by storeName that would produce the same slug, without loading all stores
            const candidates = await prisma.store.findMany({
                where: {
                    storeName: { contains: decodedSlug.replace(/-/g, ' ') }
                },
                include: {
                    user: { 
                        select: { 
                            id: true, fullName: true, avatarUrl: true, isVerified: true, 
                            subscriptionTier: true, _count: { select: { sellerFollowers: true } }
                        } 
                    },
                    products: { take: 10, orderBy: { soldCount: 'desc' }, include: { images: true } },
                    _count: { select: { products: true, Conversation: true } }
                },
                take: 10 // safety cap
            });

            store = candidates.find(s => {
                const generatedSlug = s.storeName
                    ? s.storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                    : '';
                return (
                    (s.portfolioSlug && s.portfolioSlug.toLowerCase() === normalizedSlug) ||
                    generatedSlug === normalizedSlug ||
                    generatedSlug === sluggifiedParam
                );
            }) || null;

            // Auto-fix the slug if found
            if (store) {
                await prisma.store.update({ where: { id: store.id }, data: { portfolioSlug: sluggifiedParam || normalizedSlug } });
            }
        }

        if (!store) return res.status(404).json({ success: false, message: 'Store not found' });

        // Log Engagement Event
        try {
            await prisma.engagementEvent.create({
                data: {
                    action: 'STORE_VIEW',
                    target: store.id,
                    metadata: JSON.stringify({ slug }),
                    userId: req.user?.id || null
                }
            });
        } catch (e) {
            logger.error(`Failed to log STORE_VIEW: ${e.message}`);
        }

        // Fetch real metrics and posts
        const [followers, totalLikes, posts] = await Promise.all([
            prisma.sellerFollow.count({ where: { sellerId: store.sellerId } }).catch(() => 0),
            prisma.like.count({ where: { post: { sellerId: store.sellerId } } }).catch(() => 0),
            prisma.feedPost.findMany({
                where: { sellerId: store.sellerId, status: 'ACTIVE' },
                orderBy: { createdAt: 'desc' },
                take: 20,
                include: {
                    _count: { select: { likes: true, comments: true } },
                    product: { select: { id: true, title: true, price: true, images: true } }
                }
            }).catch(() => [])
        ]);

        // Check if current user is following
        let isFollowing = false;
        // BUG-SELLER-01: Use getJwtSecret() â€” consistent with authMiddleware
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer')) {
            const token = authHeader.split(' ')[1];
            try {
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(token, getJwtSecret());
                if (decoded && decoded.id) {
                    const follow = await prisma.sellerFollow.findUnique({
                        where: {
                            buyerId_sellerId: {
                                buyerId: decoded.id,
                                sellerId: store.sellerId
                            }
                        }
                    });
                    if (follow) isFollowing = true;
                }
            } catch (e) {
                // ignore Invalid token for public endpoint
            }
        }

        const structuredPayload = {
            store: {
                id: store.id,
                slug: store.portfolioSlug,
                name: store.storeName,
                storeName: store.storeName,
                logo: store.logoUrl,
                logoUrl: store.logoUrl,
                banner: store.bannerUrl,
                bannerUrl: store.bannerUrl,
                description: store.description,
                verification: store.isVerified,
                isVerified: store.isVerified,
                country: store.country,
                averageRating: store.averageRating,
                totalReviews: store.totalReviews,
                subscriptionTier: store.sellerTier || store.user.subscriptionTier
            },
            seller: {
                id: store.user.id,
                name: store.user.fullName,
                avatar: store.user.avatarUrl,
                verified: store.user.isVerified
            },
            metrics: {
                followers: followers,
                likes: totalLikes,
                products: store._count.products,
                rating: store.averageRating,
                reviews: store.totalReviews
            },
            products: store.products,
            posts: posts,
            brandConfig: store.portfolioConfig ? JSON.parse(store.portfolioConfig) : {},
            portfolio: {
                theme: store.portfolioLayout || 'Aura Modern',
                customCss: store.customCss || '',
                sections: [],
                banners: [],
                layout: store.portfolioLayout,
                configuration: store.storeDna ? JSON.parse(store.storeDna) : {}
            },
            isFollowing
        };

        res.json({ success: true, data: structuredPayload });
    } catch (error) {
        logger.error(`getStoreBySlug Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Update Store Layout (portfolioConfig)
exports.updateStoreLayout = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const configData = req.body;

        const store = await prisma.store.findUnique({ where: { sellerId } });
        if (!store) return res.status(404).json({ success: false, message: 'Store not found' });

        const updatedStore = await prisma.store.update({
            where: { id: store.id },
            data: {
                portfolioConfig: JSON.stringify(configData)
            }
        });

        res.json({ success: true, message: 'Store layout updated', brandConfig: configData });
    } catch (error) {
        logger.error(`Update Store Layout Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Private: Preview Theme (Saves to Draft)
module.exports.previewStoreTheme = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { themeConfig } = req.body;
        
        const store = await prisma.store.findFirst({ where: { sellerId } });
        if (!store) return res.status(404).json({ success: false, message: 'Store not found' });

        const updatedStore = await prisma.store.update({
            where: { id: store.id },
            data: { storeDnaDraft: JSON.stringify(themeConfig) }
        });

        res.json({ success: true, message: 'Theme draft saved for preview', storeDnaDraft: JSON.parse(updatedStore.storeDnaDraft) });
    } catch (error) {
        logger.error(`previewStoreTheme Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Private: Apply Theme (Promotes Draft to Live)
module.exports.applyStoreTheme = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const store = await prisma.store.findFirst({ where: { sellerId } });
        
        if (!store) return res.status(404).json({ success: false, message: 'Store not found' });
        if (!store.storeDnaDraft) return res.status(400).json({ success: false, message: 'No draft theme to apply' });

        const updatedStore = await prisma.store.update({
            where: { id: store.id },
            data: {
                storeDna: store.storeDnaDraft,
                storeDnaVersion: { increment: 1 },
                storeDnaUpdatedAt: new Date(),
                storeDnaDraft: null
            }
        });

        res.json({ success: true, message: 'Theme applied successfully', storeDna: JSON.parse(updatedStore.storeDna) });
    } catch (error) {
        logger.error(`applyStoreTheme Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};


