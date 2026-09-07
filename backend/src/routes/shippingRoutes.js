const express = require('express');
const router = express.Router();
const shippingController = require('../controllers/shippingController');
const { protect } = require('../middleware/authMiddleware'); // Ensure user is logged in

router.post('/validate-address', protect, shippingController.validateAddress);
router.post('/landed-cost', protect, shippingController.calculateLandedCost);

module.exports = router;
