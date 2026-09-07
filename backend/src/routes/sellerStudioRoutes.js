const express = require('express');
const router = express.Router();
const sellerStudioController = require('../controllers/sellerStudioController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/freight', sellerStudioController.requestFreight);
router.post('/preferences', sellerStudioController.savePreferences);
router.post('/generate-store', sellerStudioController.generateStore);
router.post('/withdraw', sellerStudioController.withdrawFunds);

module.exports = router;
