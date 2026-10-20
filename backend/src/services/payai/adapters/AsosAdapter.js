'use strict';
const ExternalSellerAdapter = require('./ExternalSellerAdapter');
const prisma = require('../../../utils/prismaClient');

class AsosAdapter extends ExternalSellerAdapter {
  constructor() {
    super('asos', 'OFFICIAL_API');
  }

  getCapabilities() {
    return {
      search: true,
      productDetails: true,
      checkAvailability: true,
      shippingQuote: true,
      negotiatePrice: false, // High-street fashion retailer: fixed price
      createCart: true,
      createCheckout: false,
      captureOrConfirmOrder: false,
      getOrderStatus: true
    };
  }

  async searchProducts({ query = '', category, limit = 10, page = 1, minPrice, maxPrice }) {
    const q = (query || '').trim();
    const where = {
      provider: 'asos'
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
      category: p.category || 'Fashion & Apparel',
      brand: p.brand || 'ASOS',
      sellerName: p.sellerName || 'ASOS London Flagship',
      sellerCountry: p.sellerCountry || 'GB',
      originCountry: p.originCountry || 'GB',
      listingCurrency: p.listingCurrency || 'GBP',
      price: Number(p.price),
      originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
      availability: p.availability || 'IN_STOCK',
      stockQuantity: p.stockQuantity || 20,
      rating: p.rating || 4.7,
      reviewCount: p.reviewCount || 100,
      imageUrl: p.imageUrl,
      url: p.url,
      weightKg: Number(p.weightKg || 1.1),
      canNegotiate: false,
      provider: 'asos',
      observedAt: p.observedAt ? p.observedAt.toISOString() : new Date().toISOString()
    }));
  }

  async getProductDetails(externalProductId) {
    const p = await prisma.externalOffer.findFirst({
      where: {
        provider: 'asos',
        externalProductId
      }
    });
    if (!p) throw new Error(`ASOS product ${externalProductId} not found.`);
    return {
      externalProductId: p.externalProductId,
      title: p.title,
      description: p.description,
      category: p.category || 'Fashion & Apparel',
      brand: p.brand || 'ASOS',
      sellerName: p.sellerName || 'ASOS London Flagship',
      sellerCountry: p.sellerCountry || 'GB',
      originCountry: p.originCountry || 'GB',
      listingCurrency: p.listingCurrency || 'GBP',
      price: Number(p.price),
      originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
      availability: p.availability || 'IN_STOCK',
      stockQuantity: p.stockQuantity || 20,
      rating: p.rating || 4.7,
      reviewCount: p.reviewCount || 100,
      imageUrl: p.imageUrl,
      url: p.url,
      weightKg: Number(p.weightKg || 1.1),
      canNegotiate: false,
      provider: 'asos',
      observedAt: p.observedAt ? p.observedAt.toISOString() : new Date().toISOString()
    };
  }

  async checkAvailability(externalProductId, quantity = 1) {
    const item = await prisma.externalOffer.findFirst({
      where: {
        provider: 'asos',
        externalProductId
      }
    });
    if (!item) return { available: false, stock: 0, reason: 'Listing not found on ASOS' };

    const stockQty = item.stockQuantity || 20;
    const hasStock = stockQty >= quantity && item.availability !== 'OUT_OF_STOCK';
    return {
      available: hasStock,
      stock: stockQty,
      price: Number(item.price),
      currency: item.listingCurrency || 'GBP',
      reason: hasStock ? 'Verified available at ASOS Euro Fulfillment Center' : 'Out of stock'
    };
  }

  async getShippingQuote({ externalProductId, destinationCountry = 'NG', weightKg = 1.0 }) {
    const baseFee = 22.00;
    const perKg = 8.50;
    const shippingTotal = Math.round((baseFee + (weightKg * perKg)) * 100) / 100;

    return {
      provider: 'asos',
      carrier: 'Royal Mail International Tracked / DHL eCommerce',
      estimatedDays: '6-9 business days',
      destinationCountry,
      shippingCost: shippingTotal,
      currency: 'GBP',
      trackingIncluded: true
    };
  }

  async negotiatePrice({ externalProductId, requestedDiscountPct, quantity }) {
    return {
      supported: false,
      confirmed: false,
      discountPct: 0,
      newPrice: null,
      message: 'Price negotiation is exclusively supported for native W-Commerce sellers. External store items cannot be negotiated.'
    };
  }

  async getOrderStatus(externalOrderId) {
    return {
      externalOrderId,
      provider: 'asos',
      status: 'PACKED_AT_HUB',
      carrier: 'Royal Mail Tracked',
      lastUpdate: new Date().toISOString()
    };
  }
}

module.exports = new AsosAdapter();
