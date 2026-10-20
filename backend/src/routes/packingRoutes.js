const express = require('express');
const router = express.Router();
const packingController = require('../controllers/packingController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Seller routes
router.post('/pack', authorize('SELLER', 'ADMIN'), packingController.markOrderPacked);
router.post('/respond', authorize('SELLER', 'ADMIN'), packingController.sendPackingResponse);
router.get('/to-pack', authorize('SELLER', 'ADMIN'), packingController.getOrdersToPack);
router.get('/packed', authorize('SELLER', 'ADMIN'), packingController.getPackedOrders);

// Buyer routes
router.post('/confirm', authorize('BUYER'), packingController.confirmPackage);
router.post('/report-issue', authorize('BUYER'), packingController.reportPackingIssue);
router.get('/for-confirmation', authorize('BUYER'), packingController.getOrdersForConfirmation);

module.exports = router;