
const prisma = require('../utils/prismaClient');
const logger = require('../utils/logger');

class RevenueCatService {
    constructor() {
        this.apiKey = process.env.REVENUECAT_API_KEY;
        this.baseUrl = 'https://api.revenuecat.com/v1';
        
        if (!this.apiKey) {
            logger.warn('REVENUECAT_API_KEY is not set in environment variables');
        }
    }

    /**
     * Get subscriber information from RevenueCat
     * @param {string} appUserId - The unique user ID in our system
     * @returns {Promise<Object>}
     */
    async getSubscriber(appUserId) {
        try {
            const response = await fetch(`${this.baseUrl}/subscribers/${appUserId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Accept': 'application/json'
                }
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`RevenueCat error: ${response.status} ${errorText}`);
            }
            return await response.json();
        } catch (error) {
            logger.error(`Error fetching subscriber ${appUserId} from RevenueCat:`, error.message);
            throw error;
        }
    }

    /**
     * Update user subscription status based on RevenueCat entitlement
     * @param {string} userId - User ID
     * @param {Object} customerInfo - Customer info from RevenueCat Webhook or API
     */
    async updateUserSubscription(userId, customerInfo) {
        try {
            const entitlements = customerInfo.entitlements;
            
            // Look for active entitlements
            let activeEntitlement = null;
            let planIdentifier = null;

            let entitlementNameStr = '';
            
            if (entitlements && entitlements.active) {
                const entitlementKeys = Object.keys(entitlements.active);
                
                if (entitlementKeys.length > 0) {
                    activeEntitlement = entitlements.active[entitlementKeys[0]];
                    planIdentifier = activeEntitlement.product_identifier;
                    entitlementNameStr = entitlementKeys[0];
                }
            }

            // Fallback: If no entitlements are configured, check raw subscriptions
            if (!activeEntitlement && customerInfo.subscriptions) {
                const subscriptions = customerInfo.subscriptions;
                const subKeys = Object.keys(subscriptions);
                
                // Find the first active subscription (where expires_date is in the future)
                const now = new Date();
                for (const key of subKeys) {
                    const sub = subscriptions[key];
                    if (sub.expires_date && new Date(sub.expires_date) > now) {
                        activeEntitlement = sub;
                        planIdentifier = key;
                        entitlementNameStr = sub.display_name || 'unknown';
                        break;
                    }
                }
            }

            if (activeEntitlement) {
                // Has an active subscription
                const expiresDate = new Date(activeEntitlement.expires_date);
                
                // We need to map RevenueCat product_identifier or entitlement key to our DB enum/tier names
                let subscriptionTier = 'BASIC'; // Default
                let isCourier = false;
                
                // Check both the entitlement name and the product identifier for keywords
                const entitlementLower = (entitlementNameStr || '').toLowerCase();
                const productLower = (planIdentifier || '').toLowerCase();
                const combinedString = `${entitlementLower} ${productLower}`;
                
                if (combinedString.includes('pro') && !combinedString.includes('ultra1pro') && !combinedString.includes('ultra2pro') && !combinedString.includes('pro ultra')) subscriptionTier = 'PRO';
                if (combinedString.includes('premium')) subscriptionTier = 'PREMIUM';
                if (combinedString.includes('elite')) subscriptionTier = 'ELITE';
                if (combinedString.includes('enterprise')) subscriptionTier = 'ENTERPRISE';
                if (combinedString.includes('ultra') && !combinedString.includes('pro ultra') && !combinedString.includes('ultra1pro') && !combinedString.includes('ultra2pro')) subscriptionTier = 'ULTRA';
                
                // Precise matches for composite tiers if needed
                if (combinedString.includes('pro ultra')) subscriptionTier = 'PRO_ULTRA';
                if (combinedString.includes('ultra1pro')) subscriptionTier = 'ULTRA1PRO';
                if (combinedString.includes('ultra2pro')) subscriptionTier = 'ULTRA2PRO';

                if (combinedString.includes('courier')) {
                    isCourier = true;
                }

                const updateData = {
                    hasPaidAccess: true,
                    subscriptionTier: subscriptionTier.toUpperCase(),
                    accessExpiry: expiresDate
                };

                await prisma.user.update({
                    where: { id: userId },
                    data: updateData
                });

                logger.info(`Updated subscription for user ${userId} to ${subscriptionTier} via RevenueCat. Expires: ${expiresDate}`);
                return { success: true, active: true, tier: subscriptionTier };
            } else {
                // No active subscription - downgrade to BASIC or remove access
                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        hasPaidAccess: false,
                        subscriptionTier: 'BASIC'
                    }
                });
                
                logger.info(`Downgraded user ${userId} to BASIC (No active RevenueCat entitlements)`);
                return { success: true, active: false };
            }
        } catch (error) {
            logger.error(`Error updating user subscription from RevenueCat for ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Process RevenueCat webhook event
     * @param {Object} event - The webhook event payload
     */
    async processWebhook(event) {
        const { type, app_user_id, product_id, original_app_user_id, expiration_at_ms } = event;
        
        logger.info(`Received RevenueCat Webhook: ${type} for user ${app_user_id} (${product_id})`);

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { id: app_user_id }
        });

        if (!user) {
            logger.warn(`User ${app_user_id} not found for RevenueCat webhook`);
            return false;
        }

        // We can just fetch the latest customer info to be safe and derive status from entitlements
        try {
            const customerInfo = await this.getSubscriber(app_user_id);
            await this.updateUserSubscription(app_user_id, customerInfo.subscriber);
            return true;
        } catch (error) {
            logger.error(`Failed to process RevenueCat webhook for user ${app_user_id}`, error);
            return false;
        }
    }
}

module.exports = new RevenueCatService();
