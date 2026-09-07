'use strict';

/**
 * Checkout V2 Routes — /api/v1/checkout
 *
 * These routes coexist with the legacy /api/orders endpoint.
 * All new frontend work should target /api/v1/checkout.
 *
 * Two-step checkout flow (Phase 11):
 *   POST /initiate  — preview: groups items, calculates totals, returns sessionToken (no DB write)
 *   POST /confirm   — commit: converts session into MarketplaceOrder + FulfillmentOrders
 *
 * Legacy single-step:
 *   POST /          — direct create (still works, kept for backward compat)
 */

const express      = require('express');
const router       = express.Router();
const ctrl         = require('../controllers/checkoutV2Controller');
const { protect, authorize } = require('../middleware/authMiddleware');
const uploadMiddleware = require('../middleware/uploadMiddleware');

// ── Phase 11: Two-step checkout ───────────────────────────────────────────────
// Named routes MUST come before /:id param routes.

// Step 1: Preview cart grouped by seller — no DB write, returns sessionToken
router.post('/initiate', protect, ctrl.initiateCheckout);

// Step 2: Commit session → MarketplaceOrder + FulfillmentOrders
router.post('/confirm',  protect, ctrl.confirmCheckout);

// ── Buyer routes ──────────────────────────────────────────────────────────────

// Legacy single-step (kept for backward compat; frontend migrating to /initiate→/confirm)
router.post('/',                protect, ctrl.createCheckout);

// List the authenticated buyer's MarketplaceOrders (paginated)
router.get('/my-orders',        protect, ctrl.getMyOrders);

// Fetch a single MarketplaceOrder by ID (buyer or admin)
router.get('/:id',              protect, ctrl.getMarketplaceOrder);

// Upload payment proof for a MarketplaceOrder
router.post('/:id/upload-proof', protect, uploadMiddleware.upload.single('proof'), ctrl.uploadProof);

// List FulfillmentOrders for a MarketplaceOrder (buyer sees all; seller sees own)
router.get('/:id/fulfillment',  protect, ctrl.getFulfillmentOrders);

// ── Seller routes ─────────────────────────────────────────────────────────────

// Seller's fulfillment queue (all FulfillmentOrders assigned to them)
router.get('/seller/queue',     protect, authorize('SELLER', 'ADMIN'), ctrl.getSellerQueue);

// Advance FulfillmentOrder lifecycle (CONFIRMED → PACKED → SHIPPED → DELIVERED …)
router.patch('/fulfillment/:foId/status', protect, authorize('SELLER', 'ADMIN'), ctrl.updateFulfillmentStatus);

module.exports = router;

