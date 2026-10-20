'use strict';
const prisma = require('../../utils/prismaClient');
const adapterRegistry = require('./adapters/adapterRegistry');
const logger = require('../../utils/logger');

class CartService {
  /**
   * Get active cart for user or session
   */
  async getOrCreateCart({ userId, sessionId, marketCode = 'INTERNATIONAL', currency = 'USD' }) {
    let cart = null;
    if (userId) {
      cart = await prisma.payAICart.findFirst({
        where: { userId, status: 'ACTIVE' },
        include: { items: true }
      });
    } else if (sessionId) {
      cart = await prisma.payAICart.findFirst({
        where: { sessionId, status: 'ACTIVE' },
        include: { items: true }
      });
    }

    if (!cart) {
      cart = await prisma.payAICart.create({
        data: {
          userId: userId || null,
          sessionId: sessionId || null,
          marketCode,
          currency,
          status: 'ACTIVE'
        },
        include: { items: true }
      });
    }

    return this._formatCart(cart);
  }

  /**
   * Get cart by ID
   */
  async getCart(cartId) {
    if (!cartId) return null;
    const cart = await prisma.payAICart.findUnique({
      where: { id: cartId },
      include: { items: true }
    });
    return cart ? this._formatCart(cart) : null;
  }

  /**
   * Add item to cart - strictly enforces native W-Commerce products only
   */
  async addItem(cartId, itemData = {}) {
    const {
      productId,
      externalOfferId,
      provider = 'w-commerce',
      isExternal = false,
      title,
      price,
      currency = 'NGN',
      quantity = 1,
      imageUrl,
      sellerId,
      storeId,
      sellerName,
      originCountry = 'NG',
      weightKg,
      offerSnapshot
    } = itemData;

    // Strict W-Commerce check: Reject any explicitly external items or non-checkoutable linked store items
    const normalizedProvider = String(provider || '').trim().toLowerCase();
    const isExternalStore = ['amazon', 'aliexpress', 'ebay', 'asos', 'shopify', 'woocommerce', 'etsy', 'custom_store'].includes(normalizedProvider);
    let snap = offerSnapshot;
    if (typeof snap === 'string') {
      try { snap = JSON.parse(snap); } catch (_) {}
    }
    const isExplicitlyExternal = isExternal === true || itemData.canAddToCart === false || isExternalStore || (snap && typeof snap === 'object' && (snap.isExternal === true || snap.canAddToCart === false || snap.isCheckoutSupported === false));
    if (isExplicitlyExternal) {
      throw new Error('Only native W-Commerce products can be added to the PayAI Cart. Global store links are for reference only and do not support checkout processing.');
    }

    // Check if cart exists
    const cart = await prisma.payAICart.findUnique({
      where: { id: cartId },
      include: { items: true }
    });
    if (!cart) throw new Error('Cart not found');

    const resolvedProductId = productId || externalOfferId || null;

    // Resolve product fields from database if productId is given
    let dbProduct = null;
    if (resolvedProductId) {
      try {
        dbProduct = await prisma.product.findUnique({
          where: { id: resolvedProductId },
          include: { store: true, images: true }
        });
      } catch (_) {}
    }

    const finalTitle = title || dbProduct?.title || 'W-Commerce Product';
    let finalPrice = Number(price !== undefined ? price : (dbProduct?.price || 0));
    let finalCurrency = (currency || dbProduct?.currency || cart.currency || 'NGN').toUpperCase();

    // Prevent NGN/USD confusion: Native W-Commerce prices >= 500 are in NGN, not USD
    if (finalCurrency === 'USD' && (finalPrice >= 500 || (dbProduct && Number(dbProduct.price) === finalPrice))) {
      finalCurrency = 'NGN';
    } else if (finalCurrency === 'NGN' && finalPrice > 0 && finalPrice <= 50) {
      if (dbProduct && Number(dbProduct.price) > 50) {
        finalPrice = Number(dbProduct.price);
      } else {
        finalCurrency = 'USD';
      }
    }

    const finalQuantity = Math.max(1, Number(quantity) || 1);
    const finalImageUrl = imageUrl || dbProduct?.images?.[0]?.url || null;
    const finalSellerName = sellerName || dbProduct?.store?.storeName || 'Verified W-Commerce Merchant';
    const finalSellerId = sellerId || storeId || dbProduct?.store?.sellerId || null;
    const finalStoreId = storeId || sellerId || dbProduct?.store?.id || null;
    const finalWeightKg = Number(weightKg || dbProduct?.weightKg || 0.5);

    const snapshotObj = {
      productId: resolvedProductId,
      title: finalTitle,
      price: finalPrice,
      currency: finalCurrency,
      storeId: finalStoreId,
      sellerId: finalSellerId,
      sellerName: finalSellerName,
      weightKg: finalWeightKg,
      provider: 'w-commerce',
      isExternal: false,
      addedAt: new Date().toISOString(),
      ...(typeof offerSnapshot === 'object' ? offerSnapshot : (offerSnapshot ? { raw: offerSnapshot } : {}))
    };

    // Check if item already exists in cart (by productId, externalOfferId, or matching title)
    const existing = cart.items.find(i => {
      let snap = null;
      try {
        if (i.offerSnapshot) snap = JSON.parse(i.offerSnapshot);
      } catch (_) {}
      return (resolvedProductId && (i.externalOfferId === resolvedProductId || snap?.productId === resolvedProductId || i.id === resolvedProductId)) ||
             (i.title === finalTitle && i.provider === 'w-commerce');
    });

    if (existing) {
      await prisma.payAICartItem.update({
        where: { id: existing.id },
        data: {
          quantity: existing.quantity + finalQuantity,
          price: finalPrice,
          currency: finalCurrency,
          sellerName: finalSellerName,
          offerSnapshot: JSON.stringify(snapshotObj)
        }
      });
      return await this.getOrCreateCart({ userId: cart.userId, sessionId: cart.sessionId });
    }

    await prisma.payAICartItem.create({
      data: {
        cartId,
        externalOfferId: resolvedProductId || null,
        provider: 'w-commerce',
        title: finalTitle,
        price: finalPrice,
        currency: finalCurrency,
        quantity: finalQuantity,
        imageUrl: finalImageUrl,
        sellerName: finalSellerName,
        originCountry: originCountry || 'NG',
        offerSnapshot: JSON.stringify(snapshotObj)
      }
    });

    return await this.getOrCreateCart({ userId: cart.userId, sessionId: cart.sessionId });
  }

