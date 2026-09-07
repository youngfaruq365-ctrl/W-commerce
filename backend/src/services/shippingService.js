/**
 * GlobalX Shipping & Landed Cost Calculator
 * Calculates shipping, taxes, and duties for international orders
 */

const logger = require('../utils/logger');

// Shipping rates by region (base rates in USD)
const SHIPPING_RATES = {
    'US': { base: 5.99, perKg: 2.50, days: '3-5', region: 'North America' },
    'CA': { base: 8.99, perKg: 3.50, days: '5-8', region: 'North America' },
    'MX': { base: 12.99, perKg: 4.00, days: '7-10', region: 'North America' },
    'GB': { base: 9.99, perKg: 3.00, days: '5-7', region: 'Europe' },
    'DE': { base: 10.99, perKg: 3.25, days: '5-8', region: 'Europe' },
    'FR': { base: 10.99, perKg: 3.25, days: '5-8', region: 'Europe' },
    'IT': { base: 11.99, perKg: 3.50, days: '6-9', region: 'Europe' },
    'ES': { base: 11.99, perKg: 3.50, days: '6-9', region: 'Europe' },
    'NL': { base: 10.99, perKg: 3.25, days: '5-8', region: 'Europe' },
    'AE': { base: 14.99, perKg: 4.50, days: '4-7', region: 'Middle East' },
    'SA': { base: 15.99, perKg: 5.00, days: '5-8', region: 'Middle East' },
    'IL': { base: 14.99, perKg: 4.50, days: '5-8', region: 'Middle East' },
    'JP': { base: 8.99, perKg: 3.00, days: '3-5', region: 'Asia Pacific' },
    'KR': { base: 9.99, perKg: 3.25, days: '4-6', region: 'Asia Pacific' },
    'CN': { base: 7.99, perKg: 2.75, days: '4-7', region: 'Asia Pacific' },
    'SG': { base: 10.99, perKg: 3.50, days: '4-6', region: 'Asia Pacific' },
    'AU': { base: 12.99, perKg: 4.00, days: '6-10', region: 'Asia Pacific' },
    'NZ': { base: 14.99, perKg: 4.50, days: '7-12', region: 'Asia Pacific' },
    'IN': { base: 11.99, perKg: 3.50, days: '6-10', region: 'Asia Pacific' },
    'BR': { base: 15.99, perKg: 5.00, days: '8-14', region: 'South America' },
    'AR': { base: 16.99, perKg: 5.50, days: '8-14', region: 'South America' },
    'ZA': { base: 14.99, perKg: 4.50, days: '7-12', region: 'Africa' }
};

// Import duty rates by category (percentage)
const DUTY_RATES = {
    'Electronics': { US: 0, EU: 0, CA: 0, default: 3 },
    'Clothing': { US: 12, EU: 8, CA: 18, default: 15 },
    'Footwear': { US: 37, EU: 17, CA: 18, default: 20 },
    'Accessories': { US: 7, EU: 4, CA: 8, default: 10 },
    'Home & Garden': { US: 0, EU: 0, CA: 0, default: 5 },
    'Sports': { US: 5, EU: 4, CA: 5, default: 8 },
    'Toys': { US: 0, EU: 0, CA: 0, default: 0 },
    'Books': { US: 0, EU: 0, CA: 0, default: 0 },
    'Beauty': { US: 0, EU: 6.5, CA: 0, default: 5 },
    'Food': { US: 0, EU: 0, CA: 0, default: 10 },
    'default': { US: 3, EU: 2, CA: 3, default: 5 }
};

// Sales tax rates by region
const TAX_RATES = {
    'US': { min: 0, max: 10, average: 7.25 },  // State sales tax varies
    'CA': { min: 5, max: 15, average: 13 },     // GST/HST varies by province
    'GB': { min: 20, max: 20, average: 20 },    // VAT
    'DE': { min: 19, max: 19, average: 19 },    // VAT
    'FR': { min: 20, max: 20, average: 20 },    // VAT
    'JP': { min: 10, max: 10, average: 10 },    // Consumption tax
    'AU': { min: 10, max: 10, average: 10 },    // GST
    'default': { min: 0, max: 0, average: 0 }
};

class ShippingService {
    /**
     * Calculate landed cost (item + shipping + tax + duty)
     * @param {Object} params - Calculation parameters
     * @returns {Object} Landed cost breakdown
     */
    static async calculateLandedCost({
        itemPrice,
        quantity = 1,
        weight = 0.5, // kg
        category = 'default',
        destinationCountry = 'US',
        destinationState = '',
        isBusiness = false
    }) {
        const subtotal = itemPrice * quantity;
        
        // Get shipping rates
        const shipping = this.getShippingRate(destinationCountry, weight, quantity);
        
        // Calculate duty
        const duty = this.calculateDuty(subtotal, category, destinationCountry);
        
        // Calculate tax
        const tax = this.calculateTax(subtotal + shipping.cost + duty, destinationCountry, destinationState, isBusiness);
        
        // Calculate total
        const total = subtotal + shipping.cost + duty + tax.amount;
        
        return {
            subtotal: parseFloat(subtotal.toFixed(2)),
            shipping: {
                cost: parseFloat(shipping.cost.toFixed(2)),
                method: shipping.method,
                estimatedDays: shipping.days,
                carrier: shipping.carrier
            },
            duty: parseFloat(duty.toFixed(2)),
            tax: {
                amount: parseFloat(tax.amount.toFixed(2)),
                rate: tax.rate,
                breakdown: tax.breakdown
            },
            total: parseFloat(total.toFixed(2)),
            currency: 'USD',
            breakdown: {
                itemCost: parseFloat(subtotal.toFixed(2)),
                shippingCost: parseFloat(shipping.cost.toFixed(2)),
                importDuty: parseFloat(duty.toFixed(2)),
                salesTax: parseFloat(tax.amount.toFixed(2))
            }
        };
    }
    
