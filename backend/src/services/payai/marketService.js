'use strict';
const prisma = require('../../utils/prismaClient');
const logger = require('../../utils/logger');

// Default Market Definitions
const DEFAULT_MARKETS = [
  {
    code: 'NIGERIA',
    name: 'Shop Nigeria',
    countryCode: 'NG',
    displayCurrency: 'NGN',
    enabled: true,
    description: 'Local verified W-Commerce sellers with immediate dispatch and local payment options.',
    supportedCurrencies: JSON.stringify(['NGN']),
    checkoutMethods: JSON.stringify(['PAYSTACK', 'WALLET', 'BANK_TRANSFER'])
  },
  {
    code: 'INTERNATIONAL',
    name: 'Shop International',
    countryCode: 'GLOBAL',
    displayCurrency: 'USD',
    enabled: true,
    description: 'PayAI intelligent global shopping across global sellers (Amazon, AliExpress, eBay, ASOS) with full landed cost estimates and PayPal protection.',
    supportedCurrencies: JSON.stringify(['USD', 'NGN', 'GBP', 'EUR']),
    checkoutMethods: JSON.stringify(['PAYPAL', 'STRIPE'])
  }
];

class MarketService {
  constructor() {
    this._initialized = false;
  }

  /**
   * Ensure default market configs exist in the database
   */
  async ensureDefaultMarkets() {
    if (this._initialized) return;
    try {
      for (const market of DEFAULT_MARKETS) {
        await prisma.marketConfig.upsert({
          where: { code: market.code },
          update: {
            name: market.name,
            enabled: market.enabled,
            displayCurrency: market.displayCurrency,
            description: market.description
          },
          create: market
        });
      }
      this._initialized = true;
      logger.info('[PayAI:MarketService] Default markets initialized successfully');
    } catch (err) {
      logger.warn(`[PayAI:MarketService] Failed to seed default markets in DB: ${err.message}. Using in-memory fallback.`);
    }
  }

  /**
   * Get all active markets
   */
  async listMarkets() {
    try {
      await this.ensureDefaultMarkets();
      const dbMarkets = await prisma.marketConfig.findMany({
        where: { enabled: true }
      });

      if (dbMarkets && dbMarkets.length > 0) {
        return dbMarkets.map(m => ({
          ...m,
          supportedCurrencies: typeof m.supportedCurrencies === 'string' ? JSON.parse(m.supportedCurrencies) : m.supportedCurrencies,
          checkoutMethods: typeof m.checkoutMethods === 'string' ? JSON.parse(m.checkoutMethods) : m.checkoutMethods
        }));
      }
    } catch (e) {
      logger.warn(`[PayAI:MarketService] listMarkets DB error: ${e.message}`);
    }

    return DEFAULT_MARKETS.map(m => ({
      ...m,
      supportedCurrencies: JSON.parse(m.supportedCurrencies),
      checkoutMethods: JSON.parse(m.checkoutMethods)
    }));
  }

  /**
   * Get market by code
   */
  async getMarket(code) {
    const normalized = (code || 'NIGERIA').toUpperCase();
    const markets = await this.listMarkets();
    const match = markets.find(m => m.code === normalized);
    return match || markets[0];
  }

  /**
   * Validate whether an offer or product is eligible for a specific market & destination
   */
  validateEligibility({ marketCode, sellerCountry, destinationCountry = 'NG', category }) {
    const market = (marketCode || 'NIGERIA').toUpperCase();

    if (market === 'NIGERIA') {
      // Shop Nigeria only permits local/NG sellers or locally stocked items
      const isLocal = !sellerCountry || sellerCountry.toUpperCase() === 'NG';
      return {
        eligible: isLocal,
        marketCode: 'NIGERIA',
        currency: 'NGN',
        reason: isLocal ? 'Eligible for local domestic delivery' : 'International items must be purchased via Shop International'
      };
    }

    if (market === 'INTERNATIONAL') {
      // Prohibited categories or sanctioned destinations check
      const prohibitedDestinations = ['KP', 'SY', 'IR', 'CU'];
      const targetCountry = (destinationCountry || 'NG').toUpperCase();

      if (prohibitedDestinations.includes(targetCountry)) {
        return {
          eligible: false,
          marketCode: 'INTERNATIONAL',
          currency: 'USD',
          reason: `Shipping to ${targetCountry} is restricted due to trade compliance.`
        };
      }

      const prohibitedCategories = ['weapons', 'hazardous', 'live_animals'];
      if (category && prohibitedCategories.includes(category.toLowerCase())) {
        return {
          eligible: false,
          marketCode: 'INTERNATIONAL',
          currency: 'USD',
          reason: `Category "${category}" is prohibited for cross-border transit.`
        };
      }

      return {
        eligible: true,
        marketCode: 'INTERNATIONAL',
        currency: 'USD',
        destinationCountry: targetCountry,
        reason: 'Eligible for PayAI international import with landed-cost estimation.'
      };
    }

    return { eligible: false, reason: 'Unknown market' };
  }
}

module.exports = new MarketService();
