const express = require('express');
const router = express.Router();
const rewardController = require('../controllers/rewardController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/inputValidation');

router.get('/me', protect, rewardController.getMyRewards);
router.post('/grant', protect, authorize('ADMIN'), validate('rewardGrant'), rewardController.grantReward);
router.post('/rules', protect, authorize('ADMIN'), validate('rewardRule'), rewardController.upsertRule);

module.exports = router;
