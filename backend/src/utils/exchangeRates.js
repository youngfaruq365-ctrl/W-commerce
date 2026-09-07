/**
 * GlobalX Exchange Rate Service
 * Centralized source for currency conversions
 */
const logger = require('./logger');

const rates = {
    'USD': {
        'NGN': 1480.00, // Benchmark
        'EUR': 0.92,
        'GBP': 0.79,
        'AED': 3.67,
        'GHS': 14.20,
        'KES': 129.50
    }
};

/**
 * Get exchange rate from one currency to another
 */
function getRate(from, to) {
    if (from === to) return 1;

    // Check direct rate
    if (rates[from] && rates[from][to]) {
        return rates[from][to];
    }

    // Check inverse rate
    if (rates[to] && rates[to][from]) {
        return 1 / rates[to][from];
    }

    // Try via USD as bridge
    if (from !== 'USD' && to !== 'USD') {
        const fromToUSD = getRate(from, 'USD');
        const USDToTo = getRate('USD', to);
        return fromToUSD * USDToTo;
    }

    return 1; // Fallback
}

/**
 * Convert amount from one currency to another
 */
function convert(amount, from, to) {
    const rate = getRate(from, to);
    return amount * rate;
}

/**
 * Get all rates for a base currency (default USD)
 */
function getAllRates(base = 'USD') {
    const output = {};
    const availableCurrencies = ['USD', 'NGN', 'EUR', 'GBP', 'AED', 'GHS', 'KES'];

    availableCurrencies.forEach(curr => {
        output[curr] = getRate(base, curr);
    });

    return output;
}

/**
 * Update rates dynamically (called by Cron)
 */
function updateRates(newRates) {
    if (!newRates || typeof newRates !== 'object') return;

    Object.keys(newRates).forEach(curr => {
        if (!rates['USD']) rates['USD'] = {};
        rates['USD'][curr] = newRates[curr];
    });
    logger.info(`[EXCHANGE] Rates updated for: ${Object.keys(newRates).join(', ')}`);
}

/**
 * Fetch real-world rates from an external API
 * Used by cron service
 */
async function fetchLatestRates() {
    const API_KEY = process.env.EXCHANGE_RATE_API_KEY;
    if (!API_KEY || API_KEY.includes('REPLACE_WITH')) {
        logger.warn("[EXCHANGE] No valid API key for real-time rates. Using static fallback rates. Set EXCHANGE_RATE_API_KEY in .env.");
        const staticFallback = {
            NGN: 1480.00,
            EUR: 0.92,
            GBP: 0.79,
            AED: 3.67,
            GHS: 14.20,
            KES: 129.50
        };
        updateRates(staticFallback);
        return staticFallback;
    }

    try {
        let fetchFn = globalThis.fetch;
        if (typeof fetchFn !== 'function') {
            const nodeFetch = await import('node-fetch');
            fetchFn = nodeFetch.default || nodeFetch;
        }

        const response = await fetchFn(`https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`);
        const data = await response.json();

        if (data.result === 'success') {
            updateRates(data.conversion_rates);
            return data.conversion_rates;
        } else {
            throw new Error(data['error-type'] || 'Unknown API error');
        }
    } catch (error) {
        logger.error(`[EXCHANGE] API Fetch failed: ${error.message}`);
        return null;
    }
}

module.exports = {
    getRate,
    convert,
    getAllRates,
    updateRates,
    fetchLatestRates
};
