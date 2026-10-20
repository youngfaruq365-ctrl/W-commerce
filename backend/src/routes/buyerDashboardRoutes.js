const express = require('express');
const router = express.Router();
const buyerDashboardController = require('../controllers/buyerDashboardController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/support/action', buyerDashboardController.supportAction);
router.post('/messages/action', buyerDashboardController.messagesAction);
router.post('/security/action', buyerDashboardController.securityAction);
router.post('/preferences/action', buyerDashboardController.preferencesAction);
router.post('/addresses/action', buyerDashboardController.addressesAction);
router.post('/orders/action', buyerDashboardController.ordersAction);

router.post('/reviews/action', buyerDashboardController.genericAction);
router.post('/shops/action', buyerDashboardController.genericAction);
router.post('/tracking/action', buyerDashboardController.genericAction);
router.post('/wallet/action', buyerDashboardController.genericAction);
router.post('/wishlist/action', buyerDashboardController.genericAction);

module.exports = router;
