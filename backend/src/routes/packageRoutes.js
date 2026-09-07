'use strict';

/**
 * Package Routes — /api/v1/packages
 *
 * Seller:  POST /                        Create package for a FulfillmentOrder
 * Any:     POST /:packageId/custody      Record a custody handoff (courier, station, buyer)
 * Any:     GET  /:packageId              Full custody chain by package ID
 * Any:     GET  /by-barcode/:barcode     Look up by barcode (scanning apps)
 * Any:     GET  /by-order/:foId          Get package for a FulfillmentOrder
 */

const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/packageController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Specific named routes BEFORE param routes to avoid conflicts
router.get('/by-barcode/:barcode', ctrl.getByBarcode);
router.get('/by-order/:foId',      ctrl.getByFulfillmentOrder);

// Package creation — seller only
router.post('/', authorize('SELLER', 'ADMIN'), ctrl.createPackage);

// Custody transfer — any authenticated party (courier, station operator, buyer)
router.post('/:packageId/custody', ctrl.recordCustodyTransfer);

// Get package + full chain
router.get('/:packageId', ctrl.getPackage);

module.exports = router;
