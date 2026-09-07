/**
 * GlobalX Payment Proof Routes
 * Buyer, Seller, and Admin payment proof management
 */

const express = require('express');
const router = express.Router();
const paymentProofController = require('../controllers/paymentProofController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { handlePaymentProofUpload } = require('../middleware/encryptedUpload');

// Buyer routes
router.post('/proof/submit', protect, paymentProofController.submitPaymentProof);
router.get('/proof/my-proofs', protect, paymentProofController.getBuyerPaymentProofs);

// Seller routes
router.get('/proof/seller', protect, authorize('SELLER'), paymentProofController.getSellerPaymentProofs);
router.put('/proof/:proofId/respond', protect, authorize('SELLER'), paymentProofController.sellerRespond);

// Admin routes
router.get('/proof/admin/all', protect, authorize('ADMIN'), paymentProofController.getAllPaymentProofs);
router.put('/proof/:proofId/admin-review', protect, authorize('ADMIN'), paymentProofController.adminReview);
router.get('/proof/:proofId/audit-log', protect, authorize('ADMIN'), paymentProofController.getAuditLog);

// Common routes
router.get('/proof/:proofId', protect, paymentProofController.getPaymentProofDetails);

// Upload proof image - ENCRYPTED
router.post('/proof/upload', protect, handlePaymentProofUpload, paymentProofController.uploadProofImage);

// Decrypt and view proof (admin only)
router.get('/proof/:proofId/view', protect, authorize('ADMIN'), paymentProofController.viewEncryptedProof);

module.exports = router;
