/**
 * GlobalX Payment Proof Controller
 * Handles payment proof submissions, seller responses, and admin management
 */

const prisma = require('../utils/prismaClient');
const PaymentService = require('../services/paymentProofService');
const logger = require('../utils/logger');

/**
 * Submit payment proof (Buyer)
 */
exports.submitPaymentProof = async (req, res) => {
    try {
        const { orderId, amount, currency, bankName, accountNumber, transactionRef, proofImageUrl, sellerId, sellerName } = req.body;
        const buyerId = req.user.id;
        
        // Get buyer name
        const buyer = await prisma.user.findUnique({ where: { id: buyerId } });
        
        if (!buyer) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        const result = await PaymentService.submitPaymentProof({
            orderId,
            buyerId,
            buyerName: buyer.fullName,
            sellerId,
            sellerName,
            amount,
            currency,
            bankName,
            accountNumber,
            transactionRef,
            proofImageUrl
        });
        
        res.json(result);
        
    } catch (error) {
        logger.error('Submit payment proof error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Get buyer's payment proofs
 */
exports.getBuyerPaymentProofs = async (req, res) => {
    try {
        const buyerId = req.user.id;
        const proofs = await PaymentService.getBuyerPaymentProofs(buyerId);
        res.json({ success: true, proofs });
    } catch (error) {
        logger.error('Get buyer payment proofs error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Seller responds to payment proof
 */
exports.sellerRespond = async (req, res) => {
    try {
        const { proofId } = req.params;
        const { status, notes } = req.body;
        const sellerId = req.user.id;
        
        // Verify seller
        const seller = await prisma.user.findFirst({
            where: { id: sellerId, role: 'SELLER' }
        });
        
        if (!seller) {
            return res.status(403).json({ success: false, message: 'Only sellers can respond to payment proofs' });
        }
        
        const result = await PaymentService.sellerRespond(proofId, sellerId, { status, notes });
        res.json(result);
        
    } catch (error) {
        logger.error('Seller respond error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Get seller's payment proofs to review
 */
exports.getSellerPaymentProofs = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const proofs = await PaymentService.getSellerPaymentProofs(sellerId);
        res.json({ success: true, proofs });
    } catch (error) {
        logger.error('Get seller payment proofs error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Admin: Get all payment proofs
 */
exports.getAllPaymentProofs = async (req, res) => {
    try {
        const { status, sellerId, buyerId } = req.query;
        
        const proofs = await PaymentService.getAllPaymentProofs({
            status,
            sellerId,
            buyerId
        });
        
        res.json({ success: true, proofs });
        
    } catch (error) {
        logger.error('Get all payment proofs error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Admin: Review payment proof
 */
exports.adminReview = async (req, res) => {
    try {
        const { proofId } = req.params;
        const { status, notes } = req.body;
        const adminId = req.user.id;
        
        // Verify admin
        const admin = await prisma.user.findFirst({
            where: { id: adminId, role: 'ADMIN' }
        });
        
        if (!admin) {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        
        const result = await PaymentService.adminReview(proofId, adminId, { status, notes });
        res.json(result);
        
    } catch (error) {
        logger.error('Admin review error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Get payment proof details
 */
exports.getPaymentProofDetails = async (req, res) => {
    try {
        const { proofId } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;
        
        const proof = await prisma.paymentProof.findUnique({
            where: { id: proofId },
            include: { order: { include: { items: true } } }
        });
        
        if (!proof) {
            return res.status(404).json({ success: false, message: 'Payment proof not found' });
        }
        
        // Check access
        if (userRole === 'BUYER' && proof.buyerId !== userId) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        
        if (userRole === 'SELLER' && proof.sellerId !== userId) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        
        res.json({ success: true, proof });
        
    } catch (error) {
        logger.error('Get payment proof details error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Upload payment proof image
 */
exports.uploadProofImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image uploaded' });
        }
        
        // In production, upload to cloud storage and return URL
        const imageUrl = '/uploads/payment-proofs/' + req.file.filename;
        
        res.json({ 
            success: true, 
            url: imageUrl,
            message: 'Image uploaded successfully' 
        });
        
    } catch (error) {
        logger.error('Upload proof image error:', error);
        res.status(500).json({ success: false, message: 'Upload failed' });
    }
};

/**
 * Get audit log for payment proof (Admin)
 */
exports.getAuditLog = async (req, res) => {
    try {
        const { proofId } = req.params;
        
        const proof = await prisma.paymentProof.findUnique({
            where: { id: proofId }
        });
        
        if (!proof) {
            return res.status(404).json({ success: false, message: 'Payment proof not found' });
        }
        
        const auditLogs = await PaymentService.getAuditLogs(proofId);
        
        res.json({ success: true, auditLogs });
        
    } catch (error) {
        logger.error('Get audit log error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * View encrypted payment proof (Admin)
 */
exports.viewEncryptedProof = async (req, res) => {
    try {
        const { proofId } = req.params;
        
        const proof = await prisma.paymentProof.findUnique({
            where: { id: proofId }
        });
        
        if (!proof) {
            return res.status(404).json({ success: false, message: 'Payment proof not found' });
        }
        
        // Log access
        await PaymentService.createAuditLog(proofId, req.user.id, 'PROOF_VIEWED', {
            notes: 'Admin viewed encrypted payment proof'
        });
        
        // Return the URL for viewing (in production, serve decrypted content)
        res.json({ 
            success: true, 
            proofUrl: proof.proofImageUrl,
            message: 'Payment proof retrieved' 
        });
        
    } catch (error) {
        logger.error('View encrypted proof error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
