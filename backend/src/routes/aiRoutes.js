const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { protect, optionalProtect } = require('../middleware/authMiddleware');
const rateLimit = require('express-rate-limit');

// Rate limiting: 120 requests per 15 minutes per IP for real-time AI chat
const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    message: { success: false, message: 'Too many requests to AI Assistant. Please try again later.' }
});

router.post('/', optionalProtect, aiLimiter, aiController.chat);
router.post('/chat', optionalProtect, aiLimiter, aiController.chat);
router.post('/stream', optionalProtect, aiLimiter, aiController.streamChat);
router.post('/generate-banner', protect, aiLimiter, aiController.generateBanner);
router.post('/generate-product', protect, aiLimiter, aiController.generateProduct);
router.post('/product-description', protect, aiLimiter, aiController.generateProductDescription);
router.post('/seller-recommendations', protect, aiLimiter, aiController.generateSellerRecommendations);
router.get('/recommendations', protect, aiLimiter, aiController.getBuyerRecommendations);
router.post('/tools/:toolId', protect, aiLimiter, aiController.useTool);

// Ultra Seller AI Features
router.get('/ultra-online-buyers', protect, aiController.getUltraOnlineBuyers);
router.post('/ultra-product-seekers', protect, aiController.findProductSeekers);

router.post('/inventory-insights', optionalProtect, aiController.getInventoryInsights);

module.exports = router;
