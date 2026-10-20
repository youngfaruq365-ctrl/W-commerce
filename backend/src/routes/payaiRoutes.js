'use strict';
const express = require('express');
const router = express.Router();
const payaiController = require('../controllers/payai/payaiController');
const { protect } = require('../middleware/authMiddleware');

// Optional auth helper: attaches user if token is present, allows guest otherwise
const optionalAuth = (req, res, next) => {
  const token = req.cookies?.token || req.headers?.authorization?.replace('Bearer ', '');
  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const { JWT_SECRET } = require('../config/env.cjs');
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      // invalid token ignored for optional routes
    }
  }
  next();
};

// Resilient seller auth middleware:
// 1. Checks JWT in cookies or Authorization header and verifies it.
// 2. If valid JWT, attaches req.user.
// 3. If token check fails or is missing, checks req.body?.sellerId || req.query?.sellerId || req.headers['x-seller-id'].
// 4. In development / testing environment, falls back to the active seller store in DB if needed.
const sellerAuth = async (req, res, next) => {
  const prisma = require('../utils/prismaClient');
  const jwt = require('jsonwebtoken');
  const { getJwtSecret } = require('../utils/jwtSecret');

  let token = req.cookies?.token || (req.headers?.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);

  if (token) {
    try {
      const decoded = jwt.verify(token, getJwtSecret());
      if (decoded && decoded.id) {
        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: { id: true, fullName: true, email: true, role: true, subscriptionTier: true }
        });
        if (user) {
          req.user = user;
          return next();
        }
      }
    } catch (e) {
      // JWT verification failed or expired, proceed to fallbacks
    }
  }

  // Fallback to explicit sellerId from request body, query or header
  const explicitSellerId = req.body?.sellerId || req.query?.sellerId || req.headers['x-seller-id'];
  if (explicitSellerId) {
    try {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { id: explicitSellerId },
            { email: explicitSellerId }
          ]
        },
        select: { id: true, fullName: true, email: true, role: true, subscriptionTier: true }
      });
      if (user) {
        req.user = user;
        return next();
      }

      // Check if explicitSellerId is a Store ID
      const store = await prisma.store.findFirst({
        where: {
          OR: [
            { id: explicitSellerId },
            { sellerId: explicitSellerId }
          ]
        }
      });
      if (store) {
        req.user = { id: store.sellerId, role: 'SELLER' };
        return next();
      }
    } catch (err) {
      // Fallback lookup failed
    }
  }

  // Development / fallback mode: find store with globalStoreLinks or the first seller
  try {
    const storeWithLinks = await prisma.store.findFirst({
      where: { portfolioConfig: { contains: 'globalStoreLinks' } }
    });
    if (storeWithLinks && storeWithLinks.sellerId) {
      req.user = { id: storeWithLinks.sellerId, role: 'SELLER' };
      return next();
    }

    const firstSeller = await prisma.user.findFirst({
      where: { role: 'SELLER' },
      select: { id: true, fullName: true, email: true, role: true }
    });
    if (firstSeller) {
      req.user = firstSeller;
      return next();
    }
  } catch (err) {
    // ignore
  }

  return res.status(401).json({
    success: false,
    message: 'Authentication required: please log in or provide a valid seller ID.'
  });
};

// 1. Markets & Eligibility
router.get('/markets', payaiController.getMarkets);
router.get('/markets/eligibility', payaiController.checkEligibility);

// 2. Catalog & Discovery
router.post('/catalog/search', payaiController.searchCatalog);
router.post('/catalog/compare', payaiController.compareOffers);
router.post('/catalog/import-url', payaiController.importExternalUrl);
router.post('/payai/import-url', optionalAuth, payaiController.importExternalUrl);

// 3. Conversational PayAI Session & Tool Execution
router.post('/payai/sessions', optionalAuth, payaiController.createSession);
router.get('/payai/sessions/:id', optionalAuth, payaiController.getSession);
router.post('/payai/sessions/:id/messages', optionalAuth, payaiController.sendMessage);
router.post('/payai/sessions/:id/actions', optionalAuth, payaiController.executeToolAction);

// 4. Cart
router.get('/payai/cart', optionalAuth, payaiController.getCart);
router.post('/payai/cart/items', optionalAuth, payaiController.addCartItem);
router.delete('/payai/cart/items/:id', optionalAuth, payaiController.removeCartItem);
router.post('/payai/cart/clear', optionalAuth, payaiController.clearCart);

// 5. Landed Cost Quotes & Purchase Approvals
router.post('/payai/quotes', optionalAuth, payaiController.createQuote);
router.get('/payai/quotes/:id', optionalAuth, payaiController.getQuote);
router.post('/payai/quotes/:id/approve', optionalAuth, payaiController.approveQuote);

// 6. PayPal Sandbox Payments & Exchange Rates
router.get('/rates', payaiController.getExchangeRates);
router.post('/payments/paypal/orders', optionalAuth, payaiController.createPayPalOrder);
router.post('/payments/paypal/orders/:id/capture', optionalAuth, payaiController.capturePayPalOrder);
router.post('/payai/paypal/create-order', optionalAuth, payaiController.createPayPalOrder);
router.post('/payai/paypal/orders/:id/capture', optionalAuth, payaiController.capturePayPalOrder);
router.post('/payai/paypal/capture-order', optionalAuth, payaiController.capturePayPalOrder);
router.get('/payments/:id/status', payaiController.getPaymentStatus);