  /**
   * Record negotiated unit price on cart item
   */
  async recordNegotiatedPrice(cartId, {
    productId,
    externalOfferId,
    title,
    originalPrice,
    negotiatedPrice,
    discountPct,
    currency = 'NGN',
    imageUrl,
    sellerName
  }) {
    const cart = await prisma.payAICart.findUnique({
      where: { id: cartId },
      include: { items: true }
    });
    if (!cart) throw new Error('Cart not found');

    const targetId = productId || externalOfferId;
    const existing = cart.items.find(i => i.externalOfferId === targetId || i.id === targetId);

    const snapshot = {
      negotiated: true,
      originalPrice: Number(originalPrice),
      negotiatedPrice: Number(negotiatedPrice),
      discountPct: Number(discountPct) || 0,
      negotiatedAt: new Date().toISOString()
    };

    if (existing) {
      await prisma.payAICartItem.update({
        where: { id: existing.id },
        data: {
          price: Number(negotiatedPrice),
          currency,
          offerSnapshot: JSON.stringify(snapshot)
        }
      });
    } else {
      await prisma.payAICartItem.create({
        data: {
          cartId,
          externalOfferId: targetId || null,
          provider: 'w-commerce',
          title: title || 'Negotiated Item',
          price: Number(negotiatedPrice),
          currency,
          quantity: 1,
          imageUrl: imageUrl || null,
          sellerName: sellerName || null,
          offerSnapshot: JSON.stringify(snapshot)
        }
      });
    }

    return await this.getOrCreateCart({ userId: cart.userId, sessionId: cart.sessionId });
  }

  /**
   * Remove item from cart
   */
  async removeItem(cartId, itemId) {
    await prisma.payAICartItem.deleteMany({
      where: { id: itemId, cartId }
    });
    const cart = await prisma.payAICart.findUnique({ where: { id: cartId } });
    return await this.getOrCreateCart({ userId: cart?.userId, sessionId: cart?.sessionId });
  }

