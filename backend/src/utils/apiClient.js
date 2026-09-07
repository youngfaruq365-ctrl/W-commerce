const https = require('https');
const querystring = require('querystring');
const logger = require('./logger');
const {
    allowMockExternalApis,
    isFlutterwaveSecretConfigured,
    isPaystackSecretConfigured,
    isStripeSecretConfigured,
} = require('./providerConfig');

/**
 * Standardized API Client for External Services
 * Upgrade: Centralized handler for all API and Key needs.
 */

const ApiClient = {
    /**
     * Core HTTPS Request Wrapper
     */
    _exec: (options, postData = null) => {
        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(body);
                        if (parsed.error && parsed.error.message) reject(new Error(parsed.error.message));
                        else if (parsed.status === false) reject(new Error(parsed.message || 'Request failed'));
                        else resolve(parsed);
                    } catch (e) {
                        // Some Stripe errors return HTML or key-value if catastrophic
                        reject(new Error("Invalid API Response or Server Error"));
                    }
                });
            });

            req.on('error', (e) => {
                logger.error(`API Network Error: ${e.message}`);
                reject(e);
            });

            if (postData) req.write(postData);
            req.end();
        });
    },

    /**
     * Stripe API Wrapper
     */
    stripe: (endpoint, method = 'GET', data = null, extraHeaders = {}) => {
        if (!isStripeSecretConfigured()) {
            if (allowMockExternalApis()) {
                logger.warn(`[MOCK] Stripe API Call: ${method} ${endpoint}`);
                if (endpoint === '/payment_intents') {
                    return Promise.resolve({
                        id: 'pi_mock_' + Date.now(),
                        client_secret: 'pi_mock_secret_' + Date.now(),
                        amount: data.amount,
                        currency: data.currency,
                        status: 'succeeded'
                    });
                }
                return Promise.resolve({ id: 'mock_id', object: 'mock_object' });
            }

            throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY to enable live Stripe API calls.');
        }

        const postData = data ? querystring.stringify(data) : '';
        const options = {
            hostname: 'api.stripe.com',
            port: 443,
            path: '/v1' + endpoint,
            method: method,
            headers: {
                'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData),
                ...extraHeaders
            }
        };
        return ApiClient._exec(options, postData);
    },

    /**
     * Paystack API Wrapper
     */
    paystack: (endpoint, method = 'GET', data = null, extraHeaders = {}) => {
        if (!isPaystackSecretConfigured()) {
            if (allowMockExternalApis()) {
                logger.warn(`[MOCK] Paystack API Call: ${method} ${endpoint}`);
                if (endpoint === '/transaction/initialize') {
                    return Promise.resolve({
                        status: true,
                        message: 'Authorization URL created',
                        data: {
                            authorization_url: 'https://checkout.paystack.com/mock-checkout',
                            access_code: 'mock_access_code',
                            reference: data.reference || 'mock_ref_' + Date.now()
                        }
                    });
                }
                return Promise.resolve({ status: true, data: { status: 'success' } });
            }

            throw new Error('Paystack is not configured. Set PAYSTACK_SECRET_KEY to enable live Paystack API calls.');
        }

        const postData = data ? JSON.stringify(data) : '';
        const options = {
            hostname: 'api.paystack.co',
            port: 443,
            path: endpoint,
            method: method,
            headers: {
                'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                ...extraHeaders
            }
        };
        return ApiClient._exec(options, postData);
    },

    /**
     * Flutterwave API Wrapper
     */
    flutterwave: (endpoint, method = 'GET', data = null, extraHeaders = {}) => {
        if (!isFlutterwaveSecretConfigured()) {
            if (allowMockExternalApis()) {
                logger.warn(`[MOCK] Flutterwave API Call: ${method} ${endpoint}`);
                if (endpoint === '/payments') {
                    return Promise.resolve({
                        status: 'success',
                        message: 'Hosted Link',
                        data: {
                            link: 'https://checkout.flutterwave.com/mock-checkout'
                        }
                    });
                }
                return Promise.resolve({ status: 'success', data: {} });
            }

            throw new Error('Flutterwave is not configured. Set FLUTTERWAVE_SECRET_KEY to enable live Flutterwave API calls.');
        }

        const postData = data ? JSON.stringify(data) : '';
        const options = {
            hostname: 'api.flutterwave.com',
            port: 443,
            path: '/v3' + endpoint,
            method,
            headers: {
                'Authorization': `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                ...extraHeaders
            }
        };
        return ApiClient._exec(options, postData);
    }
};

module.exports = ApiClient;
