/**
 * GlobalX Payment Management Service
 * Direct buyer-to-seller transactions with payment proof workflows
 */

const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');
const { sendEmail } = require('./emailService');
const SMSService = require('./smsService');

class PaymentService {
    // Payment proof statuses
    static get STATUS() {
        return {
            PENDING: 'PENDING',
            SUBMITTED: 'SUBMITTED',
            UNDER_REVIEW: 'UNDER_REVIEW',
            VERIFIED: 'VERIFIED',
            REJECTED: 'REJECTED',
            COMPLETED: 'COMPLETED'
        };
    }
    
    /**
     * Submit payment proof for an order
     * @param {Object} data - Payment proof data
     */
    static async submitPaymentProof(data) {
        const { orderId, buyerId, buyerName, sellerId, sellerName, amount, currency, bankName, accountNumber, transactionRef, proofImageUrl } = data;
        
        try {
            // Validate order exists and belongs to buyer
            const order = await prisma.fulfillmentOrder.findFirst({
                where: { 
                    id: orderId,
                    buyerId: buyerId,
                    status: { in: ['PENDING', 'AWAITING_PAYMENT'] }
                },
                include: { items: { include: { product: { include: { store: true } } } } }
            });
            
            if (!order) {
                return { success: false, message: 'Order not found or already paid' };
            }
            
            // Validate seller assignment - ensure seller is the one fulfilling this order
            // In multi-seller orders, get the primary seller from order items
            const orderSellers = [...new Set(order.items.map(item => item.product.store?.sellerId))];
            
            if (!orderSellers.includes(sellerId)) {
                logger.warn(`Buyer ${buyerId} attempted to submit payment to wrong seller ${sellerId} for order ${orderId}`);
                return { 
                    success: false, 
                    message: 'Invalid seller. You can only submit payment to the seller assigned to your order.' 
                };
            }
            
            // Verify amount matches
            const orderTotal = parseFloat(order.totalAmount);
            if (parseFloat(amount) < orderTotal) {
                return { success: false, message: 'Payment amount is less than order total' };
            }
            
            // Create payment proof
            const paymentProof = await prisma.paymentProof.create({
                data: {
                    orderId,
                    buyerId,
                    buyerName,
                    sellerId,
                    sellerName,
                    amount: parseFloat(amount),
                    currency: currency || 'USD',
                    bankName,
                    accountNumber: accountNumber ? accountNumber.slice(-4) : null, // Store only last 4
                    transactionRef,
                    proofImageUrl,
                    status: this.STATUS.SUBMITTED
                }
            });
            
            // Update order status
            await prisma.fulfillmentOrder.update({
                where: { id: orderId },
                data: { 
                    status: 'PAYMENT_SUBMITTED'
                }
            });
            
            // Notify seller
            await this.notifySeller(paymentProof);
            
            // Notify admin
            await this.notifyAdmin(paymentProof);
            
            logger.info('Payment proof submitted for order: ' + orderId);
            
            return { 
                success: true, 
                paymentProof,
                message: 'Payment proof submitted successfully' 
            };
            
        } catch (error) {
            logger.error('Payment proof submission error:', error);
            return { success: false, message: 'Failed to submit payment proof' };
        }
    }
    
    /**
     * Seller responds to payment proof
     * @param {string} proofId - Payment proof ID
     * @param {string} sellerId - Seller ID
     * @param {Object} response - Seller's response
     */
    static async sellerRespond(proofId, sellerId, response) {
        const { status, notes } = response;
        
        try {
            // Verify seller owns this proof
            const proof = await prisma.paymentProof.findFirst({
                where: { 
                    id: proofId,
                    sellerId: sellerId
                }
            });
            
            if (!proof) {
                return { success: false, message: 'Payment proof not found or access denied' };
            }
            
            // Validate status
            if (!Object.values(this.STATUS).includes(status)) {
                return { success: false, message: 'Invalid status' };
            }
            
            // Update proof
            const updatedProof = await prisma.paymentProof.update({
                where: { id: proofId },
                data: {
                    status,
                    sellerResponse: notes,
                    sellerVerifiedAt: new Date()
                }
            });
            
            // If verified, update order and generate receipt
            if (status === this.STATUS.VERIFIED) {
                await this.processVerifiedPayment(proofId);
            }
            
            // Notify buyer
            await this.notifyBuyer(updatedProof);
            
            logger.info('Seller responded to payment proof: ' + proofId + ' with status: ' + status);
            
            return { success: true, paymentProof: updatedProof };
            
        } catch (error) {
            logger.error('Seller response error:', error);
            return { success: false, message: 'Failed to process seller response' };
        }
    }
    
