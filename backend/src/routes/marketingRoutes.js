const express = require('express');
const router = express.Router();
const marketingController = require('../controllers/marketingController');

router.get('/promotions', marketingController.getPromotions);
const { protect, authorize } = require('../middleware/authMiddleware');
router.post('/campaigns', protect, authorize('SELLER', 'ADMIN'), marketingController.createCampaign);

module.exports = router;
