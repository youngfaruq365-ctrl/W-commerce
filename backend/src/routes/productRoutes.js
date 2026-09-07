const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/inputValidation');
const cache = require('../middleware/cacheMiddleware');

router.get('/', cache(120), productController.getAllProducts);
router.get('/splash-manifest', productController.getSplashManifest);
router.get('/trending', cache(60), productController.getTrendingProducts);
router.get('/search', productController.searchProducts);
router.get('/compare/:productId', productController.compareProduct);
router.get('/suggestions', cache(30), productController.getSearchSuggestions);
router.get('/flash', cache(60), productController.getFlashSales);
router.get('/recommendations', productController.getRecommendations);
router.get('/:productId/bundle', productController.getRecommendationBundle);
router.get('/:productId/similar', productController.getSimilarProducts);
router.get('/:productId/people-also-bought', productController.getPeopleAlsoBought);
router.get('/recently-viewed', productController.getRecentlyViewed);
router.get('/landed-cost', productController.calculateLandedCost);
router.get('/categories', cache(300), productController.getCategories);
router.get('/menu', cache(300), productController.getMenuData);

const { upload } = require('../middleware/uploadMiddleware');

// Protected routes - with input validation
router.post('/', protect, authorize('SELLER', 'ADMIN'), upload.array('images', 5), validate('createProduct', 'body'), productController.createProduct);
router.put('/:id', protect, authorize('SELLER', 'ADMIN'), validate('uuidParam', 'params'), upload.array('images', 5), productController.updateProduct);
router.get('/my-products', protect, authorize('SELLER', 'ADMIN'), productController.getMyProducts);
router.get('/my-products/low-stock', protect, authorize('SELLER', 'ADMIN'), productController.getLowStockProducts);
router.post('/:productId/interaction', protect, productController.trackProductInteraction);
router.post('/waitlist', protect, productController.addToWaitlist);
router.post('/restock-notify', protect, productController.subscribeToRestock);
router.delete('/restock-notify/:productId', protect, productController.unsubscribeFromRestock);
router.post('/restock/:productId', protect, authorize('SELLER', 'ADMIN'), productController.restockProduct);

router.delete('/:id', protect, authorize('SELLER', 'ADMIN'), validate('uuidParam', 'params'), productController.deleteProduct);

// NOTE: Keep dynamic `/:id` route after all specific routes to avoid route collisions
router.get('/:id', cache(60), productController.getProduct); // Detailed View with Analytics



module.exports = router;
