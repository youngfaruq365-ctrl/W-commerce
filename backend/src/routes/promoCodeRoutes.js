const express = require('express');
const router = express.Router();
const promoCodeController = require('../controllers/promoCodeController');
const { protect, authorize } = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');

// Public route - validate promo code at checkout
router.get('/public/:sellerId', promoCodeController.getPublicPromoCodes);

router.post('/validate',
    rateLimiter,
    protect,
    promoCodeController.validatePromoCode
);

// Record promo code usage after order
router.post('/use',
    rateLimiter,
    protect,
    promoCodeController.usePromoCode
);

// Seller routes - require SELLER or ADMIN role
router.post('/',
    rateLimiter,
    protect,
    authorize('SELLER', 'ADMIN'),
    promoCodeController.createPromoCode
);

router.get('/seller',
    rateLimiter,
    protect,
    authorize('SELLER', 'ADMIN'),
    promoCodeController.getSellerPromoCodes
);

router.put('/:id',
    rateLimiter,
    protect,
    authorize('SELLER', 'ADMIN'),
    promoCodeController.updatePromoCode
);

router.delete('/:id',
    rateLimiter,
    protect,
    authorize('SELLER', 'ADMIN'),
    promoCodeController.deletePromoCode
);

router.get('/:id/stats',
    rateLimiter,
    protect,
    authorize('SELLER', 'ADMIN'),
    promoCodeController.getPromoCodeStats
);

module.exports = router;

