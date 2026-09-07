/**
 * GlobalX Buy Now Pay Later (BNPL) Service
 * Integrates with Klarna, Afterpay, Clearpay
 */

const logger = require('../utils/logger');

class BNPLService {
    // BNPL Providers
    static PROVIDERS = {
        KLARNA: 'klarna',
        AFTERPAY: 'afterpay',
        CLEARPAY: 'clearpay',
        AFFIRM: 'affirm'
    };
    
    // Minimum order amounts (USD)
    static MIN_AMOUNTS = {
        klarna: 10,
        afterpay: 35,
        clearpay: 35,
        affirm: 50
    };
    
    /**
     * Get available BNPL options for an order
     * @param {number} amount - Order total in USD
     * @param {string} currency - Currency code
     * @param {string} country - Customer country code
     */
    static getAvailableOptions(amount, currency = 'USD', country = 'US') {
        const options = [];
        
        // Klarna - Available in many countries
        if (this.MIN_AMOUNTS.klarna <= amount && this.isKlarnaAvailable(country)) {
            options.push(this.getKlarnaOptions(amount, currency, country));
        }
        
        // Afterpay/Clearpay - US, UK, AU, NZ, CA
        if (this.MIN_AMOUNTS.afterpay <= amount && this.isAfterpayAvailable(country)) {
            options.push(this.getAfterpayOptions(amount, currency, country));
        }
        
        // Affirm - US only
        if (this.MIN_AMOUNTS.affirm <= amount && country === 'US') {
            options.push(this.getAffirmOptions(amount, currency));
        }
        
        return options;
    }
    
