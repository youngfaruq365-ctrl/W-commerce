'use strict';
const marketService = require('../../services/payai/marketService');
const catalogSearchService = require('../../services/payai/catalogSearchService');
const payaiOrchestrator = require('../../services/payai/payaiOrchestrator');
const pricingService = require('../../services/payai/pricingService');
const cartService = require('../../services/payai/cartService');
const paypalPaymentService = require('../../services/payai/paypalPaymentService');
const orderService = require('../../services/payai/orderService');
const globalStoreService = require('../../services/payai/globalStoreService');
const prisma = require('../../utils/prismaClient');
const logger = require('../../utils/logger');
const externalProductFetcher = require('../../services/payai/externalProductFetcher');
const sellerExternalSiteService = require('../../services/payai/sellerExternalSiteService');
const negotiationEngineService = require('../../services/payai/negotiationEngineService');

class PayAIController {
  // --- Markets ---
  async getMarkets(req, res) {
    const markets = await marketService.listMarkets();
    res.json({ success: true, markets });
  }

  async checkEligibility(req, res) {
    const { marketCode, sellerCountry, destinationCountry, category } = req.query;
    const result = marketService.validateEligibility({
      marketCode,
      sellerCountry,
      destinationCountry,
      category
    });
    res.json({ success: true, ...result });
  }

  // --- Catalog ---
  async searchCatalog(req, res) {
    const {
      marketCode = 'NIGERIA',
      query = '',
      category,
      provider,
      limit = 16,
      page = 1,
      destinationCountry = 'NG',
      minPrice,
      maxPrice
    } = req.body;

    const result = await catalogSearchService.search({
      marketCode,
      query,
      category,
      provider,
      limit,
      page,
      destinationCountry,
      minPrice,
      maxPrice
    });

    res.json({ success: true, ...result });
  }

  async compareOffers(req, res) {
    const { offers } = req.body;
    const result = await catalogSearchService.compareOffers(offers);
    res.json({ success: true, ...result });
  }

