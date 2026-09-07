const express = require('express');
const router = express.Router();
const { performStudioAction } = require('../controllers/adminStudioController');

router.post('/analytics/action', performStudioAction);
router.post('/arbitration/action', performStudioAction);
router.post('/audit/action', performStudioAction);
router.post('/escrow/action', performStudioAction);
router.post('/hub/action', performStudioAction);
router.post('/kyb/action', performStudioAction);
router.post('/kyc/action', performStudioAction);
router.post('/livetx/action', performStudioAction);
router.post('/merchants/action', performStudioAction);
router.post('/promos/action', performStudioAction);
router.post('/revenue/action', performStudioAction);
router.post('/reviews/action', performStudioAction);
router.post('/support/action', performStudioAction);
router.post('/users/action', performStudioAction);

module.exports = router;