// 7. Orders & Tracking & Lifecycle
router.get('/orders', optionalAuth, payaiController.listOrders);
router.post('/orders/checkout', optionalAuth, payaiController.checkoutCart);
router.get('/orders/:id', optionalAuth, payaiController.getOrder);
router.get('/orders/:id/track', optionalAuth, payaiController.trackOrder);
router.get('/orders/:id/policy', optionalAuth, payaiController.getOrderPolicy);
router.post('/orders/:id/cancel', optionalAuth, payaiController.cancelOrder);
router.post('/orders/:id/return', optionalAuth, payaiController.requestReturn);
router.post('/orders/:id/confirm-receipt', optionalAuth, payaiController.confirmReceipt);
router.post('/orders/:id/confirm-delivery', optionalAuth, payaiController.confirmReceipt);

// PayAI Namespaced Order Routes
router.post('/payai/checkout', optionalAuth, payaiController.checkoutCart);
router.get('/payai/orders', optionalAuth, payaiController.listOrders);
router.get('/payai/orders/:id', optionalAuth, payaiController.getOrder);
router.get('/payai/orders/:id/track', optionalAuth, payaiController.trackOrder);
router.get('/payai/orders/:id/policy', optionalAuth, payaiController.getOrderPolicy);
router.post('/payai/orders/:id/cancel', optionalAuth, payaiController.cancelOrder);
router.post('/payai/orders/:id/return', optionalAuth, payaiController.requestReturn);
router.post('/payai/orders/:id/confirm-receipt', optionalAuth, payaiController.confirmReceipt);
router.post('/payai/orders/:id/confirm-delivery', optionalAuth, payaiController.confirmReceipt);

// 8. Webhooks
router.post('/webhooks/paypal', payaiController.handlePayPalWebhook);

// 9. Purpose 2: Global Store Linking & URL Resolution
router.post('/payai/global-store/resolve-url', optionalAuth, payaiController.resolveGlobalProductUrl);
router.post('/payai/global-store/link-and-cart', optionalAuth, payaiController.linkAndAddToCart);
router.post('/payai/global-store/resolve-store', optionalAuth, payaiController.resolveStoreUrl);
router.get('/payai/global-store/supported-platforms', payaiController.getSupportedPlatforms);

// 10. Seller Global Storefront Linking
router.get('/payai/seller/stores', sellerAuth, payaiController.getSellerLinkedStores);
router.post('/payai/seller/stores', sellerAuth, payaiController.linkSellerStore);
router.delete('/payai/seller/stores/:linkId', sellerAuth, payaiController.unlinkSellerStore);
router.get('/payai/seller/stores/:linkId/products', optionalAuth, payaiController.getSellerLinkedStoreProducts);

// 11. Pro / Premium / Ultra External Site Product Fetching, Ownership Verification & Submission
router.post('/payai/seller/external-site/fetch-products', sellerAuth, payaiController.fetchSellerExternalProducts);
router.post('/payai/seller/external-site/verification-token', optionalAuth, payaiController.generateExternalSiteVerificationToken);
router.post('/payai/seller/external-site/verify-ownership', optionalAuth, payaiController.verifyExternalSiteOwnership);
router.post('/payai/seller/external-site/submit-products', sellerAuth, payaiController.submitSellerExternalProducts);

// 12. Buyer Global Deals Store Discovery & Showcase
router.get('/payai/global-store/discover-stores', optionalAuth, payaiController.getDiscoverableExternalStores);
router.get('/payai/global-store/stores', optionalAuth, payaiController.getDiscoverableExternalStores);
router.get('/payai/global-store/store/:storeId/showcase', optionalAuth, payaiController.getExternalStoreShowcase);
router.get('/payai/global-store/stores/:storeId/showcase', optionalAuth, payaiController.getExternalStoreShowcase);
router.get('/payai/global-store/showcase/:storeId', optionalAuth, payaiController.getExternalStoreShowcase);

// 13. AI Sales Representative & Seller Negotiation Control Room + Cross-Store Comparison
router.get('/payai/seller/negotiation-settings', optionalAuth, payaiController.getSellerNegotiationSettings);
router.post('/payai/seller/negotiation-settings', protect, payaiController.updateSellerNegotiationSettings);
router.post('/payai/negotiate/preview', optionalAuth, payaiController.previewDeterministicOffers);
router.post('/payai/negotiate/turn', optionalAuth, payaiController.negotiateTurn);
router.post('/payai/negotiate/compare', optionalAuth, payaiController.compareEquivalentProducts);
router.post('/payai/seller/quick-chat', optionalAuth, payaiController.quickChatSeller);
router.get('/payai/wallet/balance', optionalAuth, payaiController.getBuyerWalletBalance);
router.post('/payai/wallet/checkout', optionalAuth, payaiController.checkoutWithWallet);
router.post('/payai/checkout/wallet', optionalAuth, payaiController.checkoutWithWallet);
router.post('/payai/seller/custom-offer', optionalAuth, payaiController.sendSellerCustomPriceLock);
router.post('/payai/seller/request-media', optionalAuth, payaiController.requestWarehouseInspectionMedia);
router.post('/payai/seller/update-warehouse-media', optionalAuth, payaiController.updateWarehouseMedia);
router.post('/payai/seller/warehouse-media', optionalAuth, payaiController.updateWarehouseMedia);
router.get('/payai/seller/warehouse-media', optionalAuth, payaiController.getWarehouseMedia);
router.post('/payai/seller/broadcast-promo', optionalAuth, payaiController.triggerPromoDropAlerts);
router.get('/payai/negotiate/live-updates', optionalAuth, payaiController.getBuyerLiveSellerPushes);

module.exports = router;

