'use strict';
const prisma = require('../../utils/prismaClient');
const logger = require('../../utils/logger');
const crypto = require('crypto');

// Standard verified bank exchange rates (configurable dynamically)
const DEFAULT_USD_NGN = Number(process.env.PAYAI_USD_NGN_RATE || process.env.USD_NGN_RATE || 1480.00);

const EXCHANGE_RATES = {
  USD_NGN: DEFAULT_USD_NGN,
  GBP_NGN: 1890.00,
  EUR_NGN: 1610.00,
  USD_USD: 1.00,
  GBP_USD: 1.28,
  EUR_USD: 1.09
};

// HS Code Category Import Tariffs to Nigeria
const DUTY_RATES = {
  electronics: 0.05, // 5% import duty
  fashion: 0.10,     // 10% import duty
  beauty: 0.10,
  home: 0.07,
  general: 0.05
};

const VAT_RATE = 0.075; // 7.5% Nigerian VAT
const SERVICE_FEE_PCT = 0.025; // 2.5% PayAI cross-border facilitation
const QUOTE_EXPIRY_MINUTES = 15; // 15-minute price lock

// Domestic Shipping Rules (Nigeria)
const DOMESTIC_SHIPPING = {
  BASE_FEE_NGN: 2500, // ₦2,500 base courier
  PER_KG_SURCHARGE_NGN: 500, // ₦500 per kg over 1kg
  FREE_SHIPPING_THRESHOLD_NGN: 35000, // Free domestic shipping on orders >= ₦35,000
  CARRIER: 'W-Commerce Express Courier',
  ESTIMATED_DAYS: '1-3 business days'
};

// International Shipping Rules (Cross-Border to Nigeria)
const INTERNATIONAL_SHIPPING = {
  BASE_FEE_USD: 14.00, // $14.00 base air freight
  PER_KG_SURCHARGE_USD: 11.50, // $11.50 per kg
  MIN_FEE_USD: 12.00,
  FREE_SHIPPING_THRESHOLD_USD: 150.00, // Free international air freight on orders >= $150
  CARRIER: 'DHL Express International / GlobalX',
  ESTIMATED_DAYS: '4-7 business days'
};

class PricingService {
  /**
   * Get dynamic exchange rate for a currency pair
   */
  getExchangeRate(from = 'USD', to = 'NGN') {
    const fromUpper = String(from || 'USD').toUpperCase();
    const toUpper = String(to || 'NGN').toUpperCase();
    if (fromUpper === toUpper) return 1.00;

    const directPair = `${fromUpper}_${toUpper}`;
    if (EXCHANGE_RATES[directPair] != null) {
      return Number(EXCHANGE_RATES[directPair]);
    }

    const inversePair = `${toUpper}_${fromUpper}`;
    if (EXCHANGE_RATES[inversePair] != null) {
      return Math.round((1.0 / Number(EXCHANGE_RATES[inversePair])) * 100000000) / 100000000;
    }

    throw new Error(`Exchange rate for ${fromUpper} to ${toUpper} is unavailable. Fabricated rates are forbidden.`);
  }

  /**
   * Set or update dynamic exchange rate (e.g. from forex feed or admin config)
   */
  setExchangeRate(from, to, rate) {
    const numRate = Number(rate);
    if (!Number.isFinite(numRate) || numRate <= 0) {
      throw new Error('Exchange rate must be a positive finite number.');
    }
    const fromUpper = String(from).toUpperCase();
    const toUpper = String(to).toUpperCase();
    EXCHANGE_RATES[`${fromUpper}_${toUpper}`] = numRate;
    logger.info(`[PayAI:Pricing] Dynamic exchange rate updated: ${fromUpper}/${toUpper} = ${numRate}`);
    return numRate;
  }

