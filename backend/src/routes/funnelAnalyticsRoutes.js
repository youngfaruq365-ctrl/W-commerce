const express = require('express');
const router = express.Router();
const funnelAnalyticsController = require('../controllers/funnelAnalyticsController');

// Public route to track funnel events
router.post('/funnel-event', funnelAnalyticsController.trackEvent);
router.post('/funnel', funnelAnalyticsController.trackEvent); // alias used by funnel.html

// Admin/Public route to fetch analytics
router.get('/funnel-analytics', funnelAnalyticsController.getAnalytics);
router.get('/stats', funnelAnalyticsController.getAnalytics); // alias used by funnel.html

module.exports = router;
