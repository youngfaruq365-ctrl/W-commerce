/**
 * Escrow Payment Routes
 * Nigerian-compliant escrow payment endpoints
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const escrowPaymentController = require('../controllers/escrowPaymentController');
const webhookController = require('../controllers/webhookController');
const { validate } = require('../middleware/inputValidation');

// Webhook endpoint (no auth - verified by signature)
router.post('/webhook', express.raw({ type: 'application/json' }), webhookController.handleWebhook);

// Initialize escrow payment
router.post('/initialize', protect, escrowPaymentController.initializePayment);

// Verify payment (callback from Paystack)
router.get('/verify/:reference', protect, escrowPaymentController.verifyPayment);

// Confirm delivery - triggers release countdown
router.post('/confirm-delivery', protect, escrowPaymentController.confirmDelivery);

// Raise dispute - freezes funds
router.post('/dispute', protect, escrowPaymentController.raiseDispute);

// Resolve dispute - admin only
router.post('/dispute/resolve', protect, authorize('ADMIN'), escrowPaymentController.resolveDispute);

// Get payment details
router.get('/:paymentId', protect, escrowPaymentController.getPayment);

// Get buyer's payments
router.get('/buyer/list', protect, escrowPaymentController.getBuyerPayments);

// Get seller's payments
router.get('/seller/list', protect, escrowPaymentController.getSellerPayments);

module.exports = router;
