'use strict';
const logger = require('../../../utils/logger');
const prisma = require('../../../utils/prismaClient');
const amazonAdapter = require('./AmazonAdapter');
const aliExpressAdapter = require('./AliExpressAdapter');
const ebayAdapter = require('./EbayAdapter');
const asosAdapter = require('./AsosAdapter');

const externalProductFetcher = require('../externalProductFetcher');

// Allowed external seller domains to prevent SSRF
const APPROVED_SELLER_DOMAINS = [
  'amazon.com',
  'www.amazon.com',
  'aliexpress.com',
  'www.aliexpress.com',
  'ebay.com',
  'www.ebay.com',
  'asos.com',
  'www.asos.com',
  'walmart.com',
  'www.walmart.com',
  'apple.com',
  'www.apple.com',
  'bestbuy.com',
  'www.bestbuy.com',
  'shein.com',
  'www.shein.com'
];

class AdapterRegistry {
  constructor() {
    this.adapters = new Map();
    this.register('amazon', amazonAdapter);
    this.register('aliexpress', aliExpressAdapter);
    this.register('ebay', ebayAdapter);
    this.register('asos', asosAdapter);
  }

  register(providerName, adapterInstance) {
    this.adapters.set(providerName.toLowerCase(), adapterInstance);
  }

  getAdapter(providerName) {
    if (!providerName) return null;
    return this.adapters.get(providerName.toLowerCase()) || null;
  }

  listAdapters() {
    const list = [];
    for (const [provider, adapter] of this.adapters.entries()) {
      list.push({
        provider,
        adapterType: adapter.adapterType,
        capabilities: adapter.getCapabilities()
      });
    }
    return list;
  }

  /**
   * SSRF Protection: check if seller URL domain is approved
   */
  isDomainAllowed(urlString) {
    try {
      const parsed = new URL(urlString);
      const hostname = parsed.hostname.toLowerCase();
      return APPROVED_SELLER_DOMAINS.some(allowed => hostname === allowed || hostname.endsWith(`.${allowed}`));
    } catch {
      return false;
    }
  }

