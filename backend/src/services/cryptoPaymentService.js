/**
 * GlobalX Crypto Payment Service
 * Accepts Bitcoin, Ethereum, and other cryptocurrencies
 */

const logger = require('../utils/logger');
const axios = require('axios');
const crypto = require('crypto');

class CryptoPaymentService {
    // Supported cryptocurrencies
    static CRYPTOS = {
        BTC: { name: 'Bitcoin', symbol: 'BTC', decimals: 8, icon: 'BTC' },
        ETH: { name: 'Ethereum', symbol: 'ETH', decimals: 18, icon: 'ETH' },
        USDT: { name: 'Tether', symbol: 'USDT', decimals: 6, icon: 'USDT' },
        USDC: { name: 'USD Coin', symbol: 'USDC', decimals: 6, icon: 'USDC' },
        BNB: { name: 'BNB', symbol: 'BNB', decimals: 18, icon: 'BNB' },
        SOL: { name: 'Solana', symbol: 'SOL', decimals: 9, icon: 'SOL' },
        MATIC: { name: 'Polygon', symbol: 'MATIC', decimals: 18, icon: 'MATIC' },
        ADA: { name: 'Cardano', symbol: 'ADA', decimals: 6, icon: 'ADA' }
    };
    
    // Minimum order amounts in USD
    static MIN_AMOUNTS = {
        BTC: 10,
        ETH: 10,
        USDT: 1,
        USDC: 1,
        BNB: 1,
        SOL: 1,
        MATIC: 1,
        ADA: 1
    };
    
    // Exchange rate cache
    static exchangeRates = {};
    static lastFetch = null;
    static CACHE_DURATION = 60000; // 1 minute
    
    /**
     * Get available crypto payment options
     * @param {number} amount - Order amount in USD
     */
    static getAvailableCryptos(amount) {
        return Object.entries(this.CRYPTOS)
            .filter(([symbol, crypto]) => this.MIN_AMOUNTS[symbol] <= amount)
            .map(([symbol, crypto]) => ({
                ...crypto,
                symbol,
                minAmount: this.MIN_AMOUNTS[symbol],
                enabled: true
            }));
    }
    
