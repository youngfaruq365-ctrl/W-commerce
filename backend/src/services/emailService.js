/**
 * Email Service - Nodemailer wrapper for transactional emails
 * Supports SendGrid, SMTP, and Ethereal (testing)
 */

const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Create transporter based on configuration
let transporter = null;

/**
 * Initialize the email transporter
 */
async function initializeEmailService() {
  const {
    SENDGRID_API_KEY,
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS,
    EMAIL_FROM,
    EMAIL_FROM_NAME,
    USE_ETHEREAL,
    ALLOW_EMAIL_SIMULATION
  } = process.env;

  try {
    // Priority 1: SendGrid
    if (SENDGRID_API_KEY) {
      transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: SENDGRID_API_KEY
        }
      });
      logger.info('[EMAIL] SendGrid transporter initialized');
      return;
    }

    // Priority 2: Custom SMTP
    if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
      transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT) || 587,
        secure: SMTP_SECURE === 'true',
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS
        }
      });
      logger.info(`[EMAIL] SMTP transporter initialized: ${SMTP_HOST}`);
      return;
    }

    // Priority 3: Ethereal (testing)
    if (USE_ETHEREAL === 'true') {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      logger.info('[EMAIL] Ethereal test transporter initialized');
      return;
    }

    // Fallback: Log only (simulation)
    if (ALLOW_EMAIL_SIMULATION === 'true') {
      logger.warn('[EMAIL] No email configuration found. Using simulation mode.');
      transporter = {
        sendMail: async (options) => {
          logger.info(`[EMAIL SIMULATED] To: ${options.to}`);
          logger.info(`[EMAIL SIMULATED] Subject: ${options.subject}`);
          return { messageId: 'simulated-' + Date.now() };
        }
      };
      return;
    }

    logger.error('[EMAIL] No email configuration available!');
  } catch (error) {
    logger.error('[EMAIL] Failed to initialize email service:', error);
  }
}

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body
 * @param {string} options.text - Plain text body
 */
async function sendEmail(options) {
  const { EMAIL_FROM, EMAIL_FROM_NAME } = process.env;

  if (!transporter) {
    await initializeEmailService();
  }

  // Graceful fallback if transporter is unavailable
  if (!transporter) {
    logger.warn(`[EMAIL SIMULATED] Transporter unavailable. Simulating send to ${options.to} (${options.subject})`);
    return { messageId: 'simulated-' + Date.now() };
  }

  const mailOptions = {
    from: `"${EMAIL_FROM_NAME || 'GlobalX'}" <${EMAIL_FROM || 'noreply@globalx.app'}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text || options.html.replace(/<[^>]*>/g, '')
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`[EMAIL] Sent to ${options.to}: ${info.messageId}`);

    // Preview URL for Ethereal
    if (info.messageUrl) {
      logger.info(`[EMAIL] Preview: ${info.messageUrl}`);
    }

    return info;
  } catch (error) {
    logger.warn(`[EMAIL] Failed to send to ${options.to} (${error.message}). Using fallback.`);
    return { messageId: 'fallback-' + Date.now(), fallback: true };
  }
}

/**
 * Send order confirmation email
 */
async function sendOrderConfirmation(order, user, products) {
  const productList = products.map(p => `
    <tr>
      <td>${p.title}</td>
      <td>${p.quantity}</td>
      <td>${p.price}</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #8a2be2;">Order Confirmed! 🛒</h2>
      <p>Hi ${user.fullName},</p>
      <p>Thank you for your order. Here are your order details:</p>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="background: #f5f5f5;">
          <th style="padding: 10px; text-align: left;">Product</th>
          <th style="padding: 10px; text-align: left;">Qty</th>
          <th style="padding: 10px; text-align: left;">Price</th>
        </tr>
        ${productList}
      </table>
      <p><strong>Order ID:</strong> ${order.id}</p>
      <p><strong>Total:</strong> ${order.total}</p>
      <p>We'll notify you when your order ships!</p>
      <hr>
      <p style="color: #666; font-size: 12px;">
        GlobalX - The Future of Cross-Border Commerce
      </p>
    </div>
  `;

  return sendEmail({
    to: user.email,
    subject: `Order Confirmed - #${order.id.slice(0, 8)}`,
    html
  });
}

/**
 * Send shipping notification email
 */
async function sendShippingNotification(order, user, trackingNumber, carrier) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #8a2be2;">Your Order Has Shipped! 📦</h2>
      <p>Hi ${user.fullName},</p>
      <p>Great news! Your order has been shipped.</p>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px;">
        <p><strong>Order ID:</strong> ${order.id}</p>
        <p><strong>Carrier:</strong> ${carrier}</p>
        <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
      </div>
      <p>Track your package: <a href="https://globalx.app/track/${order.id}">https://globalx.app/track/${order.id}</a></p>
      <hr>
      <p style="color: #666; font-size: 12px;">
        GlobalX - The Future of Cross-Border Commerce
      </p>
    </div>
  `;

  return sendEmail({
    to: user.email,
    subject: `Your Order Has Shipped! - #${order.id.slice(0, 8)}`,
    html
  });
}

/**
 * Send refund notification email
 */
async function sendRefundNotification(order, user, amount) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #8a2be2;">Refund Processed 💰</h2>
      <p>Hi ${user.fullName},</p>
      <p>Your refund has been processed successfully.</p>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px;">
        <p><strong>Order ID:</strong> ${order.id}</p>
        <p><strong>Refund Amount:</strong> ${amount}</p>
      </div>
      <p>Please allow 5-10 business days for the refund to appear in your account.</p>
      <hr>
      <p style="color: #666; font-size: 12px;">
        GlobalX - The Future of Cross-Border Commerce
      </p>
    </div>
  `;

  return sendEmail({
    to: user.email,
    subject: `Refund Processed - #${order.id.slice(0, 8)}`,
    html
  });
}

