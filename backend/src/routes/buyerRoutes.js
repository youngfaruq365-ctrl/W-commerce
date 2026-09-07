const express = require('express');
const router = express.Router();
const buyerController = require('../controllers/buyerController');
const buyerNotificationController = require('../controllers/buyerNotificationController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require seller authentication
router.use(protect);
router.use(authorize('SELLER', 'ADMIN'));

// Buyer management routes
router.get('/buyers/summary', buyerController.getSellerBuyerSummary);
router.get('/buyers', buyerController.getSellerBuyers);
router.get('/buyers/:buyerId/intelligence', buyerController.getBuyerIntelligence);
router.get('/buyers/:buyerId/orders', buyerController.getBuyerOrders);
router.get('/buyers/:buyerId/notifications', buyerController.getBuyerNotifications);
router.put('/buyers/:buyerId/notification-prefs', buyerController.updateBuyerNotificationPrefs);

// Notification management routes
router.post('/notifications', buyerNotificationController.createNotification);
router.post('/notifications/:notificationId/read', buyerNotificationController.markAsRead);
router.post('/buyers/:buyerId/notifications/mark-all-read', buyerNotificationController.markAllAsRead);
router.get('/notifications/stream', buyerNotificationController.getNotificationStream);
router.get('/notifications/stats', buyerNotificationController.getSellerNotificationStats);

module.exports = router;
