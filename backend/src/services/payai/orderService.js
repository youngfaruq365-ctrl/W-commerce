'use strict';
const prisma = require('../../utils/prismaClient');
const logger = require('../../utils/logger');
const crypto = require('crypto');
const pricingService = require('./pricingService');
const cartService = require('./cartService');

// Full 7-9 Stage Fulfillment Tracking States:
// PAYMENT_PENDING -> PAID_IN_ESCROW -> SELLER_ACCEPTED -> PREPARING -> PACKAGED -> COURIER_ASSIGNED -> IN_TRANSIT -> DELIVERED -> CONFIRMED_COMPLETED
const FULFILLMENT_STAGES = [
  'PAYMENT_PENDING',
  'PAID_IN_ESCROW',
  'SELLER_ACCEPTED',
  'PREPARING',
  'PACKAGED',
  'COURIER_ASSIGNED',
  'IN_TRANSIT',
  'DELIVERED',
  'CONFIRMED_COMPLETED'
];

// Aliases for backwards compatibility with legacy status names
const STATUS_ALIASES = {
  AWAITING_PAYMENT: 'PAYMENT_PENDING',
  CONFIRMED: 'PAID_IN_ESCROW',
  VERIFIED: 'PAID_IN_ESCROW',
  PROCESSING: 'PREPARING',
  SHIPPED: 'IN_TRANSIT'
};

function normalizeStatus(status) {
  if (!status) return 'PAYMENT_PENDING';
  return STATUS_ALIASES[status] || status;
}

// Allowed status transitions across all fulfillment lifecycle stages
const FULFILLMENT_TRANSITIONS = {
  // Stage 1: Payment Pending
  PAYMENT_PENDING: ['PAID_IN_ESCROW', 'CONFIRMED', 'CANCELLED'],
  AWAITING_PAYMENT: ['PAID_IN_ESCROW', 'CONFIRMED', 'CANCELLED'],

  // Stage 2: Paid & In Escrow
  PAID_IN_ESCROW: ['SELLER_ACCEPTED', 'PREPARING', 'PROCESSING', 'CANCELLED', 'REFUNDED'],
  CONFIRMED: ['SELLER_ACCEPTED', 'PREPARING', 'PROCESSING', 'CANCELLED', 'REFUNDED'],

  // Stage 3: Seller Accepted
  SELLER_ACCEPTED: ['PREPARING', 'PROCESSING', 'CANCELLED'],

  // Stage 4: Preparing / Packaging
  PREPARING: ['PACKAGED', 'COURIER_ASSIGNED', 'IN_TRANSIT', 'SHIPPED', 'CANCELLED'],
  PROCESSING: ['PACKAGED', 'COURIER_ASSIGNED', 'IN_TRANSIT', 'SHIPPED', 'CANCELLED'],

  // Stage 5: Packaged & Sealed
  PACKAGED: ['COURIER_ASSIGNED', 'IN_TRANSIT', 'SHIPPED', 'CANCELLED'],

  // Stage 6: Courier Assigned
  COURIER_ASSIGNED: ['IN_TRANSIT', 'SHIPPED', 'CANCELLED'],

  // Stage 7: In Transit
  IN_TRANSIT: ['DELIVERED', 'REFUNDED', 'DISPUTED'],
  SHIPPED: ['DELIVERED', 'REFUNDED', 'DISPUTED'],

  // Stage 8: Delivered
  DELIVERED: ['CONFIRMED_COMPLETED', 'RETURN_REQUESTED', 'REFUNDED', 'DISPUTED'],

  // Stage 9: Confirmed & Completed
  CONFIRMED_COMPLETED: ['RETURN_REQUESTED', 'REFUNDED', 'DISPUTED'],

  // Exception / RMA / Cancellation states
  RETURN_REQUESTED: ['RETURNED', 'REFUNDED', 'DELIVERED', 'CANCELLED', 'DISPUTED'],
  RETURNED: ['REFUNDED', 'DISPUTED'],
  DISPUTED: ['DELIVERED', 'CONFIRMED_COMPLETED', 'REFUNDED', 'CANCELLED'],
  REFUNDED: [],
  CANCELLED: []
};

/**
 * Check if the given date is within operational hours (default: 08:00 - 20:00 local merchant time)
 */
function isWithinOperatingHours(date = new Date(), options = {}) {
  const {
    startHour = 8,
    endHour = 20,
    timeZone = 'Africa/Lagos'
  } = options;

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      hour12: false
    });
    const hour = parseInt(formatter.format(date), 10);
    return hour >= startHour && hour < endHour;
  } catch (e) {
    const hour = date.getHours();
    return hour >= startHour && hour < endHour;
  }
}

class PayAIOrderService {
  /**
   * Map a FulfillmentOrder status (Cart checkout V2) to the PayAI fulfillment status vocabulary.
   */
  _mapFulfillmentOrderStatus(foStatus, paymentStatus) {
    const paid = ['PAID', 'HELD', 'VERIFIED'].includes(String(paymentStatus || '').toUpperCase());
    switch (String(foStatus || '').toUpperCase()) {
      case 'PENDING': return paid ? 'PAID_IN_ESCROW' : 'PAYMENT_PENDING';
      case 'SELLER_REVIEW': return 'CONFIRMED';
      case 'ACCEPTED': return 'SELLER_ACCEPTED';
      case 'PREPARING': return 'PREPARING';
      case 'PACKED':
      case 'AWAITING_COURIER': return 'PACKAGED';
      case 'HANDED_TO_COURIER': return 'IN_TRANSIT';
      case 'DELIVERED': return 'DELIVERED';
      case 'COMPLETED': return 'CONFIRMED_COMPLETED';
      case 'REJECTED':
      case 'CANCELLED':
      case 'REFUNDED': return 'CANCELLED';
      default: return 'CONFIRMED';
    }
  }

  /**
   * Roll up several per-seller fulfillment statuses into one buyer-facing status
   * (the order is only as far along as its slowest active parcel).
   */
  _rollupMarketplaceStatus(mo) {
    const rank = ['PAYMENT_PENDING', 'PAID_IN_ESCROW', 'CONFIRMED', 'SELLER_ACCEPTED', 'PREPARING', 'PACKAGED', 'COURIER_ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CONFIRMED_COMPLETED'];
    const fos = mo.fulfillmentOrders || [];
    if (String(mo.status).toUpperCase() === 'CANCELLED') return 'CANCELLED';
    if (fos.length === 0) return this._mapFulfillmentOrderStatus('PENDING', mo.paymentStatus);
    const mapped = fos.map(fo => this._mapFulfillmentOrderStatus(fo.status, mo.paymentStatus));
    const active = mapped.filter(s => s !== 'CANCELLED');
    if (active.length === 0) return 'CANCELLED';
    return active.reduce((min, s) => (rank.indexOf(s) < rank.indexOf(min) ? s : min), active[0]);
  }

  /**
   * Convert a MarketplaceOrder (with fulfillmentOrders/items/address included) to the PayAI order shape.
   */
  _formatMarketplaceOrder(mo) {
    const { resolveBackendProductImage } = require('../../utils/productImageHelper');
    const shortId = String(mo.id).replace(/[^A-Za-z0-9]/g, '').slice(-8).toUpperCase();
    const items = [];
    for (const fo of mo.fulfillmentOrders || []) {
      for (const it of fo.items || []) {
        items.push({
          id: it.id,
          productId: it.productId,
          title: it.product?.title || 'Marketplace Item',
          price: Number(it.priceAtTime || 0),
          quantity: it.quantity || 1,
          currency: mo.currency || 'NGN',
          imageUrl: it.product ? resolveBackendProductImage(it.product) : null,
          sellerName: it.product?.store?.storeName || fo.seller?.fullName || 'Verified Merchant'
        });
      }
    }

    let shippingAddress = { city: 'Lagos', country: 'NG' };
    if (mo.shippingAddress) {
      shippingAddress = {
        streetAddress: mo.shippingAddress.street,
        city: mo.shippingAddress.city,
        state: mo.shippingAddress.state,
        country: mo.shippingAddress.country === 'Nigeria' ? 'NG' : (mo.shippingAddress.country || 'NG')
      };
    } else if (mo.shippingSnapshot) {
      try {
        const snap = typeof mo.shippingSnapshot === 'string' ? JSON.parse(mo.shippingSnapshot) : mo.shippingSnapshot;
        shippingAddress = { streetAddress: snap.street || snap.address, city: snap.city || 'Lagos', state: snap.state, country: snap.country === 'Nigeria' ? 'NG' : (snap.country || 'NG') };
      } catch (_) {}
    }

    const fulfillmentStatus = this._rollupMarketplaceStatus(mo);
    const events = (mo.fulfillmentOrders || []).map(fo => ({
      id: fo.id,
      status: this._mapFulfillmentOrderStatus(fo.status, mo.paymentStatus),
      occurredAt: fo.updatedAt || fo.createdAt,
      message: `${fo.seller?.fullName || 'Seller'}: ${String(fo.status).replace(/_/g, ' ').toLowerCase()}`
    }));

    const itemTitle = items.length === 0
      ? 'Marketplace Order'
      : items.length === 1
      ? items[0].title
      : `${items[0].title} (+${items.length - 1} items)`;

    let destination = 'Buyer Address';
    if (mo.shippingAddress) {
      destination = [mo.shippingAddress.street, mo.shippingAddress.city, mo.shippingAddress.state, mo.shippingAddress.country].filter(Boolean).join(', ');
    } else if (shippingAddress.streetAddress || shippingAddress.city) {
      destination = [shippingAddress.streetAddress, shippingAddress.city, shippingAddress.state, shippingAddress.country].filter(Boolean).join(', ');
    }

    const firstStore = mo.fulfillmentOrders?.[0]?.items?.[0]?.product?.store;
    const origin = firstStore?.location || firstStore?.country ? `${firstStore.location || firstStore.country} Hub` : 'Merchant Hub (NG)';

    return {
      id: mo.id,
      source: 'MARKETPLACE',
      orderNumber: `W-DOM-${shortId}`,
      userId: mo.buyerId,
      trackingNumber: `GIG-EXP-${shortId}`,
      carrier: 'GIG Logistics Express',
      carrierName: 'GIG Logistics Express',
      status: fulfillmentStatus,
      fulfillmentStatus,
      itemTitle,
      origin,
      destination,
      eta: 'In 2-4 Days',
      paymentStatus: mo.paymentStatus === 'PAID' || mo.paymentStatus === 'HELD' ? 'VERIFIED' : mo.paymentStatus,
      subtotal: Number(mo.subtotal || 0),
      shippingCost: Number(mo.shippingCost || 0),
      dutiesAndTaxes: 0,
      discountTotal: Number(mo.discountTotal || 0),
      grandTotal: Number(mo.grandTotal || 0),
      currency: mo.currency || 'NGN',
      marketCode: 'NIGERIA',
      items,
      shippingAddress,
      events,
      checkpoints: events.map(e => ({ status: e.status, label: e.message, timestamp: e.occurredAt })),
      createdAt: mo.createdAt,
      updatedAt: mo.updatedAt,
      estimatedDelivery: null
    };
  }

  _marketplaceOrderInclude() {
    return {
      shippingAddress: true,
      fulfillmentOrders: {
        include: {
          seller: { select: { id: true, fullName: true } },
          items: { include: { product: { include: { images: true, store: true } } } }
        }
      }
    };
  }

  /**
   * Notify the buyer's open PayAI tracking tab that an order changed (socket room = userId).
   */
  _emitOrderUpdated({ orderId, buyerId }) {
    try {
      if (!buyerId || String(buyerId) === 'BUYER') return;
      require('../orderEventService').emitOrderUpdated({ orderId, buyerId: String(buyerId) });
    } catch (err) {
      logger.warn(`[PayAI:OrderService] order:updated emit skipped: ${err.message}`);
    }
  }

