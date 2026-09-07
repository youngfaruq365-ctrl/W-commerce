// backend/src/services/twilioMaskingService.js
const twilio = require('twilio');
const logger = require('../utils/logger'); // Assuming this exists given the project structure

exports.getProxyNumber = async (deliveryId, callerId, recipientId) => {
    try {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const proxyServiceSid = process.env.TWILIO_PROXY_SERVICE_SID;

        if (!accountSid || !authToken || !proxyServiceSid) {
            throw new Error('Twilio proxy service is unavailable. Phone masking is not possible at this time.');
        }

        const client = twilio(accountSid, authToken);
        
        // Ensure a session exists for this delivery
        let session;
        try {
            session = await client.proxy.v1.services(proxyServiceSid)
                .sessions(deliveryId)
                .fetch();
        } catch (e) {
            if (e.status === 404) {
                // Create a new session
                session = await client.proxy.v1.services(proxyServiceSid)
                    .sessions
                    .create({
                        uniqueName: deliveryId,
                        ttl: 3600 // 1 hour
                    });
            } else {
                throw e;
            }
        }

        // Add the caller (e.g., driver) to the session
        const participant = await client.proxy.v1.services(proxyServiceSid)
            .sessions(session.sid)
            .participants
            .create({
                identifier: callerId,
                friendlyName: 'Caller'
            });

        // Add the recipient (e.g., buyer) to the session
        await client.proxy.v1.services(proxyServiceSid)
            .sessions(session.sid)
            .participants
            .create({
                identifier: recipientId,
                friendlyName: 'Recipient'
            });

        return participant.proxyIdentifier;
    } catch (error) {
        logger.error(`Twilio Masking Error: ${error.message}`);
        throw new Error('Twilio proxy service is unavailable. Phone masking is not possible at this time.');
    }
};