    /**
     * Get shipping rate for destination
     */
    static getShippingRate(country, weight, quantity) {
        const rates = SHIPPING_RATES[country] || SHIPPING_RATES['US'];
        
        // Calculate based on weight and quantity
        const baseCost = rates.base;
        const weightCost = weight * rates.perKg * quantity;
        const totalCost = baseCost + weightCost;
        
        // Determine shipping method based on price
        let method = 'Standard';
        let carrier = 'GlobalX Shipping';
        
        if (totalCost > 100) {
            method = 'Express';
            carrier = 'DHL Express';
        } else if (totalCost > 50) {
            method = 'Priority';
            carrier = 'FedEx International';
        }
        
        return {
            cost: totalCost,
            method,
            days: rates.days,
            carrier,
            region: rates.region
        };
    }
    
    /**
     * Calculate import duty
     */
    static calculateDuty(subtotal, category, country) {
        const categoryRates = DUTY_RATES[category] || DUTY_RATES['default'];
        
        // Determine rate based on destination
        let rate = categoryRates.default;
        
        if (country === 'US' && categoryRates.US !== undefined) {
            rate = categoryRates.US;
        } else if ((country === 'GB' || country === 'DE' || country === 'FR') && categoryRates.EU !== undefined) {
            rate = categoryRates.EU;
        } else if (country === 'CA' && categoryRates.CA !== undefined) {
            rate = categoryRates.CA;
        }
        
        // Duty-free threshold for personal imports
        const dutyFreeThreshold = 800; // USD
        
        if (subtotal <= dutyFreeThreshold) {
            return subtotal * (rate / 100);
        }
        
        return subtotal * (rate / 100);
    }
    
    /**
     * Calculate sales tax/VAT
     */
    static calculateTax(subtotal, country, state, isBusiness) {
        const taxInfo = TAX_RATES[country] || TAX_RATES['default'];
        
        // Business buyers may have different rates or be exempt
        if (isBusiness && (country === 'GB' || country === 'DE' || country === 'FR')) {
            return {
                amount: 0,
                rate: 0,
                breakdown: 'Business VAT registered - Zero rated'
            };
        }
        
        // US state-specific tax
        if (country === 'US' && state) {
            const stateTaxRates = {
                'CA': 7.25, 'NY': 8.0, 'TX': 6.25, 'FL': 6.0, 'WA': 6.5,
                'OR': 0, 'MT': 0, 'NH': 0, 'DE': 0
            };
            const stateRate = stateTaxRates[state] || taxInfo.average;
            return {
                amount: subtotal * (stateRate / 100),
                rate: stateRate,
                breakdown: `State sales tax (${state})`
            };
        }
        
        return {
            amount: subtotal * (taxInfo.average / 100),
            rate: taxInfo.average,
            breakdown: country === 'US' ? 'Sales tax' : 'VAT/GST'
        };
    }
    
    /**
     * Get available shipping options
     */
    static getShippingOptions(destinationCountry, weight) {
        const baseRate = SHIPPING_RATES[destinationCountry] || SHIPPING_RATES['US'];
        
        return [
            {
                id: 'standard',
                name: 'Standard Shipping',
                price: baseRate.base + (weight * baseRate.perKg),
                days: baseRate.days,
                carrier: 'GlobalX Shipping'
            },
            {
                id: 'express',
                name: 'Express Shipping',
                price: (baseRate.base * 1.8) + (weight * baseRate.perKg * 1.5),
                days: '2-4',
                carrier: 'FedEx International'
            },
            {
                id: 'overnight',
                name: 'Overnight Shipping',
                price: (baseRate.base * 3) + (weight * baseRate.perKg * 2.5),
                days: '1-2',
                carrier: 'DHL Express'
            }
        ];
    }
    
    /**
     * Get list of supported countries
     */
    static getSupportedCountries() {
        return Object.entries(SHIPPING_RATES).map(([code, data]) => ({
            code,
            name: this.getCountryName(code),
            region: data.region
        }));
    }
    
    /**
     * Get country name from code
     */
    static getCountryName(code) {
        const names = {
            'US': 'United States', 'CA': 'Canada', 'MX': 'Mexico',
            'GB': 'United Kingdom', 'DE': 'Germany', 'FR': 'France',
            'IT': 'Italy', 'ES': 'Spain', 'NL': 'Netherlands',
            'AE': 'United Arab Emirates', 'SA': 'Saudi Arabia', 'IL': 'Israel',
            'JP': 'Japan', 'KR': 'South Korea', 'CN': 'China',
            'SG': 'Singapore', 'AU': 'Australia', 'NZ': 'New Zealand',
            'IN': 'India', 'BR': 'Brazil', 'AR': 'Argentina', 'ZA': 'South Africa'
        };
        return names[code] || code;
    }
}

module.exports = ShippingService;
