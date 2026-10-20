const revenuecatService = require('../services/revenuecatService');
const logger = require('../utils/logger');

exports.handleWebhook = async (req, res) => {
    try {
        const event = req.body.event;
        
        if (!event) {
            return res.status(400).json({ error: 'No event payload' });
        }

        // Webhook authentication (Optional but recommended)
        const authHeader = req.headers['authorization'];
        const expectedAuth = process.env.REVENUECAT_WEBHOOK_AUTH;
        
        if (expectedAuth && authHeader !== `Bearer ${expectedAuth}`) {
            logger.warn('Unauthorized RevenueCat webhook attempt');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const success = await revenuecatService.processWebhook(event);

        if (success) {
            return res.status(200).json({ message: 'Webhook processed successfully' });
        } else {
            // We still return 200 to acknowledge receipt to RevenueCat, 
            // but we might want to flag it in our logs.
            return res.status(200).json({ message: 'Webhook received but processing failed or user not found' });
        }
    } catch (error) {
        logger.error('RevenueCat Webhook Controller Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