/**
 * Send new message notification email
 */
async function sendNewMessageNotification(user, senderName, preview) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #8a2be2;">New Message 💬</h2>
      <p>Hi ${user.fullName},</p>
      <p>You have a new message from <strong>${senderName}</strong>:</p>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px;">
        <p>${preview}</p>
      </div>
      <p><a href="https://globalx.app/messages" style="color: #8a2be2;">View in GlobalX</a></p>
      <hr>
      <p style="color: #666; font-size: 12px;">
        GlobalX - The Future of Cross-Border Commerce
      </p>
    </div>
  `;

  return sendEmail({
    to: user.email,
    subject: `New message from ${senderName}`,
    html
  });
}

/**
 * Send verification code email
 * @param {string} email - Recipient email address
 * @param {string} fullName - Recipient's full name  
 * @param {string} code - 6-digit verification code
 */
async function sendVerificationCode(email, fullName, code) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #8a2be2;">Verify Your Email 🔐</h2>
      <p>Hi ${fullName || 'there'},</p>
      <p>Your GlobalX verification code is:</p>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center;">
        <span style="font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #8a2be2;">${code}</span>
      </div>
      <p>This code expires in 24 hours. Do not share it with anyone.</p>
      <hr>
      <p style="color: #666; font-size: 12px;">
        GlobalX - The Future of Cross-Border Commerce
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'Verify your GlobalX email',
    html
  });
}

/**
 * Send password reset OTP email
 * @param {string} email - Recipient email address
 * @param {string} code - 6-digit reset code
 */
async function sendPasswordResetOTP(email, code) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #8a2be2;">Password Reset Request 🔑</h2>
      <p>We received a request to reset your GlobalX account password.</p>
      <p>Your reset code is:</p>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center;">
        <span style="font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #8a2be2;">${code}</span>
      </div>
      <p>This code expires in 15 minutes. If you did not request a password reset, please ignore this email.</p>
      <hr>
      <p style="color: #666; font-size: 12px;">
        GlobalX - The Future of Cross-Border Commerce
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'GlobalX Password Reset Code',
    html
  });
}

/**
 * Send order status update email
 */
async function sendOrderStatusUpdate(email, buyerName, orderId, status, trackingNumber) {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <h2 style="color: #000;">Order Status Update</h2>
      <p>Hi ${buyerName},</p>
      <p>Your order <strong>#${orderId.substring(0, 8).toUpperCase()}</strong> status has been updated to <strong>${status}</strong>.</p>
      ${trackingNumber ? `<p>Tracking Number: <strong>${trackingNumber}</strong></p>` : ''}
      <p>Thank you for shopping with us!</p>
      <hr>
      <p style="color: #666; font-size: 12px;">W-Commerce</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `Order Update: ${status}`,
    html
  });
}

/**
 * Send withdrawal receipt email
 */
async function sendWithdrawalReceipt(user, amount, destination, reference) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #0a0a0a;">Withdrawal Receipt 💸</h2>
      <p>Hi ${user.fullName},</p>
      <p>Your withdrawal request has been successfully processed.</p>
      
      <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Amount:</strong> ₦${amount.toLocaleString()}</p>
        <p style="margin: 5px 0;"><strong>Destination:</strong> ${destination}</p>
        <p style="margin: 5px 0;"><strong>Reference:</strong> ${reference}</p>
        <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date().toLocaleString()}</p>
      </div>

      <p>The funds should reflect in your destination account shortly, subject to processing times.</p>
      <p>If you have any questions, please contact our support team.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #666; font-size: 12px; text-align: center;">W-Commerce Escrow Team</p>
    </div>
  `;

  return sendEmail({
    to: user.email,
    subject: `Withdrawal Receipt - ₦${amount.toLocaleString()}`,
    html
  });
}

/**
 * Send generic verification / OTP email (for PIN reset, verification, etc.)
 */
async function sendVerificationEmail(user, otp, purpose = 'Verification') {
  const email = typeof user === 'string' ? user : (user.email || user);
  const fullName = typeof user === 'object' ? (user.fullName || user.name || 'Valued User') : 'Valued User';

  logger.info(`[EMAIL OTP] Delivering ${purpose} code to ${email}: ${otp}`);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #0a0a0a;">${purpose} Code 🔐</h2>
      <p>Hi ${fullName},</p>
      <p>Your one-time verification code for <strong>${purpose}</strong> is:</p>
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
        <span style="font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #000;">${otp}</span>
      </div>
      <p>This code expires in 15 minutes. If you did not request this, please ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #666; font-size: 12px; text-align: center;">GlobalX / W-Commerce Security Team</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `${purpose} Code: ${otp}`,
    html
  });
}

/**
 * Send verification reminder email
 */
async function sendVerificationReminder(email, { verifyLink, hoursSinceSignup }) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #8a2be2;">Verify Your Account ⏳</h2>
      <p>Hi there,</p>
      <p>It has been ${hoursSinceSignup || 24} hours since you signed up for GlobalX. Please complete your email verification to access all platform features.</p>
      <div style="margin: 25px 0;">
        <a href="${verifyLink}" style="background-color: #8a2be2; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email</a>
      </div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">GlobalX Team</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'Action Required: Verify Your GlobalX Account',
    html
  });
}

module.exports = {
  initializeEmailService,
  sendEmail,
  sendOrderConfirmation,
  sendShippingNotification,
  sendRefundNotification,
  sendNewMessageNotification,
  sendVerificationCode,
  sendPasswordResetOTP,
  sendOrderStatusUpdate,
  sendWithdrawalReceipt,
  sendVerificationEmail,
  sendVerificationReminder
};
