const webpush = require('web-push');
const logger = require('../utils/logger');

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:support@globalx.com';

const PUSH_ENABLED = VAPID_PUBLIC && VAPID_PRIVATE &&
  !VAPID_PUBLIC.includes('YOUR_VAPID') && !VAPID_PRIVATE.includes('YOUR_VAPID');

if (PUSH_ENABLED) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
  logger.info('[PUSH] Web Push configured with VAPID keys.');
} else {
  logger.warn('[PUSH] VAPID keys not configured. Push notifications are disabled. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env.');
}

const sendPushNotification = async (subscription, payload) => {
  if (!PUSH_ENABLED) {
    logger.warn('[PUSH] Push notification skipped — VAPID keys not set.');
    return { skipped: true };
  }
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    logger.info('[PUSH] Push notification sent successfully.');
    return { success: true };
  } catch (error) {
    logger.error('[PUSH] Error sending push notification:', error.message);
    throw error;
  }
};

module.exports = { sendPushNotification, PUSH_ENABLED };
