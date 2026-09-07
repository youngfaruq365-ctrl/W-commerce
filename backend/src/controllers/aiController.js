const aiService = require('../services/aiService');
const bannerService = require('../services/bannerService');
const logger = require('../utils/logger');
const prisma = require('../utils/prismaClient');
const { trackAIUsage } = require('../utils/aiUsageTracker');

// Helper to verify store ownership
const verifyStoreOwnership = async (req, res) => {
    try {
        const store = await prisma.store.findFirst({ where: { sellerId: req.user.id } });
        if (!store) {
            res.status(403).json({ success: false, message: 'You must own a store to use this feature' });
            return null;
        }
        return store;
    } catch (error) {
        logger.error(`verifyStoreOwnership error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Internal server error' });
        return null;
    }
};

exports.chat = async (req, res) => {
    try {
        const { messages } = req.body;
        
        if (!Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ success: false, message: 'Messages array is required' });
        }

        const reply = await aiService.generateChatResponse(messages);
        
        res.json({ success: true, reply });
    } catch (error) {
        logger.error(`AI Controller Error: ${error.message}`);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.generateBanner = async (req, res) => {
    try {
        const store = await verifyStoreOwnership(req, res);
        if (!store) return;

        const { prompt } = req.body;
        const imageUrl = await bannerService.generateBanner(prompt);
        
        // Save asset formally
        const asset = await prisma.storeAsset.create({
            data: {
                storeId: store.id,
                assetUrl: imageUrl,
                type: 'BANNER'
            }
        });

        await trackAIUsage({ userId: req.user.id, storeId: store.id, tool: 'generate-banner', inputTokens: 50, outputTokens: 1 });

        res.json({ success: true, asset });
    } catch (error) {
        logger.error(`Generate Banner Error: ${error.message}`);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.generateProductDescription = async (req, res) => {
    try {
        const store = await verifyStoreOwnership(req, res);
        if (!store) return;

        const { productName, category, features, tone, language, length } = req.body;
        
        const prompt = `Write a product description in JSON format with fields: title, description, highlights (array), seoTitle, seoDescription, tags (array).
Product: ${productName}
Category: ${category}
Features: ${features ? (Array.isArray(features) ? features.join(', ') : features) : 'None'}
Tone: ${tone}
Length: ${length}
Language: ${language}
Respond ONLY with valid JSON.`;

        const reply = await aiService.generateChatResponse([{ role: 'user', content: prompt }]);
        let parsed = {};
        try {
            parsed = JSON.parse(reply.replace(/```json|```/g, '').trim());
        } catch(e) {
            // fallback if JSON parse fails
            parsed = { title: productName, description: reply, highlights: [], seoTitle: productName, seoDescription: '', tags: [] };
        }

        await trackAIUsage({ userId: req.user.id, storeId: store.id, tool: 'product-description', inputTokens: 100, outputTokens: 250 });

        res.json({ success: true, data: parsed });
    } catch (error) {
        logger.error(`Product Description Error: ${error.message}`);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.generateSellerRecommendations = async (req, res) => {
    try {
        const store = await verifyStoreOwnership(req, res);
        if (!store) return;

        // Fetch actual analytics from EngagementEngine
        const views = await prisma.engagementEvent.count({ where: { target: store.id, action: 'STORE_VIEW' } });
        const orders = await prisma.order.count({ where: { sellerId: req.user.id } });
        const productsCount = await prisma.product.count({ where: { storeId: store.id } });

        const prompt = `Analyze this seller's store and give 3 short actionable recommendations to increase sales.
Store Views: ${views}
Total Orders: ${orders}
Total Products: ${productsCount}`;

        const reply = await aiService.generateChatResponse([{ role: 'user', content: prompt }]);

        await trackAIUsage({ userId: req.user.id, storeId: store.id, tool: 'seller-recommendations', inputTokens: 100, outputTokens: 150 });

        res.json({ success: true, recommendations: reply });
    } catch (error) {
        logger.error(`Seller Recs Error: ${error.message}`);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getBuyerRecommendations = async (req, res) => {
    try {
        // Mock recommendation generation based on AI logic for the buyer
        const recommendations = {
            browsing: [1, 2, 3, 4], // Return mock IDs or items based on logic
            trending: [9, 10, 11, 12],
            alsoBought: [5, 6, 7, 8],
            completeCollection: [11, 12, 1, 2]
        };
        await trackAIUsage({ userId: req.user.id, storeId: null, tool: 'buyer-recommendations', inputTokens: 50, outputTokens: 50 });
        res.json({ success: true, recommendations });
    } catch (error) {
        logger.error(`Buyer Recs Error: ${error.message}`);
        res.status(500).json({ success: false, message: error.message });
    }
};

const AISellerToolRegistry = {
    'ad-copy': 'Write engaging ad copy',
    'seo-tags': 'Generate SEO keywords and meta tags',
    'social-caption': 'Write a catchy social media caption',
    'email-campaign': 'Write a promotional email campaign'
};

exports.useTool = async (req, res) => {
    try {
        const store = await verifyStoreOwnership(req, res);
        if (!store) return;

        const { toolId } = req.params;
        const context = req.body;

        if (!AISellerToolRegistry[toolId]) {
            return res.status(400).json({ success: false, message: 'Invalid or unregistered AI tool.' });
        }

        const prompt = `${AISellerToolRegistry[toolId]}. Context: ${JSON.stringify(context)}`;
        const reply = await aiService.generateChatResponse([{ role: 'user', content: prompt }]);

        await trackAIUsage({ userId: req.user.id, storeId: store.id, tool: toolId, inputTokens: 100, outputTokens: 200 });

        res.json({ success: true, reply });
    } catch (error) {
        logger.error(`AI Tool Error: ${error.message}`);
        res.status(500).json({ success: false, message: error.message });
    }
};
