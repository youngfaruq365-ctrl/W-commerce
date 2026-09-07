const express = require('express');
const router = express.Router();
const templateController = require('../controllers/templateController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Marketplace routes
router.get('/', templateController.getTemplates);
router.get('/:id', templateController.getTemplate);

// Protected Seller routes
router.use(protect);
router.use(authorize('SELLER'));

router.post('/:id/purchase', templateController.purchaseTemplate);
router.get('/verify-purchase/:reference', templateController.verifyPurchase);

module.exports = router;
