const axios = require('axios');
const logger = require('../utils/logger');

// Use the same env names as pushService.js (ONESIGNAL_REST_API_KEY), keep the
// legacy ONESIGNAL_API_KEY name as a fallback. No dummy values: if keys are
// missing we skip the request instead of sending a guaranteed-401 call.
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_REST_API_KEY || process.env.ONESIGNAL_API_KEY;
const ONESIGNAL_ENABLED = Boolean(ONESIGNAL_APP_ID && ONESIGNAL_API_KEY);

const sendPushNotification = async (buyerId, message, scheduledDate = null) => {
    if (!ONESIGNAL_ENABLED) {
        logger.debug(`OneSignal not configured — skipped push for ${buyerId}`);
        return null;
    }
    try {
        const payload = {
            app_id: ONESIGNAL_APP_ID,
            include_external_user_ids: [buyerId.toString()],
            contents: { en: message },
            headings: { en: 'Next Discount Available! 🎁' }
        };

        if (scheduledDate) {
            payload.send_after = scheduledDate.toISOString();
        }

        const response = await axios.post('https://onesignal.com/api/v1/notifications', payload, {
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Authorization': `Basic ${ONESIGNAL_API_KEY}`
            }
        });

        logger.info(`Scheduled OneSignal Push for ${buyerId}: ${message}`);
        return response.data;
    } catch (error) {
        logger.error(`Error scheduling OneSignal push: ${error.message}`);
        return null;
    }
};

module.exports = { sendPushNotification };