    /**
     * Admin reviews payment proof
     * @param {string} proofId - Payment proof ID
     * @param {string} adminId - Admin ID
     * @param {Object} review - Admin review data
     */
    static async adminReview(proofId, adminId, review) {
        const { status, notes } = review;
        
        try {
            const proof = await prisma.paymentProof.findUnique({
                where: { id: proofId },
                include: { order: true }
            });
            
            if (!proof) {
                return { success: false, message: 'Payment proof not found' };
            }
            
            // Update proof
            const updatedProof = await prisma.paymentProof.update({
                where: { id: proofId },
                data: {
                    status,
                    adminNotes: notes,
                    adminReviewedAt: new Date()
                }
            });
            
            // If completed, ensure order is updated
            if (status === this.STATUS.COMPLETED) {
                await prisma.fulfillmentOrder.update({
                    where: { id: proof.orderId },
                    data: { status: 'PAID' }
                });
            }
            
            // Notify parties
            await this.notifyBuyer(updatedProof);
            await this.notifySeller(updatedProof);
            
            logger.info('Admin reviewed payment proof: ' + proofId);
            
            return { success: true, paymentProof: updatedProof };
            
        } catch (error) {
            logger.error('Admin review error:', error);
            return { success: false, message: 'Failed to process admin review' };
        }
    }
    
    /**
     * Process verified payment - generate receipt
     */
    static async processVerifiedPayment(proofId) {
        const proof = await prisma.paymentProof.findUnique({
            where: { id: proofId },
            include: { order: { include: { items: true } } }
        });
        
        // Generate receipt
        const receiptNumber = 'RCP-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
        
        // Generate receipt URL (in production, generate PDF)
        const receiptUrl = '/receipts/' + receiptNumber + '.pdf';
        
        // Update proof with receipt
        await prisma.paymentProof.update({
            where: { id: proofId },
            data: {
                status: this.STATUS.COMPLETED,
                receiptUrl,
                receiptNumber,
                receiptGeneratedAt: new Date()
            }
        });
        
        // Update order status
        await prisma.fulfillmentOrder.update({
            where: { id: proof.orderId },
            data: { status: 'PAID' }
        });
        
        // Send receipts
        await this.sendReceipts(proof, receiptNumber);
        
        return { success: true, receiptNumber };
    }
    
    /**
     * Generate and send receipts
     */
    static async sendReceipts(proof, receiptNumber) {
        const receiptData = {
            receiptNumber,
            orderId: proof.orderId,
            buyer: proof.buyerName,
            seller: proof.sellerName,
            amount: proof.amount,
            currency: proof.currency,
            date: new Date(),
            bankName: proof.bankName,
            transactionRef: proof.transactionRef
        };
        
        // Send to buyer
        await this.sendReceiptEmail(proof.buyerId, receiptData, 'buyer');
        
        // Send to seller
        await this.sendReceiptEmail(proof.sellerId, receiptData, 'seller');
        
        // Send to admin
        await this.sendReceiptEmail('admin@globalx.com', receiptData, 'admin');
        
        // Mark as notified
        await prisma.paymentProof.update({
            where: { id: proof.id },
            data: {
                buyerNotified: true,
                sellerNotified: true,
                adminNotified: true
            }
        });
    }
    