    /**
     * Check if Klarna is available in country
     */
    static isKlarnaAvailable(country) {
        const klarnaCountries = ['US', 'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'NO', 'FI', 'DK', 'AT', 'PL', 'IE', 'BE', 'PT'];
        return klarnaCountries.includes(country);
    }
    
    /**
     * Check if Afterpay is available in country
     */
    static isAfterpayAvailable(country) {
        const afterpayCountries = ['US', 'GB', 'AU', 'NZ', 'CA'];
        return afterpayCountries.includes(country);
    }
    
    /**
     * Get Klarna payment options
     */
    static getKlarnaOptions(amount, currency, country) {
        const locale = this.getLocale(country);
        const installmentPlans = this.calculateInstallments(amount, 4); // 4 interest-free payments
        
        return {
            provider: this.PROVIDERS.KLARNA,
            name: 'Klarna',
            logo: '/assets/klarna-logo.svg',
            description: 'Buy now, pay later with interest-free installments',
            eligibility: {
                minAmount: this.MIN_AMOUNTS.klarna,
                countries: ['US', 'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'NO', 'FI', 'DK', 'AT', 'PL', 'IE', 'BE', 'PT']
            },
            paymentPlans: [
                {
                    id: 'pay_in_4',
                    name: 'Pay in 4',
                    description: 'Interest-free payments',
                    installments: 4,
                    installmentAmount: installmentPlans.four,
                    firstPayment: installmentPlans.first,
                    interest: 0,
                    apr: 0,
                    totalAmount: amount
                },
                {
                    id: 'pay_in_30',
                    name: 'Pay in 30 days',
                    description: 'Pay after 30 days',
                    installments: 1,
                    installmentAmount: amount,
                    firstPayment: amount,
                    interest: 0,
                    apr: 0,
                    totalAmount: amount
                },
                {
                    id: 'finance_36',
                    name: 'Financing 36 months',
                    description: 'Flexible financing',
                    installments: 36,
                    installmentAmount: this.calculateMonthlyPayment(amount, 36, 0.0999),
                    firstPayment: this.calculateMonthlyPayment(amount, 36, 0.0999),
                    interest: 9.99,
                    apr: 9.99,
                    totalAmount: this.calculateTotalWithInterest(amount, 36, 0.0999)
                }
            ],
            cta: `Pay $${installmentPlans.first.toFixed(2)} today, then $${installmentPlans.four.toFixed(2)} every 2 weeks`
        };
    }
    
    /**
     * Get Afterpay/Clearpay payment options
     */
    static getAfterpayOptions(amount, currency, country) {
        const isClearpay = country === 'GB';
        const provider = isClearpay ? this.PROVIDERS.CLEARPAY : this.PROVIDERS.AFTERPAY;
        const name = isClearpay ? 'Clearpay' : 'Afterpay';
        const installmentPlans = this.calculateInstallments(amount, 4);
        
        return {
            provider,
            name,
            logo: isClearpay ? '/assets/clearpay-logo.svg' : '/assets/afterpay-logo.svg',
            description: `Interest-free payments with ${name}`,
            eligibility: {
                minAmount: this.MIN_AMOUNTS.afterpay,
                countries: ['US', 'GB', 'AU', 'NZ', 'CA']
            },
            paymentPlans: [
                {
                    id: 'pay_in_4',
                    name: 'Pay in 4',
                    description: 'Interest-free installments',
                    installments: 4,
                    installmentAmount: installmentPlans.four,
                    firstPayment: installmentPlans.first,
                    interest: 0,
                    apr: 0,
                    totalAmount: amount
                }
            ],
            cta: `4 interest-free payments of $${installmentPlans.four.toFixed(2)}`,
            termsUrl: isClearpay ? 'https://www.clearpay.co.uk/terms' : 'https://www.afterpay.com/installment-agreement'
        };
    }
    
    /**
     * Get Affirm payment options
     */
    static getAffirmOptions(amount, currency) {
        const installmentPlans = this.calculateInstallments(amount, 4);
        
        return {
            provider: this.PROVIDERS.AFFIRM,
            name: 'Affirm',
            logo: '/assets/affirm-logo.svg',
            description: 'Flexible monthly payments',
            eligibility: {
                minAmount: this.MIN_AMOUNTS.affirm,
                countries: ['US']
            },
            paymentPlans: [
                {
                    id: 'pay_in_4',
                    name: 'Pay in 4',
                    description: 'Interest-free payments',
                    installments: 4,
                    installmentAmount: installmentPlans.four,
                    firstPayment: installmentPlans.first,
                    interest: 0,
                    apr: 0,
                    totalAmount: amount
                },
                {
                    id: 'monthly_3',
                    name: 'Monthly payments',
                    description: 'As low as 0% APR',
                    installments: 3,
                    installmentAmount: this.calculateMonthlyPayment(amount, 3, 0),
                    firstPayment: this.calculateMonthlyPayment(amount, 3, 0),
                    interest: 0,
                    apr: 0,
                    totalAmount: amount
                },
                {
                    id: 'monthly_6',
                    name: 'Monthly payments',
                    description: 'As low as 10% APR',
                    installments: 6,
                    installmentAmount: this.calculateMonthlyPayment(amount, 6, 0.10),
                    firstPayment: this.calculateMonthlyPayment(amount, 6, 0.10),
                    interest: 10,
                    apr: 10,
                    totalAmount: this.calculateTotalWithInterest(amount, 6, 0.10)
                }
            ],
            cta: `From $${installmentPlans.four.toFixed(2)}/month`
        };
    }
    
    /**
     * Calculate interest-free installments
     */
    static calculateInstallments(amount, count) {
        const perInstallment = amount / count;
        return {
            four: perInstallment,
            first: perInstallment,
            last: perInstallment
        };
    }
    
    /**
     * Calculate monthly payment with interest
     */
    static calculateMonthlyPayment(amount, months, annualRate) {
        if (annualRate === 0) {
            return amount / months;
        }
        
        const monthlyRate = annualRate / 12;
        const payment = (amount * monthlyRate * Math.pow(1 + monthlyRate, months)) / 
            (Math.pow(1 + monthlyRate, months) - 1);
        
        return payment;
    }
    
    /**
     * Calculate total with interest
     */
    static calculateTotalWithInterest(amount, months, annualRate) {
        const monthlyPayment = this.calculateMonthlyPayment(amount, months, annualRate);
        return monthlyPayment * months;
    }
    
    /**
     * Get locale for country
     */
    static getLocale(country) {
        const locales = {
            'US': 'en-US',
            'GB': 'en-GB',
            'DE': 'de-DE',
            'FR': 'fr-FR',
            'IT': 'it-IT',
            'ES': 'es-ES',
            'NL': 'nl-NL',
            'SE': 'sv-SE',
            'NO': 'nb-NO',
            'FI': 'fi-FI',
            'DK': 'da-DK',
            'AT': 'de-AT',
            'PL': 'pl-PL',
            'IE': 'en-IE',
            'BE': 'nl-BE',
            'PT': 'pt-PT',
            'AU': 'en-AU',
            'NZ': 'en-NZ',
            'CA': 'en-CA'
        };
        return locales[country] || 'en-US';
    }
    
    /**
     * Create BNPL checkout session
     * @param {Object} params - Checkout parameters
     */
    static async createCheckout(params) {
        const { provider, amount, currency, orderId, customer, items } = params;
        
        try {
            switch (provider) {
                case this.PROVIDERS.KLARNA:
                    return await this.createKlarnaSession(params);
                case this.PROVIDERS.AFTERPAY:
                case this.PROVIDERS.CLEARPAY:
                    return await this.createAfterpaySession(params);
                case this.PROVIDERS.AFFIRM:
                    return await this.createAffirmSession(params);
                default:
                    throw new Error('Unknown BNPL provider');
            }
        } catch (error) {
            logger.error('BNPL checkout error:', error);
            return { success: false, message: error.message };
        }
    }
    
    /**
     * Create Klarna checkout session
     */
    static async createKlarnaSession(params) {
        // In production, call Klarna API:
        // POST https://api.klarna.com/checkout/v3/orders
        
        logger.info('Creating Klarna checkout session...');
        
        // Placeholder response
        return {
            success: true,
            provider: this.PROVIDERS.KLARNA,
            sessionId: 'klarna_session_' + Date.now(),
            redirectUrl: `https://checkout.klarna.com/checkout?session_id=klarna_session_${Date.now()}`,
            expiresAt: new Date(Date.now() + 3600000)
        };
    }
    
    /**
     * Create Afterpay checkout session
     */
    static async createAfterpaySession(params) {
        // In production, call Afterpay API:
        // POST https://api.afterpay.com/v1/checkouts
        
        logger.info('Creating Afterpay checkout session...');
        
        // Placeholder response
        return {
            success: true,
            provider: this.PROVIDERS.AFTERPAY,
            sessionId: 'afterpay_session_' + Date.now(),
            redirectUrl: `https://checkout.afterpay.com/checkout?token=afterpay_session_${Date.now()}`,
            expiresAt: new Date(Date.now() + 3600000)
        };
    }
    
    /**
     * Create Affirm checkout session
     */
    static async createAffirmSession(params) {
        // In production, call Affirm API:
        // POST https://api.affirm.com/api/v1/checkout
        
        logger.info('Creating Affirm checkout session...');
        
        // Placeholder response
        return {
            success: true,
            provider: this.PROVIDERS.AFFIRM,
            sessionId: 'affirm_session_' + Date.now(),
            redirectUrl: `https://checkout.affirm.com/checkout?token=affirm_session_${Date.now()}`,
            expiresAt: new Date(Date.now() + 3600000)
        };
    }
    
    /**
     * Handle BNPL webhook
     */
    static async handleWebhook(provider, event) {
        switch (provider) {
            case this.PROVIDERS.KLARNA:
                return this.handleKlarnaWebhook(event);
            case this.PROVIDERS.AFTERPAY:
            case this.PROVIDERS.CLEARPAY:
                return this.handleAfterpayWebhook(event);
            case this.PROVIDERS.AFFIRM:
                return this.handleAffirmWebhook(event);
        }
    }
    
    /**
     * Handle Klarna webhook
     */
    static handleKlarnaWebhook(event) {
        const { type, orderId } = event;
        
        switch (type) {
            case 'checkout_completed':
                logger.info(`Klarna order ${orderId} completed`);
                // Update order status
                break;
            case 'checkout_failed':
                logger.info(`Klarna order ${orderId} failed`);
                break;
            case 'payment_captured':
                logger.info(`Klarna payment captured for ${orderId}`);
                break;
        }
        
        return { received: true };
    }
    
    /**
     * Handle Afterpay webhook
     */
    static handleAfterpayWebhook(event) {
        const { type, orderId } = event;
        
        switch (type) {
            case 'payment.approved':
                logger.info(`Afterpay payment approved for ${orderId}`);
                break;
            case 'payment.captured':
                logger.info(`Afterpay payment captured for ${orderId}`);
                break;
        }
        
        return { received: true };
    }
    
    /**
     * Handle Affirm webhook
     */
    static handleAffirmWebhook(event) {
        const { type, orderId } = event;
        
        switch (type) {
            case 'checkout.authorized':
                logger.info(`Affirm checkout authorized for ${orderId}`);
                break;
            case 'payment.captured':
                logger.info(`Affirm payment captured for ${orderId}`);
                break;
        }
        
        return { received: true };
    }
}

module.exports = BNPLService;
