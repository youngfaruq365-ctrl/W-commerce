const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/inputValidation');

router.get('/', protect, walletController.getSummary);
router.get('/summary', protect, walletController.getSummary);
router.get('/transactions', protect, walletController.getTransactions);
router.post('/fund/paystack', protect, validate('walletAmount'), walletController.fundPaystack);
router.post('/fund/flutterwave', protect, validate('walletAmount'), walletController.fundFlutterwave);
router.post('/fund/bank-transfer', protect, validate('walletAmount'), walletController.fundBankTransfer);
router.post('/fund/:method', protect, validate('walletAmount'), (req, res, next) => {
    const method = (req.params.method || 'paystack').toLowerCase();
    if (method === 'flutterwave') return walletController.fundFlutterwave(req, res, next);
    if (method === 'bank-transfer') return walletController.fundBankTransfer(req, res, next);
    return walletController.fundPaystack(req, res, next);
});
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
        
        
        const { amount, destination, accountName, accountNumber, bankCode, pin } = req.body;
        const userId = req.user.id;
        
        // --- PIN Verification ---
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user.withdrawPin) {
            return res.status(403).json({ success: false, message: 'PIN_NOT_SET', details: 'Please set your withdrawal PIN first' });
        }
        const bcrypt = require('bcryptjs');
        const isValidPin = await bcrypt.compare(pin || '', user.withdrawPin);
        if (!isValidPin) {
            return res.status(401).json({ success: false, message: 'Invalid withdrawal PIN' });
        }
        // ------------------------

        
        // 1. Debit internal wallet
        await walletService.debit(userId, 'GONG', amount, {
            idempotencyKey: `WITHDRAW:${userId}:${Date.now()}`,
            direction: 'DEBIT',
            description: 'Withdrawal to Paystack'
        });
        
        // 2. Call Paystack API
        try {
            let recipientCode = destination;
            // If the frontend passed 'BANK' or 'BANK_TRANSFER', create a recipient first
            if (destination === 'BANK' || destination === 'BANK_TRANSFER') {
                const recipient = await paystackService.createTransferRecipient({
                    name: accountName || 'Seller Account',
                    accountNumber: accountNumber,
                    bankCode: bankCode || '044' // Default to Access Bank
                });
                recipientCode = recipient.recipientCode;
            }
            
            const transfer = await paystackService.initiateTransfer(amount, recipientCode, 'Wallet Withdrawal');
            
            // Add in-app notification
            const notificationV2Service = require('../services/notificationV2Service');
            await notificationV2Service.notify(userId, {
                type: 'WITHDRAWAL_INITIATED',
                title: 'Withdrawal Initiated',
                body: `Your withdrawal of ₦${amount.toLocaleString()} has been initiated successfully.`,
                actionUrl: '/seller/wallet'
            }).catch(err => console.error('Failed to send withdraw notification:', err));
            
            // Send email receipt
            const emailService = require('../services/emailService');
            await emailService.sendWithdrawalReceipt(
                req.user,
                amount,
                destination === 'BANK' || destination === 'BANK_TRANSFER' ? `Bank Account (${accountNumber})` : destination,
                transfer.reference || `WD-${Date.now()}`
            ).catch(err => console.error('Failed to send withdraw email receipt:', err));
            
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


// PIN Management Routes
router.post('/set-pin', protect, walletController.setWithdrawPin);
router.post('/forgot-pin', protect, walletController.forgotWithdrawPin);
router.post('/reset-pin', protect, walletController.resetWithdrawPin);

module.exports = router;
