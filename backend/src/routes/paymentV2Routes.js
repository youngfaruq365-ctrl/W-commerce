'use strict';

/**
 * Payment V2 Routes — /api/v1/payment
 *
 * IMPORTANT: The Paystack webhook endpoint MUST receive the raw request body
 * as a Buffer so the HMAC-SHA512 signature can be computed correctly.
 * express.raw() is applied ONLY to the webhook route — all other routes use
 * the standard express.json() that is configured globally in server.cjs.
 */

const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/paymentV2Controller');
const { protect } = require('../middleware/authMiddleware');

// ── Authenticated buyer routes ────────────────────────────────────────────────

// Create a Paystack transaction for a pending MarketplaceOrder
router.post('/initialize',           protect, ctrl.initializePayment);

// Vault payment card
router.post('/vault-card',           protect, ctrl.vaultCard);

// Manual verify on frontend callback (after Paystack redirects buyer back)
router.get('/verify/:reference',     protect, ctrl.verifyPayment);

// BNPL mock routes
router.post('/bnpl/initialize',      protect, ctrl.initializeBnpl);
router.post('/bnpl/verify',          protect, ctrl.verifyBnpl);

// ── Paystack webhook (no auth — verified by HMAC signature) ──────────────────
// express.raw() captures the body as a Buffer BEFORE the global json() middleware
// would parse it, preserving the exact bytes needed for HMAC verification.
router.post(
    '/webhook/paystack',
    express.raw({ type: 'application/json' }),
    ctrl.paystackWebhook
);

module.exports = router;
