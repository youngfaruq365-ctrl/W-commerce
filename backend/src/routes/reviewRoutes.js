const express = require('express');
 const router = express.Router();
 const reviewController = require('../controllers/reviewController');
 const { protect, authorize } = require('../middleware/authMiddleware');
 const uploadMiddleware = require('../middleware/uploadMiddleware');

 router.get('/featured', reviewController.getGlobalFeaturedReviews);
 router.get('/product/:productId', reviewController.getProductReviews);
 router.get('/my-reviews', protect, reviewController.getMyReviews);
 router.get('/seller', protect, authorize('SELLER', 'ADMIN'), reviewController.getSellerReviews);
 router.post('/', protect, reviewController.createReview);
 router.put('/feature/:id', protect, authorize('SELLER', 'ADMIN'), reviewController.toggleFeatureReview);
 router.put('/reply/:id', protect, authorize('SELLER', 'ADMIN'), reviewController.replyToReview);
 router.post('/:id/appeal', protect, authorize('SELLER', 'ADMIN'), reviewController.appealReview);
 router.delete('/:id', protect, reviewController.deleteReview);

 // Feature 7: Engagement
 router.post('/:id/helpful', protect, reviewController.toggleHelpful);
 router.post('/:id/report', protect, reviewController.reportReview);

 module.exports = router;
