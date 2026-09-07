'use strict';

/**
 * Fulfillment Routes — Phase 14
 *
 * All routes require authentication.
 * Seller-action routes additionally require the seller to own the FulfillmentOrder
 * (enforced inside fulfillmentService.transition()).
 *
 * Routes (all under /api/v1/fulfillment):
 *
 *   GET  /                     → list seller's fulfillment orders (paginated)
 *   GET  /:id                  → get single FO (accessible by seller or buyer)
 *
 *   POST /:id/accept           → SELLER_REVIEW → ACCEPTED
 *   POST /:id/reject           → SELLER_REVIEW → REJECTED
 *   POST /:id/start-preparing  → ACCEPTED → PREPARING
 *   POST /:id/mark-packed      → PREPARING → PACKED
 *   POST /:id/request-courier  → PACKED → AWAITING_COURIER
 *   POST /:id/handover         → AWAITING_COURIER → HANDED_TO_COURIER
 */

const express         = require('express');
const router          = express.Router();
const ctrl            = require('../controllers/fulfillmentController');
const { protect }     = require('../middleware/authMiddleware');

// All fulfillment routes require a logged-in user
router.use(protect);

// ── Read ──────────────────────────────────────────────────────────────────────
router.get('/',           ctrl.listMyOrders);
router.get('/:id',        ctrl.getOrder);
router.get('/:id/package', ctrl.getPackage);  // Phase 15: barcode + QR for label printing

// ── Seller state machine transitions ─────────────────────────────────────────
router.post('/:id/accept',           ctrl.accept);
router.post('/:id/reject',           ctrl.reject);
router.post('/:id/start-preparing',  ctrl.startPreparing);
router.post('/:id/mark-packed',      ctrl.markPacked);
router.post('/:id/request-courier',  ctrl.requestCourier);
router.post('/:id/handover',         ctrl.handover);

module.exports = router;
