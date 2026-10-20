const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Get seller performance metrics
router.get('/', protect, authorize('SELLER', 'ADMIN'), analyticsController.getSellerAnalytics);
router.get('/performance', protect, authorize('SELLER', 'ADMIN'), analyticsController.getSellerAnalytics);
router.get('/top-products', protect, authorize('SELLER', 'ADMIN'), analyticsController.getTopProducts);
router.get('/sales-by-period', protect, authorize('SELLER', 'ADMIN'), analyticsController.getSalesByPeriod);
router.get('/weekly-summary', protect, authorize('SELLER', 'ADMIN'), analyticsController.getWeeklySummary);
router.get('/alerts', protect, authorize('SELLER', 'ADMIN'), analyticsController.getPerformanceAlerts);

// Update performance score and check alerts
router.post('/update-score', protect, authorize('SELLER', 'ADMIN'), analyticsController.updatePerformanceScore);

// Generate insights
router.get('/insights', protect, authorize('SELLER', 'ADMIN'), analyticsController.generateInsights);

module.exports = router;