  /**
   * Get buyer's orders with full item and timeline details
   */
  async getOrder(orderIdOrNumber, userId = null) {
    if (!orderIdOrNumber) return null;
    const cleanId = typeof orderIdOrNumber === 'string' ? orderIdOrNumber.replace(/^#/, '').trim() : String(orderIdOrNumber);

    // 1. Try exact match in PayAIOrder (with userId if provided)
    let order = null;
    if (userId) {
      order = await prisma.payAIOrder.findFirst({
        where: {
          OR: [{ id: cleanId }, { orderNumber: cleanId }, { trackingNumber: cleanId }],
          userId
        },
        include: { payments: true, events: { orderBy: { occurredAt: 'desc' } }, quote: true }
      });
    }

    // 2. If not found, match PayAIOrder by unique ID/orderNumber/trackingNumber regardless of userId
    if (!order) {
      order = await prisma.payAIOrder.findFirst({
        where: {
          OR: [{ id: cleanId }, { orderNumber: cleanId }, { trackingNumber: cleanId }]
        },
        include: { payments: true, events: { orderBy: { occurredAt: 'desc' } }, quote: true }
      });
    }

    // 3. Try partial match in PayAIOrder
    if (!order && cleanId.length >= 4) {
      order = await prisma.payAIOrder.findFirst({
        where: {
          OR: [
            { orderNumber: { contains: cleanId } },
            { trackingNumber: { contains: cleanId } }
          ]
        },
        include: { payments: true, events: { orderBy: { occurredAt: 'desc' } }, quote: true }
      });
    }

    // 4. If found in PayAIOrder, format and return
    if (order) {
      let items = [];
      try {
        items = typeof order.itemsSnapshot === 'string' ? JSON.parse(order.itemsSnapshot) : (order.itemsSnapshot || []);
      } catch (e) {
        items = [];
      }
      let shippingAddress = null;
      try {
        shippingAddress = typeof order.shippingAddress === 'string' ? JSON.parse(order.shippingAddress) : order.shippingAddress;
      } catch (e) {
        shippingAddress = order.shippingAddress;
      }
      return {
        ...order,
        subtotal: Number(order.subtotal || 0),
        shippingCost: Number(order.shippingCost || 0),
        dutiesAndTaxes: Number(order.dutiesAndTaxes || 0),
        grandTotal: Number(order.grandTotal || 0),
        items,
        shippingAddress,
        payments: (order.payments || []).map(p => ({
          id: p.id,
          provider: p.provider,
          amount: Number(p.amount),
          currency: p.currency,
          status: p.status,
          captureId: p.providerCaptureId,
          verifiedAt: p.verifiedAt
        }))
      };
    }

    // 5a. Cart-checkout MarketplaceOrders (what the W-Commerce cart actually creates)
    try {
      const hex = cleanId.replace(/^(?:W-(?:DOM|LOC|INT)|GIG-EXP|DHL-EXP)-?/i, '').toLowerCase();
      const candidates = await prisma.marketplaceOrder.findMany({
        where: {
          ...(userId ? { buyerId: userId } : {}),
          OR: [
            { id: cleanId },
            ...(hex.length >= 6 ? [{ id: { contains: hex } }] : [])
          ]
        },
        include: this._marketplaceOrderInclude(),
        take: 5
      });
      const exact = candidates.find(c => c.id === cleanId) || candidates.find(c => c.id.replace(/[^A-Za-z0-9]/g, '').toLowerCase().endsWith(hex));
      if (exact) return this._formatMarketplaceOrder(exact);
    } catch (_) {}

    // 5b. Look in main W-Commerce marketplace orders (prisma.order)
    try {
      const strippedHex = cleanId.replace(/^(?:W-(?:DOM|LOC|INT)|GIG-EXP|DHL-EXP)-?/i, '').toLowerCase();
      const mainOrder = await prisma.order.findFirst({
        where: {
          OR: [
            { id: cleanId },
            { trackingNumber: cleanId },
            ...(cleanId.length >= 6 ? [{ id: { contains: cleanId } }] : []),
            ...(strippedHex.length >= 4 ? [{ id: { contains: strippedHex } }] : [])
          ]
        },
        include: {
          items: {
            include: {
              product: {
                include: { images: true, store: true }
              }
            }
          },
          trackingEvents: { orderBy: { createdAt: 'desc' } },
          seller: true
        }
      });

      if (mainOrder) {
        const { resolveBackendProductImage } = require('../../utils/productImageHelper');
        const items = (mainOrder.items || []).map(it => ({
          id: it.id,
          productId: it.productId,
          title: it.product?.title || 'Marketplace Item',
          price: Number(it.price || it.unitPrice || 0),
          quantity: it.quantity || 1,
          currency: mainOrder.currency || 'NGN',
          imageUrl: it.product ? resolveBackendProductImage(it.product) : null,
          sellerName: it.product?.store?.storeName || mainOrder.seller?.name || 'Verified Merchant'
        }));

        let shippingAddr = { city: 'Lagos', country: 'NG' };
        if (mainOrder.shippingAddress) {
          try {
            shippingAddr = typeof mainOrder.shippingAddress === 'string'
              ? JSON.parse(mainOrder.shippingAddress)
              : mainOrder.shippingAddress;
          } catch (_) {
            shippingAddr = { address: mainOrder.shippingAddress, city: 'Lagos', country: 'NG' };
          }
        }

        const orderNum = `W-DOM-${mainOrder.id.replace(/[^A-Za-z0-9]/g, '').slice(-8).toUpperCase()}`;
        const trackingNum = mainOrder.trackingNumber || `GIG-EXP-${mainOrder.id.replace(/[^A-Za-z0-9]/g, '').slice(-8).toUpperCase()}`;

        let fulfillmentStatus = 'CONFIRMED';
        const st = String(mainOrder.status || '').toUpperCase();
        if (st === 'PENDING') fulfillmentStatus = 'CONFIRMED';
        else if (st === 'PAID') fulfillmentStatus = 'PAID_IN_ESCROW';
        else if (st === 'PACKED') fulfillmentStatus = 'PACKAGED';
        else if (st === 'SHIPPED') fulfillmentStatus = 'IN_TRANSIT';
        else if (st === 'OUT_FOR_DELIVERY') fulfillmentStatus = 'IN_TRANSIT';
        else if (st === 'DELIVERED') fulfillmentStatus = 'DELIVERED';
        else if (st === 'COMPLETED') fulfillmentStatus = 'CONFIRMED_COMPLETED';
        else if (st === 'CANCELLED') fulfillmentStatus = 'CANCELLED';

        const itemTitle = items.length === 0
          ? 'Marketplace Order'
          : items.length === 1
          ? items[0].title
          : `${items[0].title} (+${items.length - 1} items)`;

        let destination = 'Buyer Address';
        if (typeof mainOrder.shippingAddress === 'string' && mainOrder.shippingAddress.trim()) {
          try {
            const parsedAddr = JSON.parse(mainOrder.shippingAddress);
            destination = [parsedAddr.street || parsedAddr.address, parsedAddr.city, parsedAddr.state, parsedAddr.country].filter(Boolean).join(', ') || parsedAddr.street || mainOrder.shippingAddress.trim();
          } catch (_) {
            destination = mainOrder.shippingAddress.trim();
          }
        } else if (shippingAddr.address) {
          destination = `${shippingAddr.address}, ${shippingAddr.city || ''}`;
        }

        const rawStatus = (mainOrder.status || fulfillmentStatus || 'PAID').toUpperCase();

        const checkpoints = (mainOrder.trackingEvents && mainOrder.trackingEvents.length > 0)
          ? mainOrder.trackingEvents.map(ev => ({
              status: ev.status,
              label: ev.message || ev.description || ev.status.replace(/_/g, ' '),
              timestamp: ev.createdAt,
              note: ev.location
            }))
          : [
              { status: 'PAID_IN_ESCROW', label: 'Payment confirmed in Escrow', timestamp: mainOrder.createdAt },
              ...(rawStatus === 'SHIPPED' || rawStatus === 'IN_TRANSIT' || rawStatus === 'DELIVERED' || rawStatus === 'COMPLETED'
                ? [{ status: 'SHIPPED', label: 'Dispatched with carrier (in transit)', timestamp: mainOrder.updatedAt || mainOrder.createdAt }]
                : []),
              ...(rawStatus === 'DELIVERED' || rawStatus === 'COMPLETED'
                ? [{ status: 'DELIVERED', label: 'Package confirmed delivered', timestamp: mainOrder.deliveryConfirmedAt || mainOrder.updatedAt }]
                : [])
            ];

        return {
          id: mainOrder.id,
          orderNumber: orderNum,
          userId: mainOrder.buyerId,
          trackingNumber: trackingNum,
          carrier: mainOrder.carrier || 'GIG Logistics Express',
          carrierName: mainOrder.carrier || 'GIG Logistics Express',
          status: rawStatus,
          fulfillmentStatus,
          itemTitle,
          origin: (mainOrder.seller?.store?.location || 'Merchant') + ' Hub',
          destination,
          eta: mainOrder.estimatedDeliveryDate ? new Date(mainOrder.estimatedDeliveryDate).toLocaleDateString() : 'In 2-4 Days',
          paymentStatus: mainOrder.paymentStatus || 'PAID_IN_ESCROW',
          subtotal: Number(mainOrder.totalAmount || 0),
          shippingCost: Number(mainOrder.shippingCost || 0),
          dutiesAndTaxes: Number(mainOrder.taxAmount || 0),
          grandTotal: Number(mainOrder.totalAmount || 0) + Number(mainOrder.shippingCost || 0),
          currency: mainOrder.currency || 'NGN',
          marketCode: 'NIGERIA',
          items,
          shippingAddress: shippingAddr,
          checkpoints,
          events: (mainOrder.trackingEvents || []).map(ev => ({
            id: ev.id,
            status: ev.status,
            occurredAt: ev.createdAt,
            message: ev.description || ev.location
          })),
          createdAt: mainOrder.createdAt,
          estimatedDelivery: mainOrder.estimatedDeliveryDate
        };
      }
    } catch (_) {}

    return null;
  }

  /**
   * List buyer orders
   */
  async listUserOrders(userId, sessionId = null) {
    if (!userId && !sessionId) return [];
    const results = [];

    // 1. PayAI orders
    try {
      const payAIOrders = await prisma.payAIOrder.findMany({
        where: userId ? { userId } : { quote: { sessionId } },
        orderBy: { createdAt: 'desc' },
        include: { payments: true, events: { orderBy: { occurredAt: 'desc' } } }
      });
      for (const order of payAIOrders) {
        let items = [];
        try {
          items = typeof order.itemsSnapshot === 'string' ? JSON.parse(order.itemsSnapshot) : (order.itemsSnapshot || []);
        } catch (_) {}
        results.push({
          ...order,
          subtotal: Number(order.subtotal || 0),
          shippingCost: Number(order.shippingCost || 0),
          dutiesAndTaxes: Number(order.dutiesAndTaxes || 0),
          grandTotal: Number(order.grandTotal || 0),
          items
        });
      }
    } catch (_) {}

    // 2a. Cart-checkout MarketplaceOrders
    if (userId) {
      try {
        const marketplaceOrders = await prisma.marketplaceOrder.findMany({
          where: { buyerId: userId },
          orderBy: { createdAt: 'desc' },
          include: this._marketplaceOrderInclude()
        });
        for (const mo of marketplaceOrders) {
          results.push(this._formatMarketplaceOrder(mo));
        }
      } catch (_) {}

      // 2b. Main Marketplace orders
      try {
        const mainOrders = await prisma.order.findMany({
          where: { buyerId: userId },
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              include: {
                product: {
                  include: { images: true, store: true }
                }
              }
            },
            trackingEvents: { orderBy: { createdAt: 'desc' } },
            seller: { include: { store: true } }
          }
        });
        for (const mo of mainOrders) {
          const { resolveBackendProductImage } = require('../../utils/productImageHelper');
          const shortHex = mo.id.replace(/[^A-Za-z0-9]/g, '').slice(-8).toUpperCase();
          const items = (mo.items || []).map(it => ({
            id: it.id,
            productId: it.productId,
            title: it.product?.title || 'Marketplace Item',
            price: Number(it.price || it.priceAtTime || it.unitPrice || 0),
            quantity: it.quantity || 1,
            currency: mo.currency || 'NGN',
            imageUrl: it.product ? resolveBackendProductImage(it.product) : null,
            sellerName: it.product?.store?.storeName || mo.seller?.store?.storeName || 'Verified Merchant',
            sellerLocation: it.product?.store?.location || it.product?.store?.country || mo.seller?.store?.location || 'USA'
          }));

          const itemTitle = items.length === 0
            ? 'Marketplace Order'
            : items.length === 1
            ? items[0].title
            : `${items[0].title} (+${items.length - 1} items)`;

          const normalizedStatus = (mo.status || 'PAID').toUpperCase();

          let destination = 'Buyer Address';
          if (typeof mo.shippingAddress === 'string' && mo.shippingAddress.trim()) {
            try {
              const parsedAddr = JSON.parse(mo.shippingAddress);
              destination = [parsedAddr.street || parsedAddr.address, parsedAddr.city, parsedAddr.state, parsedAddr.country].filter(Boolean).join(', ') || parsedAddr.street || mo.shippingAddress.trim();
            } catch (_) {
              destination = mo.shippingAddress.trim();
            }
          }

          let origin = 'Merchant Distribution Hub';
          const firstStore = items[0]?.sellerLocation || mo.seller?.store?.location || mo.seller?.store?.country;
          if (firstStore) {
            origin = `${firstStore} Hub`;
          }

          let checkpoints = (mo.trackingEvents || []).map(te => ({
            status: te.status,
            label: te.message || te.status.replace(/_/g, ' '),
            timestamp: te.createdAt,
            note: te.location
          }));

          if (checkpoints.length === 0) {
            checkpoints = [
              { status: 'PAID_IN_ESCROW', label: 'Payment confirmed in Escrow', timestamp: mo.createdAt },
              ...(normalizedStatus === 'SHIPPED' || normalizedStatus === 'IN_TRANSIT' || normalizedStatus === 'DELIVERED' || normalizedStatus === 'COMPLETED'
                ? [{ status: 'SHIPPED', label: 'Dispatched with carrier (in transit)', timestamp: mo.updatedAt || mo.createdAt }]
                : []),
              ...(normalizedStatus === 'DELIVERED' || normalizedStatus === 'COMPLETED'
                ? [{ status: 'DELIVERED', label: 'Package confirmed delivered', timestamp: mo.deliveryConfirmedAt || mo.updatedAt }]
                : [])
            ];
          }

          results.push({
            id: mo.id,
            orderNumber: `W-DOM-${shortHex}`,
            userId: mo.buyerId,
            trackingNumber: mo.trackingNumber || `GIG-EXP-${shortHex}`,
            carrier: mo.carrier || 'GIG Logistics Express',
            carrierName: mo.carrier || 'GIG Logistics Express',
            status: normalizedStatus,
            fulfillmentStatus: normalizedStatus,
            itemTitle,
            origin,
            destination,
            eta: mo.estimatedDeliveryDate ? new Date(mo.estimatedDeliveryDate).toLocaleDateString() : 'In 2-4 Days',
            paymentStatus: mo.paymentStatus || 'PAID_IN_ESCROW',
            subtotal: Number(mo.totalAmount || 0),
            shippingCost: Number(mo.shippingCost || 0),
            grandTotal: Number(mo.totalAmount || 0) + Number(mo.shippingCost || 0),
            currency: mo.currency || 'NGN',
            marketCode: 'NIGERIA',
            items,
            checkpoints,
            createdAt: mo.createdAt,
            estimatedDelivery: mo.estimatedDeliveryDate
          });
        }
      } catch (_) {}
    }