  /**
   * Update item quantity
   */
  async updateQuantity(cartId, itemId, quantity) {
    const qty = Number(quantity);
    if (qty <= 0) {
      return await this.removeItem(cartId, itemId);
    }
    await prisma.payAICartItem.updateMany({
      where: { id: itemId, cartId },
      data: { quantity: qty }
    });
    const cart = await prisma.payAICart.findUnique({ where: { id: cartId } });
    return await this.getOrCreateCart({ userId: cart?.userId, sessionId: cart?.sessionId });
  }

  /**
   * Clear cart items
   */
  async clearCart(cartId) {
    await prisma.payAICartItem.deleteMany({ where: { cartId } });
    const cart = await prisma.payAICart.findUnique({ where: { id: cartId } });
    return await this.getOrCreateCart({ userId: cart?.userId, sessionId: cart?.sessionId });
  }

  /**
   * Recheck stock and prices for all cart items against native W-Commerce inventory
   */
  async recheckCartAvailability(cartId) {
    const cart = await prisma.payAICart.findUnique({
      where: { id: cartId },
      include: { items: true }
    });
    if (!cart || !cart.items.length) {
      return { allAvailable: false, issues: ['Cart is empty.'] };
    }

    const issues = [];
    for (const item of cart.items) {
      if (item.provider === 'w-commerce' || !item.provider) {
        let snap = null;
        try {
          if (item.offerSnapshot) snap = JSON.parse(item.offerSnapshot);
        } catch (_) {}
        const productId = snap?.productId || item.externalOfferId;
        if (productId) {
          const product = await prisma.product.findUnique({ where: { id: productId } }).catch(() => null);
          if (product) {
            if (product.stock < item.quantity) {
              issues.push(`"${item.title}" has insufficient stock (available: ${product.stock}).`);
            } else if (Number(product.price) !== Number(item.price)) {
              issues.push(`"${item.title}" price changed from ${item.currency} ${item.price} to ${product.price}.`);
            }
          }
        }
      } else if (item.externalOfferId && item.provider) {
        const check = await adapterRegistry.recheckOffer(item.provider, item.externalOfferId, item.quantity);
        if (!check.available) {
          issues.push(`"${item.title}" is no longer available (${check.reason}).`);
        } else if (check.price && Number(check.price) !== Number(item.price)) {
          issues.push(`"${item.title}" price changed from $${item.price} to $${check.price}.`);
        }
      }
    }

    return {
      allAvailable: issues.length === 0,
      issues
    };
  }

  _formatCart(cart) {
    if (!cart) return null;
    const items = cart.items || [];
    const FX_RATE = 1480;
    const subtotalUSD = items.reduce((sum, item) => {
      const p = Number(item.price) || 0;
      const qty = Number(item.quantity) || 1;
      const curr = (item.currency || 'USD').toUpperCase();
      const unitUSD = (p >= 500 || curr === 'NGN') ? (p > 50 ? p / FX_RATE : p) : p;
      return sum + (unitUSD * qty);
    }, 0);
    const itemCount = items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

    return {
      id: cart.id,
      userId: cart.userId,
      sessionId: cart.sessionId,
      marketCode: cart.marketCode,
      currency: cart.currency,
      status: cart.status,
      items: items.map(i => {
        let snapshotData = null;
        if (i.offerSnapshot) {
          try {
            snapshotData = typeof i.offerSnapshot === 'string' ? JSON.parse(i.offerSnapshot) : i.offerSnapshot;
          } catch (_) {
            snapshotData = null;
          }
        }
        const productId = snapshotData?.productId || i.externalOfferId || i.id;
        const sellerId = snapshotData?.sellerId || snapshotData?.storeId || null;
        const storeId = snapshotData?.storeId || snapshotData?.sellerId || null;
        const sellerName = i.sellerName || snapshotData?.sellerName || 'Verified W-Commerce Merchant';

        return {
          id: i.id,
          productId,
          externalOfferId: i.externalOfferId,
          provider: 'w-commerce',
          title: i.title,
          price: Number(i.price),
          currency: i.currency,
          quantity: i.quantity,
          imageUrl: i.imageUrl,
          sellerName,
          sellerId,
          storeId,
          originCountry: i.originCountry || 'NG',
          snapshot: snapshotData
        };
      }),
      itemCount,
      subtotal: Math.round(subtotalUSD * 100) / 100,
      subtotalUSD: Math.round(subtotalUSD * 100) / 100,
      subtotalNGN: Math.round(subtotalUSD * FX_RATE)
    };
  }
}

module.exports = new CartService();
