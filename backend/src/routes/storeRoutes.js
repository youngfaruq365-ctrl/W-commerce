const express = require('express');
const router = express.Router();
const storeController = require('../controllers/storeController');
const templateController = require('../controllers/templateController');
const { optionalProtect } = require('../middleware/authMiddleware');

router.get('/:storeId/active-templates', templateController.getActiveStoreTemplates);
router.get('/portfolio', storeController.getPortfolio);
router.get('/profile-link', storeController.getSellerProfile);
router.get('/details', optionalProtect, storeController.getStoreDetailsById);
router.get('/', storeController.getPublicStores);
router.get('/verified', storeController.getVerifiedStores);
router.get('/public', storeController.getPublicStores);

router.get('/search', storeController.searchStores);

const { protect } = require('../middleware/authMiddleware');
const { upload, antivirusScan } = require('../middleware/uploadMiddleware');

router.get('/profile', protect, storeController.getStoreProfile);
router.put('/profile', protect, upload.fields([{ name: 'banner', maxCount: 1 }, { name: 'logo', maxCount: 1 }]), storeController.updateStoreProfile);
router.put('/layout', protect, storeController.updateStoreLayout);
router.post('/profile/dna/generate', protect, storeController.generateStoreDnaDraft);
router.post('/profile/dna/surprise', protect, storeController.generateSurpriseStoreDna);
router.post('/profile/dna/publish', protect, storeController.publishStoreDna);
router.post('/premium-unlock', protect, storeController.premiumUnlock);
router.post('/theme/preview', protect, storeController.previewStoreTheme);
router.post('/theme/apply', protect, storeController.applyStoreTheme);
router.get('/by-slug/:slug', optionalProtect, storeController.getStoreBySlug);
router.get('/bank-details/:sellerName', protect, storeController.getBankDetailsBySellerName);

// Store follow and asset upload
router.post('/:storeId/follow', protect, storeController.toggleFollowStore);
router.post('/upload-asset', protect, upload.single('file'), antivirusScan, storeController.uploadStoreAsset);

// Store reviews (public) — fetch all reviews for products in this store
router.get('/:storeId/reviews', async (req, res) => {
  try {
    const prisma = require('../utils/prismaClient');
    const reviews = await prisma.review.findMany({
      where: { product: { storeId: req.params.storeId } },
      include: { user: { select: { id: true, fullName: true, avatarUrl: true } }, product: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    res.json({ success: true, reviews });
  } catch (err) {
    res.json({ success: true, reviews: [] });
  }
});

// Store collections (public) — placeholder returning empty array since Collection model doesn't exist yet
router.get('/:storeId/collections', async (req, res) => {
  res.json({ success: true, collections: [] });
});

module.exports = router;
