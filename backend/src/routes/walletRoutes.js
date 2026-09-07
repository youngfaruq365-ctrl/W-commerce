const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/inputValidation');

router.get('/summary', protect, walletController.getSummary);
router.get('/transactions', protect, walletController.getTransactions);
router.post('/fund/paystack', protect, validate('walletAmount'), walletController.fundPaystack);
router.post('/fund/flutterwave', protect, validate('walletAmount'), walletController.fundFlutterwave);
router.post('/fund/bank-transfer', protect, validate('walletAmount'), walletController.fundBankTransfer);
router.get('/fund/verify-paystack/:reference', protect, walletController.verifyPaystackFunding);
router.get('/fund/verify-flutterwave/:txRef', protect, walletController.verifyFlutterwaveFunding);
const paystackService = require('../services/paystackService');
const walletService = require('../services/walletService');

router.post('/withdraw', protect, validate('walletWithdraw'), async (req, res) => {
    try {
        const key = req.headers['idempotency-key'] || req.body.idempotencyKey;
        if (!key) {
            return res.status(400).json({ success: false, message: 'Idempotency-Key header is required' });
        }
        
        const { amount, destination } = req.body;
        const userId = req.user.id;
        
        // 1. Debit internal wallet
        await walletService.debit(userId, 'GONG', amount, {
            idempotencyKey: `WITHDRAW:${userId}:${Date.now()}`,
            direction: 'DEBIT',
            description: 'Withdrawal to Paystack'
        });
        
        // 2. Call Paystack API
        try {
            const transfer = await paystackService.initiateTransfer(amount, destination, 'Wallet Withdrawal');
            res.json({ success: true, transfer });
        } catch (apiError) {
            // 3. Rollback if Paystack fails
            await walletService.credit(userId, 'GONG', amount, {
                idempotencyKey: `WITHDRAW_ROLLBACK:${userId}:${Date.now()}`,
                direction: 'CREDIT',
                description: 'Withdrawal rollback due to API failure'
            });
            return res.status(400).json({ success: false, message: 'Paystack transfer failed, balance refunded' });
        }
    } catch (error) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
});

router.post('/transfer', protect, validate('walletTransfer'), walletController.transfer);
router.post('/convert', protect, validate('walletConvert'), walletController.convert);
router.post('/hold', protect, validate('walletHold'), walletController.hold);
router.post('/release-hold', protect, authorize('ADMIN'), validate('walletHoldAction'), walletController.releaseHold);
router.post('/refund', protect, authorize('ADMIN'), validate('walletHoldAction'), walletController.refundHold);

module.exports = router;