  /**
   * Get all active exchange rates with metadata
   */
  getAllExchangeRates() {
    return {
      rates: { ...EXCHANGE_RATES },
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Convert currency with known verified exchange rates
   */
  convertCurrency(amount, from = 'USD', to = 'NGN') {
    const fromUpper = from.toUpperCase();
    const toUpper = to.toUpperCase();
    if (fromUpper === toUpper) return Number(amount);

    const directPair = `${fromUpper}_${toUpper}`;
    if (EXCHANGE_RATES[directPair] != null) {
      return Math.round(Number(amount) * Number(EXCHANGE_RATES[directPair]) * 100) / 100;
    }

    const inversePair = `${toUpper}_${fromUpper}`;
    if (EXCHANGE_RATES[inversePair] != null) {
      return Math.round((Number(amount) / Number(EXCHANGE_RATES[inversePair])) * 100) / 100;
    }

    const rate = this.getExchangeRate(fromUpper, toUpper);
    return Math.round(Number(amount) * rate * 100) / 100;
  }

  /**
   * Calculate domestic or international shipping fees with free shipping threshold qualification
   */
  calculateShippingFees({
    items = [],
    destinationCountry = 'NG',
    originCountry = 'NG',
    isDomestic = false,
    marketCode = 'INTERNATIONAL',
    targetCurrency = 'USD',
    targetDeadline = null
  }) {
    const isExplicitlyInternational = isDomestic === false || (marketCode || '').toUpperCase() === 'INTERNATIONAL';
    const isLocalMarket = !isExplicitlyInternational && (
      (marketCode || '').toUpperCase() === 'NIGERIA' ||
      isDomestic === true ||
      (originCountry === 'NG' && destinationCountry === 'NG') ||
      (items.length > 0 && items.every(i => !i.isExternal && (i.currency === 'NGN' || i.provider === 'w-commerce')))
    );

    if (isLocalMarket) {
      // Domestic shipping calculation
      let subtotalNgn = 0;
      let totalWeightKg = 0;
      let productSpecifiedShipping = 0;
      let hasProductSpecifiedShipping = false;

      const itemBreakdowns = [];

      for (const item of items) {
        const qty = Math.max(1, Number(item.quantity) || 1);
        const price = Number(item.price) || 0;
        const currency = (item.currency || 'NGN').toUpperCase();
        const priceNgn = currency === 'NGN' ? price : this.convertCurrency(price, currency, 'NGN');
        const itemSubtotal = priceNgn * qty;
        subtotalNgn += itemSubtotal;

        const weight = (Number(item.weightKg) || 0.5) * qty;
        totalWeightKg += weight;

        let itemShip = 0;
        if (item.shippingFee != null && Number(item.shippingFee) >= 0) {
          itemShip = Number(item.shippingFee) * qty;
          productSpecifiedShipping += itemShip;
          hasProductSpecifiedShipping = true;
        }

        itemBreakdowns.push({
          title: item.title,
          quantity: qty,
          weightKg: weight,
          priceNgn: itemSubtotal,
          itemShippingFee: itemShip
        });
      }

      // Base domestic calculation
      let standardShippingFee = 0;
      let weightSurcharge = 0;

      if (hasProductSpecifiedShipping && productSpecifiedShipping > 0) {
        standardShippingFee = productSpecifiedShipping;
      } else {
        weightSurcharge = totalWeightKg > 1.0 ? Math.round((totalWeightKg - 1.0) * DOMESTIC_SHIPPING.PER_KG_SURCHARGE_NGN) : 0;
        standardShippingFee = DOMESTIC_SHIPPING.BASE_FEE_NGN + weightSurcharge;
      }

      const threshold = DOMESTIC_SHIPPING.FREE_SHIPPING_THRESHOLD_NGN;
      const qualifiesForFreeShipping = subtotalNgn >= threshold;
      const finalShippingFee = qualifiesForFreeShipping ? 0 : standardShippingFee;
      const freeShippingSavings = qualifiesForFreeShipping ? standardShippingFee : 0;
      const amountNeededForFreeShipping = qualifiesForFreeShipping ? 0 : Math.max(0, threshold - subtotalNgn);

      let deadlineEvaluation = null;
      if (targetDeadline) {
        deadlineEvaluation = this.evaluateDeliveryDeadline({
          isDomestic: true,
          destinationCountry: 'NG',
          targetDeadline
        });
      }

      return {
        isDomestic: true,
        destinationCountry: 'NG',
        carrier: DOMESTIC_SHIPPING.CARRIER,
        estimatedDays: DOMESTIC_SHIPPING.ESTIMATED_DAYS,
        minTransitDays: 1,
        maxTransitDays: 3,
        currency: 'NGN',
        subtotal: subtotalNgn,
        baseShipping: DOMESTIC_SHIPPING.BASE_FEE_NGN,
        weightSurcharge,
        totalWeightKg: Math.round(totalWeightKg * 100) / 100,
        standardShippingFee,
        finalShippingFee,
        qualifiesForFreeShipping,
        freeShippingThreshold: threshold,
        freeShippingSavings,
        amountNeededForFreeShipping,
        trackingIncluded: true,
        itemBreakdowns,
        deadlineEvaluation
      };
    }

    // International shipping calculation
    let subtotalUsd = 0;
    let totalWeightKg = 0;
    const itemBreakdowns = [];

    for (const item of items) {
      const qty = Math.max(1, Number(item.quantity) || 1);
      const price = Number(item.price) || 0;
      const currency = (item.currency || 'USD').toUpperCase();
      const priceUsd = currency === 'USD' ? price : this.convertCurrency(price, currency, 'USD');
      const itemSubtotal = priceUsd * qty;
      subtotalUsd += itemSubtotal;

      const weight = (Number(item.weightKg) || 0.6) * qty;
      totalWeightKg += weight;

      const itemShipping = Math.max(
        INTERNATIONAL_SHIPPING.MIN_FEE_USD,
        Math.round((INTERNATIONAL_SHIPPING.BASE_FEE_USD + (weight * INTERNATIONAL_SHIPPING.PER_KG_SURCHARGE_USD)) * 100) / 100
      );

      itemBreakdowns.push({
        title: item.title,
        quantity: qty,
        weightKg: weight,
        priceUsd: itemSubtotal,
        itemShippingUsd: itemShipping
      });
    }

    const weightSurchargeUsd = Math.round((totalWeightKg * INTERNATIONAL_SHIPPING.PER_KG_SURCHARGE_USD) * 100) / 100;
    const standardShippingFeeUsd = Math.round((INTERNATIONAL_SHIPPING.BASE_FEE_USD + weightSurchargeUsd) * 100) / 100;

    const thresholdUsd = INTERNATIONAL_SHIPPING.FREE_SHIPPING_THRESHOLD_USD;
    const qualifiesForFreeShipping = subtotalUsd >= thresholdUsd;
    const finalShippingFeeUsd = qualifiesForFreeShipping ? 0 : standardShippingFeeUsd;
    const freeShippingSavingsUsd = qualifiesForFreeShipping ? standardShippingFeeUsd : 0;
    const amountNeededForFreeShippingUsd = qualifiesForFreeShipping ? 0 : Math.round((thresholdUsd - subtotalUsd) * 100) / 100;

    let deadlineEvaluation = null;
    if (targetDeadline) {
      deadlineEvaluation = this.evaluateDeliveryDeadline({
        isDomestic: false,
        destinationCountry,
        targetDeadline
      });
    }

    return {
      isDomestic: false,
      destinationCountry,
      carrier: INTERNATIONAL_SHIPPING.CARRIER,
      estimatedDays: INTERNATIONAL_SHIPPING.ESTIMATED_DAYS,
      minTransitDays: 4,
      maxTransitDays: 7,
      currency: 'USD',
      subtotal: Math.round(subtotalUsd * 100) / 100,
      baseShipping: INTERNATIONAL_SHIPPING.BASE_FEE_USD,
      weightSurcharge: weightSurchargeUsd,
      totalWeightKg: Math.round(totalWeightKg * 100) / 100,
      standardShippingFee: standardShippingFeeUsd,
      finalShippingFee: finalShippingFeeUsd,
      qualifiesForFreeShipping,
      freeShippingThreshold: thresholdUsd,
      freeShippingSavings: freeShippingSavingsUsd,
      amountNeededForFreeShipping: amountNeededForFreeShippingUsd,
      trackingIncluded: true,
      itemBreakdowns,
      deadlineEvaluation
    };
  }

  /**
   * Calculate landed cost for an item or set of items
   */
  calculateLandedCost({ items = [], destinationCountry = 'NG', targetCurrency = 'USD', marketCode = 'INTERNATIONAL', targetDeadline }) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Items list is required for landed cost calculation.');
    }

    const isDomestic = (marketCode || '').toUpperCase() === 'NIGERIA' ||
      (items.every(i => !i.isExternal && (i.currency === 'NGN' || i.provider === 'w-commerce')));

    const shippingInfo = this.calculateShippingFees({
      items,
      destinationCountry,
      isDomestic,
      marketCode: isDomestic ? 'NIGERIA' : marketCode,
      targetCurrency,
      targetDeadline
    });

    const usdNgnRate = this.getExchangeRate('USD', 'NGN');

    let subtotalUsd = 0;
    let subtotalNgn = 0;
    let dutiesUsd = 0;
    let hasUncertainDuties = false;
    const breakdownItems = [];

    for (const item of items) {
      const price = Number(item.price) || 0;
      const quantity = Math.max(1, Number(item.quantity) || 1);
      const currency = (item.currency || (isDomestic ? 'NGN' : 'USD')).toUpperCase();
      const itemSubtotalOriginal = price * quantity;

      let itemPriceUsd = 0;
      let itemPriceNgn = 0;

      if (currency === 'USD') {
        itemPriceUsd = itemSubtotalOriginal;
        itemPriceNgn = this.convertCurrency(itemSubtotalOriginal, 'USD', 'NGN');
      } else if (currency === 'NGN') {
        itemPriceNgn = itemSubtotalOriginal;
        itemPriceUsd = this.convertCurrency(itemSubtotalOriginal, 'NGN', 'USD');
      } else {
        itemPriceUsd = this.convertCurrency(itemSubtotalOriginal, currency, 'USD');
        itemPriceNgn = this.convertCurrency(itemPriceUsd, 'USD', 'NGN');
      }

      subtotalUsd += itemPriceUsd;
      subtotalNgn += itemPriceNgn;

      let dutyAmount = 0;
      let dutyRate = 0;
      if (!isDomestic) {
        const categoryKey = (item.category || 'general').toLowerCase();
        dutyRate = DUTY_RATES[categoryKey] != null ? DUTY_RATES[categoryKey] : DUTY_RATES.general;
        if (DUTY_RATES[categoryKey] == null) hasUncertainDuties = true;
        dutyAmount = Math.round((itemPriceUsd * dutyRate) * 100) / 100;
        dutiesUsd += dutyAmount;
      }

      breakdownItems.push({
        title: item.title,
        quantity,
        originalPrice: price,
        originalCurrency: currency,
        priceUsd: Math.round(itemPriceUsd * 100) / 100,
        priceNgn: Math.round(itemPriceNgn * 100) / 100,
        shippingUsd: isDomestic ? Math.round(this.convertCurrency(shippingInfo.finalShippingFee, 'NGN', 'USD') * 100) / 100 : (shippingInfo.qualifiesForFreeShipping ? 0 : Math.round(shippingInfo.finalShippingFee * 100) / 100),
        shippingNgn: isDomestic ? shippingInfo.finalShippingFee : Math.round(this.convertCurrency(shippingInfo.finalShippingFee, 'USD', 'NGN') * 100) / 100,
        dutiesUsd: dutyAmount,
        dutyRatePct: Math.round(dutyRate * 100)
      });
    }

    subtotalUsd = Math.round(subtotalUsd * 100) / 100;
    subtotalNgn = Math.round(subtotalNgn * 100) / 100;

    const shippingUsd = isDomestic
      ? this.convertCurrency(shippingInfo.finalShippingFee, 'NGN', 'USD')
      : Math.round(shippingInfo.finalShippingFee * 100) / 100;
    const shippingNgn = isDomestic
      ? shippingInfo.finalShippingFee
      : this.convertCurrency(shippingUsd, 'USD', 'NGN');

    const vatUsd = Math.round((subtotalUsd + dutiesUsd) * VAT_RATE * 100) / 100;
    const vatNgn = Math.round(vatUsd * usdNgnRate * 100) / 100;

    const serviceFeeUsd = Math.round(subtotalUsd * SERVICE_FEE_PCT * 100) / 100;
    const serviceFeeNgn = Math.round(subtotalNgn * SERVICE_FEE_PCT * 100) / 100;
    const handlingUsd = serviceFeeUsd;
    const handlingNgn = serviceFeeNgn;

    // Total in USD (for PayPal checkout)
    const totalUsd = Math.round((subtotalUsd + shippingUsd + dutiesUsd + vatUsd + handlingUsd) * 100) / 100;
    // Total in NGN (locked equivalent for seller payout)
    const totalNgn = Math.round(totalUsd * usdNgnRate * 100) / 100;

    let convertedTotal = totalNgn;
    let exchangeRate = usdNgnRate;
    if (targetCurrency && targetCurrency.toUpperCase() !== 'USD' && targetCurrency.toUpperCase() !== 'NGN') {
      exchangeRate = this.getExchangeRate('USD', targetCurrency.toUpperCase());
      convertedTotal = Math.round(totalUsd * exchangeRate * 100) / 100;
    }

    let disclaimer = hasUncertainDuties
      ? 'Some customs tariff rates are estimates based on standard harmonized HS categories. Final airport clearance charges may vary slightly.'
      : 'All landed costs are guaranteed under the PayAI Price Lock Guarantee.';

    if (shippingInfo.qualifiesForFreeShipping) {
      disclaimer += ` 🎉 Free shipping unlocked (Saved ${shippingInfo.currency === 'NGN' ? '₦' + shippingInfo.freeShippingSavings.toLocaleString() : '$' + shippingInfo.freeShippingSavings}!).`;
    } else if (shippingInfo.amountNeededForFreeShipping > 0) {
      disclaimer += ` 💡 Add ${shippingInfo.currency === 'NGN' ? '₦' + shippingInfo.amountNeededForFreeShipping.toLocaleString() : '$' + shippingInfo.amountNeededForFreeShipping} more to qualify for FREE Shipping!`;
    }

    return {
      currency: 'USD',
      displayCurrency: 'USD',
      payoutCurrency: 'NGN',
      targetCurrency: targetCurrency.toUpperCase(),
      exchangeRate: usdNgnRate,
      usdNgnRate,
      subtotal: subtotalUsd,
      subtotalUsd,
      subtotalNgn,
      shipping: shippingUsd,
      shippingUsd,
      shippingNgn,
      shippingBreakdown: shippingInfo,
      freeShippingQualification: {
        isDomestic: shippingInfo.isDomestic,
        threshold: shippingInfo.freeShippingThreshold,
        thresholdLabel: shippingInfo.currency === 'NGN' ? '₦35,000 NGN' : '$150 USD',
        qualifiesForFreeShipping: shippingInfo.qualifiesForFreeShipping,
        freeShippingSavings: shippingInfo.freeShippingSavings,
        amountNeededForFreeShipping: shippingInfo.amountNeededForFreeShipping
      },
      handling: handlingUsd,
      handlingUsd,
      handlingNgn,
      serviceFee: serviceFeeUsd,
      serviceFeeUsd,
      serviceFeeNgn,
      duties: Math.round(dutiesUsd * 100) / 100,
      dutiesUsd: Math.round(dutiesUsd * 100) / 100,
      dutiesNgn: Math.round(dutiesUsd * usdNgnRate * 100) / 100,
      taxes: Math.round(vatUsd * 100) / 100,
      taxesUsd: Math.round(vatUsd * 100) / 100,
      taxesNgn: vatNgn,
      total: totalUsd,
      totalUsd,
      totalNgn,
      convertedTotal,
      hasUncertainDuties,
      disclaimer,
      deadlineEvaluation: shippingInfo.deadlineEvaluation || null,
      breakdownItems
    };
  }

