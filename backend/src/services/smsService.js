/**
 * GlobalX SMS Notification Service
 * Handles SMS notifications for payment events
 * Supports multiple providers: Twilio, Nexmo, custom gateway
 */

const logger = require('../utils/logger');

// SMS Provider Configuration
// In production, set SMS_PROVIDER env var to 'twilio' or 'nexmo'.
// In development (NODE_ENV !== 'production'), defaults to 'mock' for local testing.
const SMS_CONFIG = {
    provider: (process.env.SMS_PROVIDER || (process.env.NODE_ENV !== 'production' ? 'mock' : 'none')).toLowerCase(),
    from: process.env.SMS_FROM_NUMBER || 'WCOMMERCE',
    twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        fromNumber: process.env.TWILIO_FROM_NUMBER
    },
    nexmo: {
        apiKey: process.env.NEXMO_API_KEY,
        apiSecret: process.env.NEXMO_API_SECRET,
        fromNumber: process.env.NEXMO_FROM_NUMBER
    },
    termii: {
        apiUrl: process.env.TERMII_API_URL || 'https://v4.api.termii.com/',
        apiKey: process.env.TERMII_API_KEY
    }
};

class SMSService {
    /**
     * Send SMS notification
     * @param {string} phoneNumber - Recipient phone number
     * @param {string} message - Message content
     * @param {Object} options - Additional options
     */
    static async sendSMS(phoneNumber, message, options = {}) {
        try {
            if (!phoneNumber) {
                logger.warn('SMS send attempted without phone number');
                return { success: false, message: 'Phone number required' };
            }

            // Format phone number
            const formattedNumber = this.formatPhoneNumber(phoneNumber);

            // Log the attempt
            logger.info(`Sending SMS to ${formattedNumber}: ${message.substring(0, 50)}...`);

            // Select provider
            let result;
            switch (SMS_CONFIG.provider) {
                case 'twilio':
                    result = await this.sendViaTwilio(formattedNumber, message);
                    break;
                case 'nexmo':
                    result = await this.sendViaNexmo(formattedNumber, message);
                    break;
                case 'termii':
                    result = await this.sendViaTermii(formattedNumber, message);
                    break;
                case 'mock':
                case 'simulation':
                    result = await this.sendMockSMS(formattedNumber, message);
                    break;
                default:
                    // Production with no configured provider — log and skip gracefully
                    logger.warn(`[SMS] No SMS provider configured. Set SMS_PROVIDER env var. Message to ${formattedNumber} was NOT sent.`);
                    return { success: false, message: 'SMS provider not configured' };
            }

            return result;
        } catch (error) {
            logger.error('SMS send error:', error);
            return { success: false, message: error.message };
        }
    }
    