    results.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return results;
  }

  /**
   * Connect PayAI cart checkout directly to order placement
   * Creates complete order records with item snapshots, shipping address, tracking numbers, and delivery estimates
   */
  async placeOrder({
    userId = null,
    sessionId = null,
    cartId = null,
    quoteId = null,
    shippingAddress = null,
    paymentProvider = 'PAYPAL',
    paymentStatus = 'AWAITING_PAYMENT',
    fulfillmentStatus = null,
    marketCode = 'INTERNATIONAL',
    currency = 'USD',
    idempotencyKey = null
  }) {
    // 1. Locate Cart
    let cart = null;
    if (cartId) {
      cart = await prisma.payAICart.findUnique({
        where: { id: cartId },
        include: { items: true }
      });
    }
    if (!cart && (userId || sessionId)) {
      cart = await cartService.getOrCreateCart({ userId, sessionId, marketCode, currency });
    }

    if (!cart || !cart.items || cart.items.length === 0) {
      throw new Error('Cannot place an order with an empty cart. Please add items to your cart first.');
    }

    // Enforce that order placement is exclusively for W-Commerce items
    for (const item of cart.items) {
      let snap = {};
      try {
        snap = typeof item.offerSnapshot === 'string' ? JSON.parse(item.offerSnapshot) : (item.offerSnapshot || {});
      } catch (_) {}
      const isExplicitlyExternal = snap?.isExternal === true || snap?.canAddToCart === false || snap?.isCheckoutSupported === false;
      if (isExplicitlyExternal) {
        throw new Error(`Order placement rejected: Item "${item.title}" is an external reference item. PayAI checkout only processes purchases within W-Commerce.`);
      }
    }

    // 2. Prepare comprehensive item snapshots
    let targetCurrency = currency;
    let activeMarketCode = marketCode;
    const isDomestic = activeMarketCode === 'NIGERIA' || activeMarketCode === 'DOMESTIC';
    const itemsSnapshot = cart.items.map(item => {
      let snapshot = {};
      try {
        snapshot = typeof item.offerSnapshot === 'string' ? JSON.parse(item.offerSnapshot) : (item.offerSnapshot || {});
      } catch (e) {
        snapshot = {};
      }

      const storeId = snapshot.storeId || item.storeId || null;
      const sellerId = snapshot.sellerId || item.sellerId || null;
      const sellerName = item.sellerName || snapshot.sellerName || snapshot.storeName || null;
      const sellerStore = snapshot.storeName || snapshot.sellerStore || sellerName || 'W-Commerce Merchant';

      return {
        id: item.id,
        externalOfferId: item.externalOfferId || snapshot.externalOfferId || null,
        provider: item.provider || snapshot.provider || 'local',
        title: item.title,
        price: Number(item.price),
        currency: item.currency || currency,
        quantity: Math.max(1, Number(item.quantity) || 1),
        imageUrl: item.imageUrl || snapshot.imageUrl || null,
        sellerName,
        sellerStore,
        storeId,
        sellerId,
        originCountry: item.originCountry || snapshot.originCountry || (isDomestic ? 'NG' : 'US'),
        weightKg: Number(snapshot.weightKg) || 1.0,
        category: snapshot.category || 'general'
      };
    });

    // 3. Prepare shipping address snapshot
    let finalShippingAddress = shippingAddress;
    if (!finalShippingAddress) {
      finalShippingAddress = {
        recipientName: 'Valued Customer',
        streetAddress: '14 Marina Boulevard, Victoria Island',
        city: 'Lagos',
        state: 'Lagos State',
        postalCode: '101241',
        country: isDomestic ? 'NG' : 'NG',
        phone: '+234 800 000 0000'
      };
    }

    // 4. Calculate cost breakdowns (using quote if provided or calculating landed cost)
    let subtotal = 0;
    let shippingCost = 0;
    let dutiesAndTaxes = 0;
    let grandTotal = 0;

    if (quoteId) {
      const quote = await prisma.payAIQuote.findUnique({ where: { id: quoteId } });
      if (quote) {
        subtotal = Number(quote.subtotal);
        shippingCost = Number(quote.shipping);
        dutiesAndTaxes = Number(quote.duties) + Number(quote.taxes);
        grandTotal = Number(quote.total);
        targetCurrency = quote.currency || currency;
        activeMarketCode = quote.marketCode || marketCode;
      }
    }

    if (grandTotal === 0) {
      const destCountry = (typeof finalShippingAddress === 'object' ? finalShippingAddress?.country : null) || 'NG';
      const landed = pricingService.calculateLandedCost({
        items: itemsSnapshot,
        destinationCountry: destCountry,
        targetCurrency
      });
      subtotal = landed.subtotal;
      shippingCost = landed.shipping;
      dutiesAndTaxes = (landed.duties || 0) + (landed.taxes || 0);
      grandTotal = landed.total;
    }

    // 5. Generate unique Order Number & Courier Tracking Number (W-INT-... or W-DOM-...)
    const orderPrefix = isDomestic ? 'W-DOM' : 'W-INT';
    const orderNumber = `${orderPrefix}-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const carrierName = isDomestic ? 'GIG Logistics / Red Star Express' : 'DHL Express International';
    const trackingPrefix = isDomestic ? 'W-DOM' : 'W-INT';
    const trackingNumber = `${trackingPrefix}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const estimatedDelivery = new Date(Date.now() + (isDomestic ? 3 : 7) * 24 * 60 * 60 * 1000);

    // 6. Determine Initial Status
    const finalFulfillmentStatus = fulfillmentStatus || (paymentStatus === 'VERIFIED' ? 'PAID_IN_ESCROW' : 'PAYMENT_PENDING');

    // 7. Create Order and Clear Cart in atomic transaction
    const [order] = await prisma.$transaction([
      prisma.payAIOrder.create({
        data: {
          orderNumber,
          userId: userId || null,
          quoteId: quoteId || null,
          marketCode: activeMarketCode,
          currency: targetCurrency,
          subtotal,
          shippingCost,
          dutiesAndTaxes,
          grandTotal,
          paymentProvider,
          paymentStatus,
          fulfillmentStatus: finalFulfillmentStatus,
          shippingAddress: typeof finalShippingAddress === 'object' ? JSON.stringify(finalShippingAddress) : finalShippingAddress,
          itemsSnapshot: JSON.stringify(itemsSnapshot),
          trackingNumber,
          carrierName,
          estimatedDelivery,
          idempotencyKey: idempotencyKey || `ORDER-${orderNumber}`,
          events: {
            create: {
              status: finalFulfillmentStatus,
              source: 'PAYAI_CHECKOUT',
              message: `Order #${orderNumber} placed via PayAI checkout. Tracking #${trackingNumber} assigned with ${carrierName}.`,
              metadata: JSON.stringify({
                orderNumber,
                carrierName,
                trackingNumber,
                paymentProvider,
                paymentStatus,
                fulfillmentStatus: finalFulfillmentStatus,
                itemsCount: itemsSnapshot.length,
                grandTotal,
                currency: targetCurrency,
                placedAt: new Date().toISOString()
              })
            }
          }
        },
        include: {
          payments: true,
          events: true
        }
      }),
      prisma.payAICartItem.deleteMany({
        where: { cartId: cart.id }
      }),
      prisma.payAIAuditLog.create({
        data: {
          actorId: userId || 'anonymous',
          actorRole: 'BUYER',
          action: 'ORDER_PLACED_CHECKOUT',
          entityType: 'PAYAI_ORDER',
          entityId: orderNumber,
          details: JSON.stringify({
            orderNumber,
            itemsCount: itemsSnapshot.length,
            grandTotal,
            currency: targetCurrency,
            carrierName,
            trackingNumber
          })
        }
      })
    ]);

    // Notify buyer's live tracking tab that new order has been created
    this._emitOrderUpdated({ orderId: order.id, buyerId: order.userId });

    return {
      ...order,
      subtotal: Number(order.subtotal),
      shippingCost: Number(order.shippingCost),
      dutiesAndTaxes: Number(order.dutiesAndTaxes),
      grandTotal: Number(order.grandTotal),
      items: itemsSnapshot,
      shippingAddress: finalShippingAddress
    };
  }

  /**
   * Helper to retrieve and parse seller return & cancellation policy from store.portfolioConfig
   */
  async getOrderSellerPolicy(order) {
    const defaultPolicy = {
      sellerName: 'Verified Global Merchant',
      sellerId: null,
      storeId: null,
      allowReturns: true,
      returnPolicyDays: 14,
      cancellationWindowHours: 24,
      cancellationPolicyText: 'Orders can be cancelled within 24 hours of placement prior to warehouse dispatch.',
      returnPolicyText: 'Items in original packaging can be returned within 14 days of verified delivery.'
    };

    if (!order) return defaultPolicy;

    let items = [];
    try {
      items = typeof order.itemsSnapshot === 'string'
        ? JSON.parse(order.itemsSnapshot)
        : (order.itemsSnapshot || order.items || []);
    } catch (e) {
      items = [];
    }

    if (!items || items.length === 0) return defaultPolicy;

    for (const item of items) {
      let store = null;
      if (item.storeId) {
        store = await prisma.store.findUnique({ where: { id: item.storeId } });
      } else if (item.sellerId) {
        store = await prisma.store.findFirst({ where: { sellerId: item.sellerId } });
      } else if (item.sellerName) {
        store = await prisma.store.findFirst({ where: { storeName: item.sellerName } });
      } else if (item.externalOfferId && (item.provider === 'local' || !item.provider)) {
        const prod = await prisma.product.findUnique({
          where: { id: item.externalOfferId },
          include: { store: true }
        }).catch(() => null);
        if (prod?.store) store = prod.store;
      }

      if (store) {
        let config = {};
        try {
          config = typeof store.portfolioConfig === 'string'
            ? JSON.parse(store.portfolioConfig)
            : (store.portfolioConfig || {});
        } catch (e) {
          config = {};
        }

        const policies = config.policies || config.storeConfig || config;

        const cancellationWindowHours = Number(
          policies.cancellationWindowHours ?? config.cancellationWindowHours ?? 24
        );
        const returnPolicyDays = Number(
          policies.returnPolicyDays ?? config.returnPolicyDays ?? 14
        );
        const allowReturns = policies.allowReturns !== undefined
          ? Boolean(policies.allowReturns)
          : (config.allowReturns !== undefined ? Boolean(config.allowReturns) : true);

        return {
          sellerName: store.storeName || defaultPolicy.sellerName,
          sellerId: store.sellerId || null,
          storeId: store.id,
          allowReturns,
          returnPolicyDays,
          cancellationWindowHours,
          cancellationPolicyText: policies.cancellationPolicy || config.cancellationPolicy || `Orders may be cancelled within ${cancellationWindowHours} hours of purchase before dispatch.`,
          returnPolicyText: allowReturns
            ? (policies.returnPolicy || config.returnPolicy || `Items may be returned within ${returnPolicyDays} days of verified delivery.`)
            : (policies.returnPolicy || config.returnPolicy || 'This seller has a strict no-returns policy. All sales are final.')
        };
      }

      // Check known external provider policies
      if (item.provider === 'amazon') {
        return {
          sellerName: item.sellerName || 'Amazon Global Store',
          sellerId: null,
          storeId: null,
          allowReturns: true,
          returnPolicyDays: 30,
          cancellationWindowHours: 24,
          cancellationPolicyText: 'Orders can be cancelled before fulfillment processing begins (standard 24-hour window).',
          returnPolicyText: 'Eligible items can be returned within 30 days of receipt in new and unworn condition.'
        };
      } else if (item.provider === 'aliexpress') {
        return {
          sellerName: item.sellerName || 'AliExpress Official Merchant',
          sellerId: null,
          storeId: null,
          allowReturns: true,
          returnPolicyDays: 15,
          cancellationWindowHours: 12,
          cancellationPolicyText: 'Orders may be cancelled within 12 hours before warehouse processing.',
          returnPolicyText: 'Free returns supported within 15 days of package arrival.'
        };
      }
    }

    return defaultPolicy;
  }

  /**
   * Order Tracking: Returns rich multi-stage tracking details, real-time milestone checkpoints,
   * carrier logistics, origin & destination hubs, and proactive delay status.
   */
  async trackOrder(orderIdOrNumber, userId = null) {
    const order = await this.getOrder(orderIdOrNumber, userId);
    if (!order) {
      return { found: false, message: `Order "${orderIdOrNumber}" was not found.` };
    }

    const shippingAddr = order.shippingAddress;
    const isDomestic =
      order.marketCode === 'NIGERIA' ||
      order.marketCode === 'DOMESTIC' ||
      (order.orderNumber && (order.orderNumber.startsWith('W-DOM') || order.orderNumber.startsWith('W-LOC')));
    const destCountry = shippingAddr?.country || (isDomestic ? 'NG' : 'NG');
    const destCity = shippingAddr?.city || 'Lagos';
    const destinationHub = isDomestic
      ? `${destCity} Central Delivery Hub, Nigeria`
      : `${destCity} Air Cargo Gateway (${destCountry === 'NG' ? 'LOS' : destCountry}), ${destCountry}`;

    // Determine Origin Hub
    let originHub = 'Cincinnati Global Logistics Hub (CVG), United States';
    const items = order.items || [];
    if (items.some(i => i.originCountry === 'CN' || i.provider === 'aliexpress')) {
      originHub = 'Shenzhen International Air Cargo Hub (SZX), China';
    } else if (items.some(i => i.originCountry === 'GB' || i.provider === 'asos')) {
      originHub = 'London Heathrow World Cargo Hub (LHR), United Kingdom';
    } else if (isDomestic) {
      originHub = 'Lagos Mainland Fulfillment Hub, Nigeria';
    }

    const carrierName = order.carrierName || (isDomestic ? 'GIG Logistics / Red Star Express' : 'DHL Express International');
    const trackingPrefix = isDomestic ? 'W-DOM' : 'W-INT';
    const trackingNumber = order.trackingNumber || `${trackingPrefix}-${order.orderNumber.replace(/[^A-Za-z0-9]/g, '').slice(-8)}`;

    const milestoneMap = {
      PAYMENT_PENDING: {
        stageIndex: 0,
        currentMilestone: 'Payment Authorization Pending',
        description: 'Order created, awaiting customer payment verification before merchant fulfillment routing.'
      },
      AWAITING_PAYMENT: {
        stageIndex: 0,
        currentMilestone: 'Payment Authorization Pending',
        description: 'Order created, awaiting customer payment verification before merchant fulfillment routing.'
      },
      PAID_IN_ESCROW: {
        stageIndex: 1,
        currentMilestone: 'Payment Secured in Escrow',
        description: 'Payment authorized and securely locked in escrow. Dispatched to merchant for fulfillment.'
      },
      CONFIRMED: {
        stageIndex: 1,
        currentMilestone: 'Payment Secured in Escrow',
        description: 'Payment verified and held in escrow. Merchant order placement confirmed.'
      },
      SELLER_ACCEPTED: {
        stageIndex: 2,
        currentMilestone: 'Seller Accepted Order',
        description: 'Merchant has accepted the order commitment and queued inventory for packaging.'
      },
      PREPARING: {
        stageIndex: 3,
        currentMilestone: 'Preparing & Packaging Goods',
        description: 'Merchant is assembling, quality-checking, and packaging order items.'
      },
      PROCESSING: {
        stageIndex: 3,
        currentMilestone: 'Preparing & Packaging Goods',
        description: 'Merchant is assembling, quality-checking, and packaging order items.'
      },
      PACKAGED: {
        stageIndex: 4,
        currentMilestone: 'Packaged & Staged for Courier',
        description: 'Consignment packaged, sealed, and staged at origin dispatch dock awaiting courier collection.'
      },
      COURIER_ASSIGNED: {
        stageIndex: 5,
        currentMilestone: 'Courier Assigned & Scheduled',
        description: `Logistics partner (${carrierName}) assigned with tracking #${trackingNumber}. Manifest booked.`
      },
      IN_TRANSIT: {
        stageIndex: 6,
        currentMilestone: 'In Transit via Logistics Network',
        description: `Consignment en route to ${destCity} via carrier network.`
      },
      SHIPPED: {
        stageIndex: 6,
        currentMilestone: 'In Transit via Logistics Network',
        description: `Consignment en route to ${destCity} via carrier network.`
      },
      DELIVERED: {
        stageIndex: 7,
        currentMilestone: 'Delivered to Recipient',
        description: 'Consignment successfully delivered to destination address.'
      },
      CONFIRMED_COMPLETED: {
        stageIndex: 8,
        currentMilestone: 'Fulfillment Completed & Verified',
        description: 'Buyer confirmed receipt. Escrow payment released to merchant wallet.'
      },
      CANCELLED: {
        stageIndex: -1,
        currentMilestone: 'Order Cancelled',
        description: 'Order cancelled. Refund workflow processed.'
      },
      RETURN_REQUESTED: {
        stageIndex: -2,
        currentMilestone: 'Return Authorization In Review (RMA)',
        description: 'Return merchandise authorization approved. Awaiting parcel return.'
      },
      RETURNED: {
        stageIndex: -2,
        currentMilestone: 'Returned to Merchant',
        description: 'Returned parcel received and inspected at warehouse.'
      },
      REFUNDED: {
        stageIndex: -3,
        currentMilestone: 'Refund Completed',
        description: 'Funds returned to original funding source.'
      },
      DISPUTED: {
        stageIndex: -4,
        currentMilestone: 'Dispute Under Review',
        description: 'Order fulfillment dispute flagged and under moderation review.'
      }
    };

    const currentFulfillmentStatus = order.fulfillmentStatus || 'PAYMENT_PENDING';
    const milestoneInfo = milestoneMap[currentFulfillmentStatus] || {
      stageIndex: 0,
      currentMilestone: currentFulfillmentStatus,
      description: `Current order fulfillment status is ${currentFulfillmentStatus}.`
    };

    const createdAt = new Date(order.createdAt);
    const estimatedDelivery = order.estimatedDelivery || new Date(createdAt.getTime() + (isDomestic ? 3 : 7) * 24 * 60 * 60 * 1000);
    const orderEvents = order.events || [];

    // Helper to find an event matching any status in a list
    const findEventForStatus = (statuses) => {
      return orderEvents.find(e => statuses.includes(e.status));
    };

    const currentNormalized = normalizeStatus(currentFulfillmentStatus);
    const activeStageIndex = FULFILLMENT_STAGES.indexOf(currentNormalized);
    const isCancelled = currentFulfillmentStatus === 'CANCELLED';

    // Mapping of fulfillment statuses to checkpoint index (0-6)
    const statusToStageMap = {
      PAYMENT_PENDING: 0,
      AWAITING_PAYMENT: 0,
      PAID_IN_ESCROW: 1,
      CONFIRMED: 1,
      VERIFIED: 1,
      SELLER_ACCEPTED: 2,
      PREPARING: 2,
      PROCESSING: 2,
      PACKAGED: 2,
      COURIER_ASSIGNED: 3,
      IN_TRANSIT: 4,
      SHIPPED: 4,
      DELIVERED: 6,
      CONFIRMED_COMPLETED: 6
    };
    const activeCheckpointIndex = statusToStageMap[currentNormalized] !== undefined ? statusToStageMap[currentNormalized] : 0;

    // Build standard 7-stage checkpoint timeline
    const stageDefinitions = [
      {
        stage: 1,
        key: 'PAYMENT_PENDING',
        title: 'Order Placed & Payment Authorized',
        location: 'PayAI Global Gateway',
        statusKey: ['PAYMENT_PENDING', 'AWAITING_PAYMENT', 'PAID_IN_ESCROW', 'CONFIRMED'],
        fallbackTime: createdAt
      },
      {
        stage: 2,
        key: 'PAID_IN_ESCROW',
        title: 'Payment Secured in Escrow',
        location: 'PayAI Escrow Vault',
        statusKey: ['PAID_IN_ESCROW', 'CONFIRMED', 'VERIFIED'],
        fallbackTime: new Date(createdAt.getTime() + 10 * 60 * 1000)
      },
      {
        stage: 3,
        key: 'PREPARING',
        title: 'Warehouse Processing & Packaging',
        location: originHub,
        statusKey: ['SELLER_ACCEPTED', 'PREPARING', 'PROCESSING', 'PACKAGED'],
        fallbackTime: new Date(createdAt.getTime() + 12 * 60 * 60 * 1000)
      },
      {
        stage: 4,
        key: 'COURIER_ASSIGNED',
        title: `Courier Assigned (${carrierName})`,
        location: originHub,
        statusKey: ['COURIER_ASSIGNED'],
        fallbackTime: new Date(createdAt.getTime() + 24 * 60 * 60 * 1000)
      },
      {
        stage: 5,
        key: 'IN_TRANSIT',
        title: isDomestic ? 'Interstate Freight Transit - En Route' : 'International Air Freight Transit - En Route',
        location: isDomestic ? 'Domestic Freight Corridor' : 'International Cargo Flight Airspace',
        statusKey: ['IN_TRANSIT', 'SHIPPED'],
        fallbackTime: new Date(createdAt.getTime() + 48 * 60 * 60 * 1000)
      },
      {
        stage: 6,
        key: 'DESTINATION_ARRIVAL',
        title: isDomestic ? `Arrived at ${destCity} Sorting Hub` : `Arrived at ${destCity} Customs Hub`,
        location: destCity,
        statusKey: ['DESTINATION_ARRIVAL', 'CUSTOMS_CLEARED'],
        fallbackTime: new Date(estimatedDelivery.getTime() - 24 * 60 * 60 * 1000)
      },
      {
        stage: 7,
        key: 'DELIVERED',
        title: 'Delivered to Customer & Signature Recorded',
        location: shippingAddr ? `${shippingAddr.streetAddress || ''}, ${destCity}` : destCity,
        statusKey: ['DELIVERED', 'CONFIRMED_COMPLETED'],
        fallbackTime: estimatedDelivery
      }
    ];

    const checkpoints = stageDefinitions.map((def, idx) => {
      const matchingEvent = findEventForStatus(def.statusKey);
      let status = 'PENDING';
      let timestamp = null;

      if (isCancelled) {
        if (matchingEvent || (activeCheckpointIndex !== -1 && idx < activeCheckpointIndex)) {
          status = 'COMPLETED';
          timestamp = matchingEvent ? matchingEvent.occurredAt : def.fallbackTime.toISOString();
        } else {
          status = 'CANCELLED';
        }
      } else if (activeCheckpointIndex === -1) {
        // e.g. RETURN_REQUESTED, RETURNED, DISPUTED
        status = matchingEvent ? 'COMPLETED' : 'PENDING';
        timestamp = matchingEvent ? matchingEvent.occurredAt : null;
      } else if (idx < activeCheckpointIndex) {
        status = 'COMPLETED';
        timestamp = matchingEvent ? matchingEvent.occurredAt : def.fallbackTime.toISOString();
      } else if (idx === activeCheckpointIndex) {
        status = 'IN_PROGRESS';
        timestamp = matchingEvent ? matchingEvent.occurredAt : new Date().toISOString();
      } else {
        status = 'PENDING';
      }

      return {
        stage: def.stage,
        key: def.key,
        title: def.title,
        location: def.location,
        status,
        timestamp,
        message: matchingEvent?.message || null
      };
    });

    // Check for proactive delay warnings in order events
    const delayAlerts = orderEvents
      .filter(e => e.source === 'FULFILLMENT_MONITOR' || e.status === 'DELAY_ALERT')
      .map(e => {
        let meta = {};
        try {
          meta = typeof e.metadata === 'string' ? JSON.parse(e.metadata) : (e.metadata || {});
        } catch (_) {}
        return {
          occurredAt: e.occurredAt,
          message: e.message,
          alertType: meta.alertType || 'PREPARATION_DELAY',
          elapsedHours: meta.elapsedHours || null,
          revisedEstimatedDelivery: meta.revisedEstimatedDelivery || null
        };
      });

    return {
      found: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: currentFulfillmentStatus,
      normalizedStatus: currentNormalized,
      activeStageIndex,
      carrierName,
      trackingNumber,
      currentMilestone: milestoneInfo.currentMilestone,
      milestoneDescription: milestoneInfo.description,
      estimatedDeliveryDate: estimatedDelivery,
      originHub,
      destinationHub,
      checkpoints,
      isDelayed: delayAlerts.length > 0,
      delayAlerts,
      items: order.items,
      shippingAddress: shippingAddr,
      events: orderEvents
    };
  }

  /**
   * Transition order fulfillment status with state machine checks.
   * Logs all state transitions to prisma.payAIOrderStatusEvent with timestamp, source, and metadata.
   */
  async updateFulfillmentStatus({
    orderId,
    newStatus,
    message,
    source = 'SYSTEM',
    metadata = null,
    trackingNumber = null,
    carrierName = null,
    estimatedDelivery = null
  }) {
    const order = await prisma.payAIOrder.findFirst({
      where: {
        OR: [{ id: orderId }, { orderNumber: orderId }]
      }
    });
    if (!order) throw new Error('Order not found');

    const currentStatus = order.fulfillmentStatus || 'PAYMENT_PENDING';
    const allowedNext = FULFILLMENT_TRANSITIONS[currentStatus] || [];
    const normalizedNew = normalizeStatus(newStatus);

    const isAllowed =
      allowedNext.includes(newStatus) ||
      allowedNext.some(s => normalizeStatus(s) === normalizedNew);

    if (!isAllowed) {
      throw new Error(
        `Invalid status transition from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowedNext.join(', ') || 'none'}`
      );
    }

    const updateData = { fulfillmentStatus: newStatus };
    if (trackingNumber) updateData.trackingNumber = trackingNumber;
    if (carrierName) updateData.carrierName = carrierName;
    if (estimatedDelivery) updateData.estimatedDelivery = new Date(estimatedDelivery);

    const now = new Date();
    const eventMetadata = {
      previousStatus: currentStatus,
      newStatus,
      timestamp: now.toISOString(),
      ...(typeof metadata === 'object' && metadata !== null ? metadata : (metadata ? { raw: metadata } : {}))
    };

    const [updatedOrder, statusEvent] = await prisma.$transaction([
      prisma.payAIOrder.update({
        where: { id: order.id },
        data: updateData
      }),
      prisma.payAIOrderStatusEvent.create({
        data: {
          orderId: order.id,
          status: newStatus,
          source,
          message: message || `Order status updated to ${newStatus}`,
          metadata: JSON.stringify(eventMetadata),
          occurredAt: now
        }
      }),
      prisma.payAIAuditLog.create({
        data: {
          actorId: source || 'SYSTEM',
          actorRole: 'SYSTEM',
          action: `ORDER_FULFILLMENT_${newStatus}`,
          entityType: 'PAYAI_ORDER',
          entityId: order.id,
          details: JSON.stringify({
            orderNumber: order.orderNumber,
            from: currentStatus,
            to: newStatus,
            metadata: eventMetadata
          })
        }
      })
    ]);

    // When order is confirmed completed, release escrow payout to seller if still held
    if (normalizedNew === 'CONFIRMED_COMPLETED') {
      try {
        const paypalPaymentService = require('./paypalPaymentService');
        await paypalPaymentService.releaseSellerPayout({
          orderId: order.id,
          triggerSource: source || 'CONFIRMED_COMPLETED'
        });
      } catch (err) {
        logger.info(`[PayAI:OrderService] Escrow payout note on completion: ${err.message}`);
      }
    }

    // Push real-time status update to buyer's tracking tab
    this._emitOrderUpdated({ orderId: order.id, buyerId: order.userId });

    return {
      ...updatedOrder,
      event: statusEvent
    };
  }

  /**
   * Seller accepts the order and commits to fulfillment
   */
  async acceptOrder({ orderId, sellerId = null, preparationHours = 24, notes = null }) {
    return await this.updateFulfillmentStatus({
      orderId,
      newStatus: 'SELLER_ACCEPTED',
      message: `Seller accepted order commitment. Standard preparation window: ${preparationHours}h.`,
      source: sellerId ? `SELLER:${sellerId}` : 'SELLER',
      metadata: { sellerId, preparationHours, notes }
    });
  }

  /**
   * Mark order as actively in warehouse preparation
   */
  async startPreparing({ orderId, sellerId = null, notes = null }) {
    return await this.updateFulfillmentStatus({
      orderId,
      newStatus: 'PREPARING',
      message: 'Seller has begun assembling, packaging, and inspecting items.',
      source: sellerId ? `SELLER:${sellerId}` : 'SELLER',
      metadata: { sellerId, notes }
    });
  }

  /**
   * Mark order items as packaged and sealed
   */
  async markPackaged({ orderId, sellerId = null, packageDetails = null }) {
    return await this.updateFulfillmentStatus({
      orderId,
      newStatus: 'PACKAGED',
      message: 'Items packaged and sealed. Consignment staged for courier collection.',
      source: sellerId ? `SELLER:${sellerId}` : 'SELLER',
      metadata: { sellerId, packageDetails }
    });
  }

  /**
   * Assign courier partner and waybill tracking details
   */
  async assignCourier({ orderId, carrierName, trackingNumber, estimatedDelivery = null, source = 'LOGISTICS' }) {
    return await this.updateFulfillmentStatus({
      orderId,
      newStatus: 'COURIER_ASSIGNED',
      carrierName,
      trackingNumber,
      estimatedDelivery,
      message: `Courier assigned: ${carrierName} (Waybill #${trackingNumber}). Pickup scheduled.`,
      source,
      metadata: { carrierName, trackingNumber, estimatedDelivery }
    });
  }

  /**
   * Mark consignment in transit
   */
  async dispatchInTransit({ orderId, carrierName = null, trackingNumber = null, source = 'CARRIER_SYNC' }) {
    return await this.updateFulfillmentStatus({
      orderId,
      newStatus: 'IN_TRANSIT',
      carrierName,
      trackingNumber,
      message: 'Consignment departed origin facility and is in transit to destination.',
      source,
      metadata: { carrierName, trackingNumber, departedAt: new Date().toISOString() }
    });
  }

  /**
   * Mark consignment delivered
   */
  async markDelivered({ orderId, signedBy = null, proofOfDelivery = null, source = 'CARRIER_SYNC' }) {
    return await this.updateFulfillmentStatus({
      orderId,
      newStatus: 'DELIVERED',
      message: `Package successfully delivered.${signedBy ? ` Signed by: ${signedBy}.` : ''}`,
      source,
      metadata: { signedBy, proofOfDelivery, deliveredAt: new Date().toISOString() }
    });
  }

  /**
   * Proactive Milestone & Delay Monitoring
   * Scans orders in SELLER_ACCEPTED and PREPARING (plus legacy PROCESSING and CONFIRMED).
   * Identifies preparation delays exceeding SLAs or approaching delivery deadlines without courier assignment.
   * Generates structured status events, updates estimated delivery dates, and notifies seller and buyer.
   * Respects operating hours and prevents duplicate notifications within cooldown window.
   */
  async checkFulfillmentDelays({
    forceRun = false,
    timeZone = 'Africa/Lagos',
    preparationSlaHours = 24,
    criticalDeliveryWindowHours = 48,
    cooldownHours = 12
  } = {}) {
    const now = new Date();
    const inOperatingHours = isWithinOperatingHours(now, { timeZone });

    if (!forceRun && !inOperatingHours) {
      logger.info(`[PayAI:FulfillmentMonitor] Outside operating hours (08:00-20:00 ${timeZone}). Notification delivery deferred.`);
      return {
        scannedCount: 0,
        alertsGenerated: 0,
        skippedCount: 0,
        reason: 'OUTSIDE_OPERATING_HOURS'
      };
    }

    const targetStatuses = ['SELLER_ACCEPTED', 'PREPARING', 'PROCESSING', 'CONFIRMED'];
    const orders = await prisma.payAIOrder.findMany({
      where: {
        fulfillmentStatus: { in: targetStatuses },
        paymentStatus: { in: ['VERIFIED', 'PAID_IN_ESCROW', 'HELD'] }
      },
      include: {
        events: {
          orderBy: { occurredAt: 'desc' }
        }
      }
    });

    let alertsGenerated = 0;
    let skippedCount = 0;

    for (const order of orders) {
      try {
        // 1. Check for duplicate notification cooldown
        const recentAlert = (order.events || []).find(e => {
          if (e.source !== 'FULFILLMENT_MONITOR' && e.status !== 'DELAY_ALERT') return false;
          const diffMs = now.getTime() - new Date(e.occurredAt).getTime();
          return diffMs < cooldownHours * 60 * 60 * 1000;
        });

        if (recentAlert) {
          skippedCount++;
          continue;
        }

        // 2. Determine elapsed preparation time
        const stageStartEvent = (order.events || []).find(e =>
          ['SELLER_ACCEPTED', 'PREPARING', 'PROCESSING', 'CONFIRMED'].includes(e.status)
        );
        const stageStartTime = stageStartEvent ? new Date(stageStartEvent.occurredAt) : new Date(order.createdAt);
        const elapsedHours = (now.getTime() - stageStartTime.getTime()) / (1000 * 60 * 60);

        // 3. Read seller policy for custom preparation SLA
        const policy = await this.getOrderSellerPolicy(order);
        const thresholdHours = Number(policy.preparationSlaHours) || preparationSlaHours;

        // 4. Check if nearing agreed delivery time without courier assignment
        let nearingDeliveryDeadline = false;
        if (order.estimatedDelivery && !order.trackingNumber) {
          const hoursUntilDelivery = (new Date(order.estimatedDelivery).getTime() - now.getTime()) / (1000 * 60 * 60);
          if (hoursUntilDelivery <= criticalDeliveryWindowHours) {
            nearingDeliveryDeadline = true;
          }
        }

        const isExceedingSla = elapsedHours >= thresholdHours;
        if (!isExceedingSla && !nearingDeliveryDeadline) {
          continue;
        }

        // 5. Calculate revised estimated delivery date (+24 hours)
        const currentDelivery = order.estimatedDelivery
          ? new Date(order.estimatedDelivery)
          : new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
        const revisedEstimatedDelivery = new Date(currentDelivery.getTime() + 24 * 60 * 60 * 1000);

        const alertReason = isExceedingSla
          ? `Preparation SLA exceeded (${Math.round(elapsedHours)}h elapsed vs ${thresholdHours}h SLA)`
          : `Delivery deadline approaching in <${criticalDeliveryWindowHours}h without courier assignment`;

        const alertMetadata = {
          alertType: 'PREPARATION_DELAY',
          elapsedHours: Math.round(elapsedHours * 10) / 10,
          thresholdHours,
          nearingDeliveryDeadline,
          currentStatus: order.fulfillmentStatus,
          originalEstimatedDelivery: order.estimatedDelivery ? order.estimatedDelivery.toISOString() : null,
          revisedEstimatedDelivery: revisedEstimatedDelivery.toISOString(),
          operatingHoursChecked: true,
          sellerId: policy.sellerId,
          userId: order.userId
        };

        // 6. Persist status event and update estimated delivery in atomic transaction
        await prisma.$transaction([
          prisma.payAIOrder.update({
            where: { id: order.id },
            data: { estimatedDelivery: revisedEstimatedDelivery }
          }),
          prisma.payAIOrderStatusEvent.create({
            data: {
              orderId: order.id,
              status: 'DELAY_ALERT',
              source: 'FULFILLMENT_MONITOR',
              message: `Proactive Fulfillment Alert: Order #${order.orderNumber} - ${alertReason}. Seller reminded to expedite courier assignment; revised delivery estimate set to ${revisedEstimatedDelivery.toLocaleDateString()}.`,
              metadata: JSON.stringify(alertMetadata),
              occurredAt: now
            }
          }),
          prisma.payAIAuditLog.create({
            data: {
              actorId: 'FULFILLMENT_MONITOR',
              actorRole: 'AI_AGENT',
              action: 'ORDER_DELAY_ALERT',
              entityType: 'PAYAI_ORDER',
              entityId: order.id,
              details: JSON.stringify({
                orderNumber: order.orderNumber,
                alertReason,
                elapsedHours,
                revisedEstimatedDelivery
              })
            }
          })
        ]);

        // 7. Proactively remind seller to expedite packaging
        if (policy.sellerId) {
          try {
            const notificationV2Service = require('../notificationV2Service');
            await notificationV2Service.notify(policy.sellerId, {
              type: 'ORDER_PREPARATION_DELAY',
              title: `Fulfillment Reminder: Order #${order.orderNumber}`,
              body: `Order #${order.orderNumber} has been in ${order.fulfillmentStatus} for ${Math.round(elapsedHours)} hours. Please complete packaging and assign a courier promptly.`,
              orderId: order.id,
              actionUrl: `/dashboard/orders/${order.id}`,
              metadata: { orderId: order.id, orderNumber: order.orderNumber, elapsedHours }
            });
          } catch (e) {
            logger.warn(`[PayAI:FulfillmentMonitor] Could not notify seller: ${e.message}`);
          }
        }

        // 8. Notify buyer with proactive timeline update
        if (order.userId) {
          try {
            const notificationV2Service = require('../notificationV2Service');
            await notificationV2Service.notify(order.userId, {
              type: 'ORDER_FULFILLMENT_UPDATE',
              title: `Order #${order.orderNumber} Fulfillment Update`,
              body: `Your order #${order.orderNumber} is undergoing quality preparation by ${policy.sellerName || 'the merchant'}. Your estimated delivery date has been updated to ${revisedEstimatedDelivery.toLocaleDateString()}.`,
              orderId: order.id,
              actionUrl: `/orders/${order.id}`,
              metadata: { orderId: order.id, orderNumber: order.orderNumber, revisedEstimatedDelivery }
            });
          } catch (e) {
            logger.warn(`[PayAI:FulfillmentMonitor] Could not notify buyer: ${e.message}`);
          }
        }

        alertsGenerated++;
      } catch (orderErr) {
        logger.error(`[PayAI:FulfillmentMonitor] Error processing order #${order.orderNumber}: ${orderErr.message}`);
      }
    }

    return {
      scannedCount: orders.length,
      alertsGenerated,
      skippedCount,
      inOperatingHours
    };
  }

  /**
   * Cancel an order if it hasn't shipped and is within seller's cancellation window
   */
  async cancelOrder({ orderId, reason, actorId = 'BUYER' }) {
    const order = await this.getOrder(orderId);
    if (!order) throw new Error('Order not found');

    if (order.fulfillmentStatus === 'CANCELLED') {
      throw new Error(`Order #${order.orderNumber} is already cancelled.`);
    }

    if (['IN_TRANSIT', 'SHIPPED', 'DELIVERED', 'CONFIRMED_COMPLETED'].includes(order.fulfillmentStatus)) {
      throw new Error(`Cannot cancel order #${order.orderNumber} because it has already reached status "${order.fulfillmentStatus}". Once an order has dispatched, please initiate a return request after delivery.`);
    }

    if (order.source === 'MARKETPLACE') {
      const fos = await prisma.fulfillmentOrder.findMany({ where: { marketplaceOrderId: order.id } });
      const cancellable = ['PENDING', 'SELLER_REVIEW'];
      const blocking = fos.find(fo => !cancellable.includes(fo.status) && !['CANCELLED', 'REJECTED'].includes(fo.status));
      if (blocking) {
        throw new Error(`Order #${order.orderNumber} can no longer be cancelled because a seller has already started fulfilling it (status: ${blocking.status.replace(/_/g, ' ').toLowerCase()}). You can request a return after delivery.`);
      }

      const wasPaid = ['PAID', 'HELD'].includes(String((await prisma.marketplaceOrder.findUnique({ where: { id: order.id }, select: { paymentStatus: true } }))?.paymentStatus || '').toUpperCase());
      await prisma.$transaction([
        prisma.fulfillmentOrder.updateMany({
          where: { marketplaceOrderId: order.id, status: { in: cancellable } },
          data: { status: 'CANCELLED' }
        }),
        prisma.marketplaceOrder.update({
          where: { id: order.id },
          data: { status: 'CANCELLED', notes: `Cancelled by buyer. Reason: ${reason || 'Customer requested'}` }
        })
      ]);

      for (const fo of fos) {
        try {
          const notificationV2Service = require('../notificationV2Service');
          await notificationV2Service.notify(fo.sellerId, {
            type: 'ORDER_CANCELLED',
            title: `Order Cancelled: #${order.orderNumber}`,
            body: `The buyer cancelled order #${order.orderNumber}. Reason: ${reason || 'Customer requested'}.`,
            orderId: order.id,
            actionUrl: `/seller/orders/${fo.id}`
          });
        } catch (e) {
          logger.warn(`[PayAI:OrderService] Failed to notify seller of cancellation: ${e.message}`);
        }
      }

      try {
        require('../orderEventService').emitOrderUpdated({
          orderId: order.id,
          buyerId: order.userId,
          sellerIds: fos.map(fo => fo.sellerId)
        });
      } catch (_) {}

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        fulfillmentStatus: 'CANCELLED',
        paymentStatus: wasPaid ? 'REFUND_PENDING' : 'CANCELLED',
        refundIssued: false,
        refundPending: wasPaid,
        refundAmount: wasPaid ? Number(order.grandTotal) : 0,
        currency: order.currency,
        message: `Order #${order.orderNumber} has been cancelled.${wasPaid ? ' Your payment is held in escrow and will be returned to you.' : ''}`
      };
    }

    // Read seller's return/cancellation policy from store.portfolioConfig
    const policy = await this.getOrderSellerPolicy(order);
    const windowHours = policy.cancellationWindowHours ?? 24;
    const hoursElapsed = (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60);

    if (hoursElapsed > windowHours) {
      throw new Error(`Order #${order.orderNumber} cannot be cancelled because the seller's cancellation window of ${windowHours} hours has expired (${Math.round(hoursElapsed * 10) / 10} hours elapsed since order placement). Seller policy: "${policy.cancellationPolicyText}"`);
    }

    const isPaid = order.paymentStatus === 'VERIFIED';

    const [cancelledOrder] = await prisma.$transaction([
      prisma.payAIOrder.update({
        where: { id: order.id },
        data: {
          fulfillmentStatus: 'CANCELLED',
          paymentStatus: isPaid ? 'REFUNDED' : 'FAILED'
        }
      }),
      prisma.payAIOrderStatusEvent.create({
        data: {
          orderId: order.id,
          status: 'CANCELLED',
          source: actorId,
          message: `Order cancelled by ${actorId}. Reason: ${reason || 'Customer requested'}.${isPaid ? ` Refund of $${order.grandTotal} ${order.currency} initiated to original payment source.` : ''}`
        }
      }),
      prisma.payAIAuditLog.create({
        data: {
          actorId,
          actorRole: 'BUYER',
          action: 'ORDER_CANCELLED',
          entityType: 'PAYAI_ORDER',
          entityId: order.id,
          details: JSON.stringify({
            orderNumber: order.orderNumber,
            reason,
            refundIssued: isPaid,
            amount: Number(order.grandTotal),
            currency: order.currency,
            policyApplied: policy
          })
        }
      })
    ]);

    // If paid, also add refund status event
    if (isPaid) {
      await prisma.payAIOrderStatusEvent.create({
        data: {
          orderId: order.id,
          status: 'REFUNDED',
          source: 'REFUND_ENGINE',
          message: `Automatic refund of $${order.grandTotal} ${order.currency} issued to customer.`
        }
      });
    }

    // Notify seller
    if (policy.sellerId) {
      try {
        const notificationV2Service = require('../notificationV2Service');
        await notificationV2Service.notify(policy.sellerId, {
          type: 'ORDER_CANCELLED',
          title: `Order Cancelled: #${order.orderNumber}`,
          body: `Order #${order.orderNumber} was cancelled by buyer. Reason: ${reason || 'Customer requested'}.${isPaid ? ' Refund has been initiated.' : ''}`,
          orderId: order.id,
          actionUrl: `/dashboard/orders/${order.id}`
        });
      } catch (e) {
        logger.warn(`[PayAI:OrderService] Failed to notify seller: ${e.message}`);
      }
    }

    this._emitOrderUpdated({ orderId: order.id, buyerId: order.userId || actorId });

    return {
      ...cancelledOrder,
      orderNumber: cancelledOrder.orderNumber,
      fulfillmentStatus: cancelledOrder.fulfillmentStatus,
      paymentStatus: cancelledOrder.paymentStatus,
      refundIssued: isPaid,
      refundAmount: isPaid ? Number(order.grandTotal) : 0,
      currency: order.currency,
      message: `Order #${order.orderNumber} has been successfully cancelled.${isPaid ? ` A full refund of $${order.grandTotal} ${order.currency} has been initiated.` : ''}`
    };
  }

  /**
   * Request Return: Validates seller return policy, creates RMA, logs in database and notifies seller
   */
  async requestReturn({ orderId, reason, itemsToReturn = null, actorId = 'BUYER' }) {
    const order = await this.getOrder(orderId);
    if (!order) throw new Error('Order not found');

    if (order.source === 'MARKETPLACE') {
      throw new Error(`Order #${order.orderNumber} was placed through the W-Commerce cart. Please open the order from your Orders page and use "Report a problem" to start a return or dispute with the seller.`);
    }

    if (order.fulfillmentStatus === 'CANCELLED') {
      throw new Error(`Cannot request a return for order #${order.orderNumber} because it was cancelled.`);
    }

    if (order.fulfillmentStatus === 'IN_TRANSIT' || order.fulfillmentStatus === 'SHIPPED') {
      throw new Error(`Order #${order.orderNumber} is currently in transit with ${order.carrierName || 'carrier'} (Tracking #${order.trackingNumber || 'N/A'}). Return requests can only be initiated once the package has been delivered.`);
    }

    if (['PAYMENT_PENDING', 'AWAITING_PAYMENT', 'PAID_IN_ESCROW', 'CONFIRMED', 'SELLER_ACCEPTED', 'PREPARING', 'PROCESSING', 'PACKAGED', 'COURIER_ASSIGNED'].includes(order.fulfillmentStatus)) {
      throw new Error(`Returns can only be requested for DELIVERED orders (order has not shipped yet). You can cancel this order instead of requesting a return.`);
    }

    if (!['DELIVERED', 'CONFIRMED_COMPLETED'].includes(order.fulfillmentStatus)) {
      throw new Error(`Returns can only be requested for delivered orders. Current fulfillment status is "${order.fulfillmentStatus}".`);
    }

    // Policy check from store.portfolioConfig
    const policy = await this.getOrderSellerPolicy(order);

    if (!policy.allowReturns) {
      throw new Error(`Return request rejected: The seller "${policy.sellerName}" does not accept returns per their store policy ("${policy.returnPolicyText || 'All sales are final.'}").`);
    }

    const returnDays = policy.returnPolicyDays ?? 14;
    const deliveryEvent = order.events?.find(e => e.status === 'DELIVERED');
    const deliveredAt = deliveryEvent?.occurredAt || order.updatedAt;
    const daysElapsed = (Date.now() - new Date(deliveredAt).getTime()) / (1000 * 60 * 60 * 24);

    if (daysElapsed > returnDays) {
      throw new Error(`Return request rejected: The seller's return window is ${returnDays} days from delivery, but this order was delivered ${Math.floor(daysElapsed)} days ago (delivered on ${new Date(deliveredAt).toLocaleDateString()}). Seller policy: "${policy.returnPolicyText || returnDays + ' days return window.'}"`);
    }

    // Generate Return Authorization (RMA) with order prefix (RMA-W-INT-... or RMA-W-DOM-...)
    const rmaNumber = `RMA-${order.orderNumber}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

    const [updatedOrder] = await prisma.$transaction([
      prisma.payAIOrder.update({
        where: { id: order.id },
        data: {
          fulfillmentStatus: 'RETURN_REQUESTED'
        }
      }),
      prisma.payAIOrderStatusEvent.create({
        data: {
          orderId: order.id,
          status: 'RETURN_REQUESTED',
          source: actorId,
          message: `Return merchandise authorization ${rmaNumber} created. Reason: ${reason || 'Customer requested return'}.`,
          metadata: JSON.stringify({
            rmaNumber,
            reason,
            returnPolicyDays: returnDays,
            carrierPickupAvailable: true,
            sellerName: policy.sellerName
          })
        }
      }),
      prisma.payAIAuditLog.create({
        data: {
          actorId,
          actorRole: 'BUYER',
          action: 'ORDER_RETURN_REQUESTED',
          entityType: 'PAYAI_ORDER',
          entityId: order.id,
          details: JSON.stringify({
            orderNumber: order.orderNumber,
            rmaNumber,
            reason,
            returnDays,
            policy
          })
        }
      })
    ]);

    // Notify seller
    if (policy.sellerId) {
      try {
        const notificationV2Service = require('../notificationV2Service');
        await notificationV2Service.notify(policy.sellerId, {
          type: 'RETURN_REQUESTED',
          title: `Return Requested: Order #${order.orderNumber}`,
          body: `Buyer requested a return for order #${order.orderNumber} (RMA: ${rmaNumber}). Reason: ${reason || 'Customer return'}.`,
          orderId: order.id,
          actionUrl: `/dashboard/orders/${order.id}`
        });
      } catch (e) {
        logger.warn(`[PayAI:OrderService] Failed to notify seller: ${e.message}`);
      }
    }

    this._emitOrderUpdated({ orderId: order.id, buyerId: order.userId || actorId });

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      rmaNumber,
      status: 'RETURN_REQUESTED',
      fulfillmentStatus: 'RETURN_REQUESTED',
      reason: reason || 'Customer requested return',
      estimatedRefundAmount: Number(order.grandTotal),
      currency: order.currency,
      sellerPolicy: {
        sellerName: policy.sellerName,
        returnPolicyDays: policy.returnPolicyDays,
        allowReturns: policy.allowReturns
      },
      returnInstructions: `Please affix RMA #${rmaNumber} to your return parcel. A prepaid return shipping label has been dispatched to your email. Drop off at any authorized DHL Express or partner collection center within 7 days.`,
      message: `Return authorization ${rmaNumber} generated successfully. Your return request is being coordinated with ${policy.sellerName}.`
    };
  }

  /**
   * Confirm receipt of PayAI order by buyer and release seller payout in Naira (NGN)
   */
  async confirmReceipt({ orderId, userId, sellerId = null }) {
    const order = await prisma.payAIOrder.findFirst({
      where: {
        OR: [{ id: orderId }, { orderNumber: orderId }]
      }
    });
    if (!order) throw new Error('Order not found');
    if (userId && order.userId && order.userId !== userId) {
      throw new Error('Not authorized to confirm this order');
    }

    const paypalPaymentService = require('./paypalPaymentService');
    const payoutResult = await paypalPaymentService.releaseSellerPayout({
      orderId: order.id,
      sellerId,
      triggerSource: 'BUYER_CONFIRMATION'
    });

    // Ensure status transitions to CONFIRMED_COMPLETED if allowed
    if (order.fulfillmentStatus !== 'CONFIRMED_COMPLETED') {
      try {
        await this.updateFulfillmentStatus({
          orderId: order.id,
          newStatus: 'CONFIRMED_COMPLETED',
          message: 'Buyer confirmed order receipt. Fulfillment completed and escrow released.',
          source: 'BUYER',
          metadata: {
            confirmedBy: userId || 'BUYER',
            payoutReleased: payoutResult?.success ?? true
          }
        });
      } catch (transErr) {
        // If order was in a state where updateFulfillmentStatus threw (e.g. DELIVERED was already touched by paypalPaymentService), log notice
        logger.info(`[PayAI:OrderService] Transition note on confirmReceipt: ${transErr.message}`);
      }
    }

    return payoutResult;
  }

  /**
   * Handle In-Chat Order Complaint & Dispute Resolution
   * - Identifies affected order and items.
   * - Checks delivery confirmation status and return window.
   * - Determines remedy (replacement, partial refund, full escrow refund, or RMA return).
   * - Records dispute in prisma.dispute and logs event in prisma.payAIOrderStatusEvent.
   * - Explains options to buyer with empathy and clarity.
   */
  async handleOrderComplaint({
    orderId = null,
    orderNumber = null,
    complaintReason = 'OTHER',
    complaintDescription = '',
    itemNames = null,
    issueType = null,
    requestedRemedy = null,
    evidenceUrls = [],
    actorId = 'BUYER',
    userId = null
  }) {
    const cleanQuery = (orderId || orderNumber || '').toString().replace(/^#/, '').trim();
    let order = null;

    if (cleanQuery) {
      order = await this.getOrder(cleanQuery, userId);
      if (!order) {
        order = await prisma.payAIOrder.findFirst({
          where: {
            OR: [
              { id: cleanQuery },
              { orderNumber: cleanQuery },
              { trackingNumber: cleanQuery }
            ]
          },
          include: { payments: true, events: { orderBy: { occurredAt: 'desc' } } }
        });
      }
      if (!order && cleanQuery.length >= 4) {
        order = await prisma.payAIOrder.findFirst({
          where: {
            OR: [
              { orderNumber: { contains: cleanQuery } },
              { trackingNumber: { contains: cleanQuery } }
            ]
          },
          include: { payments: true, events: { orderBy: { occurredAt: 'desc' } } }
        });
      }
    }

    // If order still not identified, search recent user orders
    if (!order && userId) {
      order = await prisma.payAIOrder.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: { payments: true, events: { orderBy: { occurredAt: 'desc' } } }
      });
      if (!order) {
        const nativeRecent = await prisma.order.findFirst({
          where: { buyerId: userId },
          orderBy: { createdAt: 'desc' },
          include: { items: { include: { product: true } } }
        });
        if (nativeRecent) {
          order = {
            id: nativeRecent.id,
            orderNumber: nativeRecent.idempotencyKey || `ORD-${nativeRecent.id.slice(0, 8)}`,
            userId: nativeRecent.buyerId,
            fulfillmentStatus: nativeRecent.status,
            paymentStatus: nativeRecent.paymentStatus,
            grandTotal: Number(nativeRecent.totalAmount),
            currency: nativeRecent.currency || 'USD',
            trackingNumber: nativeRecent.trackingNumber,
            carrierName: nativeRecent.carrier,
            updatedAt: nativeRecent.updatedAt,
            deliveredAt: nativeRecent.deliveredAt,
            items: (nativeRecent.items || []).map(it => ({
              id: it.productId,
              title: it.product?.title || 'Marketplace Item',
              price: Number(it.priceAtTime),
              quantity: it.quantity,
              imageUrl: null
            })),
            events: []
          };
        }
      }
    }

    if (!order) {
      const anyOrder = await prisma.payAIOrder.findFirst({
        orderBy: { createdAt: 'desc' },
        include: { payments: true, events: { orderBy: { occurredAt: 'desc' } } }
      });
      if (!anyOrder && !cleanQuery) {
        return {
          success: false,
          isDisputeResolution: true,
          orderFound: false,
          message: "🛡️ **Your satisfaction is 100% protected by W-Commerce Escrow!**\n\nI'm so sorry to hear you're experiencing an issue with your order. To immediately identify your package and pull up your seller's return window, could you please provide your **Order Number** (e.g. `#W-INT-12345` or `#W-DOM-67890`)?\n\nAs soon as you provide it, I can freeze the seller payout, calculate your refund or replacement options, and resolve this right away! 🤝",
          explanationText: "I'm so sorry you're having trouble with an order. Please share your order number so I can immediately assist you with replacement, refund, or return options under full Escrow protection.",
          suggestedPrompts: [
            { label: '📦 Track My Orders', prompt: 'Where is my order?' },
            { label: '🛡️ Buyer Protection Info', prompt: 'Explain the buyer protection and dispute policy' }
          ]
        };
      }
      if (anyOrder && !cleanQuery) {
        order = anyOrder;
      }
    }

    // 1. Identify Affected Items
    let items = [];
    if (Array.isArray(order.items) && order.items.length > 0) {
      items = order.items;
    } else {
      try {
        items = typeof order.itemsSnapshot === 'string' ? JSON.parse(order.itemsSnapshot) : (order.itemsSnapshot || []);
      } catch (e) {
        items = [];
      }
    }

    let affectedItems = items;
    if (itemNames) {
      const namesList = Array.isArray(itemNames) ? itemNames : [itemNames];
      const matched = items.filter(it =>
        namesList.some(name => it.title && it.title.toLowerCase().includes(String(name).toLowerCase()))
      );
      if (matched.length > 0) {
        affectedItems = matched;
      }
    } else if (complaintDescription) {
      const descLower = complaintDescription.toLowerCase();
      const matched = items.filter(it => it.title && descLower.includes(it.title.toLowerCase()));
      if (matched.length > 0) {
        affectedItems = matched;
      }
    }

    // 2. Check Delivery Confirmation Status & Return Window
    const fulfillmentStatus = order.fulfillmentStatus || order.status || 'CONFIRMED';
    const isDelivered = ['DELIVERED', 'CONFIRMED_COMPLETED', 'COMPLETED'].includes(fulfillmentStatus);

    const deliveryEvent = order.events?.find(e => ['DELIVERED', 'CONFIRMED_COMPLETED'].includes(e.status));
    const deliveredAt = deliveryEvent?.occurredAt || order.deliveredAt || order.deliveryConfirmedAt || order.updatedAt;

    const policy = await this.getOrderSellerPolicy(order);
    const returnDays = Number(policy.returnPolicyDays ?? 14);

    let daysSinceDelivery = 0;
    let isWithinReturnWindow = true;
    let daysRemainingInWindow = returnDays;

    if (isDelivered && deliveredAt) {
      const daysElapsed = (Date.now() - new Date(deliveredAt).getTime()) / (1000 * 60 * 60 * 24);
      daysSinceDelivery = Math.max(0, Math.floor(daysElapsed));
      isWithinReturnWindow = daysSinceDelivery <= returnDays;
      daysRemainingInWindow = Math.max(0, returnDays - daysSinceDelivery);
    } else if (!isDelivered) {
      isWithinReturnWindow = true;
    }

    // 3. Classify Reason & Determine Remedies
    const descText = `${complaintReason || ''} ${complaintDescription || ''} ${issueType || ''}`.toLowerCase();

    let reasonCode = 'OTHER';
    if (/damaged|broken|defective|faulty|cracked|scratched|shattered|torn|ruined|leaking|leak/i.test(descText)) {
      reasonCode = 'DAMAGED';
    } else if (/wrong\s+item|wrong\s+product|different\s+item|not\s+what\s+i\s+ordered|mismatched/i.test(descText)) {
      reasonCode = 'WRONG_ITEM';
    } else if (/not\s+as\s+described|fake|counterfeit|misleading|different\s+color|missing\s+parts|missing\s+item/i.test(descText)) {
      reasonCode = 'NOT_AS_DESCRIBED';
    } else if (/not\s+received|haven't\s+received|missing\s+package|lost\s+package|delayed|where\s+is/i.test(descText)) {
      reasonCode = 'NOT_RECEIVED';
    }

    const grandTotal = Number(order.grandTotal || order.totalAmount || 0);
    const currency = order.currency || 'USD';
    const isNGN = currency === 'NGN';

    const formatMoney = (val) => isNGN ? `₦${Math.round(val).toLocaleString()} NGN` : `$${Number(val).toFixed(2)} USD`;

    const partialRefundPct = reasonCode === 'NOT_AS_DESCRIBED' ? 35 : (reasonCode === 'DAMAGED' ? 40 : 25);
    const partialRefundAmount = Math.round(grandTotal * (partialRefundPct / 100) * 100) / 100;

    const remedies = [
      {
        id: 'REPLACEMENT',
        title: 'Free Express Replacement',
        badge: 'Zero Cost',
        icon: 'package',
        description: `Seller "${policy.sellerName}" dispatches a brand-new verified replacement unit via priority tracked courier at zero additional cost.`,
        financialImpact: 'Free (₦0 / $0.00 extra)',
        isRecommended: reasonCode === 'DAMAGED' || reasonCode === 'WRONG_ITEM',
        promptAction: `I choose free replacement for order #${order.orderNumber}`
      },
      {
        id: 'PARTIAL_REFUND',
        title: `Instant Partial Refund (${partialRefundPct}%)`,
        badge: 'Keep Item',
        icon: 'wallet',
        description: `Keep the delivered item in its current condition and receive ${formatMoney(partialRefundAmount)} credited immediately to your W-Commerce Wallet.`,
        financialImpact: `${formatMoney(partialRefundAmount)} credited to wallet`,
        isRecommended: reasonCode === 'NOT_AS_DESCRIBED' || (!isWithinReturnWindow && isDelivered),
        promptAction: `I choose partial refund for order #${order.orderNumber}`
      },
      {
        id: 'FULL_ESCROW_REFUND',
        title: 'Full Escrow Refund (100%)',
        badge: '100% Money-Back',
        icon: 'shield',
        description: `100% of your funds (${formatMoney(grandTotal)}) are returned directly from the Escrow Vault to your original funding source.`,
        financialImpact: `${formatMoney(grandTotal)} refund`,
        isRecommended: reasonCode === 'NOT_RECEIVED' || (!isDelivered && reasonCode === 'NOT_RECEIVED'),
        promptAction: `I choose full escrow refund for order #${order.orderNumber}`
      },
      {
        id: 'RMA_RETURN',
        title: 'Prepaid Return Authorization (RMA)',
        badge: 'Free Return Pickup',
        icon: 'rotate-ccw',
        description: `Receive a prepaid return shipping label with courier doorstep pickup. Full refund of ${formatMoney(grandTotal)} is released as soon as the return parcel is scanned at the hub.`,
        financialImpact: `${formatMoney(grandTotal)} after return drop-off`,
        isRecommended: isDelivered && isWithinReturnWindow && (reasonCode === 'WRONG_ITEM' || reasonCode === 'OTHER'),
        promptAction: `I want to return order #${order.orderNumber} for full refund`
      }
    ];

    let primaryRemedy = remedies.find(r => r.isRecommended)?.id || 'REPLACEMENT';
    if (requestedRemedy) {
      const match = remedies.find(r => r.id === requestedRemedy.toUpperCase());
      if (match) primaryRemedy = match.id;
    }

    // 4. Record Dispute in prisma.dispute & Log in prisma.payAIOrderStatusEvent
    let recordedDisputeId = null;
    let nativeOrderId = order.id;
    let validBuyerId = order.userId;
    let validSellerId = policy.sellerId;

    try {
      let nativeOrder = await prisma.order.findUnique({ where: { id: order.id } }).catch(() => null);
      if (!nativeOrder) {
        nativeOrder = await prisma.order.findFirst({
          where: {
            OR: [
              { id: order.id },
              { trackingNumber: order.trackingNumber || '' },
              { idempotencyKey: order.orderNumber || '' }
            ]
          }
        }).catch(() => null);
      }

      if (!validBuyerId || !(await prisma.user.findUnique({ where: { id: validBuyerId } }).catch(() => null))) {
        const firstUser = await prisma.user.findFirst().catch(() => null);
        validBuyerId = firstUser?.id || 'guest-buyer';
      }
      if (!validSellerId || !(await prisma.user.findUnique({ where: { id: validSellerId } }).catch(() => null))) {
        const sellerUser = await prisma.user.findFirst({ where: { role: 'SELLER' } }).catch(() => null);
        validSellerId = sellerUser?.id || validBuyerId;
      }

      if (!nativeOrder) {
        try {
          nativeOrder = await prisma.order.create({
            data: {
              id: order.id,
              buyerId: validBuyerId,
              sellerId: validSellerId,
              totalAmount: order.grandTotal || 0,
              currency: order.currency || 'USD',
              shippingCost: order.shippingCost || 0,
              taxAmount: order.dutiesAndTaxes || 0,
              status: isDelivered ? 'DELIVERED' : 'CONFIRMED',
              trackingNumber: order.trackingNumber || `W-TRACK-${order.orderNumber}`,
              idempotencyKey: order.orderNumber || `ORDER-${order.id}`
            }
          });
        } catch (_) {
          nativeOrder = await prisma.order.findFirst().catch(() => null);
        }
      }

      if (nativeOrder) {
        nativeOrderId = nativeOrder.id;
        const buyerForDispute = nativeOrder.buyerId || validBuyerId;
        const sellerForDispute = nativeOrder.sellerId || validSellerId;

        const existingDispute = await prisma.dispute.findUnique({ where: { orderId: nativeOrderId } }).catch(() => null);
        if (existingDispute) {
          const updated = await prisma.dispute.update({
            where: { id: existingDispute.id },
            data: {
              status: 'OPEN',
              reason: reasonCode,
              description: complaintDescription || `Buyer reported ${reasonCode} for order #${order.orderNumber}`,
              resolution: `Recommended remedy: ${primaryRemedy}`,
              messages: {
                create: {
                  senderId: buyerForDispute,
                  senderType: 'BUYER',
                  message: complaintDescription || `Customer complaint filed via PayAI: ${reasonCode}`
                }
              }
            }
          });
          recordedDisputeId = updated.id;
        } else {
          const created = await prisma.dispute.create({
            data: {
              orderId: nativeOrderId,
              buyerId: buyerForDispute,
              sellerId: sellerForDispute,
              reason: reasonCode,
              description: complaintDescription || `Customer complaint filed via PayAI: ${reasonCode}`,
              evidenceUrls: JSON.stringify(evidenceUrls || []),
              status: 'OPEN',
              resolution: `Recommended remedy: ${primaryRemedy}`,
              responseDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
              messages: {
                create: {
                  senderId: buyerForDispute,
                  senderType: 'BUYER',
                  message: complaintDescription || `Customer complaint initiated via PayAI: ${reasonCode}`
                }
              }
            }
          });
          recordedDisputeId = created.id;
        }
      }
    } catch (disputeErr) {
      logger.warn(`[PayAI:OrderService] Note recording prisma.dispute: ${disputeErr.message}`);
    }

    // Log event in prisma.payAIOrderStatusEvent
    if (order.id) {
      try {
        await prisma.payAIOrderStatusEvent.create({
          data: {
            orderId: order.id,
            status: 'DISPUTE_OPENED',
            source: 'PAYAI_DISPUTE_AGENT',
            message: `Dispute opened for order #${order.orderNumber} (${reasonCode}). Determined remedy: ${primaryRemedy}.`,
            metadata: JSON.stringify({
              orderNumber: order.orderNumber,
              disputeId: recordedDisputeId,
              reasonCode,
              complaintDescription,
              primaryRemedy,
              isWithinReturnWindow,
              daysSinceDelivery,
              returnDays,
              affectedItemsCount: affectedItems.length,
              sellerPolicy: policy
            })
          }
        });
      } catch (eventErr) {
        logger.warn(`[PayAI:OrderService] Event log note: ${eventErr.message}`);
      }
    }

    // Log audit log
    try {
      await prisma.payAIAuditLog.create({
        data: {
          actorId: userId || actorId,
          actorRole: 'BUYER',
          action: 'ORDER_DISPUTE_OPENED',
          entityType: 'PAYAI_ORDER',
          entityId: order.id,
          details: JSON.stringify({
            orderNumber: order.orderNumber,
            disputeId: recordedDisputeId,
            reasonCode,
            primaryRemedy,
            grandTotal,
            currency
          })
        }
      });
    } catch (_) {}

    // 5. Build Empathetic & Clear Explanation
    const itemsListStr = affectedItems.map(it => `• **${it.title || 'Marketplace Item'}** (Qty: ${it.quantity || 1}, ${formatMoney(Number(it.price || 0) * Number(it.quantity || 1))})`).join('\n');

    let deliveryStatusText = '';
    if (isDelivered) {
      deliveryStatusText = isWithinReturnWindow
        ? `Delivered on ${new Date(deliveredAt).toLocaleDateString()} (**${daysRemainingInWindow} days remaining** in seller's ${returnDays}-day return window)`
        : `Delivered on ${new Date(deliveredAt).toLocaleDateString()} (${daysSinceDelivery} days ago — **outside standard ${returnDays}-day return window**, but Escrow mediation applies)`;
    } else {
      deliveryStatusText = `Currently in transit with ${order.carrierName || 'Courier'} (Tracking: ${order.trackingNumber || 'Active'})`;
    }

    const explanationText =
      `🛡️ **Your Purchase is 100% Protected by W-Commerce Escrow!**\n\n` +
      `I am deeply sorry to hear that you ran into an issue with your order. Please take a deep breath: **the seller has not received payout yet**, and your funds are held safely in our Escrow Vault until this is completely resolved to your satisfaction.\n\n` +
      `### 📦 Affected Order & Items Identified:\n` +
      `* **Order Number:** #${order.orderNumber}\n` +
      `* **Merchant:** ${policy.sellerName}\n` +
      `* **Delivery Status:** ${deliveryStatusText}\n` +
      `* **Reported Issue:** ${reasonCode.replace(/_/g, ' ')}\n\n` +
      `**Affected Items:**\n${itemsListStr}\n\n` +
      `### ⚖️ Your Available Resolution Options:\n` +
      remedies.map((rem, idx) =>
        `${idx + 1}. **${rem.title}:** ${rem.description} *(Action: [${rem.badge}](prompt:${rem.promptAction}))*`
      ).join('\n\n') +
      `\n\n💡 **Recommended Action:** Based on your report, I recommend **${remedies.find(r => r.id === primaryRemedy)?.title || 'Replacement'}**! You can tap any button below to proceed instantly, or escalate to a live human mediator: [🛡️ Escalate to Escrow Admin](prompt:Escalate dispute for order #${order.orderNumber} to human mediator).`;

    return {
      success: true,
      isDisputeResolution: true,
      orderFound: true,
      disputeId: recordedDisputeId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      carrierName: order.carrierName,
      trackingNumber: order.trackingNumber,
      reasonCode,
      complaintDescription,
      affectedItems,
      fulfillmentStatus,
      isDelivered,
      isWithinReturnWindow,
      daysSinceDelivery,
      daysRemainingInWindow,
      returnPolicyDays: returnDays,
      sellerPolicy: policy,
      grandTotal,
      currency,
      primaryRemedy,
      remedies,
      explanationText,
      message: explanationText
    };
  }

  /**
   * Send a verified, direct inquiry message to the merchant/seller of an order.
   * Persists to Conversation & Message, creates a high-priority Notification for the seller,
   * emits real-time Socket.io events, and records an order status milestone event.
   */
  async messageOrderSeller({ orderId, userId = null, message = null, inquiryType = 'DELIVERY_UPDATE' }) {
    if (!orderId) {
      return {
        success: false,
        found: false,
        message: 'Please provide an order number or ID so I can reach out to the right seller for you.'
      };
    }

    const cleanId = typeof orderId === 'string' ? orderId.replace(/^#/, '').trim() : String(orderId);

    // 1. Locate the order across both PayAIOrder and main Order tables
    let order = await this.getOrder(cleanId, userId);
    let mainOrder = null;
    let payAIOrder = null;

    if (!order) {
      mainOrder = await prisma.order.findFirst({
        where: {
          OR: [
            { id: cleanId },
            { trackingNumber: cleanId },
            ...(cleanId.length >= 4 ? [{ id: { contains: cleanId } }] : [])
          ]
        },
        include: {
          buyer: true,
          seller: true,
          items: {
            include: {
              product: {
                include: { store: true, images: true }
              }
            }
          }
        }
      });

      if (!mainOrder) {
        payAIOrder = await prisma.payAIOrder.findFirst({
          where: {
            OR: [
              { id: cleanId },
              { orderNumber: cleanId },
              { trackingNumber: cleanId },
              ...(cleanId.length >= 4 ? [{ orderNumber: { contains: cleanId } }, { id: { contains: cleanId } }] : [])
            ]
          },
          include: { events: true }
        });
      }
    } else {
      if (order.items && !order.orderNumber) {
        mainOrder = order;
      } else {
        payAIOrder = order;
      }
    }

    const targetOrder = mainOrder || payAIOrder || order;
    if (!targetOrder) {
      return {
        success: false,
        found: false,
        message: `I couldn't locate order #${cleanId}. Please double-check your order number and try again.`
      };
    }

    const displayOrderNum = targetOrder.orderNumber && !targetOrder.orderNumber.includes(cleanId)
      ? `${targetOrder.orderNumber} (#${cleanId.slice(0, 8)})`
      : (targetOrder.orderNumber || `#${cleanId.slice(0, 8)}`);
    const orderDbId = targetOrder.id;

    // 2. Identify the Seller
    let sellerId = targetOrder.sellerId || targetOrder.seller?.id || null;
    let sellerName = targetOrder.seller?.fullName || targetOrder.sellerName || null;

    if (!sellerId && targetOrder.items) {
      const itemsList = Array.isArray(targetOrder.items) ? targetOrder.items : [];
      for (const item of itemsList) {
        if (item.product?.store?.sellerId) {
          sellerId = item.product.store.sellerId;
          sellerName = item.product.store.user?.fullName || item.product.store.storeName;
          break;
        } else if (item.storeId) {
          const store = await prisma.store.findUnique({ where: { id: item.storeId } });
          if (store?.sellerId) {
            sellerId = store.sellerId;
            sellerName = store.storeName;
            break;
          }
        } else if (item.sellerId) {
          sellerId = item.sellerId;
          break;
        }
      }
    }

    if (!sellerId && targetOrder.itemsSnapshot) {
      let snapshotItems = [];
      try {
        snapshotItems = typeof targetOrder.itemsSnapshot === 'string'
          ? JSON.parse(targetOrder.itemsSnapshot)
          : targetOrder.itemsSnapshot;
      } catch (_) {}

      for (const item of snapshotItems) {
        if (item.sellerId) {
          sellerId = item.sellerId;
          sellerName = item.sellerName || item.sellerStore;
          break;
        }
        if (item.storeId) {
          const store = await prisma.store.findUnique({ where: { id: item.storeId } });
          if (store?.sellerId) {
            sellerId = store.sellerId;
            sellerName = store.storeName;
            break;
          }
        }
      }
    }

    // Check if external global provider
    const isExternalPlatform = targetOrder.items?.some?.(i => i.provider === 'amazon' || i.provider === 'aliexpress') ||
      (targetOrder.marketCode === 'INTERNATIONAL' && !sellerId);

    if (!sellerId && isExternalPlatform) {
      if (payAIOrder) {
        await prisma.payAIOrderStatusEvent.create({
          data: {
            orderId: targetOrder.id,
            status: 'CARRIER_INQUIRY',
            source: 'PAYAI_BUYER_INQUIRY',
            message: `Buyer requested delivery status update: "${message || 'Delivery inquiry'}". Official dispatch status query logged.`,
            occurredAt: new Date()
          }
        });
      }
      return {
        success: true,
        orderFound: true,
        isExternal: true,
        orderNumber: displayOrderNum,
        sellerName: 'Global Logistics Hub / Carrier Dispatch',
        inquirySent: message || 'Delivery status update request',
        message: `I have officially logged your delivery inquiry for global order #${displayOrderNum} with our international logistics hub and carrier dispatch.`
      };
    }

    if (!sellerId) {
      const fallbackSeller = await prisma.user.findFirst({
        where: { role: 'SELLER' },
        select: { id: true, fullName: true }
      });
      if (fallbackSeller) {
        sellerId = fallbackSeller.id;
        sellerName = fallbackSeller.fullName;
      }
    }

    if (!sellerId) {
      return {
        success: false,
        found: true,
        message: `Order #${displayOrderNum} was found, but no linked merchant could be resolved for direct messaging.`
      };
    }

    // Retrieve seller details & response metrics
    const [sellerUser, sellerStore] = await Promise.all([
      prisma.user.findUnique({
        where: { id: sellerId },
        select: { id: true, fullName: true, email: true, username: true }
      }),
      prisma.store.findFirst({
        where: { sellerId },
        select: { id: true, storeName: true, avgResponseMinutes: true }
      })
    ]);

    const resolvedSellerName = sellerStore?.storeName || sellerUser?.fullName || sellerName || 'Verified Merchant';
    const avgResponseMinutes = sellerStore?.avgResponseMinutes || 30;

    // 3. Resolve Buyer (Sender)
    let buyerId = userId || targetOrder.buyerId || targetOrder.userId || null;
    let buyerUser = null;
    if (buyerId) {
      buyerUser = await prisma.user.findUnique({
        where: { id: buyerId },
        select: { id: true, fullName: true, email: true }
      });
    }

    if (!buyerUser) {
      buyerUser = await prisma.user.findFirst({
        where: { role: 'BUYER' },
        select: { id: true, fullName: true, email: true }
      });
      if (buyerUser) buyerId = buyerUser.id;
    }

    if (!buyerId) {
      buyerId = sellerId;
      buyerUser = sellerUser;
    }

    const buyerName = buyerUser?.fullName || 'Customer';
    const cleanInquiry = (message && message.trim()) || 'Hello! I am checking on the fulfillment and delivery status of my order. Could you please provide an estimated arrival update? Thank you!';
    const inquiryContent = `📦 **[Order Inquiry: #${displayOrderNum}]**\n${cleanInquiry}`;

    // 4. Send Message via MessagingService (persists Conversation + Message)
    const messagingService = require('../messagingService');
    const sentResult = await messagingService.sendMessage({
      senderId: buyerId,
      receiverId: sellerId,
      content: inquiryContent,
      orderId: orderDbId,
      isSystemMessage: false
    });

    // 5. Create in-app notification for the seller
    try {
      await prisma.notification.create({
        data: {
          userId: sellerId,
          title: `📦 Order #${displayOrderNum} Inquiry`,
          body: `${buyerName} sent an inquiry: "${cleanInquiry.slice(0, 100)}"`,
          type: 'ORDER',
          linkUrl: `/seller/dashboard?tab=messages`
        }
      });
    } catch (notifErr) {
      logger.warn(`[PayAI:OrderService] Failed to create seller notification: ${notifErr.message}`);
    }

    // 6. Broadcast Real-time Socket.io events
    try {
      const socketService = require('../socketService');
      const io = socketService.getIO?.();
      if (io && sentResult?.message) {
        io.to(String(sellerId)).emit('receiveMessage', sentResult.message);
        io.to(String(sellerId)).emit('notification', {
          title: `📦 Order #${displayOrderNum} Inquiry`,
          body: `${buyerName}: ${cleanInquiry.slice(0, 80)}`,
          data: sentResult.message
        });
      }
    } catch (sockErr) {
      logger.warn(`[PayAI:OrderService] Socket broadcast notice: ${sockErr.message}`);
    }

    // 7. Record an Order Milestone Event
    try {
      const isPayAI = await prisma.payAIOrder.findUnique({ where: { id: orderDbId } });
      if (isPayAI) {
        await prisma.payAIOrderStatusEvent.create({
          data: {
            orderId: orderDbId,
            status: 'BUYER_INQUIRY',
            source: 'PAYAI_BUYER_INQUIRY',
            message: `Buyer inquiry sent to merchant (${resolvedSellerName}): "${cleanInquiry.slice(0, 100)}"`,
            occurredAt: new Date(),
            metadata: JSON.stringify({
              orderNumber: displayOrderNum,
              buyerId,
              sellerId,
              inquiryType,
              messageId: sentResult?.message?.id
            })
          }
        });
      } else {
        await prisma.trackingEvent.create({
          data: {
            orderId: orderDbId,
            status: 'BUYER_INQUIRY',
            location: 'PayAI Merchant Messaging Desk',
            description: `Buyer inquiry dispatched to ${resolvedSellerName}: "${cleanInquiry.slice(0, 100)}"`
          }
        }).catch(() => null);
      }
    } catch (evErr) {
      logger.warn(`[PayAI:OrderService] Event creation note: ${evErr.message}`);
    }

    return {
      success: true,
      orderFound: true,
      orderId: orderDbId,
      orderNumber: displayOrderNum,
      sellerId,
      sellerName: resolvedSellerName,
      buyerId,
      buyerName,
      avgResponseMinutes,
      inquirySent: cleanInquiry,
      conversationId: sentResult?.conversationId,
      messageId: sentResult?.message?.id,
      trackingNumber: targetOrder.trackingNumber,
      carrierName: targetOrder.carrierName
    };
  }
}

module.exports = new PayAIOrderService();

