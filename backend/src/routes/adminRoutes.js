const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes here are restricted to ADMIN only
router.use(protect);
router.use(authorize('ADMIN'));

// Financials
router.get('/wallet-stats', adminController.getWalletStats);
router.get('/ledger', adminController.getLedger);
router.get('/stats', adminController.getStats);
router.get('/fleet-analytics', adminController.getFleetAnalytics);

// Disputes
router.get('/disputes', adminController.getAllDisputes);
router.post('/disputes/resolve', adminController.resolveDispute);

// KYC/KYB
router.get('/verifications', adminController.getVerificationRequests);
router.post('/verifications/process', adminController.processVerification);
router.put('/verifications/:id/section-status', adminController.processVerificationSection);

// Courier KYC
router.get('/couriers/pending-kyc', adminController.getPendingCourierKyc);
router.post('/couriers/:id/kyc-approve', adminController.approveCourierKyc);
router.post('/couriers/:id/kyc-reject', adminController.rejectCourierKyc);
router.post('/couriers/:id/:action', (req, res, next) =>
    req.params.action === 'kyc-approve' || req.params.action === 'approve'
        ? adminController.approveCourierKyc(req, res, next)
        : adminController.rejectCourierKyc(req, res, next)
);

// Bank Transfer Verification
router.get('/bank-transfers', adminController.getPendingBankTransfers);
router.post('/bank-transfers/verify', adminController.verifyBankTransfer);

// Payouts
router.get('/payouts', adminController.getPayoutRequests);
router.post('/payouts/process', adminController.processPayout);

// Notifications
router.get('/notifications', adminController.getNotifications);

// Hub Queue
router.get('/hub-queue', adminController.getHubQueue);
router.post('/hub-queue/consolidate', adminController.consolidateOrder);

// Review Moderation
router.get('/reviews', adminController.getAllReviews);
router.delete('/reviews/:id', adminController.deleteReview);
// Promos
router.get('/promos', adminController.getAllPromos);
router.post('/promos', adminController.createAdminPromo);
router.put('/promos/:id/toggle', adminController.togglePromoStatus);

// Users
router.get('/users', adminController.getAllUsers);
router.post('/users/:id/toggle', adminController.toggleUserBan);

// Merchants
router.get('/merchants', adminController.getAllMerchants);
router.post('/merchants/:id/toggle', adminController.toggleMerchantSuspension);

// Audit Logs
router.get('/audit-logs', adminController.getAuditLogs);

// Referrals
router.get('/referrals', adminController.getReferrals);

// System Stories
router.get('/system-stories', adminController.getSystemStories);

module.exports = router;