  /**
   * Generate an official, expiring price quote
   */
  async createPriceQuote({ userId, cartId, items = [], marketCode = 'INTERNATIONAL', targetCurrency = 'USD' }) {
    const landedCost = this.calculateLandedCost({ items, targetCurrency, marketCode });
    const quoteNumber = `PAYAI-Q-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const expiresAt = new Date(Date.now() + QUOTE_EXPIRY_MINUTES * 60 * 1000);

    const quoteRecord = await prisma.payAIQuote.create({
      data: {
        quoteNumber,
        userId: userId || null,
        cartId: cartId || null,
        marketCode,
        currency: 'USD',
        targetCurrency: landedCost.targetCurrency,
        exchangeRate: landedCost.usdNgnRate,
        subtotal: landedCost.subtotal,
        shipping: landedCost.shipping,
        duties: landedCost.duties,
        taxes: landedCost.taxes,
        serviceFee: landedCost.serviceFee,
        total: landedCost.total,
        convertedTotal: landedCost.totalNgn,
        breakdown: JSON.stringify(landedCost),
        itemsSnapshot: JSON.stringify(items),
        status: 'ACTIVE',
        expiresAt
      }
    });

    return {
      ...quoteRecord,
      total: Number(quoteRecord.total),
      totalUsd: Number(quoteRecord.total),
      totalNgn: Number(landedCost.totalNgn),
      convertedTotal: Number(landedCost.totalNgn),
      exchangeRate: Number(landedCost.usdNgnRate),
      breakdown: landedCost,
      items: typeof quoteRecord.itemsSnapshot === 'string' ? JSON.parse(quoteRecord.itemsSnapshot) : quoteRecord.itemsSnapshot
    };
  }

  /**
   * Validate that quote is active, not expired, and not already used
   */
  async validateQuote(quoteIdOrNumber) {
    const quote = await prisma.payAIQuote.findFirst({
      where: {
        OR: [
          { id: quoteIdOrNumber },
          { quoteNumber: quoteIdOrNumber }
        ]
      }
    });

    if (!quote) {
      return { valid: false, reason: 'Quote does not exist.' };
    }

    if (new Date() > new Date(quote.expiresAt)) {
      if (quote.status === 'ACTIVE') {
        await prisma.payAIQuote.update({
          where: { id: quote.id },
          data: { status: 'EXPIRED' }
        });
      }
      return { valid: false, reason: 'Quote has expired (>15 minutes). Please request a renewed quote.' };
    }

    if (quote.status !== 'ACTIVE' && quote.status !== 'APPROVED') {
      return { valid: false, reason: `Quote is no longer valid (Status: ${quote.status}).` };
    }

    const rate = Number(quote.exchangeRate) || this.getExchangeRate('USD', 'NGN');
    const totalUsd = Number(quote.total);
    const totalNgn = quote.convertedTotal ? Number(quote.convertedTotal) : Math.round(totalUsd * rate * 100) / 100;

    return {
      valid: true,
      quote: {
        ...quote,
        totalUsd,
        totalNgn,
        exchangeRate: rate
      }
    };
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
   * Estimate transit days and carrier by provider / market
   */
  estimateTransitDays({ provider = 'w-commerce', isDomestic = true, destinationCountry = 'NG' } = {}) {
    const prov = String(provider).toLowerCase();
    if (prov === 'amazon') {
      return {
        provider: 'amazon',
        carrier: 'DHL Express Global Priority',
        estimatedDays: '4-7 business days',
        minTransitDays: 4,
        maxTransitDays: 7
      };
    }
    if (prov === 'aliexpress') {
      return {
        provider: 'aliexpress',
        carrier: 'AliExpress Standard Direct Line (SpeedAF / GIG Logistics NG)',
        estimatedDays: '10-16 business days',
        minTransitDays: 10,
        maxTransitDays: 16
      };
    }
    if (prov === 'ebay') {
      return {
        provider: 'ebay',
        carrier: 'eBay International Shipping Program (Pitney Bowes / Aramex)',
        estimatedDays: '7-12 business days',
        minTransitDays: 7,
        maxTransitDays: 12
      };
    }
    if (prov === 'asos') {
      return {
        provider: 'asos',
        carrier: 'Royal Mail International Tracked / DHL eCommerce',
        estimatedDays: '6-9 business days',
        minTransitDays: 6,
        maxTransitDays: 9
      };
    }
    if (isDomestic || destinationCountry === 'NG') {
      return {
        provider: 'w-commerce',
        carrier: DOMESTIC_SHIPPING.CARRIER,
        estimatedDays: DOMESTIC_SHIPPING.ESTIMATED_DAYS,
        minTransitDays: 1,
        maxTransitDays: 3
      };
    }
    return {
      provider: 'w-commerce-global',
      carrier: INTERNATIONAL_SHIPPING.CARRIER,
      estimatedDays: INTERNATIONAL_SHIPPING.ESTIMATED_DAYS,
      minTransitDays: 4,
      maxTransitDays: 7
    };
  }

  /**
   * Evaluate delivery deadline against estimated transit days
   */
  evaluateDeliveryDeadline({ items = [], provider, isDomestic, destinationCountry = 'NG', targetDeadline, maxDays } = {}) {
    const transitInfo = this.estimateTransitDays({ provider, isDomestic, destinationCountry });
    const allowedDays = this.parseDeadlineToDays(targetDeadline, maxDays);

    if (allowedDays == null) {
      return {
        feasible: true,
        meetsDeadline: true,
        targetDeadline,
        allowedDays: null,
        minTransitDays: transitInfo.minTransitDays,
        maxTransitDays: transitInfo.maxTransitDays,
        estimatedDays: transitInfo.estimatedDays,
        carrier: transitInfo.carrier,
        confidence: 'MEDIUM',
        reason: 'No strict deadline constraint supplied.'
      };
    }

    const feasible = transitInfo.maxTransitDays <= allowedDays;
    const estimatedDeliveryDate = new Date(Date.now() + transitInfo.maxTransitDays * 24 * 60 * 60 * 1000);

    return {
      feasible,
      meetsDeadline: feasible,
      targetDeadline,
      allowedDays,
      minTransitDays: transitInfo.minTransitDays,
      maxTransitDays: transitInfo.maxTransitDays,
      estimatedDays: transitInfo.estimatedDays,
      estimatedDeliveryDate: estimatedDeliveryDate.toISOString().split('T')[0],
      carrier: transitInfo.carrier,
      confidence: feasible ? 'HIGH' : 'LOW',
      reason: feasible
        ? `Carrier delivery (${transitInfo.estimatedDays}) arrives within deadline of ${allowedDays} days (${targetDeadline}).`
        : `Carrier delivery (${transitInfo.estimatedDays}) exceeds deadline of ${allowedDays} days (${targetDeadline}).`
    };
  }
}

module.exports = new PricingService();
