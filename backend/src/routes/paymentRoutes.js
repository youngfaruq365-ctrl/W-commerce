// Payment routes for GlobalX Marketplace
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
// ── V1 Payment Route Deprecation ─────────────────────────────────────────────
// Deprecation redirect removed because it causes infinite loops with the current routing setup
// and breaks legacy frontend payment flows (like pay-wallet).
const paymentController = require('../controllers/paymentController');
const monnifyController = require('../controllers/monnifyController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/create-intent', protect, paymentController.createPaymentIntent);
router.post('/cod-order', protect, paymentController.createCodOrder);
router.post('/flutterwave-intent', protect, paymentController.createFlutterwaveIntent);
router.post('/access-fee', protect, paymentController.initiateAccessPayment);
router.post('/calculate-tax', protect, paymentController.calculateTax);
router.post('/bank-transfer', protect, paymentController.createBankTransferOrder);
router.post('/pay-wallet', protect, paymentController.payWithWallet);
router.post('/monnify-intent', protect, monnifyController.createMonnifyPayment);
router.post('/upload-proof', protect, paymentController.uploadPaymentProof);
router.get('/seller-proofs', protect, authorize('SELLER'), paymentController.getSellerProofs);
router.post('/verify-proof/:proofId', protect, authorize('SELLER'), paymentController.verifyPaymentProof);
router.post('/payout-request', protect, authorize('SELLER'), paymentController.requestPayout);
router.get('/payouts', protect, authorize('SELLER'), paymentController.getPayouts);

router.post('/refund', protect, authorize('ADMIN'), paymentController.processRefund);
router.get('/verify/:reference', protect, paymentController.verifyTransaction);
router.post('/cancel-pending', protect, paymentController.cancelPendingPayment);

// Webhooks now handled centrally in server.cjs
router.post('/webhook/monnify', monnifyController.handleMonnifyWebhook);
router.post('/flutterwave/init', protect, paymentController.createFlutterwaveIntent);
router.post('/flutterwave/webhook', (req, res) => res.json({ success: true }));

module.exports = router;
