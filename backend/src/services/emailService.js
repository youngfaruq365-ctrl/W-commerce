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
    logger.error(`[EMAIL] Failed to send to ${options.to}:`, error);
    return null; // Suppress email errors
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

module.exports = {
  initializeEmailService,
  sendEmail,
  sendOrderConfirmation,
  sendShippingNotification,
  sendRefundNotification,
  sendNewMessageNotification,
  sendVerificationCode,
  sendPasswordResetOTP,
  sendOrderStatusUpdate
};
