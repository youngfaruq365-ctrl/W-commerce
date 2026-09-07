const express = require('express');
const router = express.Router();
const adminEconomyController = require('../controllers/adminEconomyController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/inputValidation');

router.use(protect, authorize('ADMIN'));

router.get('/overview', adminEconomyController.overview);
router.post('/conversion-rate', validate('conversionRate'), adminEconomyController.setConversionRate);
router.post('/reward-rule', validate('rewardRule'), adminEconomyController.setRewardRule);
router.post('/wallet/freeze', validate('walletFreeze'), adminEconomyController.freezeWallet);
router.post('/wallet/unfreeze', validate('walletFreeze'), adminEconomyController.unfreezeWallet);
router.post('/seed-plans', adminEconomyController.seedPlans);

module.exports = router;