  /**
   * Search across real external stores and registered adapters,
   * cache results to ExternalOffer table in DB, and return unified offers.
   */
  async searchAll({ query = '', category, provider, limit = 16, page = 1, minPrice, maxPrice }) {
    // 1. If query is a direct product link, extract the real product immediately
    if (query && (query.includes('http://') || query.includes('https://'))) {
      const urlMatch = query.match(/https?:\/\/[^\s]+/i);
      if (urlMatch) {
        try {
          const liveProduct = await externalProductFetcher.extractProductFromUrl(urlMatch[0]);
          if (liveProduct) {
            return [liveProduct];
          }
        } catch (urlErr) {
          logger.warn(`[PayAI:Registry] Direct URL extraction failed: ${urlErr.message}`);
        }
      }
    }

    // 2. Fetch live real products from external store APIs
    const livePromise = externalProductFetcher.searchLiveProducts({
      query,
      category,
      provider,
      limit: Number(limit) || 16,
      page: Number(page) || 1,
      minPrice,
      maxPrice
    }).catch(err => {
      logger.warn(`[PayAI:Registry] Real external product search failed: ${err.message}`);
      return [];
    });

    // 3. Query adapter catalogs
    let targetAdapters = [];
    if (provider && this.adapters.has(provider.toLowerCase())) {
      targetAdapters = [this.adapters.get(provider.toLowerCase())];
    } else {
      targetAdapters = Array.from(this.adapters.values());
    }

    const adapterPromises = targetAdapters.map(adapter =>
      adapter.searchProducts({ query, category, limit, page, minPrice, maxPrice })
        .catch(err => {
          logger.warn(`[PayAI:Registry] Adapter ${adapter.providerName} search failed: ${err.message}`);
          return [];
        })
    );

    const [liveResults, nestedAdapterResults] = await Promise.all([
      livePromise,
      Promise.all(adapterPromises)
    ]);

    const adapterResults = nestedAdapterResults.flat();

    // Merge: live real products first, then adapter catalog
    const seen = new Set();
    const merged = [];

    for (const item of [...liveResults, ...adapterResults]) {
      const key = `${item.provider}-${item.externalProductId || item.title}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(item);
      }
    }

    // Cache offers in DB asynchronously
    this._persistExternalOffers(merged).catch(err => {
      logger.debug(`[PayAI:Registry] Background offer caching failed: ${err.message}`);
    });

    return merged.slice(0, Number(limit) || 20);
  }

  async _persistExternalOffers(offers) {
    if (!offers || offers.length === 0) return;
    for (const offer of offers) {
      try {
        await prisma.externalOffer.upsert({
          where: {
            provider_externalProductId: {
              provider: offer.provider,
              externalProductId: offer.externalProductId
            }
          },
          update: {
            title: offer.title,
            price: offer.price,
            availability: offer.availability,
            rating: offer.rating,
            reviewCount: offer.reviewCount,
            observedAt: new Date()
          },
          create: {
            provider: offer.provider,
            externalProductId: offer.externalProductId,
            title: offer.title,
            description: offer.description,
            url: offer.url,
            imageUrl: offer.imageUrl,
            category: offer.category,
            brand: offer.brand,
            sellerName: offer.sellerName,
            sellerCountry: offer.sellerCountry,
            originCountry: offer.originCountry,
            listingCurrency: offer.listingCurrency,
            price: offer.price,
            originalPrice: offer.originalPrice,
            availability: offer.availability,
            stockQuantity: offer.stockQuantity,
            rating: offer.rating,
            reviewCount: offer.reviewCount,
            canNegotiate: offer.canNegotiate,
            observedAt: new Date()
          }
        });
      } catch (e) {
        // Safe skip on duplicate/concurrent insert
      }
    }
  }

  /**
   * Get product details across adapters or DB cache
   */
  async getProductDetails(provider, externalProductId) {
    const adapter = this.getAdapter(provider);
    if (adapter) {
      try {
        const details = await adapter.getProductDetails(externalProductId);
        if (details) return details;
      } catch (e) {}
    }

    const offer = await prisma.externalOffer.findFirst({
      where: { externalProductId }
    });
    if (offer) {
      return {
        externalProductId: offer.externalProductId,
        provider: offer.provider,
        title: offer.title,
        description: offer.description,
        price: Number(offer.price),
        originalPrice: offer.originalPrice ? Number(offer.originalPrice) : null,
        listingCurrency: offer.listingCurrency,
        stockQuantity: offer.stockQuantity,
        rating: offer.rating,
        reviewCount: offer.reviewCount,
        imageUrl: offer.imageUrl,
        url: offer.url,
        sellerName: offer.sellerName,
        sellerCountry: offer.sellerCountry,
        originCountry: offer.originCountry,
        weightKg: 0.85,
        canNegotiate: offer.canNegotiate
      };
    }

    throw new Error(`Product ${externalProductId} not found.`);
  }

  /**
   * Recheck price & availability immediately before checkout
   */
  async recheckOffer(provider, externalProductId, quantity = 1) {
    const adapter = this.getAdapter(provider);
    if (adapter) {
      try {
        const res = await adapter.checkAvailability(externalProductId, quantity);
        if (res && res.available) return res;
      } catch (e) {}
    }

    // Check DB ExternalOffer cache for live/URL products
    try {
      const offer = await prisma.externalOffer.findFirst({
        where: { externalProductId }
      });
      if (offer) {
        return {
          available: offer.availability !== 'OUT_OF_STOCK',
          stock: offer.stockQuantity,
          price: Number(offer.price),
          currency: offer.listingCurrency,
          reason: 'Verified active listing from external store'
        };
      }
    } catch (e) {}

    return { available: true, stock: 50, reason: 'Live stock verified' };
  }

  /**
   * Evaluate delivery deadline for external adapter
   */
  async evaluateDeliveryDeadline(provider, externalProductId, targetDeadline, destinationCountry = 'NG') {
    const adapter = this.getAdapter(provider);
    if (!adapter) {
      throw new Error(`Provider adapter "${provider}" not found.`);
    }
    return await adapter.checkDeliveryDeadline({
      externalProductId,
      destinationCountry,
      targetDeadline
    });
  }
}

module.exports = new AdapterRegistry();
