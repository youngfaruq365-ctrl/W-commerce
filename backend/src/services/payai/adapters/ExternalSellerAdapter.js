'use strict';

/**
 * Base abstract class for External Seller Adapters
 */
class ExternalSellerAdapter {
  constructor(providerName, adapterType = 'OFFICIAL_API') {
    this.providerName = providerName;
    this.adapterType = adapterType;
  }

  /**
   * Return capability flags supported by this seller
   * @returns {Object} SellerCapabilities
   */
  getCapabilities() {
    return {
      search: true,
      productDetails: true,
      checkAvailability: true,
      shippingQuote: true,
      negotiatePrice: false,
      createCart: true,
      createCheckout: false,
      captureOrConfirmOrder: false,
      getOrderStatus: true
    };
  }

  /**
   * Search catalog products
   */
  async searchProducts({ query, category, limit = 10, page = 1, minPrice, maxPrice }) {
    throw new Error('searchProducts not implemented');
  }

  /**
   * Get single product details
   */
  async getProductDetails(externalProductId) {
    throw new Error('getProductDetails not implemented');
  }

  /**
   * Check live stock & availability
   */
  async checkAvailability(externalProductId, quantity = 1) {
    throw new Error('checkAvailability not implemented');
  }

  /**
   * Estimate shipping quote to destination
   */
  async getShippingQuote({ externalProductId, destinationCountry = 'NG', weightKg = 1.0, subtotal = 0 }) {
    throw new Error('getShippingQuote not implemented');
  }

  /**
   * Negotiate price discount (only for sellers that support it, e.g. eBay best offer or AliExpress wholesale)
   */
  async negotiatePrice({ externalProductId, requestedDiscountPct, quantity = 1 }) {
    return {
      supported: false,
      confirmed: false,
      discountPct: 0,
      newPrice: null,
      message: `Price negotiation is not supported by ${this.providerName}. Price is fixed.`
    };
  }

  /**
   * Check order fulfillment status
   */
  async getOrderStatus(externalOrderId) {
    throw new Error('getOrderStatus not implemented');
  }

  /**
   * Helper to parse deadline string into days from now
   */
  parseDeadlineToDays(deadlineStr, maxDays = null) {
    if (maxDays != null) return Number(maxDays);
    if (!deadlineStr) return null;
    if (typeof deadlineStr === 'number') return deadlineStr;
    const lower = String(deadlineStr).toLowerCase().trim();

    const daysMatch = lower.match(/\b(?:within|in|under)?\s*(\d+)\s*(?:business\s+)?days?\b/i);
    if (daysMatch) return parseInt(daysMatch[1], 10);

    const hoursMatch = lower.match(/\b(?:within|in)?\s*(\d+)\s*hours?\b/i);
    if (hoursMatch) return Math.ceil(parseInt(hoursMatch[1], 10) / 24);

    if (lower.includes('tomorrow')) return 1;
    if (lower.includes('today')) return 0;

    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (let i = 0; i < daysOfWeek.length; i++) {
      if (lower.includes(daysOfWeek[i])) {
        const todayDay = new Date().getDay();
        let diff = i - todayDay;
        if (diff <= 0) diff += 7;
        return diff;
      }
    }

    const parsedDate = new Date(deadlineStr);
    if (!isNaN(parsedDate.getTime())) {
      const now = new Date();
      const diffMs = parsedDate.getTime() - now.getTime();
      return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    return null;
  }

  /**
   * Default deadline check for any adapter
   */
  async checkDeliveryDeadline({ externalProductId, destinationCountry = 'NG', targetDeadline, maxDays }) {
    const quote = await this.getShippingQuote({ externalProductId, destinationCountry });
    const match = String(quote.estimatedDays || '').match(/(\d+)\s*(?:-\s*(\d+))?/);
    const maxTransit = quote.maxTransitDays || (match ? (match[2] ? Number(match[2]) : Number(match[1])) : 7);
    const minTransit = quote.minTransitDays || (match ? Number(match[1]) : 3);
    const allowedDays = this.parseDeadlineToDays(targetDeadline, maxDays);
    const feasible = allowedDays != null ? maxTransit <= allowedDays : true;

    return {
      provider: this.providerName,
      feasible,
      meetsDeadline: feasible,
      targetDeadline,
      allowedDays,
      minTransitDays: minTransit,
      maxTransitDays: maxTransit,
      estimatedDays: quote.estimatedDays,
      carrier: quote.carrier,
      confidence: feasible ? 'HIGH' : 'LOW',
      reason: feasible
        ? `${quote.carrier || this.providerName} (${quote.estimatedDays}) arrives within deadline of ${allowedDays} days`
        : `${quote.carrier || this.providerName} (${quote.estimatedDays}) exceeds deadline of ${allowedDays} days`
    };
  }
}

module.exports = ExternalSellerAdapter;
