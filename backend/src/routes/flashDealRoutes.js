const express = require('express');
const router = express.Router();
const flashDealController = require('../controllers/flashDealController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/inputValidation');

// Public routes
router.get('/active', flashDealController.getActiveFlashDeals);
router.get('/stats', flashDealController.getDealsStats);
router.get('/paginated', flashDealController.getDealsForPagination);
router.get('/seasonal-suggestions', flashDealController.getSeasonalSuggestions);
router.get('/:id', flashDealController.getFlashDeal);
router.post('/:id/view', flashDealController.trackFlashDealView);
router.post('/:id/click', flashDealController.trackFlashDealClick);
router.post('/:id/sale', flashDealController.recordFlashDealSale);

// Protected routes - Sellers only
router.use(protect);
router.use(authorize('SELLER', 'ADMIN'));

router.post('/', validate('createFlashDeal', 'body'), flashDealController.createFlashDeal);
router.get('/', flashDealController.getSellerFlashDeals);
router.put('/:id', validate('uuidParam', 'params'), flashDealController.updateFlashDeal);
router.delete('/:id', validate('uuidParam', 'params'), flashDealController.deleteFlashDeal);

module.exports = router;
