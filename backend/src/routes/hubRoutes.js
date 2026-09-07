const express = require('express');
const router = express.Router();
const hubController = require('../controllers/hubController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Get all consolidated packages for the hub queue
router.get('/packages', protect, authorize('ADMIN'), hubController.getHubPackages);

// Consolidate a package and dispatch it to the final courier
router.post('/packages/:id/consolidate', protect, authorize('ADMIN'), hubController.consolidatePackage);

// Join Universe Hub waitlist
router.post('/waitlist', protect, hubController.joinWaitlist);

module.exports = router;
