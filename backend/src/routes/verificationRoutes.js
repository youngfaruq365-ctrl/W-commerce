const express = require('express');
const router = express.Router();
const verificationController = require('../controllers/verificationController');
const { protect } = require('../middleware/authMiddleware');

router.get('/my-status', protect, verificationController.getMyVerifications);
router.post('/submit', protect, verificationController.submitVerification);
router.get('/tiers', verificationController.getTierBenefits);

module.exports = router;