    /**
     * Get current exchange rates
     */
    static async getExchangeRates() {
        // Check cache
        if (this.exchangeRates && this.lastFetch) {
const axios = require('axios');

class CryptoPaymentService {
    // Supported cryptocurrencies
    static CRYPTOS = {
        BTC: { name: 'Bitcoin', symbol: 'BTC', decimals: 8, icon: 'BTC' },
        ETH: { name: 'Ethereum', symbol: 'ETH', decimals: 18, icon: 'ETH' },
        USDT: { name: 'Tether', symbol: 'USDT', decimals: 6, icon: 'USDT' },
        USDC: { name: 'USD Coin', symbol: 'USDC', decimals: 6, icon: 'USDC' },
        BNB: { name: 'BNB', symbol: 'BNB', decimals: 18, icon: 'BNB' },
        SOL: { name: 'Solana', symbol: 'SOL', decimals: 9, icon: 'SOL' },
        MATIC: { name: 'Polygon', symbol: 'MATIC', decimals: 18, icon: 'MATIC' },
        ADA: { name: 'Cardano', symbol: 'ADA', decimals: 6, icon: 'ADA' }
    };
    
    // Minimum order amounts in USD
    static MIN_AMOUNTS = {
        BTC: 10,
        ETH: 10,
        USDT: 1,
        USDC: 1,
        BNB: 1,
        SOL: 1,
        MATIC: 1,
        ADA: 1
    };
    
    // Exchange rate cache
    static exchangeRates = {};
    static lastFetch = null;
    static CACHE_DURATION = 60000; // 1 minute
    
    /**
     * Get available crypto payment options
     * @param {number} amount - Order amount in USD
     */
    static getAvailableCryptos(amount) {
        return Object.entries(this.CRYPTOS)
            .filter(([symbol, crypto]) => this.MIN_AMOUNTS[symbol] <= amount)
            .map(([symbol, crypto]) => ({
                ...crypto,
                symbol,
                minAmount: this.MIN_AMOUNTS[symbol],
                enabled: true
            }));
    }
    
    /**
     * Get current exchange rates
     */
    static async getExchangeRates() {
        // Check cache
        if (this.exchangeRates && this.lastFetch) {
            const elapsed = Date.now() - this.lastFetch;
            if (elapsed < this.CACHE_DURATION) {
                return this.exchangeRates;
            }
        }
        
        try {
            const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether,usd-coin,binancecoin,solana,matic-network,cardano&vs_currencies=usd');
            const data = response.data;
            
            this.exchangeRates = {
                BTC: data.bitcoin?.usd || 67500,
                ETH: data.ethereum?.usd || 3450,
                USDT: data.tether?.usd || 1,
                USDC: data['usd-coin']?.usd || 1,
                BNB: data.binancecoin?.usd || 580,
                SOL: data.solana?.usd || 145,
                MATIC: data['matic-network']?.usd || 0.85,
                ADA: data.cardano?.usd || 0.65
            };
            
            this.lastFetch = Date.now();
            return this.exchangeRates;
            
        } catch (error) {
            logger.error('Failed to fetch exchange rates:', error);
            // Return cached rates if available
            return this.exchangeRates || this.getDefaultRates();
        }
    }
    
    /**
     * Get default exchange rates
     */
    static getDefaultRates() {
        return {
            BTC: 67500,
            ETH: 3450,
            USDT: 1,
            USDC: 1,
            BNB: 580,
            SOL: 145,
            MATIC: 0.85,
            ADA: 0.65
        };
    }
    
    /**
     * Calculate crypto amount for order
     * @param {number} usdAmount - Amount in USD
     * @param {string} cryptoSymbol - Cryptocurrency symbol
     */
    static async calculateCryptoAmount(usdAmount, cryptoSymbol) {
        const rates = await this.getExchangeRates();
        const rate = rates[cryptoSymbol];
        
        if (!rate) {
            throw new Error('Unsupported cryptocurrency: ' + cryptoSymbol);
        }
        
        const cryptoAmount = usdAmount / rate;
        const crypto = this.CRYPTOS[cryptoSymbol];
        
        return {
            cryptoAmount: parseFloat(cryptoAmount.toFixed(crypto.decimals)),
            usdAmount,
            rate,
            cryptoSymbol,
            cryptoName: crypto.name,
            icon: crypto.icon
        };
    }
    
    /**
     * Create crypto payment invoice
     * @param {Object} params - Payment parameters
     */
    static async createPayment(params) {
        const { orderId, amount, currency = 'USD', cryptoSymbol, customerEmail } = params;
        
        try {
            const COINBASE_API_KEY = process.env.COINBASE_API_KEY || '';
            const response = await axios.post('https://api.commerce.coinbase.com/charges', {
                name: 'Order ' + orderId,
                description: 'Payment for order ' + orderId,
                pricing_type: 'fixed_price',
                local_price: {
                    amount: amount,
                    currency: currency
                }
            }, {
                headers: {
                    'X-CC-Api-Key': COINBASE_API_KEY,
                    'X-CC-Version': '2018-03-22'
                }
            });
            
            const charge = response.data.data;
            
            const payment = {
                id: charge.id,
                orderId,
                status: 'pending',
                currency,
                cryptoSymbol,
                usdAmount: amount,
                paymentAddress: charge.hosted_url,
                customerEmail,
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 1800000)
            };
            
            logger.info('Created crypto payment: ' + payment.id);
            
            return { success: true, payment };
            
        } catch (error) {
            logger.error('Crypto payment creation error:', error);
            return { success: false, message: error.message };
        }
    }
    
    /**
     * Generate payment address for cryptocurrency
     * In production, this would integrate with crypto wallets
     */
    static async generatePaymentAddress(cryptoSymbol, orderId) {
        try {
            const response = await axios.post('https://api.crypto-provider.com/v1/address/generate', {
                currency: cryptoSymbol,
                orderId
            });
            return response.data.address;
        } catch (error) {
            logger.error('[CRYPTO] Address generation failed:', error.message);
            throw new Error('Crypto payment address generation is unavailable. Please try a different payment method.');
        }
    }
    
    /**
     * Get required confirmations for crypto
     */
    static getRequiredConfirmations(cryptoSymbol) {
        const confirmations = {
            BTC: 3,
            ETH: 12,
            USDT: 15,
            USDC: 15,
            BNB: 15,
            SOL: 32,
            MATIC: 100,
            ADA: 30
        };
        
        return confirmations[cryptoSymbol] || 6;
    }
    
    /**
     * Check payment status
     */
    static async checkPaymentStatus(paymentId) {
        logger.info('Checking crypto payment status for ' + paymentId);

        try {
            const response = await axios.get(`https://api.crypto-provider.com/v1/payments/${paymentId}`);
            const data = response.data;
            
            return {
                success: true,
                status: data.status || 'pending',
                confirmations: data.confirmations || 0
            };
        } catch (error) {
            logger.error('Error checking payment status:', error);
            return { success: false, message: error.message };
        }
    }
    /**
     * Handle webhook from payment processor
     */
    static async handleWebhook(event) {
        const { type, paymentId, txHash, confirmations } = event;
        
        switch (type) {
            case 'payment_received':
                logger.info('Payment ' + paymentId + ' received with ' + confirmations + ' confirmations');
                break;
            case 'payment_confirmed':
                logger.info('Payment ' + paymentId + ' confirmed');
                break;
            case 'payment_failed':
                logger.info('Payment ' + paymentId + ' failed');
                break;
        }
        
        return { received: true };
    }
    
    /**
     * Get crypto payment QR code data
     */
    static getQRData(payment) {
        const { cryptoAmount, cryptoSymbol, paymentAddress } = payment;
        
        // Different URI schemes for different cryptos
        const uriSchemes = {
            BTC: 'bitcoin:' + paymentAddress + '?amount=' + cryptoAmount,
            ETH: 'ethereum:' + paymentAddress + '?value=' + (cryptoAmount * 1e18),
            USDT: 'ethereum:' + paymentAddress + '?value=' + (cryptoAmount * 1e6),
            USDC: 'ethereum:' + paymentAddress + '?value=' + (cryptoAmount * 1e6),
            SOL: 'solana:' + paymentAddress + '?amount=' + cryptoAmount
        };
        
        return {
            address: paymentAddress,
            amount: cryptoAmount,
            symbol: cryptoSymbol,
            uri: uriSchemes[cryptoSymbol] || paymentAddress
        };
    }
    
    /**
     * Refund crypto payment
     */
    static async refundPayment(paymentId, refundAddress) {
        try {
            logger.info('Processing refund for payment ' + paymentId + ' to ' + refundAddress);
            
            const response = await axios.post(`https://api.crypto-provider.com/v1/payments/${paymentId}/refund`, {
                refundAddress
            });
            const data = response.data;
            
            return {
                success: true,
                refundId: data.refundId || ('refund_' + Date.now()),
                status: data.status || 'processing'
            };
        } catch (error) {
            logger.error('Refund error:', error);
            return { success: false, message: error.message };
        }
    }
}

module.exports = CryptoPaymentService;
