const express = require('express');
const router = express.Router();
const storeController = require('../controllers/storeController');
const templateController = require('../controllers/templateController');

router.get('/:storeId/active-templates', templateController.getActiveStoreTemplates);
router.get('/portfolio', storeController.getPortfolio);
router.get('/profile-link', storeController.getSellerProfile);
router.get('/details', storeController.getStoreDetailsById);
router.get('/verified', storeController.getVerifiedStores);


router.get('/search', storeController.searchStores);

const { protect } = require('../middleware/authMiddleware');
const { upload, antivirusScan } = require('../middleware/uploadMiddleware');

router.get('/profile', protect, storeController.getStoreProfile);
router.put('/profile', protect, storeController.updateStoreProfile);
router.put('/layout', protect, storeController.updateStoreLayout);
router.post('/profile/dna/generate', protect, storeController.generateStoreDnaDraft);
router.post('/profile/dna/surprise', protect, storeController.generateSurpriseStoreDna);
router.post('/profile/dna/publish', protect, storeController.publishStoreDna);
router.post('/premium-unlock', protect, storeController.premiumUnlock);
router.post('/theme/preview', protect, storeController.previewStoreTheme);
router.post('/theme/apply', protect, storeController.applyStoreTheme);
router.get('/by-slug/:slug', storeController.getStoreBySlug);

// Store follow and asset upload
router.post('/:storeId/follow', protect, storeController.toggleFollowStore);
router.post('/upload-asset', protect, upload.single('file'), antivirusScan, storeController.uploadStoreAsset);

module.exports = router;
