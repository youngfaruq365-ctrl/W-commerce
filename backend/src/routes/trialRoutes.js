/**
 * Trial Routes - 6-Month Free Trial API Endpoints
 */

const express = require('express');
const router = express.Router();
const trialController = require('../controllers/trialController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/authMiddleware');

// ============================================
// User Routes (require authentication)
// ============================================

// Start a new trial
router.post('/signup', protect, trialController.startTrial);

// Get trial status
router.get('/status', protect, trialController.getTrialStatus);

// Convert trial to paid subscription
router.post('/convert', protect, trialController.convertToPaid);

// Cancel trial
router.post('/cancel', protect, trialController.cancelTrial);

// ============================================
// Admin Routes (require admin role)
// ============================================

// Check and process expired trials
router.post('/check-expiration', protect, authorize('ADMIN'), trialController.checkTrialExpiration);

// Send expiration warning emails
router.get('/warning-notifications', protect, authorize('ADMIN'), trialController.sendExpirationWarnings);

// Get trial statistics
router.get('/admin/stats', protect, authorize('ADMIN'), trialController.getTrialStats);

module.exports = router;
