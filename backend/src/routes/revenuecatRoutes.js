const express = require('express');
const router = express.Router();
const revenuecatWebhookController = require('../controllers/revenuecatWebhookController');
const revenuecatService = require('../services/revenuecatService');
const { protect } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

// Webhook endpoint (raw body must be parsed outside this router if using express.raw, but we assume it's passed here)
router.post('/webhook', revenuecatWebhookController.handleWebhook);

// Get RevenueCat offerings (proxy for frontend if needed, though frontend SDK usually fetches directly)
router.get('/offerings', protect, async (req, res) => {
    try {
        // Here we could return the RevenueCat Web Billing URL or Public API Key
        // For Web Billing links, the URL format is typically: 
        // https://pay.revenuecat.com/p/project_id?app_user_id={userId}
        
        // Alternatively we return the RevenueCat public API key for the frontend to initialize Purchases SDK
        res.json({ 
            success: true, 
            revenuecat_api_key_public: process.env.REVENUECAT_PUBLIC_KEY || '',
            app_user_id: req.user.id
        });
    } catch (error) {
        logger.error(`Get Offerings Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to fetch offerings configuration' });
    }
});

// Verify subscription explicitly (if frontend wants to trigger a manual refresh)
router.post('/verify', protect, async (req, res) => {
    try {
        const customerInfo = await revenuecatService.getSubscriber(req.user.id);
        const result = await revenuecatService.updateUserSubscription(req.user.id, customerInfo.subscriber);
        
        res.json({
            success: true,
            active: result.active,
            tier: result.tier,
            message: result.active ? `Verified active ${result.tier} subscription` : 'No active subscription found'
        });
    } catch (error) {
        logger.error(`Verify Subscription Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to verify subscription' });
    }
});

// Get current subscription status from RevenueCat
router.get('/status', protect, async (req, res) => {
    try {
        const customerInfo = await revenuecatService.getSubscriber(req.user.id);
        res.json({
            success: true,
            entitlements: customerInfo.subscriber.entitlements
        });
    } catch (error) {
        logger.error(`Get Subscription Status Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to fetch subscription status' });
    }
});

module.exports = router;
// Expose the webhook handler separately for raw body mounting in app.cjs
module.exports.webhookHandler = revenuecatWebhookController.handleWebhook;
