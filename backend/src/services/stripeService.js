const logger = require('../utils/logger');

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const IS_MOCK = !STRIPE_SECRET_KEY || STRIPE_SECRET_KEY.includes('REPLACE') || STRIPE_SECRET_KEY.includes('your_stripe');

if (IS_MOCK) {
  logger.warn('[STRIPE] No STRIPE_SECRET_KEY found. Running in MOCK mode.');
}

let stripe = null;
if (!IS_MOCK) {
  stripe = require('stripe')(STRIPE_SECRET_KEY);
}

class StripeService {
    async createPaymentIntent(amount, currency = 'ngn', metadata = {}) {
        if (IS_MOCK) {
            logger.warn(`[STRIPE MOCK] createPaymentIntent: ${amount} ${currency}`);
            return {
                id: `pi_mock_${Date.now()}`,
                client_secret: `pi_mock_secret_${Date.now()}`,
                amount,
                currency,
                status: 'requires_payment_method',
                mock: true
            };
        }
        try {
            return await stripe.paymentIntents.create({
                amount: Math.round(amount),
                currency,
                metadata,
                automatic_payment_methods: { enabled: true }
            });
        } catch (error) {
            logger.error('[STRIPE] createPaymentIntent error:', error.message);
            throw error;
        }
    }

    async capturePayment(paymentId) {
        if (IS_MOCK) {
            logger.warn(`[STRIPE MOCK] capturePayment: ${paymentId}`);
            return { id: paymentId, status: 'succeeded', mock: true };
        }
        try {
            return await stripe.paymentIntents.capture(paymentId);
        } catch (error) {
            logger.error('[STRIPE] capturePayment error:', error.message);
            throw error;
        }
    }

    async constructWebhookEvent(payload, signature, webhookSecret) {
        if (IS_MOCK) {
            logger.warn('[STRIPE MOCK] constructWebhookEvent - skipping signature verification');
            return JSON.parse(payload.toString());
        }
        return stripe.webhooks.constructEvent(payload, signature, webhookSecret || process.env.STRIPE_WEBHOOK_SECRET);
    }
}

module.exports = new StripeService();
