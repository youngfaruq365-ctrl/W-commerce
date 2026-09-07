const walletService = require('../services/walletService');
const coinConversionService = require('../services/coinConversionService');
const payoutService = require('../services/payoutService');
const ApiClient = require('../utils/apiClient');
const exchangeRates = require('../utils/exchangeRates');
const logger = require('../utils/logger');

function requireIdempotency(req) {
    const key = req.headers['idempotency-key'] || req.body.idempotencyKey;
    if (!key) {
        const error = new Error('Idempotency-Key header is required');
        error.statusCode = 400;
        throw error;
    }
    return String(key);
}

function frontendBase(req) {
    return (process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
}

exports.getSummary = async (req, res) => {
    try {
        const summary = await walletService.getSummary(req.user.id);
        res.json({ success: true, summary });
    } catch (error) {
        logger.error(`Wallet summary error: ${error.message}`);
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

exports.getTransactions = async (req, res) => {
    try {
        const transactions = await walletService.listTransactions(req.user.id, req.query);
        res.json({ success: true, transactions });
    } catch (error) {
        logger.error(`Wallet transaction error: ${error.message}`);
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

exports.fundPaystack = async (req, res) => {
    try {
        const idempotencyKey = requireIdempotency(req);
        const amountGong = walletService.normalizeAmount(req.body.amount);
        const amountNgn = Math.round(amountGong * exchangeRates.getRate('USD', 'NGN'));
        const reference = `GONG-FUND-${req.user.id.substring(0, 8)}-${Date.now()}`;
        const response = await ApiClient.paystack('/transaction/initialize', 'POST', {
            email: req.user.email,
            amount: amountNgn * 100,
            currency: 'NGN',
            reference,
            metadata: {
                type: 'GONG_FUNDING',
                userId: req.user.id,
                amountGong,
                idempotencyKey
            },
            callback_url: `${frontendBase(req)}/buyer/dashboard?tab=wallet&funding=paystack`
        });

        res.json({
            success: true,
            provider: 'PAYSTACK',
            reference,
            amountGong,
            amountNgn,
            authorization_url: response.data.authorization_url
        });
    } catch (error) {
        logger.error(`Paystack wallet funding error: ${error.message}`);
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

exports.fundFlutterwave = async (req, res) => {
    try {
        const idempotencyKey = requireIdempotency(req);
        const amountGong = walletService.normalizeAmount(req.body.amount);
        const amountNgn = Math.round(amountGong * exchangeRates.getRate('USD', 'NGN'));
        const txRef = `GONG-FLW-${req.user.id.substring(0, 8)}-${Date.now()}`;
        const response = await ApiClient.flutterwave('/payments', 'POST', {
            tx_ref: txRef,
            amount: amountNgn,
            currency: 'NGN',
            redirect_url: `${frontendBase(req)}/buyer/dashboard?tab=wallet&funding=flutterwave`,
            customer: { email: req.user.email, name: req.user.fullName || 'GlobalX User' },
            customizations: { title: 'GlobalX Wallet Funding', description: `${amountGong} GONG wallet top-up` },
            meta: {
                type: 'GONG_FUNDING',
                userId: req.user.id,
                amountGong,
                idempotencyKey
            }
        });

        res.json({
            success: true,
            provider: 'FLUTTERWAVE',
            reference: txRef,
            amountGong,
            amountNgn,
            authorization_url: response.data?.link
        });
    } catch (error) {
        logger.error(`Flutterwave wallet funding error: ${error.message}`);
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

exports.fundBankTransfer = async (req, res) => {
    try {
        const idempotencyKey = requireIdempotency(req);
        const amountGong = walletService.normalizeAmount(req.body.amount);
        const amountNgn = Math.round(amountGong * exchangeRates.getRate('USD', 'NGN'));
        
        // Generate a transaction reference for tracking
        const txRef = `GONG-BANK-${req.user.id.substring(0, 8)}-${Date.now()}`;
        
        // In a real system, you would register a pending bank transfer transaction in DB
        
        res.json({
            success: true,
            provider: 'BANK_TRANSFER',
            reference: txRef,
            amountGong,
            amountNgn,
            bankDetails: {
                bankName: 'Chase Bank',
                accountName: 'GlobalX Escrow LLC',
                accountNumber: '1234567890',
                routingNumber: '098765432'
            },
            message: 'Bank transfer initiated successfully'
        });
    } catch (error) {
        logger.error(`Bank transfer wallet funding error: ${error.message}`);
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

exports.verifyPaystackFunding = async (req, res) => {
    try {
        const reference = req.params.reference;
        const response = await ApiClient.paystack(`/transaction/verify/${reference}`, 'GET');
        const data = response.data || {};
        if (data.status !== 'success' || data.metadata?.type !== 'GONG_FUNDING') {
            return res.status(400).json({ success: false, message: 'Funding payment is not successful' });
        }

        const amountGong = Number(data.metadata.amountGong || 0);
        if (!amountGong || amountGong <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid funding amount in payment metadata' });
        }
        // BUG-WALLET-01: Was using data.metadata.userId — a crafted payload could credit any wallet.
        // Always credit the authenticated user's wallet, not the userId from external metadata.
        const entry = await walletService.credit(req.user.id, 'GONG', amountGong, {
            idempotencyKey: data.metadata.idempotencyKey || `PAYSTACK_FUND:${reference}`,
            referenceType: 'PAYMENT',
            referenceId: reference,
            description: `Paystack funding: ${amountGong} GONG`
        });
        res.json({ success: true, entry });
    } catch (error) {
        logger.error(`Verify Paystack funding error: ${error.message}`);
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

exports.verifyFlutterwaveFunding = async (req, res) => {
    try {
        const txRef = req.params.txRef;
        const response = await ApiClient.flutterwave(`/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`, 'GET');
        const data = response.data || {};
        if (response.status !== 'success' || data.status !== 'successful' || data.meta?.type !== 'GONG_FUNDING') {
            return res.status(400).json({ success: false, message: 'Funding payment is not successful' });
        }

        const amountGong = Number(data.meta.amountGong || 0);
        if (!amountGong || amountGong <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid funding amount in payment metadata' });
        }
        // BUG-WALLET-01: Same fix as Paystack — always use authenticated user, not external metadata.
        const entry = await walletService.credit(req.user.id, 'GONG', amountGong, {
            idempotencyKey: data.meta.idempotencyKey || `FLW_FUND:${txRef}`,
            referenceType: 'PAYMENT',
            referenceId: txRef,
            description: `Flutterwave funding: ${amountGong} GONG`
        });
        res.json({ success: true, entry });
    } catch (error) {
        logger.error(`Verify Flutterwave funding error: ${error.message}`);
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

exports.withdraw = async (req, res) => {
    try {
        requireIdempotency(req);
        const { amount, destination, bankCode, accountNumber, accountName } = req.body;
        const payout = await payoutService.requestPayout(req.user.id, amount, destination, bankCode, accountNumber, accountName);
        res.json({ success: true, payout });
    } catch (error) {
        logger.error(`Wallet withdraw error: ${error.message}`);
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

exports.transfer = async (req, res) => {
    try {
        const idempotencyKey = requireIdempotency(req);
        const result = await walletService.transfer(req.user.id, req.body.toUserId, req.body.coin || 'GONG', req.body.amount, {
            idempotencyKey,
            description: req.body.description || 'Wallet transfer'
        });
        res.json({ success: true, result });
    } catch (error) {
        logger.error(`Wallet transfer error: ${error.message}`);
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

exports.convert = async (req, res) => {
    try {
        const idempotencyKey = requireIdempotency(req);
        const result = await coinConversionService.convertForUser(req.user.id, req.body.fromCoin, req.body.toCoin, req.body.amount, {
            idempotencyKey
        });
        res.json({ success: true, result });
    } catch (error) {
        logger.error(`Wallet conversion error: ${error.message}`);
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

exports.hold = async (req, res) => {
    try {
        const idempotencyKey = requireIdempotency(req);
        const hold = await walletService.createHold(req.user.id, req.body.coin || 'GONG', req.body.amount, {
            idempotencyKey,
            reason: req.body.reason || 'ESCROW',
            referenceType: req.body.referenceType,
            referenceId: req.body.referenceId
        });
        res.json({ success: true, hold });
    } catch (error) {
        logger.error(`Wallet hold error: ${error.message}`);
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

exports.releaseHold = async (req, res) => {
    try {
        requireIdempotency(req);
        const hold = await walletService.releaseHold(req.body.holdId, {
            referenceType: req.body.referenceType,
            referenceId: req.body.referenceId,
            description: 'Admin hold release'
        });
        res.json({ success: true, hold });
    } catch (error) {
        logger.error(`Wallet release hold error: ${error.message}`);
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

exports.refundHold = async (req, res) => {
    try {
        requireIdempotency(req);
        const hold = await walletService.refundHold(req.body.holdId, {
            referenceType: req.body.referenceType,
            referenceId: req.body.referenceId,
            description: 'Admin hold refund'
        });
        res.json({ success: true, hold });
    } catch (error) {
        logger.error(`Wallet refund hold error: ${error.message}`);
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};
