const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { protect, requirePaidAccess } = require('../middleware/authMiddleware');

router.get('/', protect, cartController.getCart);
router.post('/', protect, cartController.addToCart);
router.post('/add', protect, cartController.addToCart);
router.post('/update', protect, cartController.updateQuantity);
router.post('/remove', protect, cartController.removeFromCart);
router.post('/sync', protect, cartController.syncCart);
router.post('/verify', protect, cartController.verifyCartPrices);
router.get('/optimize', protect, cartController.optimizeCart);

module.exports = router;
