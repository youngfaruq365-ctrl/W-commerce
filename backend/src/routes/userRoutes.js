const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

const storeController = require('../controllers/storeController');
const buyerController = require('../controllers/buyerController');

router.get('/dashboard', protect, userController.getBuyerDashboard);
router.get('/profile', protect, userController.getProfile);
router.get('/profile/:id', protect, userController.getMemberProfile);
router.put('/profile', protect, userController.updateProfile);
router.get('/addresses', protect, userController.getAddresses);
router.post('/address', protect, userController.addAddress);
router.put('/address/:id', protect, userController.updateAddress);
router.delete('/address/:id', protect, userController.deleteAddress);
router.put('/address/:id/default', protect, buyerController.setDefaultAddress);
const { upload } = require('../middleware/uploadMiddleware');

router.post('/avatar', protect, upload.single('avatar'), userController.uploadAvatar);
router.post('/verify', protect, userController.submitVerification);
router.post('/upgrade', protect, userController.upgradeToSeller);
// Follow System
router.post('/sellers/:sellerId/follow', protect, userController.followSeller);
router.delete('/sellers/:sellerId/follow', protect, userController.unfollowSeller);
router.get('/sellers/:sellerId/follow-status', protect, userController.getFollowStatus);
router.get('/following', protect, userController.getFollowing);
router.post('/store-update', protect, authorize('SELLER', 'ADMIN'), storeController.updateStore);
router.get('/search', protect, userController.findMember);
router.post('/deposit', protect, userController.depositFunds);
router.get('/wallet/transactions', protect, userController.getWalletTransactions);
router.post('/wallet/withdraw', protect, userController.requestWalletWithdrawal);

// GDPR Compliance Routes
router.post('/data-export', protect, userController.requestDataExport);
router.post('/delete-account', protect, userController.requestAccountDeletion);
router.post('/cookie-preferences', protect, userController.updateCookiePreferences);


router.get('/users-for-chat', protect, userController.getUsersForChat);
router.post('/support', protect, userController.contactSupport);



router.post('/subscribe-push', protect, userController.subscribePush);

module.exports = router;