    /**
     * Send receipt email
     */
    static async sendReceiptEmail(userId, receiptData, type) {
        try {
            // Get user email
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user) return;
            
            const subject = type === 'admin' 
                ? 'New Payment Received - Order ' + receiptData.orderId
                : 'Payment Receipt - ' + receiptData.receiptNumber;
            
            const html = this.generateReceiptHTML(receiptData, type);
            
            await sendEmail(user.email, subject, html);
            
        } catch (error) {
            logger.error('Receipt email error:', error);
        }
    }
    
    /**
     * Generate receipt HTML
     */
    static generateReceiptHTML(data, type) {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #8a2be2, #ff007f); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0;">GLOBALX</h1>
                    <p style="color: white; margin: 5px 0 0 0;">PAYMENT RECEIPT</p>
                </div>
                
                <div style="padding: 30px; background: #f9f9f9;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #ddd;">
                                <strong>Receipt Number:</strong>
                            </td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #ddd; text-align: right;">
                                ${data.receiptNumber}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #ddd;">
                                <strong>Order ID:</strong>
                            </td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #ddd; text-align: right;">
                                ${data.orderId}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #ddd;">
                                <strong>Date:</strong>
                            </td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #ddd; text-align: right;">
                                ${new Date(data.date).toLocaleDateString()}
                            </td>
                        </tr>
                        ${type !== 'admin' ? `
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #ddd;">
                                <strong>Amount Paid:</strong>
                            </td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #ddd; text-align: right; font-size: 18px; color: #00aa00;">
                                ${data.currency} ${data.amount.toFixed(2)}
                            </td>
                        </tr>
                        ` : ''}
                    </table>
                    
                    <div style="margin-top: 20px; padding: 15px; background: white; border-radius: 8px;">
                        <h3 style="margin: 0 0 10px 0;">Payment Details</h3>
                        <p style="margin: 5px 0;"><strong>Bank:</strong> ${data.bankName}</p>
                        <p style="margin: 5px 0;"><strong>Transaction Ref:</strong> ${data.transactionRef}</p>
                    </div>
                    
                    <div style="margin-top: 20px; text-align: center;">
                        <a href="https://globalx.com/receipts/${data.receiptNumber}" 
                           style="display: inline-block; background: #8a2be2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px;">
                            View Full Receipt
                        </a>
                    </div>
                </div>
                
                <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
                    <p>GlobalX Marketplace - Secure Payments</p>
                    <p>This is an automated receipt. Please retain for your records.</p>
                </div>
            </div>
        `;
    }
    
    /**
     * Notify seller of new payment proof
     */
    static async notifySeller(proof) {
        try {
            const seller = await prisma.user.findUnique({ where: { id: proof.sellerId } });
            if (!seller) return;
            
            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
                    <div style="background: #8a2be2; padding: 20px; text-align: center;">
                        <h2 style="color: white; margin: 0;">New Payment Proof Submitted</h2>
                    </div>
                    <div style="padding: 20px; background: #f9f9f9;">
                        <p>A buyer has submitted payment proof for order.</p>
                        <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
                            <p><strong>Amount:</strong> ${proof.currency} ${parseFloat(proof.amount).toFixed(2)}</p>
                            <p><strong>Transaction Ref:</strong> ${proof.transactionRef}</p>
                            <p><strong>Bank:</strong> ${proof.bankName}</p>
                        </div>
                        <a href="https://globalx.com/seller-dashboard.html?tab=payments" 
                           style="display: inline-block; background: #8a2be2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px;">
                            Review Payment
                        </a>
                    </div>
                </div>
            `;
            
            await sendEmail(seller.email, 'New Payment Proof - Action Required', html);
            
            // Send SMS notification if phone available
            if (seller.phone) {
                await SMSService.notifySellerNewPayment(seller.phone, proof.buyerName, proof.amount.toString(), proof.orderId);
            }
            
        } catch (error) {
            logger.error('Seller notification error:', error);
        }
    }
    
    /**
     * Notify buyer of payment status update
     */
    static async notifyBuyer(proof) {
        try {
            const buyer = await prisma.user.findUnique({ where: { id: proof.buyerId } });
            if (!buyer) return;
            
            const statusMessages = {
                VERIFIED: 'Your payment has been verified!',
                REJECTED: 'Your payment proof was rejected. Please resubmit.',
                COMPLETED: 'Your payment is complete. Thank you!'
            };
            
            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
                    <div style="background: #00aa00; padding: 20px; text-align: center;">
                        <h2 style="color: white; margin: 0;">Payment Update</h2>
                    </div>
                    <div style="padding: 20px; background: #f9f9f9;">
                        <p>${statusMessages[proof.status] || 'Your payment status has been updated.'}</p>
                        ${proof.sellerResponse ? `
                        <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
                            <p><strong>Seller Note:</strong> ${proof.sellerResponse}</p>
                        </div>
                        ` : ''}
                        ${proof.receiptNumber ? `
                        <p><strong>Receipt Number:</strong> ${proof.receiptNumber}</p>
                        ` : ''}
                        <a href="https://globalx.com/buyer-dashboard.html?tab=orders" 
                           style="display: inline-block; background: #8a2be2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px;">
                            View Order
                        </a>
                    </div>
                </div>
            `;
            
            await sendEmail(buyer.email, 'Payment Status Update - Order ' + proof.orderId, html);
            
            // Send SMS notification if phone available
            if (buyer.phone) {
                const smsMessages = {
                    VERIFIED: `GlobalX: Your payment for order #${proof.orderId.substring(0, 8)} has been verified! Thank you!`,
                    REJECTED: `GlobalX: Your payment proof for order #${proof.orderId.substring(0, 8)} was rejected. Please resubmit.`,
                    COMPLETED: `GlobalX: Payment complete for order #${proof.orderId.substring(0, 8)}. Receipt: ${proof.receiptNumber}`
                };
                if (smsMessages[proof.status]) {
                    await SMSService.sendSMS(buyer.phone, smsMessages[proof.status]);
                }
            }
            
        } catch (error) {
            logger.error('Buyer notification error:', error);
        }
    }
    
    /**
     * Notify admin of new payment proof
     */
    static async notifyAdmin(proof) {
        try {
            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
                    <div style="background: #ff007f; padding: 20px; text-align: center;">
                        <h2 style="color: white; margin: 0;">New Payment Proof</h2>
                    </div>
                    <div style="padding: 20px; background: #f9f9f9;">
                        <p>New payment proof requires review.</p>
                        <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
                            <p><strong>Order:</strong> ${proof.orderId}</p>
                            <p><strong>Buyer:</strong> ${proof.buyerName}</p>
                            <p><strong>Seller:</strong> ${proof.sellerName}</p>
                            <p><strong>Amount:</strong> ${proof.currency} ${parseFloat(proof.amount).toFixed(2)}</p>
                        </div>
                        <a href="https://globalx.com/admin-payments.html" 
                           style="display: inline-block; background: #8a2be2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px;">
                            Review in Admin
                        </a>
                    </div>
                </div>
            `;
            
            await sendEmail('admin@globalx.com', 'New Payment Proof - Order ' + proof.orderId, html);
            
        } catch (error) {
            logger.error('Admin notification error:', error);
        }
    }
    
    /**
     * Get buyer's payment proofs
     */
    static async getBuyerPaymentProofs(buyerId) {
        return prisma.paymentProof.findMany({
            where: { buyerId },
            orderBy: { createdAt: 'desc' }
        });
    }
    
    /**
     * Get seller's payment proofs
     */
    static async getSellerPaymentProofs(sellerId) {
        return prisma.paymentProof.findMany({
            where: { sellerId },
            orderBy: { createdAt: 'desc' }
        });
    }
    
    /**
     * Get all payment proofs (admin)
     */
    static async getAllPaymentProofs(filters = {}) {
        const { status, sellerId, buyerId } = filters;
        
        const where = {};
        if (status) where.status = status;
        if (sellerId) where.sellerId = sellerId;
        if (buyerId) where.buyerId = buyerId;
        
        return prisma.paymentProof.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
    }
    
    /**
     * Create audit log entry for payment action
     * @param {string} paymentProofId - Payment proof ID
     * @param {string} userId - User who performed the action
     * @param {string} action - Action performed
     * @param {Object} details - Additional details
     */
    static async createAuditLog(paymentProofId, userId, action, details = {}) {
        try {
            // Get user info
            const user = await prisma.user.findUnique({ where: { id: userId } });
            
            const auditLog = await prisma.paymentAuditLog.create({
                data: {
                    paymentProofId,
                    userId,
                    userName: user?.fullName || 'Unknown',
                    userRole: user?.role || 'UNKNOWN',
                    action,
                    previousStatus: details.previousStatus,
                    newStatus: details.newStatus,
                    notes: details.notes,
                    ipAddress: details.ipAddress,
                    userAgent: details.userAgent
                }
            });
            
            logger.info(`Payment audit log created: ${action} by ${userId} for proof ${paymentProofId}`);
            
            return auditLog;
        } catch (error) {
            logger.error('Audit log creation error:', error);
            return null;
        }
    }
    
    /**
     * Get audit logs for a payment proof
     * @param {string} paymentProofId - Payment proof ID
     */
    static async getAuditLogs(paymentProofId) {
        try {
            return await prisma.paymentAuditLog.findMany({
                where: { paymentProofId },
                orderBy: { createdAt: 'asc' }
            });
        } catch (error) {
            logger.error('Get audit logs error:', error);
            return [];
        }
    }
    
    /**
     * Log payment status change with full audit trail
     */
    static async logStatusChange(paymentProofId, userId, oldStatus, newStatus, notes, ipAddress = null) {
        await this.createAuditLog(paymentProofId, userId, 'STATUS_CHANGE', {
            previousStatus: oldStatus,
            newStatus: newStatus,
            notes: notes,
            ipAddress: ipAddress
        });
    }
}

module.exports = PaymentService;
