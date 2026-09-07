const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');
const rateLimit = require('express-rate-limit');

// Rate limiting: 20 requests per 15 minutes per IP
const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { success: false, message: 'Too many requests to AI Assistant. Please try again later.' }
});

router.post('/chat', protect, aiLimiter, aiController.chat);
router.post('/generate-banner', protect, aiLimiter, aiController.generateBanner);
router.post('/product-description', protect, aiLimiter, aiController.generateProductDescription);
router.post('/seller-recommendations', protect, aiLimiter, aiController.generateSellerRecommendations);
router.get('/recommendations', protect, aiLimiter, aiController.getBuyerRecommendations);
router.post('/tools/:toolId', protect, aiLimiter, aiController.useTool);

module.exports = router;
