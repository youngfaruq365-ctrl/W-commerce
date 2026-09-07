const express = require('express');
const router = express.Router();
const buyerRequestController = require('../controllers/buyerRequestController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/inputValidation');

router.post('/', protect, authorize('BUYER', 'ADMIN'), validate('createBuyerRequest', 'body'), buyerRequestController.createBuyerRequest);
router.get('/my', protect, authorize('BUYER', 'ADMIN'), buyerRequestController.getMyBuyerRequests);
router.get('/trending', protect, buyerRequestController.getTrendingDemandFeed);
router.get('/', protect, authorize('SELLER', 'ADMIN'), buyerRequestController.getMarketplaceBuyerRequests);
router.get('/seller-insights', protect, authorize('SELLER', 'ADMIN'), buyerRequestController.getSellerDemandInsights);
router.post('/:requestId/respond', protect, authorize('SELLER', 'ADMIN'), buyerRequestController.respondToBuyerRequest);

module.exports = router;
