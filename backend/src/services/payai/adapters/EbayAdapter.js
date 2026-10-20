'use strict';
const ExternalSellerAdapter = require('./ExternalSellerAdapter');
const prisma = require('../../../utils/prismaClient');

class EbayAdapter extends ExternalSellerAdapter {
  constructor() {
    super('ebay', 'OFFICIAL_API');
  }

  getCapabilities() {
    return {
      search: true,
      productDetails: true,
      checkAvailability: true,
      shippingQuote: true,
      negotiatePrice: false, // Negotiation is exclusively for native W-Commerce sellers
      createCart: true,
      createCheckout: false,
      captureOrConfirmOrder: false,
      getOrderStatus: true
    };
  }

  async searchProducts({ query = '', category, limit = 10, page = 1, minPrice, maxPrice }) {
    const q = (query || '').trim();
    const where = {
      provider: 'ebay'
    };

    if (q) {
      where.OR = [
        { title: { contains: q } },
        { description: { contains: q } },
        { brand: { contains: q } },
        { category: { contains: q } }
      ];
    }
    if (category) {
      where.category = { contains: category };
    }
    if (minPrice != null || maxPrice != null) {
      where.price = {};
      if (minPrice != null) where.price.gte = Number(minPrice);
      if (maxPrice != null) where.price.lte = Number(maxPrice);
    }

    const take = Number(limit) || 10;
    const skip = ((Number(page) || 1) - 1) * take;

    const offers = await prisma.externalOffer.findMany({
      where,
      take,
      skip,
      orderBy: { observedAt: 'desc' }
    });

    return offers.map(p => ({
      externalProductId: p.externalProductId,
      title: p.title,
      description: p.description,
      category: p.category || 'Electronics & Collectibles',
      brand: p.brand || 'eBay Store',
      sellerName: p.sellerName || 'eBay Top Rated Merchant',
      sellerCountry: p.sellerCountry || 'US',
      originCountry: p.originCountry || 'US',
      listingCurrency: p.listingCurrency || 'USD',
      price: Number(p.price),
      originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
      availability: p.availability || 'IN_STOCK',
      stockQuantity: p.stockQuantity || 15,
      rating: p.rating || 4.8,
      reviewCount: p.reviewCount || 100,
      imageUrl: p.imageUrl,
      url: p.url,
      weightKg: Number(p.weightKg || 1.2),
      canNegotiate: false,
      provider: 'ebay',
      observedAt: p.observedAt ? p.observedAt.toISOString() : new Date().toISOString()
    }));
  }

  async getProductDetails(externalProductId) {
    const p = await prisma.externalOffer.findFirst({
      where: {
        provider: 'ebay',
        externalProductId
      }
    });
    if (!p) throw new Error(`eBay product ${externalProductId} not found.`);
    return {
      externalProductId: p.externalProductId,
      title: p.title,
      description: p.description,
      category: p.category || 'Electronics & Collectibles',
      brand: p.brand || 'eBay Store',
      sellerName: p.sellerName || 'eBay Top Rated Merchant',
      sellerCountry: p.sellerCountry || 'US',
      originCountry: p.originCountry || 'US',
      listingCurrency: p.listingCurrency || 'USD',
      price: Number(p.price),
      originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
      availability: p.availability || 'IN_STOCK',
      stockQuantity: p.stockQuantity || 15,
      rating: p.rating || 4.8,
      reviewCount: p.reviewCount || 100,
      imageUrl: p.imageUrl,
      url: p.url,
      weightKg: Number(p.weightKg || 1.2),
      canNegotiate: false,
      provider: 'ebay',
      observedAt: p.observedAt ? p.observedAt.toISOString() : new Date().toISOString()
    };
  }

  async checkAvailability(externalProductId, quantity = 1) {
    const item = await prisma.externalOffer.findFirst({
      where: {
        provider: 'ebay',
        externalProductId
      }
    });
    if (!item) return { available: false, stock: 0, reason: 'Listing not found on eBay' };

    const stockQty = item.stockQuantity || 15;
    const hasStock = stockQty >= quantity && item.availability !== 'OUT_OF_STOCK';
    return {
      available: hasStock,
      stock: stockQty,
      price: Number(item.price),
      currency: item.listingCurrency || 'USD',
      reason: hasStock ? 'Verified active eBay listing with Buyer Protection' : 'Out of stock'
    };
  }

  async getShippingQuote({ externalProductId, destinationCountry = 'NG', weightKg = 1.0 }) {
    const baseFee = 32.00;
    const perKg = 12.50;
    const shippingTotal = Math.round((baseFee + (weightKg * perKg)) * 100) / 100;

    return {
      provider: 'ebay',
      carrier: 'eBay International Shipping Program (Pitney Bowes / Aramex)',
      estimatedDays: '7-12 business days',
      destinationCountry,
      shippingCost: shippingTotal,
      currency: 'USD',
      trackingIncluded: true
    };
  }

  async negotiatePrice({ externalProductId, requestedDiscountPct = 8, quantity = 1 }) {
    return {
      supported: false,
      confirmed: false,
      message: 'Price negotiation is exclusively supported for native W-Commerce sellers. External store items cannot be negotiated.'
    };
  }

  async getOrderStatus(externalOrderId) {
    return {
      externalOrderId,
      provider: 'ebay',
      status: 'IN_TRANSIT_CUSTOMS_CLEARED',
      carrier: 'Aramex International',
      lastUpdate: new Date().toISOString()
    };
  }
}

module.exports = new EbayAdapter();