    /**
     * Format phone number to E.164 format
     */
    static formatPhoneNumber(phoneNumber) {
        // Remove all non-numeric characters
        const cleaned = phoneNumber.replace(/\D/g, '');
        
        // Add country code if not present
        if (cleaned.length === 10) {
            return '+1' + cleaned;
        } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
            return '+' + cleaned;
        } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
            // Convert Nigerian 070... to +23470...
            return '+234' + cleaned.substring(1);
        } else if (!phoneNumber.startsWith('+')) {
            return '+' + cleaned;
        }
        
        return phoneNumber;
    }
    
    /**
     * Send SMS via Twilio
     */
    static async sendViaTwilio(phoneNumber, message) {
        try {
            const twilio = require('twilio');
            const client = new twilio(SMS_CONFIG.twilio.accountSid, SMS_CONFIG.twilio.authToken);
            
            const result = await client.messages.create({
                body: message,
                from: SMS_CONFIG.twilio.fromNumber,
                to: phoneNumber
            });
            
            logger.info(`Twilio SMS sent: ${result.sid}`);
            return { success: true, sid: result.sid, provider: 'twilio' };
        } catch (error) {
            logger.error('Twilio SMS error:', error);
            return { success: false, message: error.message, provider: 'twilio' };
        }
    }
    
    /**
     * Send SMS via Nexmo
     */
    static async sendViaNexmo(phoneNumber, message) {
        try {
            const Nexmo = require('nexmo');
            const nexmo = new Nexmo({
                apiKey: SMS_CONFIG.nexmo.apiKey,
                apiSecret: SMS_CONFIG.nexmo.apiSecret
            });
            
            return new Promise((resolve) => {
                nexmo.sendSMS(
                    SMS_CONFIG.nexmo.fromNumber,
                    phoneNumber,
                    message,
                    (err, result) => {
                        if (err) {
                            logger.error('Nexmo SMS error:', err);
                            resolve({ success: false, message: err.message, provider: 'nexmo' });
                        } else {
                            logger.info(`Nexmo SMS sent: ${result.messages[0]['message-id']}`);
                            resolve({ success: true, id: result.messages[0]['message-id'], provider: 'nexmo' });
                        }
                    }
                );
            });
        } catch (error) {
            logger.error('Nexmo SMS error:', error);
            return { success: false, message: error.message, provider: 'nexmo' };
        }
    }
    
    /**
     * Send SMS via Termii
     */
    static async sendViaTermii(phoneNumber, message) {
        try {
            const axios = require('axios');
            // Termii requires phone number without '+' sign
            const termiiNumber = phoneNumber.replace('+', '');
            
            const payload = {
                to: termiiNumber,
                from: SMS_CONFIG.from,
                sms: message,
                type: 'plain',
                channel: 'generic',
                api_key: SMS_CONFIG.termii.apiKey
            };
            
            // Format URL to prevent double slashes
            const baseUrl = SMS_CONFIG.termii.apiUrl.endsWith('/') 
                ? SMS_CONFIG.termii.apiUrl.slice(0, -1) 
                : SMS_CONFIG.termii.apiUrl;
                
            const response = await axios.post(`${baseUrl}/api/sms/send`, payload);
            
            logger.info(`Termii SMS sent: ${JSON.stringify(response.data)}`);
            return { success: true, messageId: response.data.message_id, provider: 'termii' };
        } catch (error) {
            logger.error('Termii SMS error:', error.response?.data || error.message);
            return { success: false, message: error.message, provider: 'termii' };
        }
    }
    
    /**
     * Mock SMS for development/testing
     */
    static async sendMockSMS(phoneNumber, message) {
        logger.info(`[MOCK SMS] To: ${phoneNumber}, Message: ${message}`);
        
        // Store in database for later viewing
        const prisma = require('../utils/prismaClient');
        try {
            await prisma.notification.create({
                data: {
                    userId: 'system',
                    type: 'SMS_MOCK',
                    title: 'SMS Notification',
                    message: `To: ${phoneNumber}\n${message}`,
                    read: false
                }
            });
        } catch (e) {
            // Ignore DB errors for mock
        }
        
        return { success: true, mock: true, provider: 'mock' };
    }
    
    /**
     * Send payment proof notification to buyer
     */
    static async notifyBuyerPaymentProofSubmitted(buyerPhone, orderId, amount) {
        const message = `GlobalX: Your payment proof for order #${orderId.substring(0, 8)} ($${amount}) has been submitted and is pending review.`;
        return this.sendSMS(buyerPhone, message);
    }
    
    /**
     * Send payment verified notification to buyer
     */
    static async notifyBuyerPaymentVerified(buyerPhone, orderId, receiptNumber) {
        const message = `GlobalX: Your payment for order #${orderId.substring(0, 8)} has been verified! Receipt: ${receiptNumber}. Thank you!`;
        return this.sendSMS(buyerPhone, message);
    }
    
    /**
     * Send payment rejected notification to buyer
     */
    static async notifyBuyerPaymentRejected(buyerPhone, orderId, reason) {
        const message = `GlobalX: Your payment for order #${orderId.substring(0, 8)} was rejected. Reason: ${reason}. Please submit a new payment proof.`;
        return this.sendSMS(buyerPhone, message);
    }
    
    /**
     * Send new payment proof notification to seller
     */
    static async notifySellerNewPayment(sellerPhone, buyerName, amount, orderId) {
        const message = `GlobalX: New payment proof received from ${buyerName} for $${amount}. Order #${orderId.substring(0, 8)}. Please verify in your dashboard.`;
        return this.sendSMS(sellerPhone, message);
    }
    
    /**
     * Send order shipped notification to buyer
     */
    /**
     * Send order status update notification to buyer
     */
    static async sendOrderStatusUpdate(phone, orderId, status) {
        const message = `W-Commerce: Your order #${orderId.substring(0, 8)} status has been updated to ${status}.`;
        return this.sendSMS(phone, message);
    }
    
    /**
     * Send verification code (OTP) via SMS
     */
    static async sendVerificationCode(phone, code) {
        const message = `W-Commerce: Your verification code is ${code}. It expires in 15 minutes.`;
        return this.sendSMS(phone, message);
    }
}

module.exports = SMSService;
