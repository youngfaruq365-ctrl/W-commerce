const express = require('express');
const router = express.Router();
const templateController = require('../controllers/templateController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('SELLER'));

router.get('/', templateController.getMyTemplates);
router.post('/:id/customize', templateController.customizeTemplate);
router.post('/:id/apply', templateController.applyTemplate);
router.post('/:id/unapply', templateController.unapplyTemplate);

module.exports = router;