  async importExternalUrl(req, res) {
    const { url, destinationCountry = 'NG', targetCurrency = 'USD' } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, message: 'External product URL is required' });
    }
    try {
      let result;
      try {
        result = await globalStoreService.resolveAndImportProductUrl(url, {
          destinationCountry,
          targetCurrency,
          sellerId: req.user?.id || null
        });
      } catch (storeErr) {
        logger.warn(`[PayAI:Controller] globalStoreService error: ${storeErr.message}. Fallback to externalProductFetcher.`);
        const fetched = await externalProductFetcher.extractProductFromUrl(url);
        result = {
          success: true,
          platform: fetched.provider,
          externalProductId: fetched.externalProductId,
          product: fetched
        };
      }
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message || 'Failed to extract product from URL' });
    }
  }

  // --- PayAI Sessions & Chat ---
  async createSession(req, res) {
    const userId = req.user?.id || null;
    const { marketCode = 'INTERNATIONAL', destinationCountry = 'NG' } = req.body;

    const result = await payaiOrchestrator.createSession({
      userId,
      marketCode,
      destinationCountry
    });

    res.json({ success: true, ...result });
  }

  async getSession(req, res) {
    const { id } = req.params;
    const session = await payaiOrchestrator.getSession(id);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    // Isolation: If session is bound to a registered user, ensure only that user can view it
    const userId = req.user?.id || null;
    if (session.userId && userId && session.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized session access' });
    }
    // Bind anonymous session to newly authenticated user
    if (!session.userId && userId) {
      await prisma.payAISession.update({
        where: { id: session.id },
        data: { userId }
      }).catch(() => {});
      session.userId = userId;
    }

    res.json({ success: true, session });
  }

  async sendMessage(req, res) {
    const { id } = req.params;
    const message = req.body.message || req.body.content;
    const { productId, proposedPrice, actionType, quantity } = req.body;
    const userId = req.user?.id || null;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    const result = await payaiOrchestrator.handleUserMessage({
      sessionId: id,
      userId,
      userMessage: message,
      productId,
      proposedPrice,
      actionType,
      quantity
    });

    res.json({ success: true, ...result });
  }

  async executeToolAction(req, res) {
    const { id } = req.params;
    const { toolName, toolArgs } = req.body;
    const userId = req.user?.id || null;

    const session = await payaiOrchestrator.getSession(id);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    if (session.userId && userId && session.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized session access' });
    }

    const result = await payaiOrchestrator.executeTool({
      toolName,
      toolArgs,
      sessionId: id,
      userId,
      destinationCountry: session.destinationCountry,
      marketCode: session.marketCode
    });

    res.json({ success: true, toolName, result });
  }

  // --- Cart ---
  async getCart(req, res) {
    const userId = req.user?.id || null;
    const sessionId = req.query.sessionId || null;
    const cart = await cartService.getOrCreateCart({ userId, sessionId });
    res.json({ success: true, cart });
  }

  async addCartItem(req, res) {
    const userId = req.user?.id || null;
    const { sessionId, item } = req.body;
    const cart = await cartService.getOrCreateCart({ userId, sessionId });
    const updated = await cartService.addItem(cart.id, item);
    res.json({ success: true, cart: updated });
  }

  async removeCartItem(req, res) {
    const { id } = req.params;
    const { cartId } = req.body;
    const updated = await cartService.removeItem(cartId, id);
    res.json({ success: true, cart: updated });
  }

  async clearCart(req, res) {
    const { cartId } = req.body;
    const updated = await cartService.clearCart(cartId);
    res.json({ success: true, cart: updated });
  }

  // --- Quotes & Approvals ---
  async createQuote(req, res) {
    const userId = req.user?.id || null;
    const { cartId, items, marketCode = 'INTERNATIONAL', targetCurrency = 'USD' } = req.body;

    let quoteItems = items;
    if (!quoteItems || quoteItems.length === 0) {
      if (!cartId) return res.status(400).json({ success: false, message: 'Cart ID or items list is required.' });
      const cart = await cartService.getOrCreateCart({ userId, sessionId: cartId });
      quoteItems = cart.items;
    }

    if (!quoteItems || quoteItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Cannot generate a quote for an empty list of items.' });
    }

    const quote = await pricingService.createPriceQuote({
      userId,
      cartId,
      items: quoteItems,
      marketCode,
      targetCurrency
    });

    res.json({ success: true, quote });
  }

  async getQuote(req, res) {
    const { id } = req.params;
    const validation = await pricingService.validateQuote(id);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.reason });
    }
    res.json({ success: true, quote: validation.quote });
  }

  async approveQuote(req, res) {
    const { id } = req.params;
    const userId = req.user?.id || null;
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];

    const validation = await pricingService.validateQuote(id);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.reason });
    }
    const quote = validation.quote;

    // Check availability re-check before approval
    if (quote.cartId) {
      const stockCheck = await cartService.recheckCartAvailability(quote.cartId);
      if (!stockCheck.allAvailable) {
        return res.status(409).json({
          success: false,
          message: 'Item availability changed before approval.',
          issues: stockCheck.issues
        });
      }
    }

    // Record immutable customer approval
    const approval = await prisma.payAIPurchaseApproval.create({
      data: {
        userId,
        quoteId: quote.id,
        approvedTotal: quote.total,
        approvedCurrency: quote.currency,
        ipAddress: typeof ipAddress === 'string' ? ipAddress : JSON.stringify(ipAddress),
        userAgent,
        status: 'VALID'
      }
    });

    await prisma.payAIQuote.update({
      where: { id: quote.id },
      data: { status: 'APPROVED' }
    });

    await prisma.payAIAuditLog.create({
      data: {
        actorId: userId || 'anonymous',
        actorRole: 'BUYER',
        action: 'QUOTE_PURCHASE_APPROVED',
        entityType: 'PAYAI_QUOTE',
        entityId: quote.id,
        details: JSON.stringify({
          approvalId: approval.id,
          total: quote.total,
          currency: quote.currency
        })
      }
    });

    res.json({
      success: true,
      approvalId: approval.id,
      quoteId: quote.id,
      approvedTotal: Number(quote.total),
      currency: quote.currency,
      expiresAt: quote.expiresAt,
      message: 'Quote approved. Proceed to PayPal Sandbox checkout.'
    });
  }

  // --- Payments ---
  async createPayPalOrder(req, res) {
    const { quoteId, approvalId, returnUrl, cancelUrl, cartId, sessionId, amount, currency, items } = req.body;
    const userId = req.user?.id || null;

    try {
      const result = await paypalPaymentService.createPayPalOrder({
        quoteId,
        approvalId,
        userId,
        sessionId,
        returnUrl,
        cancelUrl,
        cartId,
        amount,
        currency,
        items
      });
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async capturePayPalOrder(req, res) {
    const { id } = req.params; // PayPal order ID
    const { internalOrderId, simulatedFailure, providerOrderId, sellerId, sessionId } = req.body;
    const effectiveOrderId = id || providerOrderId;

    try {
      const result = await paypalPaymentService.capturePayPalOrder({
        providerOrderId: effectiveOrderId,
        internalOrderId,
        sessionId,
        simulatedFailure: Boolean(simulatedFailure),
        sellerId
      });
      res.json({ success: result.success !== false, ...result });
    } catch (err) {
      logger.error(`[PayAI:Capture] Error capturing PayPal order ${effectiveOrderId}: ${err.message}`, { stack: err.stack });
      res.status(400).json({ success: false, message: err.message, error: err.message });
    }
  }

  async confirmReceipt(req, res) {
    const { id } = req.params;
    const { orderId, sellerId } = req.body;
    const effectiveOrderId = id || orderId;

    try {
      const result = await paypalPaymentService.releaseSellerPayout({
        orderId: effectiveOrderId,
        sellerId,
        triggerSource: 'BUYER_CONFIRMATION'
      });
      res.json({ success: true, ...result });
    } catch (err) {
      logger.error(`[PayAI:ConfirmReceipt] Error confirming receipt for order ${effectiveOrderId}: ${err.message}`);
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async getExchangeRates(req, res) {
    const data = pricingService.getAllExchangeRates();
    res.json({ success: true, ...data });
  }

  async getPaymentStatus(req, res) {
    const { id } = req.params;
    const payment = await prisma.payAIPayment.findFirst({
      where: {
        OR: [
          { id },
          { providerOrderId: id },
          { providerCaptureId: id }
        ]
      },
      include: { order: true }
    });

    if (!payment) return res.status(404).json({ success: false, message: 'Payment record not found.' });

    res.json({
      success: true,
      payment: {
        id: payment.id,
        provider: payment.provider,
        amount: Number(payment.amount),
        currency: payment.currency,
        status: payment.status,
        verifiedAt: payment.verifiedAt,
        orderNumber: payment.order?.orderNumber
      }
    });
  }

  // --- Orders & Tracking & Lifecycle ---
  async listOrders(req, res) {
    const userId = req.user?.id || req.query.userId || null;
    const sessionId = req.query.sessionId || req.body?.sessionId || null;
    if (!userId && !sessionId) {
      return res.json({ success: true, orders: [] });
    }
    const orders = await orderService.listUserOrders(userId, sessionId);
    res.json({ success: true, orders });
  }

  async checkoutCart(req, res) {
    const userId = req.user?.id || null;
    const { sessionId, cartId, quoteId, shippingAddress, paymentProvider = 'PAYPAL', marketCode = 'INTERNATIONAL', currency = 'USD' } = req.body;
    try {
      const order = await orderService.placeOrder({
        userId,
        sessionId,
        cartId,
        quoteId,
        shippingAddress,
        paymentProvider,
        marketCode,
        currency
      });
      res.json({ success: true, order });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message, error: err.message });
    }
  }

  async getOrder(req, res) {
    const { id } = req.params;
    const userId = req.user?.id || null;
    const order = await orderService.getOrder(id, userId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    res.json({ success: true, order });
  }

  async trackOrder(req, res) {
    const { id } = req.params;
    const userId = req.user?.id || null;
    try {
      const tracking = await orderService.trackOrder(id, userId);
      if (!tracking.found) {
        return res.status(404).json({ success: false, message: tracking.message });
      }
      res.json({ success: true, tracking, ...tracking });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message, error: err.message });
    }
  }

  async cancelOrder(req, res) {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user?.id || 'BUYER';
    try {
      const result = await orderService.cancelOrder({ orderId: id, reason, actorId: userId });
      res.json({ success: true, order: result, ...result });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message, error: err.message });
    }
  }

  async requestReturn(req, res) {
    const { id } = req.params;
    const { reason, itemsToReturn } = req.body;
    const userId = req.user?.id || 'BUYER';
    try {
      const result = await orderService.requestReturn({
        orderId: id,
        reason,
        itemsToReturn,
        actorId: userId
      });
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message, error: err.message });
    }
  }

  async getOrderPolicy(req, res) {
    const { id } = req.params;
    try {
      const order = await orderService.getOrder(id);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
      const policy = await orderService.getOrderSellerPolicy(order);
      res.json({ success: true, policy });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message, error: err.message });
    }
  }

  // --- Webhooks ---
  async handlePayPalWebhook(req, res) {
    const event = req.body;
    const eventId = event?.id || `WH-${Date.now()}`;
    const eventType = event?.event_type;
    const resource = event?.resource;

    const result = await paypalPaymentService.processWebhookEvent({ eventId, eventType, resource });
    res.json({ success: true, ...result });
  }

  // --- Purpose 2: Global Store Linking & URL Resolution ---
  async resolveGlobalProductUrl(req, res) {
    const { url, destinationCountry = 'NG', targetCurrency = 'USD' } = req.body;
    const userId = req.user?.id || null;

    if (!url) {
      return res.status(400).json({ success: false, message: 'External product URL is required.' });
    }

    try {
      const result = await globalStoreService.resolveAndImportProductUrl(url, {
        destinationCountry,
        targetCurrency,
        sellerId: userId
      });
      res.json({ success: true, ...result });
    } catch (err) {
      logger.error(`[PayAI:Controller] URL resolution failed: ${err.message}`);
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async linkAndAddToCart(req, res) {
    const { url, destinationCountry = 'NG', targetCurrency = 'USD', sessionId } = req.body;
    const userId = req.user?.id || null;

    if (!url) {
      return res.status(400).json({ success: false, message: 'External product URL is required.' });
    }

    try {
      const resolved = await globalStoreService.resolveAndImportProductUrl(url, {
        destinationCountry,
        targetCurrency,
        sellerId: userId
      });

      const cart = await cartService.getOrCreateCart({ userId, sessionId });
      const updatedCart = await cartService.addItem(cart.id, resolved.cartItemPayload);

      res.json({
        success: true,
        product: resolved.product,
        landedCost: resolved.landedCost,
        cart: updatedCart
      });
    } catch (err) {
      logger.error(`[PayAI:Controller] Link & Add to Cart failed: ${err.message}`);
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async resolveStoreUrl(req, res) {
    const url = req.body.url || req.query.url;
    if (!url) {
      return res.status(400).json({ success: false, message: 'Store URL is required.' });
    }

    try {
      const result = await globalStoreService.resolveStoreUrl(url);
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async getSupportedPlatforms(req, res) {
    const platforms = globalStoreService.getSupportedPlatforms();
    res.json({ success: true, platforms });
  }

  // --- Seller Global Storefront Linking ---
  async getSellerLinkedStores(req, res) {
    const sellerId = req.user?.id || req.body?.sellerId || req.query?.sellerId;
    if (!sellerId) {
      return res.status(401).json({ success: false, message: 'Authentication required to retrieve linked stores.' });
    }

    try {
      const linkedStores = await globalStoreService.getSellerLinkedStores(sellerId);
      res.json({ success: true, linkedStores });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async linkSellerStore(req, res) {
    const sellerId = req.user?.id || req.body?.sellerId || req.query?.sellerId;
    if (!sellerId) {
      return res.status(401).json({ success: false, message: 'Authentication required to link a store.' });
    }

    const { platform, storeUrl, storeName, description, syncEnabled } = req.body;
    if (!storeUrl) {
      return res.status(400).json({ success: false, message: 'storeUrl is required.' });
    }

    try {
      const result = await globalStoreService.linkSellerStore(sellerId, {
        platform,
        storeUrl,
        storeName,
        description,
        syncEnabled
      });
      res.json({ success: true, ...result });
    } catch (err) {
      logger.error(`[PayAI:Controller] linkSellerStore error: ${err.message}`);
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async unlinkSellerStore(req, res) {
    const sellerId = req.user?.id || req.body?.sellerId || req.query?.sellerId;
    const { linkId } = req.params;

    if (!sellerId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    try {
      const result = await globalStoreService.unlinkSellerStore(sellerId, linkId);
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async getSellerLinkedStoreProducts(req, res) {
    const sellerId = req.user?.id || req.query.sellerId;
    const { linkId } = req.params;

    try {
      const result = await globalStoreService.getSellerLinkedStoreProducts(sellerId, linkId);
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  // --- Pro / Premium / Ultra External Site System ---
  async fetchSellerExternalProducts(req, res) {
    const body = req.body || {};
    const queryParams = req.query || {};
    const storeUrl = body.storeUrl || queryParams.storeUrl;
    if (!storeUrl) {
      return res.status(400).json({ success: false, message: 'External store URL is required.' });
    }

    try {
      const result = await sellerExternalSiteService.fetchProductsFromExternalUrl({
        storeUrl,
        query: body.query !== undefined ? body.query : queryParams.query,
        category: body.category !== undefined ? body.category : queryParams.category,
        minPrice: body.minPrice !== undefined ? body.minPrice : queryParams.minPrice,
        maxPrice: body.maxPrice !== undefined ? body.maxPrice : queryParams.maxPrice,
        limit: body.limit !== undefined ? body.limit : queryParams.limit,
        page: body.page !== undefined ? body.page : queryParams.page
      });
      res.json(result);
    } catch (err) {
      logger.error(`[PayAI:Controller] fetchSellerExternalProducts error: ${err.message}`);
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async submitSellerExternalProducts(req, res) {
    let sellerId = req.user?.id || req.body?.sellerId || req.query?.sellerId;
    if (!sellerId) {
      try {
        const fallbackStore = await prisma.store.findFirst({
          where: { portfolioConfig: { contains: 'globalStoreLinks' } }
        });
        if (fallbackStore) {
          sellerId = fallbackStore.sellerId;
        }
      } catch (e) {}
    }
    if (!sellerId) {
      return res.status(401).json({ success: false, message: 'Authentication required to submit products.' });
    }

    const {
      linkId,
      storeUrl,
      storeName,
      platform,
      description,
      bannerUrl,
      logoUrl,
      products,
      ownershipVerified,
      verificationMethod,
      verificationToken,
      verifiedAt
    } = req.body;
    if (!storeUrl) {
      return res.status(400).json({ success: false, message: 'storeUrl is required.' });
    }
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one product must be selected for submission.' });
    }

    try {
      const result = await sellerExternalSiteService.submitProductsToWCommerce({
        sellerId,
        linkId,
        storeUrl,
        storeName,
        platform,
        description,
        bannerUrl,
        logoUrl,
        products,
        ownershipVerified,
        verificationMethod,
        verificationToken,
        verifiedAt
      });
      res.json(result);
    } catch (err) {
      logger.error(`[PayAI:Controller] submitSellerExternalProducts error: ${err.message}`);
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async generateExternalSiteVerificationToken(req, res) {
    const sellerId = req.user?.id || req.body?.sellerId || 'seller-default';
    const storeUrl = req.body?.storeUrl || req.query?.storeUrl;
    if (!storeUrl) {
      return res.status(400).json({ success: false, message: 'storeUrl is required to generate an ownership verification token.' });
    }

    try {
      const result = sellerExternalSiteService.generateOwnershipToken({ sellerId, storeUrl });
      res.json(result);
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async verifyExternalSiteOwnership(req, res) {
    const sellerId = req.user?.id || req.body?.sellerId || 'seller-default';
    const { storeUrl, linkId, method, apiKeyOrToken } = req.body || {};
    if (!storeUrl) {
      return res.status(400).json({ success: false, message: 'storeUrl is required to verify store ownership.' });
    }

    try {
      const result = await sellerExternalSiteService.verifyStoreOwnership({
        sellerId,
        storeUrl,
        linkId,
        method,
        apiKeyOrToken
      });
      res.json(result);
    } catch (err) {
      logger.error(`[PayAI:Controller] verifyExternalSiteOwnership error: ${err.message}`);
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async getDiscoverableExternalStores(req, res) {
    try {
      const stores = await sellerExternalSiteService.getDiscoverableExternalStores();
      res.json({ success: true, stores });
    } catch (err) {
      logger.error(`[PayAI:Controller] getDiscoverableExternalStores error: ${err.message}`);
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async getExternalStoreShowcase(req, res) {
    const { storeId } = req.params;
    const { linkId } = req.query;
    try {
      const showcase = await sellerExternalSiteService.getExternalStoreShowcase(storeId, linkId);
      res.json(showcase);
    } catch (err) {
      logger.error(`[PayAI:Controller] getExternalStoreShowcase error: ${err.message}`);
      res.status(400).json({ success: false, message: err.message });
    }
  }

  // --- AI Sales Representative & Deterministic Negotiation Control Room ---
  async getSellerNegotiationSettings(req, res) {
    const sellerId = req.user?.id || req.query.sellerId;
    const { productId } = req.query;
    try {
      const result = await negotiationEngineService.getSellerNegotiationSettings(sellerId, productId);
      res.json(result);
    } catch (err) {
      logger.error(`[PayAI:Controller] getSellerNegotiationSettings error: ${err.message}`);
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async updateSellerNegotiationSettings(req, res) {
    const sellerId = req.user?.id || req.body.sellerId;
    if (!sellerId) {
      return res.status(401).json({ success: false, message: 'Authentication required to update seller negotiation rules.' });
    }
    try {
      const result = await negotiationEngineService.updateSellerNegotiationSettings(sellerId, req.body);
      res.json(result);
    } catch (err) {
      logger.error(`[PayAI:Controller] updateSellerNegotiationSettings error: ${err.message}`);
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async previewDeterministicOffers(req, res) {
    try {
      const { originalPrice = 10000, currency = 'NGN', quantity = 1, rules = {} } = req.body;
      const preview = negotiationEngineService.calculateDeterministicOffers({
        originalPrice,
        currency,
        quantity,
        rules
      });
      res.json({ success: true, preview });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async negotiateTurn(req, res) {
    try {
      const userId = req.user?.id || req.body.userId || null;
      const result = await negotiationEngineService.negotiateTurn({
        ...req.body,
        userId
      });
      res.json(result);
    } catch (err) {
      logger.error(`[PayAI:Controller] negotiateTurn error: ${err.message}`);
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async compareEquivalentProducts(req, res) {
    try {
      const comparisons = await negotiationEngineService.compareEquivalentProducts(req.body || {});
      res.json({ success: true, comparisons });
    } catch (err) {
      logger.error(`[PayAI:Controller] compareEquivalentProducts error: ${err.message}`);
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async quickChatSeller(req, res) {
    try {
      const buyerId = req.user?.id || req.body.buyerId || null;
      const result = await negotiationEngineService.checkSellerOnlineAndRelayChat({
        ...req.body,
        buyerId
      });
      res.json(result);
    } catch (err) {
      logger.error(`[PayAI:Controller] quickChatSeller error: ${err.message}`);
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async getBuyerWalletBalance(req, res) {
    try {
      const userId = req.user?.id || req.query.userId || null;
      const wallet = await negotiationEngineService.getBuyerWalletBalance(userId);
      res.json(wallet);
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async checkoutWithWallet(req, res) {
    try {
      const userId = req.user?.id || req.body.userId || null;
      const result = await negotiationEngineService.checkoutWithWallet({
        ...req.body,
        userId
      });
      res.json(result);
    } catch (err) {
      logger.error(`[PayAI:Controller] checkoutWithWallet error: ${err.message}`);
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async sendSellerCustomPriceLock(req, res) {
    try {
      const sellerId = req.user?.id || req.body.sellerId || 'seller-a';
      const result = await negotiationEngineService.sendSellerCustomPriceLock({
        ...req.body,
        sellerId
      });
      res.json(result);
    } catch (err) {
      logger.error(`[PayAI:Controller] sendSellerCustomPriceLock error: ${err.message}`);
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async requestWarehouseInspectionMedia(req, res) {
    try {
      const buyerId = req.user?.id || req.body.buyerId || null;
      const result = await negotiationEngineService.requestWarehouseInspectionMedia({
        ...req.body,
        buyerId
      });
      res.json(result);
    } catch (err) {
      logger.error(`[PayAI:Controller] requestWarehouseInspectionMedia error: ${err.message}`);
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async updateWarehouseMedia(req, res) {
    try {
      const sellerId = req.user?.id || req.body.sellerId || null;
      const result = await negotiationEngineService.updateWarehouseMedia({
        ...req.body,
        sellerId
      });
      res.json(result);
    } catch (err) {
      logger.error(`[PayAI:Controller] updateWarehouseMedia error: ${err.message}`);
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async getWarehouseMedia(req, res) {
    try {
      const { productId } = req.query;
      const key = productId ? String(productId) : null;
      const media = key
        ? (negotiationEngineService.warehouseMediaStore.get(key) || null)
        : Array.from(negotiationEngineService.warehouseMediaStore.values());
      res.json({
        success: true,
        media,
        requests: negotiationEngineService.warehouseInspectionRequests
      });
    } catch (err) {
      logger.error(`[PayAI:Controller] getWarehouseMedia error: ${err.message}`);
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async triggerPromoDropAlerts(req, res) {
    try {
      const triggered = await negotiationEngineService.triggerMatchingPromoAlerts(req.body || {});
      res.json({ success: true, count: triggered.length, triggeredAlerts: triggered });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async getBuyerLiveSellerPushes(req, res) {
    try {
      const result = await negotiationEngineService.getBuyerLiveSellerPushes(req.query || {});
      res.json(result);
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
}

module.exports = new PayAIController();

