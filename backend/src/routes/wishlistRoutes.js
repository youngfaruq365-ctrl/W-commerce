const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const { protect } = require('../middleware/authMiddleware');

// Get buyer's wishlist
router.get('/', protect, wishlistController.getWishlist);

// Get buyer's wishlist count
router.get('/count', protect, wishlistController.getWishlistCount);

// Add to wishlist
router.post('/:productId', protect, wishlistController.addToWishlist);

// Remove from wishlist
router.delete('/:productId', protect, wishlistController.removeFromWishlist);

// Subscribe to restock notifications
router.post('/:productId/restock-subscribe', protect, wishlistController.subscribeToRestock);

// Add to wishlist via body
router.post('/', protect, wishlistController.addToWishlist);

// Remove from wishlist via body
router.delete('/', protect, wishlistController.removeFromWishlist);

module.exports = router;
