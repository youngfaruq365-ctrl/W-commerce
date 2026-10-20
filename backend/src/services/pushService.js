const axios = require('axios');
const logger = require('../utils/logger');

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

const PUSH_ENABLED = Boolean(ONESIGNAL_APP_ID && ONESIGNAL_REST_API_KEY);

if (PUSH_ENABLED) {
  logger.info('[PUSH] OneSignal configured for push notifications.');
} else {
  logger.warn('OneSignal keys not configured — push notifications disabled');
}

/**
 * Send push notification via OneSignal REST API
 * @param {string} userId - The user's W-Commerce User ID
 * @param {object} payload - Title, message, and JSON data
 */
const sendPushNotification = async (userId, payload) => {
  if (!PUSH_ENABLED) {
    logger.warn('OneSignal keys not configured — push notifications disabled');
    return { skipped: true };
  }
  try {
    const response = await axios.post(
      'https://onesignal.com/api/v1/notifications',
      {
        app_id: ONESIGNAL_APP_ID,
        include_external_user_ids: [userId],
        headings: { en: payload.title },
        contents: { en: payload.body || payload.message },
        data: payload.data || {}
      },
      {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
        }
      }
    );
    logger.info(`[PUSH] OneSignal push sent to user ${userId}:`, response.data);
    return { success: true, data: response.data };
  } catch (error) {
    logger.error(`[PUSH] Error sending OneSignal push to ${userId}:`, error.response?.data || error.message);
    throw error;
  }
};

module.exports = { sendPushNotification, PUSH_ENABLED };
