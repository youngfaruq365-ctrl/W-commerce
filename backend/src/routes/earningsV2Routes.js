'use strict';

/**
 * Earnings V2 Routes — /api/v1/earnings
 *
 * Seller:  GET  /seller/summary        — earnings dashboard
 * Buyer:   POST /buyer/confirm/:foId   — confirm receipt → release escrow
 * Admin:   POST /admin/release/:foId   — force release
 */

const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/earningsV2Controller');
const { protect, authorize } = require('../middleware/authMiddleware');

// Seller
router.get('/seller/summary', protect, authorize('SELLER', 'ADMIN'), ctrl.getSellerEarnings);

// Buyer
router.post('/buyer/confirm/:foId', protect, ctrl.buyerConfirmReceipt);

// Admin
router.post('/admin/release/:foId', protect, authorize('ADMIN'), ctrl.adminRelease);

module.exports = router;
