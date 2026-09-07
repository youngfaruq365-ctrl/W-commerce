const exchangeRates = require('../utils/exchangeRates');
const {
    isPaystackPublicKeyConfigured,
    isPaystackSecretConfigured,
    isStripePublishableKeyConfigured,
    isStripeSecretConfigured,
} = require('../utils/providerConfig');

/**
 * Public configuration for the frontend
 */
exports.getPublicConfig = (req, res) => {
    try {
        const stripePublishableKey = isStripePublishableKeyConfigured() ? process.env.STRIPE_PUBLISHABLE_KEY : '';
        const paystackPublicKey = isPaystackPublicKeyConfigured() ? process.env.PAYSTACK_PUBLIC_KEY : '';

        res.json({
            success: true,
            stripePublishableKey,
            paystackPublicKey,
            googleClientId: process.env.GOOGLE_CLIENT_ID || '',
            exchangeRates: exchangeRates.getAllRates('USD'),
            features: {
                flashSales: true,
                groupBuys: true,
                cryptoPayments: false,
                stripeCardPayments: Boolean(stripePublishableKey && isStripeSecretConfigured()),
                paystackPayments: Boolean(paystackPublicKey && isPaystackSecretConfigured()),
                inventorySync: process.env.ENABLE_REAL_INVENTORY_SYNC === 'true'
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to load configuration' });
    }
};

/**
 * Get Google Maps API key (client-side safe)
 */
exports.getGoogleMapsKey = (req, res) => {
    try {
        // Return the API key for client-side use
        // In production, you might want to use API keys with restrictions
        res.json({
            success: true,
            key: process.env.GOOGLE_MAPS_API_KEY || ''
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to load Google Maps key' });
    }
};
