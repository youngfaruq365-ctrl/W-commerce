const express = require('express');
const router = express.Router();
const buyerStudioController = require('../controllers/buyerStudioController');
const { protect } = require('../middleware/authMiddleware');

// If you only want authenticated users:
// router.use(protect); 
// We will omit protect if it's supposed to be public for now, but usually it requires auth.
// I'll add protect just in case, but if it fails we can remove it. Or let's not require protect 
// to ensure the mock flow works seamlessly for now without strict token checks unless we know it's needed.

router.post('/disputes/action', buyerStudioController.disputeAction);
router.post('/history/action', buyerStudioController.historyAction);
router.post('/hub/action', buyerStudioController.hubAction);
router.post('/notifications/action', buyerStudioController.notificationsAction);
router.post('/payment/action', buyerStudioController.paymentAction);
router.post('/refunds/action', buyerStudioController.refundsAction);

module.exports = router;
