const express = require('express');
const router = express.Router();
const sellerStudioController = require('../controllers/sellerStudioController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/freight', sellerStudioController.requestFreight);
router.get('/freight', sellerStudioController.getFreightRequests);
router.post('/freight/offer/:offerId/accept', sellerStudioController.acceptFreightOffer);
router.post('/freight/offer/:offerId/reject', sellerStudioController.rejectFreightOffer);
router.post('/freight/offer/:offerId/:action', (req, res, next) =>
    req.params.action === 'accept'
        ? sellerStudioController.acceptFreightOffer(req, res, next)
        : sellerStudioController.rejectFreightOffer(req, res, next)
);
router.post('/preferences', sellerStudioController.savePreferences);
router.post('/generate-store', sellerStudioController.generateStore);
router.post('/withdraw', sellerStudioController.withdrawFunds);

router.post('/export-orders', sellerStudioController.exportOrders);
router.post('/import-buyers', sellerStudioController.importBuyers);

module.exports = router;
