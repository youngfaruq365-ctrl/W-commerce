const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/authMiddleware');
const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');
const sellerController = require('../controllers/sellerController');
const { upload, uploadToCloud } = require('../middleware/uploadMiddleware');

/**
 * GET /api/v1/sellers/:sellerId/profile
 * Public — returns seller identity, trust metrics, store reference.
 */
router.get('/:sellerId/profile', sellerController.getSellerProfile);
router.post('/onboarding', protect, upload.single('document'), sellerController.sellerOnboarding);
router.post('/:sellerId/follow', protect, sellerController.followSeller);
router.get('/analytics', protect, authorize('SELLER', 'ADMIN'), analyticsController.getSellerAnalytics);
router.get('/weekly-summary', protect, authorize('SELLER', 'ADMIN'), analyticsController.getWeeklySummary);
router.get('/performance-alerts', protect, authorize('SELLER', 'ADMIN'), analyticsController.getPerformanceAlerts);
router.get('/top-products', protect, authorize('SELLER', 'ADMIN'), analyticsController.getTopProducts);
router.get('/sales-by-period', protect, authorize('SELLER', 'ADMIN'), analyticsController.getSalesByPeriod);
router.get('/customer-insights', protect, authorize('SELLER', 'ADMIN'), analyticsController.getCustomerInsights);
router.get('/analytics/performance', protect, authorize('SELLER', 'ADMIN'), analyticsController.getPerformanceMetrics);
router.get('/insights', protect, authorize('SELLER', 'ADMIN'), analyticsController.generateInsights);
router.post('/update-score', protect, authorize('SELLER', 'ADMIN'), analyticsController.updatePerformanceScore);
router.get('/active-carts', protect, authorize('SELLER', 'ADMIN'), analyticsController.getActiveCarts);
router.post('/integration', protect, authorize('SELLER', 'ADMIN'), sellerController.connectIntegration);

/**
 * POST /api/seller/setup-paystack
 * Sets up Paystack subaccount and transfer recipient for a seller
 */
router.post('/setup-paystack', protect, authorize('SELLER'), async (req, res) => {
    try {
        const paystackService = require('../services/paystackSubaccountService');

        const store = await prisma.store.findFirst({
            where: { sellerId: req.user.id },
            include: { user: { select: { email: true, fullName: true } } }
        });

        if (!store) {
            return res.status(404).json({ success: false, message: 'Store not found' });
        }

        if (!store.accountNumber || !store.bankName) {
            return res.status(400).json({
                success: false,
                message: 'Please add your bank details (bank name and account number) to your store profile first.'
            });
        }

        const results = { subaccount: null, recipient: null };

        // 1. Create subaccount if not exists
        if (!store.paystackSubaccount) {
            const subaccount = await paystackService.createSubaccount(store);
            await prisma.store.update({
                where: { id: store.id },
                data: { paystackSubaccount: subaccount.subaccount_code }
            });
            results.subaccount = subaccount.subaccount_code;
        } else {
            results.subaccount = store.paystackSubaccount;
        }

        // 2. Create transfer recipient if not exists
        if (!store.paystackRecipientCode) {
            const recipient = await paystackService.createTransferRecipient(store);
            await prisma.store.update({
                where: { id: store.id },
                data: { paystackRecipientCode: recipient.recipient_code }
            });
            results.recipient = recipient.recipient_code;
        } else {
            results.recipient = store.paystackRecipientCode;
        }

        logger.info(`[SELLER] Paystack setup completed for store: ${store.storeName}`);

        res.json({
            success: true,
            message: 'Paystack payment setup complete! You can now receive split payments and payouts.',
            data: {
                subaccountCode: results.subaccount,
                recipientCode: results.recipient,
                storeName: store.storeName
            }
        });

    } catch (error) {
        logger.error(`Paystack Setup Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to setup Paystack. Please try again.' });
    }
});

/**
 * GET /api/seller/paystack-status
 * Check if Paystack is set up for the seller
 */
router.get('/paystack-status', protect, authorize('SELLER'), async (req, res) => {
    try {
        const store = await prisma.store.findFirst({
            where: { sellerId: req.user.id },
            select: {
                paystackSubaccount: true,
                paystackRecipientCode: true,
                storeName: true,
                bankName: true,
                accountNumber: true
            }
        });

        if (!store) {
            return res.status(404).json({ success: false, message: 'Store not found' });
        }

        res.json({
            success: true,
            data: {
                storeName: store.storeName,
                hasBankDetails: !!(store.bankName && store.accountNumber),
                hasSubaccount: !!store.paystackSubaccount,
                hasRecipient: !!store.paystackRecipientCode,
                isFullySetup: !!(store.paystackSubaccount && store.paystackRecipientCode)
            }
        });

    } catch (error) {
        logger.error(`Paystack Status Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
