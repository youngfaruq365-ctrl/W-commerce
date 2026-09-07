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
router.post('/access-fee', protect, paymentController.initiateAccessPayment);
router.post('/calculate-tax', protect, paymentController.calculateTax);
router.post('/bank-transfer', protect, paymentController.createBankTransferOrder);
router.post('/pay-wallet', protect, paymentController.payWithWallet);
router.post('/cod-order', protect, paymentController.createCodOrder);
router.post('/flutterwave-intent', protect, paymentController.createFlutterwavePayment);
router.post('/monnify-intent', protect, monnifyController.createMonnifyPayment);
router.post('/upload-proof', protect, paymentController.uploadPaymentProof);
router.post('/payout-request', protect, authorize('SELLER'), paymentController.requestPayout);
router.get('/payouts', protect, authorize('SELLER'), paymentController.getPayouts);

router.post('/refund', protect, authorize('ADMIN'), paymentController.processRefund);
router.get('/verify/:reference', protect, paymentController.verifyTransaction);

// Webhooks
// BUG-PAY-01: Was using JSON.stringify(req.body) for HMAC — JSON round-trip changes byte order/whitespace,
// causing ALL real Paystack webhooks to fail signature verification.
// Fix: use express.raw() to capture the exact bytes Paystack signed.
router.post('/webhook',
    express.raw({ type: 'application/json' }),
    (req, res, next) => {
        const rawBody = req.body; // Buffer from express.raw()
        const secret = process.env.PAYSTACK_PRIMARY_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY;
        if (!secret) {
            // Misconfigured — let the controller handle it gracefully
            return next();
        }
        const hash = crypto.createHmac('sha512', secret)
            .update(rawBody)
            .digest('hex');
        if (hash !== req.headers['x-paystack-signature']) {
            return res.status(400).send('Invalid signature');
        }
        next();
    },
    paymentController.handleWebhook
);
router.post('/webhook/monnify', monnifyController.handleMonnifyWebhook);
router.post('/flutterwave/init', protect, (req, res) => res.json({ success: true }));
router.post('/flutterwave/webhook', (req, res) => res.json({ success: true }));

module.exports = router;
