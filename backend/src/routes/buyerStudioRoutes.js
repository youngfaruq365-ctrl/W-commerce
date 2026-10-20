const express = require('express');
const router = express.Router();
const buyerStudioController = require('../controllers/buyerStudioController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/disputes/action', buyerStudioController.disputeAction);
router.post('/history/action', buyerStudioController.historyAction);
router.post('/hub/action', buyerStudioController.hubAction);
router.post('/notifications/action', buyerStudioController.notificationsAction);
router.post('/payment/action', buyerStudioController.paymentAction);
router.post('/refunds/action', buyerStudioController.refundsAction);

module.exports = router;
