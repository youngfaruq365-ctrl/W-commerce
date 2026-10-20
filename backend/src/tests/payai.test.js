'use strict';
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:../database/prisma/dev.db';
}

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');

const marketService = require('../services/payai/marketService');
const catalogSearchService = require('../services/payai/catalogSearchService');
const pricingService = require('../services/payai/pricingService');
const cartService = require('../services/payai/cartService');
const adapterRegistry = require('../services/payai/adapters/adapterRegistry');
const payaiOrchestrator = require('../services/payai/payaiOrchestrator');
const paypalPaymentService = require('../services/payai/paypalPaymentService');
const orderService = require('../services/payai/orderService');
const prisma = require('../utils/prismaClient');

describe('W-Commerce PayAI Comprehensive Test Suite', () => {

  describe('1. Markets & Eligibility', () => {
    test('Rule 1: Shop Nigeria lists default market with NGN currency', async () => {
      const markets = await marketService.listMarkets();
      const nigeria = markets.find(m => m.code === 'NIGERIA');
      assert.ok(nigeria, 'Shop Nigeria should exist');
      assert.equal(nigeria.displayCurrency, 'NGN');
      assert.equal(nigeria.countryCode, 'NG');
    });

    test('Rule 2: Shop International returns offers eligible for destination', async () => {
      const eligibility = marketService.validateEligibility({
        marketCode: 'INTERNATIONAL',
        sellerCountry: 'US',
        destinationCountry: 'NG',
        category: 'electronics'
      });
      assert.equal(eligibility.eligible, true);
      assert.equal(eligibility.marketCode, 'INTERNATIONAL');
    });

    test('Rule 3: Unsupported/sanctioned destinations cannot be purchased', () => {
      const sanctioned = marketService.validateEligibility({
        marketCode: 'INTERNATIONAL',
        sellerCountry: 'US',
        destinationCountry: 'KP', // North Korea
        category: 'electronics'
      });
      assert.equal(sanctioned.eligible, false);
      assert.match(sanctioned.reason, /restricted/i);
    });

    test('Rule 4: Prohibited dangerous goods are rejected', () => {
      const prohibited = marketService.validateEligibility({
        marketCode: 'INTERNATIONAL',
        sellerCountry: 'US',
        destinationCountry: 'NG',
        category: 'weapons'
      });
      assert.equal(prohibited.eligible, false);
      assert.match(prohibited.reason, /prohibited/i);
    });
  });

  describe('2. Catalog & External Seller Adapters', () => {
    test('Rule 5: SSRF protection blocks non-allowlisted seller domains', () => {
      assert.equal(adapterRegistry.isDomainAllowed('https://www.amazon.com/dp/123'), true);
      assert.equal(adapterRegistry.isDomainAllowed('https://www.aliexpress.com/item/456'), true);
      assert.equal(adapterRegistry.isDomainAllowed('https://www.ebay.com/itm/789'), true);
      assert.equal(adapterRegistry.isDomainAllowed('http://malicious-internal-server:8080'), false);
      assert.equal(adapterRegistry.isDomainAllowed('https://evil-phishing-site.com'), false);
    });

    test('Rule 6: Adapter capabilities contract is respected', () => {
      const amazon = adapterRegistry.getAdapter('amazon');
      assert.equal(amazon.getCapabilities().negotiatePrice, false, 'Amazon retail must not support haggling');

      const ali = adapterRegistry.getAdapter('aliexpress');
      assert.equal(ali.getCapabilities().negotiatePrice, true, 'AliExpress supports volume/coupon negotiation');
    });

    test('Rule 7: Price negotiation is shown as successful ONLY after seller confirmation', async () => {
      const amazon = adapterRegistry.getAdapter('amazon');
      const amazonResult = await amazon.negotiatePrice({ externalProductId: 'amz-b0c14v5q32', requestedDiscountPct: 15 });
      assert.equal(amazonResult.confirmed, false, 'Amazon negotiation must not be confirmed');

      const ali = adapterRegistry.getAdapter('aliexpress');
      const aliResult = await ali.negotiatePrice({ externalProductId: 'ali-1005006281923', requestedDiscountPct: 10 });
      assert.equal(aliResult.confirmed, true, 'AliExpress volume negotiation confirmed by seller rule');
      assert.ok(aliResult.newPrice < aliResult.originalPrice, 'New price must be discounted');
    });
  });

  describe('3. Pricing, Landed Costs & Quotes', () => {
    test('Rule 8: Unavailable exchange rates throw error without fabricating numbers', () => {
      assert.throws(() => {
        pricingService.convertCurrency(100, 'XYZ', 'NGN');
      }, /unavailable/i);
    });

    test('Rule 9: Landed cost includes transparent breakdown of shipping, customs and VAT', () => {
      const mockItems = [
        { title: 'Test Headphones', price: 100.00, currency: 'USD', quantity: 1, category: 'electronics', weightKg: 0.8 }
      ];
      const landed = pricingService.calculateLandedCost({ items: mockItems, destinationCountry: 'NG' });

      assert.equal(landed.currency, 'USD');
      assert.equal(landed.subtotal, 100.00);
      assert.ok(landed.shipping > 0, 'Shipping must be calculated');
      assert.equal(landed.duties, 5.00, 'Electronics duty should be 5% = $5');
      assert.ok(landed.taxes > 0, 'VAT must be calculated');
      assert.ok(landed.total > landed.subtotal, 'Total landed cost must be greater than item subtotal');
    });

    test('Rule 10: Unknown tariff categories are clearly flagged as uncertain estimates', () => {
      const mockItems = [
        { title: 'Mystery Item', price: 50.00, currency: 'USD', quantity: 1, category: 'unknown_niche_gadget', weightKg: 0.5 }
      ];
      const landed = pricingService.calculateLandedCost({ items: mockItems, destinationCountry: 'NG' });
      assert.equal(landed.hasUncertainDuties, true);
      assert.match(landed.disclaimer, /estimates/i);
    });

    test('Rule 11: Quotes expire after 15 minutes and reject checkout', async () => {
      const testQuote = await prisma.payAIQuote.create({
        data: {
          quoteNumber: `TEST-EXP-${Date.now()}`,
          subtotal: 100,
          shipping: 20,
          total: 120,
          breakdown: '{}',
          itemsSnapshot: '[]',
          status: 'ACTIVE',
          expiresAt: new Date(Date.now() - 5000) // 5 seconds in the past
        }
      });

      const validation = await pricingService.validateQuote(testQuote.id);
      assert.equal(validation.valid, false);
      assert.match(validation.reason, /expired/i);
    });
  });

  describe('4. Cart & Purchase Approval', () => {
    test('Rule 12: Changing markets does NOT mutate an existing cart', async () => {
      const cart = await cartService.getOrCreateCart({ sessionId: 'test-session-1', marketCode: 'INTERNATIONAL' });
      await cartService.clearCart(cart.id);
      const updatedCart = await cartService.addItem(cart.id, {
        provider: 'w-commerce',
        productId: 'wcom-sony-headphones-12',
        title: 'Sony Headphones',
        price: 348.00,
        currency: 'USD',
        quantity: 1
      });

      assert.equal(updatedCart.items.length, 1);
      assert.equal(updatedCart.marketCode, 'INTERNATIONAL');

      // Now query local market without touching the cart
      const localResult = await catalogSearchService.search({ marketCode: 'NIGERIA' });
      assert.equal(localResult.marketCode, 'NIGERIA');

      // Verify the international cart is completely preserved
      const fetchedCart = await cartService.getOrCreateCart({ sessionId: 'test-session-1' });
      assert.equal(fetchedCart.items.length, 1);
      assert.equal(fetchedCart.items[0].price, 348.00);
    });

    test('Rule 12b: External items cannot be added to PayAI cart (Strict W-Commerce Enforcement)', async () => {
      const cart = await cartService.getOrCreateCart({ sessionId: 'test-strict-wcommerce-cart' });
      await cartService.clearCart(cart.id);

      // Reject Amazon items
      await assert.rejects(async () => {
        await cartService.addItem(cart.id, {
          provider: 'amazon',
          externalOfferId: 'amz-b0bdhwdr12',
          title: 'Amazon Product',
          price: 99.00
        });
      }, /Only native W-Commerce products can be added to the PayAI Cart/i);

      // Reject AliExpress items
      await assert.rejects(async () => {
        await cartService.addItem(cart.id, {
          provider: 'aliexpress',
          externalOfferId: 'ali-100500',
          title: 'AliExpress Product',
          price: 29.00
        });
      }, /Only native W-Commerce products can be added to the PayAI Cart/i);

      // Reject eBay items
      await assert.rejects(async () => {
        await cartService.addItem(cart.id, {
          provider: 'ebay',
          externalOfferId: 'ebay-123',
          title: 'eBay Item',
          price: 49.00
        });
      }, /Only native W-Commerce products can be added to the PayAI Cart/i);

      // Reject ASOS items
      await assert.rejects(async () => {
        await cartService.addItem(cart.id, {
          provider: 'asos',
          externalOfferId: 'asos-456',
          title: 'ASOS Jacket',
          price: 79.00
        });
      }, /Only native W-Commerce products can be added to the PayAI Cart/i);

      // Reject any item with isExternal === true
      await assert.rejects(async () => {
        await cartService.addItem(cart.id, {
          provider: 'w-commerce',
          isExternal: true,
          title: 'External Linked Product',
          price: 60.00
        });
      }, /Only native W-Commerce products can be added to the PayAI Cart/i);

      // Add valid native W-Commerce product
      const validCart = await cartService.addItem(cart.id, {
        provider: 'w-commerce',
        productId: 'prod-wcom-strict-001',
        title: 'Native Handcrafted Ankara Bag',
        price: 35000,
        currency: 'NGN',
        quantity: 1,
        sellerId: 'seller-strict-001',
        storeId: 'store-strict-001',
        sellerName: 'Lagos Heritage Craft'
      });

      assert.equal(validCart.items.length, 1);
      const item = validCart.items[0];
      assert.equal(item.provider, 'w-commerce');
      assert.equal(item.productId, 'prod-wcom-strict-001');
      assert.equal(item.title, 'Native Handcrafted Ankara Bag');
      assert.equal(item.price, 35000);
      assert.equal(item.currency, 'NGN');
      assert.equal(item.sellerName, 'Lagos Heritage Craft');
      assert.equal(item.sellerId, 'seller-strict-001');
    });

    test('Rule 13: PayPal order requires explicit prior customer approval', async () => {
      // Create fresh quote WITHOUT approval
      const quote = await pricingService.createPriceQuote({
        items: [{ title: 'Item 1', price: 80, currency: 'USD', quantity: 1, category: 'electronics' }],
        marketCode: 'INTERNATIONAL'
      });

      await assert.rejects(async () => {
        await paypalPaymentService.createPayPalOrder({ quoteId: quote.id });
      }, /approval is required/i);
    });
  });

  describe('5. Payments, PayPal Sandbox & Orders', () => {
    test('Rule 14: Valid PayPal Sandbox order creation and server-side capture', async () => {
      // 1. Create Quote
      const quote = await pricingService.createPriceQuote({
        items: [{ title: 'Logitech Mouse', price: 99.99, currency: 'USD', quantity: 1, category: 'electronics' }]
      });

      // 2. Customer Approves
      const approval = await prisma.payAIPurchaseApproval.create({
        data: {
          quoteId: quote.id,
          approvedTotal: quote.total,
          approvedCurrency: quote.currency,
          status: 'VALID'
        }
      });

      // 3. Create PayPal Order
      const paypalOrder = await paypalPaymentService.createPayPalOrder({
        quoteId: quote.id,
        approvalId: approval.id
      });

      assert.ok(paypalOrder.providerOrderId);
      assert.equal(paypalOrder.amount, Number(quote.total));
      assert.equal(paypalOrder.currency, 'USD');

      // 4. Capture PayPal Order
      const capture = await paypalPaymentService.capturePayPalOrder({
        providerOrderId: paypalOrder.providerOrderId,
        internalOrderId: paypalOrder.orderId
      });

      assert.equal(capture.success, true);
      assert.equal(capture.paymentStatus, 'VERIFIED');
      assert.equal(capture.fulfillmentStatus, 'CONFIRMED');
      assert.ok(capture.trackingNumber);
    });

    test('Rule 15: Duplicate capture attempts do not create duplicate payments (Idempotency)', async () => {
      const quote = await pricingService.createPriceQuote({
        items: [{ title: 'Cable', price: 10, currency: 'USD', quantity: 1, category: 'electronics' }]
      });
      await prisma.payAIPurchaseApproval.create({
        data: { quoteId: quote.id, approvedTotal: quote.total, approvedCurrency: 'USD' }
      });
      const paypalOrder = await paypalPaymentService.createPayPalOrder({ quoteId: quote.id });

      // First capture
      const cap1 = await paypalPaymentService.capturePayPalOrder({ providerOrderId: paypalOrder.providerOrderId });
      assert.equal(cap1.success, true);

      // Second capture with exact same ID
      const cap2 = await paypalPaymentService.capturePayPalOrder({ providerOrderId: paypalOrder.providerOrderId });
      assert.equal(cap2.success, true);
      assert.equal(cap2.alreadyCaptured, true, 'Second capture must return idempotent success');
    });

    test('Rule 16: Duplicate webhook events are discarded', async () => {
      const eventId = `WH-TEST-${Date.now()}`;
      const res1 = await paypalPaymentService.processWebhookEvent({ eventId, eventType: 'CHECKOUT.ORDER.APPROVED' });
      assert.equal(res1.processed, true);

      const res2 = await paypalPaymentService.processWebhookEvent({ eventId, eventType: 'CHECKOUT.ORDER.APPROVED' });
      assert.equal(res2.duplicate, true);
    });

    test('Rule 17: Failed or cancelled checkouts do not mark order as paid', async () => {
      const quote = await pricingService.createPriceQuote({
        items: [{ title: 'Failed Item', price: 50, currency: 'USD', quantity: 1, category: 'electronics' }]
      });
      await prisma.payAIPurchaseApproval.create({
        data: { quoteId: quote.id, approvedTotal: quote.total, approvedCurrency: 'USD' }
      });
      const paypalOrder = await paypalPaymentService.createPayPalOrder({ quoteId: quote.id });

      const failedCapture = await paypalPaymentService.capturePayPalOrder({
        providerOrderId: paypalOrder.providerOrderId,
        simulatedFailure: true
      });

      assert.equal(failedCapture.success, false);
      const order = await orderService.getOrder(paypalOrder.orderId);
      assert.notEqual(order.paymentStatus, 'VERIFIED');
      assert.equal(order.paymentStatus, 'FAILED');
    });

    test('Rule 18: Order cancellation updates fulfillment and refund state machine', async () => {
      const quote = await pricingService.createPriceQuote({
        items: [{ title: 'Item to cancel', price: 40, currency: 'USD', quantity: 1, category: 'electronics' }]
      });
      await prisma.payAIPurchaseApproval.create({
        data: { quoteId: quote.id, approvedTotal: quote.total, approvedCurrency: 'USD' }
      });
      const paypalOrder = await paypalPaymentService.createPayPalOrder({ quoteId: quote.id });
      await paypalPaymentService.capturePayPalOrder({ providerOrderId: paypalOrder.providerOrderId });

      const cancelled = await orderService.cancelOrder({
        orderId: paypalOrder.orderId,
        reason: 'Customer changed mind before dispatch'
      });

      assert.equal(cancelled.fulfillmentStatus, 'CANCELLED');
      assert.equal(cancelled.paymentStatus, 'REFUNDED');
    });

    test('Rule 19: Audit log is created for all consequential actions', async () => {
      const logs = await prisma.payAIAuditLog.findMany({
        where: { action: 'PAYMENT_CAPTURED_VERIFIED' }
      });
      assert.ok(logs.length > 0, 'Audit logs must be written for verified captures');
    });

    test('Rule 20: AI tools cannot execute unauthorized purchases without approval', async () => {
      await assert.rejects(async () => {
        await payaiOrchestrator.executeTool({
          toolName: 'execute_unauthorized_payment',
          toolArgs: { amount: 500 }
        });
      }, /not in the approved/i);
    });
  });

  describe('6. Orders, Tracking, Returns & Cancellations Specialist Suite', () => {
    test('Rule 21: Direct cart checkout places an order with snapshots, tracking, and delivery estimate', async () => {
      const sessionResult = await payaiOrchestrator.createSession({ marketCode: 'INTERNATIONAL', destinationCountry: 'NG' });
      const sessionId = sessionResult.session.id;

      const cart = await cartService.getOrCreateCart({ sessionId, marketCode: 'INTERNATIONAL' });
      await cartService.addItem(cart.id, {
        provider: 'w-commerce',
        productId: 'wcom-sony-xm5',
        title: 'Sony WH-1000XM5 Wireless Headphones',
        price: 348.00,
        currency: 'USD',
        quantity: 1,
        sellerName: 'Amazon Export Store',
        originCountry: 'US'
      });

      const shippingAddress = {
        recipientName: 'Adebayo Johnson',
        streetAddress: '24 Adeola Odeku Street, Victoria Island',
        city: 'Lagos',
        state: 'Lagos State',
        postalCode: '101241',
        country: 'NG',
        phone: '+234 802 345 6789'
      };

      const placedOrder = await orderService.placeOrder({
        sessionId,
        cartId: cart.id,
        shippingAddress,
        marketCode: 'INTERNATIONAL',
        currency: 'USD'
      });

      assert.ok(placedOrder.id, 'Order must have an ID');
      assert.match(placedOrder.orderNumber, /^W-INT-/, 'International order number must start with W-INT-');
      assert.match(placedOrder.trackingNumber, /^W-INT-/, 'International tracking number must start with W-INT-');
      assert.ok(placedOrder.carrierName, 'Order must have a carrier assigned');
      assert.ok(placedOrder.estimatedDelivery, 'Order must have estimated delivery date');
      assert.equal(placedOrder.items.length, 1);
      assert.equal(placedOrder.items[0].title, 'Sony WH-1000XM5 Wireless Headphones');
      assert.equal(placedOrder.items[0].sellerStore, 'Amazon Export Store');
      assert.equal(placedOrder.shippingAddress.recipientName, 'Adebayo Johnson');

      const cartAfter = await cartService.getOrCreateCart({ sessionId });
      assert.equal(cartAfter.items.length, 0, 'Cart must be emptied upon successful checkout');
    });

    test('Rule 21b: Direct domestic cart checkout generates W-DOM order & tracking numbers with local courier', async () => {
      const sessionResult = await payaiOrchestrator.createSession({ marketCode: 'NIGERIA', destinationCountry: 'NG' });
      const sessionId = sessionResult.session.id;

      const cart = await cartService.getOrCreateCart({ sessionId, marketCode: 'NIGERIA', currency: 'NGN' });
      await cartService.addItem(cart.id, {
        provider: 'w-commerce',
        productId: 'wcom-ankara-set',
        title: 'Ankara Fabric Set',
        price: 15000,
        currency: 'NGN',
        quantity: 2,
        sellerName: 'Lagos Textiles Hub'
      });

      const placedOrder = await orderService.placeOrder({
        sessionId,
        cartId: cart.id,
        marketCode: 'NIGERIA',
        currency: 'NGN'
      });

      assert.match(placedOrder.orderNumber, /^W-DOM-/, 'Domestic order number must start with W-DOM-');
      assert.match(placedOrder.trackingNumber, /^W-DOM-/, 'Domestic tracking number must start with W-DOM-');
      assert.equal(placedOrder.carrierName, 'GIG Logistics / Red Star Express');
      assert.equal(placedOrder.items[0].sellerStore, 'Lagos Textiles Hub');
    });

    test('Rule 22: Order Tracking in PayAI chat detects intent and returns rich 7-stage tracking details', async () => {
      const sessionResult = await payaiOrchestrator.createSession({ destinationCountry: 'NG' });
      const sessionId = sessionResult.session.id;

      const cart = await cartService.getOrCreateCart({ sessionId });
      await cartService.addItem(cart.id, {
        provider: 'w-commerce',
        productId: 'wcom-kindle-pw',
        title: 'Kindle Paperwhite',
        price: 139.99,
        quantity: 1
      });

      const order = await orderService.placeOrder({
        sessionId,
        cartId: cart.id,
        shippingAddress: { city: 'Lagos', country: 'NG' }
      });

      // Conversational query with "#" and exact "Where is order #W-INT-..."
      const chatResponse = await payaiOrchestrator.handleUserMessage({
        sessionId,
        userMessage: `Where is order #${order.orderNumber}?`
      });

      assert.equal(chatResponse.toolCall.toolName, 'track_order', 'Intent should route to track_order');
      assert.equal(chatResponse.toolCall.result.found, true);
      assert.equal(chatResponse.toolCall.result.orderNumber, order.orderNumber);
      assert.ok(chatResponse.toolCall.result.carrierName);
      assert.ok(chatResponse.toolCall.result.trackingNumber);
      assert.ok(chatResponse.toolCall.result.currentMilestone);
      assert.ok(chatResponse.toolCall.result.originHub);
      assert.ok(chatResponse.toolCall.result.destinationHub);
      assert.equal(chatResponse.toolCall.result.checkpoints.length, 7, 'Must have complete 7-stage checkpoint timeline');
      assert.equal(chatResponse.toolCall.result.checkpoints[0].stage, 1);
      assert.equal(chatResponse.toolCall.result.checkpoints[6].stage, 7);
      assert.match(chatResponse.message.content, /7-Stage Checkpoint Timeline/i);
    });

    test('Rule 23: Direct tracking service provides origin hub, destination hub, and checkpoints', async () => {
      const cart = await cartService.getOrCreateCart({ sessionId: 'tracking-test-session' });
      await cartService.addItem(cart.id, {
        provider: 'w-commerce',
        productId: 'wcom-usbc-hub',
        title: 'USB-C Fast Hub',
        price: 25.00,
        originCountry: 'CN'
      });

      const order = await orderService.placeOrder({
        sessionId: 'tracking-test-session',
        cartId: cart.id
      });

      const tracking = await orderService.trackOrder(order.orderNumber);
      assert.equal(tracking.found, true);
      assert.match(tracking.originHub, /Shenzhen|China/i, 'AliExpress items should originate from China hub');
      assert.match(tracking.destinationHub, /Lagos|Air/i);
      assert.equal(tracking.checkpoints.length, 7, 'Must provide 7-stage checkpoints');
      assert.ok(tracking.estimatedDeliveryDate);
    });

    test('Rule 24: Pre-shipping cancellation within seller window cancels order and initiates refund', async () => {
      const quote = await pricingService.createPriceQuote({
        items: [{ title: 'Bluetooth Speaker', price: 65, currency: 'USD', quantity: 1, category: 'electronics' }]
      });
      await prisma.payAIPurchaseApproval.create({
        data: { quoteId: quote.id, approvedTotal: quote.total, approvedCurrency: 'USD' }
      });
      const paypalOrder = await paypalPaymentService.createPayPalOrder({ quoteId: quote.id });
      await paypalPaymentService.capturePayPalOrder({ providerOrderId: paypalOrder.providerOrderId });

      const cancelResult = await orderService.cancelOrder({
        orderId: paypalOrder.orderId,
        reason: 'Customer no longer requires item'
      });

      assert.equal(cancelResult.fulfillmentStatus, 'CANCELLED');
      assert.equal(cancelResult.paymentStatus, 'REFUNDED');
      assert.equal(cancelResult.refundIssued, true);

      const orderAfter = await orderService.getOrder(paypalOrder.orderId);
      const cancelEvent = orderAfter.events.find(e => e.status === 'CANCELLED');
      assert.ok(cancelEvent, 'Cancellation event must be recorded');
      const refundEvent = orderAfter.events.find(e => e.status === 'REFUNDED');
      assert.ok(refundEvent, 'Refund event must be recorded');
    });

    test('Rule 25: Order cancellation is rejected if order has already shipped', async () => {
      const quote = await pricingService.createPriceQuote({
        items: [{ title: 'Dispatched Drone', price: 299, currency: 'USD', quantity: 1, category: 'electronics' }]
      });
      await prisma.payAIPurchaseApproval.create({
        data: { quoteId: quote.id, approvedTotal: quote.total, approvedCurrency: 'USD' }
      });
      const paypalOrder = await paypalPaymentService.createPayPalOrder({ quoteId: quote.id });
      await paypalPaymentService.capturePayPalOrder({ providerOrderId: paypalOrder.providerOrderId });

      await orderService.updateFulfillmentStatus({
        orderId: paypalOrder.orderId,
        newStatus: 'PROCESSING',
        message: 'Packaging finished'
      });
      await orderService.updateFulfillmentStatus({
        orderId: paypalOrder.orderId,
        newStatus: 'SHIPPED',
        message: 'Air freight departed'
      });

      await assert.rejects(async () => {
        await orderService.cancelOrder({
          orderId: paypalOrder.orderId,
          reason: 'Try to cancel after dispatch'
        });
      }, /Cannot cancel order.*SHIPPED/i);
    });

    test('Rule 26: Order Return is rejected if order is not delivered', async () => {
      const quote = await pricingService.createPriceQuote({
        items: [{ title: 'Running Shoes', price: 90, currency: 'USD', quantity: 1, category: 'fashion' }]
      });
      await prisma.payAIPurchaseApproval.create({
        data: { quoteId: quote.id, approvedTotal: quote.total, approvedCurrency: 'USD' }
      });
      const paypalOrder = await paypalPaymentService.createPayPalOrder({ quoteId: quote.id });
      await paypalPaymentService.capturePayPalOrder({ providerOrderId: paypalOrder.providerOrderId });

      await assert.rejects(async () => {
        await orderService.requestReturn({
          orderId: paypalOrder.orderId,
          reason: 'Too small'
        });
      }, /Returns can only be requested for DELIVERED orders|not shipped yet/i);
    });

    test('Rule 27: Delivered order within return window generates RMA authorization and logs in DB', async () => {
      const quote = await pricingService.createPriceQuote({
        items: [{ title: 'Mechanical Keyboard', price: 120, currency: 'USD', quantity: 1, category: 'electronics' }]
      });
      await prisma.payAIPurchaseApproval.create({
        data: { quoteId: quote.id, approvedTotal: quote.total, approvedCurrency: 'USD' }
      });
      const paypalOrder = await paypalPaymentService.createPayPalOrder({ quoteId: quote.id });
      await paypalPaymentService.capturePayPalOrder({ providerOrderId: paypalOrder.providerOrderId });

      await orderService.updateFulfillmentStatus({ orderId: paypalOrder.orderId, newStatus: 'PROCESSING' });
      await orderService.updateFulfillmentStatus({ orderId: paypalOrder.orderId, newStatus: 'SHIPPED' });
      await orderService.updateFulfillmentStatus({ orderId: paypalOrder.orderId, newStatus: 'DELIVERED' });

      const returnResult = await orderService.requestReturn({
        orderId: paypalOrder.orderId,
        reason: 'Key switch defect'
      });

      assert.equal(returnResult.success, true);
      assert.match(returnResult.rmaNumber, /^RMA-W-INT-/, 'RMA number must start with RMA-W-INT-');
      assert.equal(returnResult.status, 'RETURN_REQUESTED');
      assert.ok(returnResult.estimatedRefundAmount > 0);
      assert.ok(returnResult.returnInstructions);

      const order = await orderService.getOrder(paypalOrder.orderId);
      assert.equal(order.fulfillmentStatus, 'RETURN_REQUESTED');
      const rmaEvent = order.events.find(e => e.status === 'RETURN_REQUESTED');
      assert.ok(rmaEvent, 'RETURN_REQUESTED event must exist in DB');
    });

    test('Rule 28: Seller return and cancellation policies are strictly enforced from store.portfolioConfig', async () => {
      const uniqueSellerId = `test-seller-${Date.now()}`;
      await prisma.user.create({
        data: {
          id: uniqueSellerId,
          email: `seller-${Date.now()}@example.com`,
          fullName: 'Artisan Seller',
          passwordHash: 'hashed',
          role: 'SELLER'
        }
      });

      const store = await prisma.store.create({
        data: {
          sellerId: uniqueSellerId,
          storeName: `Strict Policy Store ${Date.now()}`,
          country: 'NG',
          portfolioConfig: JSON.stringify({
            allowReturns: false,
            returnPolicyDays: 7,
            cancellationWindowHours: 2,
            returnPolicy: 'Custom artisanal goods are strictly non-returnable.',
            cancellationPolicy: 'Cancellations only allowed within 2 hours of purchase.'
          })
        }
      });

      // Test 1: Return rejected when allowReturns = false
      const orderDelivered = await prisma.payAIOrder.create({
        data: {
          orderNumber: `W-LOC-TEST-${Date.now()}`,
          subtotal: 50,
          shippingCost: 5,
          grandTotal: 55,
          paymentProvider: 'PAYPAL',
          paymentStatus: 'VERIFIED',
          fulfillmentStatus: 'DELIVERED',
          itemsSnapshot: JSON.stringify([{
            title: 'Custom Wooden Bowl',
            price: 50,
            quantity: 1,
            storeId: store.id,
            sellerName: store.storeName
          }])
        }
      });

      await assert.rejects(async () => {
        await orderService.requestReturn({
          orderId: orderDelivered.id,
          reason: 'Decided I do not like the wood finish'
        });
      }, /does not accept returns/i);

      // Test 2: Cancellation rejected when outside seller's cancellationWindowHours
      const orderPastWindow = await prisma.payAIOrder.create({
        data: {
          orderNumber: `W-DOM-TEST-EXPIRED-${Date.now()}`,
          subtotal: 75,
          shippingCost: 5,
          grandTotal: 80,
          paymentProvider: 'PAYPAL',
          paymentStatus: 'AWAITING_PAYMENT',
          fulfillmentStatus: 'CONFIRMED',
          createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago (past 2-hour window)
          itemsSnapshot: JSON.stringify([{
            title: 'Custom Wooden Table',
            price: 75,
            quantity: 1,
            storeId: store.id,
            sellerName: store.storeName
          }])
        }
      });

      await assert.rejects(async () => {
        await orderService.cancelOrder({
          orderId: orderPastWindow.id,
          reason: 'Customer wants to cancel after window'
        });
      }, /cancellation window of 2 hours has expired/i);
    });

    test('Rule 29: Conversational PayAI Chat handles return, cancellation, and tracking requests', async () => {
      const sessionResult = await payaiOrchestrator.createSession({ destinationCountry: 'NG' });

      // 1. Cancel intent detection
      const cancelIntent = payaiOrchestrator._detectIntent('Please cancel my order #W-INT-998877 because I ordered the wrong model', sessionResult.session);
      assert.equal(cancelIntent.toolName, 'cancel_order');
      assert.equal(cancelIntent.toolArgs.orderId, 'W-INT-998877');

      // 2. Return intent detection
      const returnIntent = payaiOrchestrator._detectIntent('I need to return order #W-INT-554433 due to size issues', sessionResult.session);
      assert.equal(returnIntent.toolName, 'request_return');
      assert.equal(returnIntent.toolArgs.orderId, 'W-INT-554433');

      // 3. Tracking intent detection: "Where is order #W-INT-12345?"
      const trackIntent = payaiOrchestrator._detectIntent('Where is order #W-INT-12345?', sessionResult.session);
      assert.equal(trackIntent.toolName, 'track_order');
      assert.equal(trackIntent.toolArgs.orderId, 'W-INT-12345');

      // 4. Tracking intent detection without explicit ID: "Track my order"
      const trackMyOrderIntent = payaiOrchestrator._detectIntent('Track my order', sessionResult.session);
      assert.equal(trackMyOrderIntent.toolName, 'track_order');

      // 5. Domestic tracking intent: "Where is order W-DOM-776655"
      const trackDomesticIntent = payaiOrchestrator._detectIntent('Where is order W-DOM-776655', sessionResult.session);
      assert.equal(trackDomesticIntent.toolName, 'track_order');
      assert.equal(trackDomesticIntent.toolArgs.orderId, 'W-DOM-776655');
    });
  });

  describe('Purpose 1: PayPal USD Checkout, Dynamic Currency Conversion & Seller NGN Payout', () => {
    const orderController = require('../controllers/orderController');

    test('Rule 30: Pricing service supports dynamic exchange rates and configurable USD/NGN rates', () => {
      const defaultRate = pricingService.getExchangeRate('USD', 'NGN');
      assert.ok(defaultRate >= 1400, 'Default USD/NGN rate should be ~1480');

      // Update rate dynamically
      pricingService.setExchangeRate('USD', 'NGN', 1550.50);
      assert.equal(pricingService.getExchangeRate('USD', 'NGN'), 1550.50);

      // Verify dynamic conversion
      const converted = pricingService.convertCurrency(100, 'USD', 'NGN');
      assert.equal(converted, 155050.00);

      // Reset back to standard default
      pricingService.setExchangeRate('USD', 'NGN', 1480.00);
      assert.equal(pricingService.getExchangeRate('USD', 'NGN'), 1480.00);

      const allRates = pricingService.getAllExchangeRates();
      assert.ok(allRates.rates.USD_NGN);
      assert.ok(allRates.updatedAt);
    });

    test('Rule 31: Landed cost quotes clearly show both USD total and NGN equivalent', async () => {
      const items = [{ title: 'Smart Speaker', price: 120.00, currency: 'USD', quantity: 1, category: 'electronics' }];
      const quote = await pricingService.createPriceQuote({
        items,
        marketCode: 'INTERNATIONAL',
        targetCurrency: 'USD'
      });

      assert.equal(quote.currency, 'USD');
      assert.ok(quote.total > 120, 'Total landed cost should include shipping, duties and taxes');
      assert.ok(quote.totalUsd > 120);
      assert.ok(quote.totalNgn > 150000, 'NGN equivalent must be calculated');
      assert.equal(quote.totalNgn, quote.convertedTotal);

      // Validate quote preserves both figures
      const validation = await pricingService.validateQuote(quote.id);
      assert.equal(validation.valid, true);
      assert.equal(validation.quote.totalUsd, quote.totalUsd);
      assert.equal(validation.quote.totalNgn, quote.totalNgn);
      assert.equal(validation.quote.exchangeRate, 1480.00);
    });

    test('Rule 32: PayPal checkout generates valid USD orders and server-side capture holds escrow with calculated NGN payout', async () => {
      // 1. Create quote with seller
      const sellerId = `seller-test-${Date.now()}`;
      await prisma.user.create({
        data: {
          id: sellerId,
          email: `${sellerId}@test.local`,
          fullName: 'Test Electronic Seller',
          role: 'SELLER',
          passwordHash: 'hash-123'
        }
      });

      const quote = await pricingService.createPriceQuote({
        items: [{ title: 'Mechanical Keyboard', price: 100.00, currency: 'USD', quantity: 1, category: 'electronics', sellerId }]
      });

      // 2. Customer approves
      const approval = await prisma.payAIPurchaseApproval.create({
        data: {
          quoteId: quote.id,
          approvedTotal: quote.total,
          approvedCurrency: 'USD',
          status: 'VALID'
        }
      });

      // 3. Create PayPal Order in USD
      const paypalOrder = await paypalPaymentService.createPayPalOrder({
        quoteId: quote.id,
        approvalId: approval.id
      });
      assert.equal(paypalOrder.currency, 'USD');
      assert.ok(paypalOrder.providerOrderId);

      // 4. Capture PayPal Order
      const capture = await paypalPaymentService.capturePayPalOrder({
        providerOrderId: paypalOrder.providerOrderId,
        internalOrderId: paypalOrder.orderId,
        sellerId
      });

      assert.equal(capture.success, true);
      assert.equal(capture.paymentStatus, 'VERIFIED');
      assert.equal(capture.escrowStatus, 'HELD');
      assert.ok(capture.sellerPayoutNgn > 0, 'Seller payout in Naira must be calculated at purchase time');
      assert.equal(capture.exchangeRate, 1480.00);

      // Verify event logged
      const order = await prisma.payAIOrder.findUnique({
        where: { id: paypalOrder.orderId },
        include: { events: true, payments: true }
      });
      assert.equal(order.paymentStatus, 'VERIFIED');
      const verifiedEvent = order.events.find(e => e.source === 'PAYPAL_CAPTURE');
      assert.ok(verifiedEvent);
      assert.match(verifiedEvent.message, /Escrow locked: ₦/i);
    });

    test('Rule 33: Confirming delivery releases escrow, credits seller Wallet in NAIRA (NGN), and creates NGN Transaction', async () => {
      const sellerId = `seller-payout-${Date.now()}`;
      await prisma.user.create({
        data: {
          id: sellerId,
          email: `${sellerId}@test.local`,
          fullName: 'Test Gadget Merchant',
          role: 'SELLER',
          passwordHash: 'hash-123'
        }
      });

      // 1. Order setup & capture
      const quote = await pricingService.createPriceQuote({
        items: [{ title: 'Noise Cancelling Buds', price: 80.00, currency: 'USD', quantity: 1, category: 'electronics', sellerId }]
      });
      await prisma.payAIPurchaseApproval.create({
        data: { quoteId: quote.id, approvedTotal: quote.total, approvedCurrency: 'USD' }
      });
      const paypalOrder = await paypalPaymentService.createPayPalOrder({ quoteId: quote.id });
      const capture = await paypalPaymentService.capturePayPalOrder({
        providerOrderId: paypalOrder.providerOrderId,
        sellerId
      });

      const initialNgn = capture.sellerPayoutNgn;
      assert.ok(initialNgn > 0);

      // 2. Release seller payout upon order confirmation
      const payoutResult = await paypalPaymentService.releaseSellerPayout({
        orderId: paypalOrder.orderId,
        sellerId,
        triggerSource: 'BUYER_CONFIRMATION'
      });

      assert.equal(payoutResult.success, true);
      assert.equal(payoutResult.escrowStatus, 'RELEASED');
      assert.equal(payoutResult.currency, 'NGN');
      assert.equal(payoutResult.payoutAmountNgn, initialNgn);
      assert.ok(payoutResult.transactionId);

      // 3. Verify seller's Wallet was created/updated in NAIRA
      const wallet = await prisma.wallet.findUnique({ where: { userId: sellerId } });
      assert.ok(wallet);
      assert.equal(Number(wallet.gongAvailable), initialNgn);

      // 4. Verify Transaction record in NGN
      const tx = await prisma.transaction.findFirst({
        where: { referenceId: paypalOrder.orderNumber }
      });
      assert.ok(tx);
      assert.equal(tx.currency, 'NGN');
      assert.equal(tx.type, 'SELLER_PAYOUT');
      assert.equal(tx.status, 'COMPLETED');
      assert.equal(Number(tx.amount), initialNgn);

      // 5. Verify Notification was created
      const notif = await prisma.notification.findFirst({
        where: { userId: sellerId }
      });
      assert.ok(notif);
      assert.match(notif.body || notif.title, /Naira|NGN/i);

      // 6. Idempotent check: repeated release must not duplicate payouts
      const duplicatePayout = await paypalPaymentService.releaseSellerPayout({
        orderId: paypalOrder.orderId,
        sellerId
      });
      assert.equal(duplicatePayout.alreadyReleased, true);
      const walletAfter = await prisma.wallet.findUnique({ where: { userId: sellerId } });
      assert.equal(Number(walletAfter.gongAvailable), initialNgn, 'Wallet balance must not double');
    });

    test('Rule 34: orderController.confirmReceipt seamlessly releases PayAI order seller payout in Naira (NGN)', async () => {
      const buyerId = `buyer-test-${Date.now()}`;
      const sellerId = `seller-route-${Date.now()}`;
      await prisma.user.create({
        data: {
          id: buyerId,
          email: `${buyerId}@test.local`,
          fullName: 'Test Buyer',
          role: 'BUYER',
          passwordHash: 'hash-123'
        }
      });
      await prisma.user.create({
        data: {
          id: sellerId,
          email: `${sellerId}@test.local`,
          fullName: 'Test Route Merchant',
          role: 'SELLER',
          passwordHash: 'hash-123'
        }
      });

      const quote = await pricingService.createPriceQuote({
        userId: buyerId,
        items: [{ title: 'Studio Monitor', price: 150.00, currency: 'USD', quantity: 1, category: 'electronics', sellerId }]
      });
      await prisma.payAIPurchaseApproval.create({
        data: { userId: buyerId, quoteId: quote.id, approvedTotal: quote.total, approvedCurrency: 'USD' }
      });
      const paypalOrder = await paypalPaymentService.createPayPalOrder({ quoteId: quote.id, userId: buyerId });
      await paypalPaymentService.capturePayPalOrder({ providerOrderId: paypalOrder.providerOrderId, sellerId });

      // Call orderController.confirmReceipt with mock request/response
      let responsePayload = null;
      let responseCode = 200;
      const req = {
        body: { orderId: paypalOrder.orderId },
        user: { id: buyerId, role: 'BUYER' }
      };
      const res = {
        status(code) { responseCode = code; return this; },
        json(data) { responsePayload = data; return this; }
      };

      await orderController.confirmReceipt(req, res);

      assert.equal(responseCode, 200);
      assert.equal(responsePayload.success, true);
      assert.ok(responsePayload.payout);
      assert.equal(responsePayload.payout.currency, 'NGN');
      assert.ok(responsePayload.payout.payoutAmountNgn > 0);

      // Verify seller wallet credited
      const sellerWallet = await prisma.wallet.findUnique({ where: { userId: sellerId } });
      assert.ok(sellerWallet);
      assert.equal(Number(sellerWallet.gongAvailable), responsePayload.payout.payoutAmountNgn);
    });

    test('Rule 35: Native W-Commerce items priced in NGN checkout in USD via PayPal and payout seller in Naira upon order confirmation', async () => {
      // 1. Setup Seller & Store in DB
      const sellerId = `seller-wcom-paypal-${Date.now()}`;
      await prisma.user.create({
        data: {
          id: sellerId,
          email: `${sellerId}@w-commerce.local`,
          fullName: 'Chidi Okafor Electronics',
          role: 'SELLER',
          passwordHash: 'seeded-hash'
        }
      });

      const store = await prisma.store.create({
        data: {
          sellerId,
          storeName: `Chidi Tech Hub ${Date.now()}`,
          country: 'NG'
        }
      });

      // 2. Setup Native W-Commerce Product priced in NGN
      const product = await prisma.product.create({
        data: {
          storeId: store.id,
          title: 'W-Commerce Wireless Noise-Cancelling Headphones',
          category: 'Electronics',
          price: 148000.00, // ₦148,000 NGN
          stock: 10
        }
      });

      // 3. Add to PayAI Cart (strictly native W-Commerce)
      const sessionId = `session-wcom-${Date.now()}`;
      const cart = await cartService.getOrCreateCart({ sessionId, marketCode: 'NIGERIA', currency: 'NGN' });

      // Ensure adding external item to this cart fails
      await assert.rejects(async () => {
        await cartService.addItem(cart.id, {
          provider: 'amazon',
          title: 'Amazon Product',
          price: 100
        });
      }, /Only native W-Commerce products can be added to the PayAI Cart/i);

      // Add the native W-Commerce product
      const updatedCart = await cartService.addItem(cart.id, {
        provider: 'w-commerce',
        productId: product.id,
        title: product.title,
        price: Number(product.price),
        currency: 'NGN',
        quantity: 1,
        sellerId,
        storeId: store.id,
        sellerName: store.storeName
      });

      assert.equal(updatedCart.items.length, 1);
      assert.equal(updatedCart.items[0].productId, product.id);
      assert.equal(updatedCart.items[0].provider, 'w-commerce');
      assert.equal(updatedCart.items[0].currency, 'NGN');
      assert.equal(updatedCart.items[0].sellerName, store.storeName);

      // 4. Generate Landed Cost & Dual Currency Quote for PayPal USD Checkout
      const quote = await pricingService.createPriceQuote({
        items: updatedCart.items,
        marketCode: 'NIGERIA',
        targetCurrency: 'USD'
      });

      assert.equal(quote.currency, 'USD', 'PayPal requires quotes in USD');
      assert.ok(quote.totalUsd > 0);
      assert.ok(quote.totalNgn > 0);
      assert.equal(quote.exchangeRate, 1480.00);
      // Free domestic shipping threshold is ₦35,000; order is ₦148,000 so qualifies for free shipping
      assert.equal(quote.breakdown.freeShippingQualification.qualifiesForFreeShipping, true);
      assert.ok(quote.breakdown.handlingUsd >= 0);

      // 5. Customer Purchase Approval
      const approval = await prisma.payAIPurchaseApproval.create({
        data: {
          quoteId: quote.id,
          approvedTotal: quote.total,
          approvedCurrency: 'USD',
          status: 'VALID'
        }
      });

      // 6. Initialize PayPal Order in USD
      const paypalOrder = await paypalPaymentService.createPayPalOrder({
        quoteId: quote.id,
        approvalId: approval.id
      });
      assert.equal(paypalOrder.currency, 'USD');
      assert.ok(paypalOrder.providerOrderId);

      // 7. Capture PayPal Order in USD and Hold Escrow with Locked Naira Payout
      const capture = await paypalPaymentService.capturePayPalOrder({
        providerOrderId: paypalOrder.providerOrderId,
        internalOrderId: paypalOrder.orderId,
        sellerId
      });

      assert.equal(capture.success, true);
      assert.equal(capture.currency, 'USD');
      assert.equal(capture.paymentStatus, 'VERIFIED');
      assert.equal(capture.escrowStatus, 'HELD');
      assert.ok(capture.sellerPayoutNgn > 0, 'Seller payout in Naira must be calculated and locked');
      assert.equal(capture.exchangeRate, 1480.00);

      // 8. Order Confirmation / Delivery releases Escrow & Credits Seller Wallet in NAIRA
      const payout = await paypalPaymentService.releaseSellerPayout({
        orderId: paypalOrder.orderId,
        sellerId,
        triggerSource: 'BUYER_CONFIRMATION'
      });

      assert.equal(payout.success, true);
      assert.equal(payout.escrowStatus, 'RELEASED');
      assert.equal(payout.currency, 'NGN');
      assert.equal(payout.payoutAmountNgn, capture.sellerPayoutNgn);
      assert.ok(payout.transactionId);

      // 9. Verify Seller Wallet credited in NAIRA (NGN)
      const sellerWallet = await prisma.wallet.findUnique({ where: { userId: sellerId } });
      assert.ok(sellerWallet);
      assert.equal(Number(sellerWallet.gongAvailable), capture.sellerPayoutNgn);

      // 10. Verify Completed Transaction Record with currency: 'NGN', type: 'SELLER_PAYOUT'
      const payoutTx = await prisma.transaction.findFirst({
        where: { referenceId: paypalOrder.orderNumber, type: 'SELLER_PAYOUT' }
      });
      assert.ok(payoutTx);
      assert.equal(payoutTx.currency, 'NGN');
      assert.equal(payoutTx.status, 'COMPLETED');
      assert.equal(Number(payoutTx.amount), capture.sellerPayoutNgn);

      // 11. Verify WalletLedgerEntry in NGN
      const ledgerEntry = await prisma.walletLedgerEntry.findFirst({
        where: { referenceId: paypalOrder.orderId, coin: 'NGN' }
      });
      assert.ok(ledgerEntry);
      assert.equal(ledgerEntry.direction, 'CREDIT');
      assert.equal(Number(ledgerEntry.amount), capture.sellerPayoutNgn);

      // 12. Verify Push Notification in Naira
      const notif = await prisma.notification.findFirst({
        where: { userId: sellerId }
      });
      assert.ok(notif);
      assert.match(notif.body || notif.title, /Naira|NGN/i);

      // 13. Verify Idempotency - double release does not duplicate payout
      const secondRelease = await paypalPaymentService.releaseSellerPayout({
        orderId: paypalOrder.orderId,
        sellerId
      });
      assert.equal(secondRelease.alreadyReleased, true);
      const sellerWalletAfter = await prisma.wallet.findUnique({ where: { userId: sellerId } });
      assert.equal(Number(sellerWalletAfter.gongAvailable), capture.sellerPayoutNgn);
    });
  });

  describe('7. Real-World Shopping Evaluator & Universal Connector System (Agent 2 Suite)', () => {
    test('Rule 36: AliExpress adapter contract enables negotiatePrice: true and seller confirmation discounts', async () => {
      const ali = adapterRegistry.getAdapter('aliexpress');
      assert.equal(ali.getCapabilities().negotiatePrice, true, 'AliExpress capability contract must have negotiatePrice: true');

      const negResult = await ali.negotiatePrice({ externalProductId: 'ali-test-item', requestedDiscountPct: 15 });
      assert.equal(negResult.supported, true);
      assert.equal(negResult.confirmed, true);
      assert.ok(negResult.newPrice < negResult.originalPrice, 'Discounted price must be strictly less than original price');
      assert.equal(negResult.discountPct, 15);

      // Safety policy check: discounts over 25% are rejected
      const highDiscount = await ali.negotiatePrice({ externalProductId: 'ali-test-item', requestedDiscountPct: 35 });
      assert.equal(highDiscount.confirmed, false, 'Discounts above 25% safety threshold must be rejected');
    });

    test('Rule 37: Value vs. Cheapest composite scoring balances price, rating, stock health, and delivery speed', () => {
      const testItems = [
        {
          id: 'item-cheap-slow',
          title: 'Budget Wired Earphones',
          price: 5000,
          currency: 'NGN',
          stock: 2, // low stock
          rating: 3.5, // mediocre rating
          maxTransitDays: 14, // slow transit
          seller: { averageRating: 3.5 }
        },
        {
          id: 'item-best-value',
          title: 'Pro Wireless ANC Earbuds',
          price: 9000,
          currency: 'NGN',
          stock: 45, // healthy stock
          rating: 4.9, // top seller rating
          maxTransitDays: 2, // fast delivery
          seller: { averageRating: 4.9 }
        },
        {
          id: 'item-premium-pricey',
          title: 'Luxury Studio Headset',
          price: 35000,
          currency: 'NGN',
          stock: 15,
          rating: 4.8,
          maxTransitDays: 2,
          seller: { averageRating: 4.8 }
        }
      ];

      const scored = catalogSearchService.applyValueScoring(testItems);

      const bestValue = scored.find(i => i.id === 'item-best-value');
      const budgetPick = scored.find(i => i.id === 'item-cheap-slow');

      assert.ok(bestValue.valueScore > budgetPick.valueScore, 'Best value item must outscore lowest sticker price item due to superior rating, stock, and speed');
      assert.equal(bestValue.isBestValue, true);
      assert.equal(bestValue.badge, 'Best Value');
      assert.equal(budgetPick.isBudgetPick, true);
      assert.equal(budgetPick.badge, 'Budget Pick');

      // Default ranking should place the Best Value item first, not the cheapest sticker price
      assert.equal(scored[0].id, 'item-best-value', 'Search results must rank by composite valueScore instead of solely cheapest price');
    });

    test('Rule 38: Composite ranking identifies dual Best Value & Budget Pick when an item dominates both', () => {
      const items = [
        {
          id: 'dominant-item',
          title: 'Dominant Best Seller',
          price: 4000,
          currency: 'NGN',
          stock: 100,
          rating: 5.0,
          maxTransitDays: 1,
          seller: { averageRating: 5.0 }
        },
        {
          id: 'expensive-inferior',
          title: 'Overpriced Generic',
          price: 12000,
          currency: 'NGN',
          stock: 1,
          rating: 3.0,
          maxTransitDays: 10,
          seller: { averageRating: 3.0 }
        }
      ];

      catalogSearchService.applyValueScoring(items);
      const dominant = items.find(i => i.id === 'dominant-item');
      assert.equal(dominant.isBestValue, true);
      assert.equal(dominant.isBudgetPick, true);
      assert.equal(dominant.badge, 'Best Value & Budget Pick');
    });

    test('Rule 39: Delivery deadline parsing extracts target days from natural language queries', () => {
      assert.equal(catalogSearchService.parseDeadlineToDays('delivery within 3 days'), 3);
      assert.equal(catalogSearchService.parseDeadlineToDays('within 5 business days'), 5);
      assert.equal(catalogSearchService.parseDeadlineToDays('within 48 hours'), 2);
      assert.equal(catalogSearchService.parseDeadlineToDays('tomorrow'), 1);
      assert.equal(catalogSearchService.parseDeadlineToDays('today'), 0);

      const daysUntilSaturday = catalogSearchService.parseDeadlineToDays('arrive before Saturday');
      assert.ok(daysUntilSaturday >= 1 && daysUntilSaturday <= 7, 'Saturday deadline must return 1-7 days');
    });

    test('Rule 40: Delivery deadline evaluation flags transit feasibility across local vs cross-border carriers', () => {
      const localItem = {
        id: 'local-fabric',
        title: 'Ankara Fabric',
        provider: 'w-commerce',
        minTransitDays: 1,
        maxTransitDays: 3,
        estimatedDays: '1-3 business days'
      };

      const amazonItem = {
        id: 'amz-laptop',
        title: 'Dell XPS 13',
        provider: 'amazon',
        minTransitDays: 4,
        maxTransitDays: 7,
        estimatedDays: '4-7 business days'
      };

      const aliItem = {
        id: 'ali-watch',
        title: 'Smart Watch Band',
        provider: 'aliexpress',
        minTransitDays: 10,
        maxTransitDays: 16,
        estimatedDays: '10-16 business days'
      };

      // 1. "delivery within 3 days": Local passes, Amazon and AliExpress fail
      const local3Day = catalogSearchService.checkDeliveryFeasibility(localItem, 'delivery within 3 days');
      assert.equal(local3Day.feasible, true);
      assert.equal(local3Day.allowedDays, 3);
      assert.equal(local3Day.confidence, 'HIGH');

      const amazon3Day = catalogSearchService.checkDeliveryFeasibility(amazonItem, 'delivery within 3 days');
      assert.equal(amazon3Day.feasible, false);
      assert.equal(amazon3Day.allowedDays, 3);
      assert.equal(amazon3Day.confidence, 'LOW');

      const ali3Day = catalogSearchService.checkDeliveryFeasibility(aliItem, 'delivery within 3 days');
      assert.equal(ali3Day.feasible, false);

      // 2. "delivery within 8 days": Local and Amazon pass, AliExpress fails
      const amazon8Day = catalogSearchService.checkDeliveryFeasibility(amazonItem, 'delivery within 8 days');
      assert.equal(amazon8Day.feasible, true);

      const ali8Day = catalogSearchService.checkDeliveryFeasibility(aliItem, 'delivery within 8 days');
      assert.equal(ali8Day.feasible, false);

      // 3. "within 20 days": All pass
      const ali20Day = catalogSearchService.checkDeliveryFeasibility(aliItem, 'within 20 days');
      assert.equal(ali20Day.feasible, true);
    });

    test('Rule 41: PricingService shipping and landed cost calculation incorporates delivery deadline checks', () => {
      const mockItems = [
        { title: 'Keyboard', price: 100, currency: 'USD', quantity: 1, category: 'electronics', weightKg: 1.0 }
      ];

      // Domestic shipping with 3-day deadline
      const domesticShipping = pricingService.calculateShippingFees({
        items: [{ title: 'Local Shoes', price: 15000, currency: 'NGN', quantity: 1 }],
        isDomestic: true,
        targetDeadline: 'delivery within 3 days'
      });
      assert.ok(domesticShipping.deadlineEvaluation);
      assert.equal(domesticShipping.deadlineEvaluation.feasible, true);

      // International landed cost with tight 2-day deadline (air freight requires 4-7 days)
      const intlLanded = pricingService.calculateLandedCost({
        items: mockItems,
        destinationCountry: 'NG',
        targetDeadline: 'delivery within 2 days'
      });
      assert.ok(intlLanded.deadlineEvaluation);
      assert.equal(intlLanded.deadlineEvaluation.feasible, false);
      assert.match(intlLanded.deadlineEvaluation.reason, /exceeds/i);
    });

    test('Rule 42: Universal adapter registry evaluates delivery deadlines across external adapters', async () => {
      // Amazon 4-7 business days
      const amazonDeadline = await adapterRegistry.evaluateDeliveryDeadline('amazon', 'amz-b0c14v5q32', 'delivery within 5 days');
      assert.equal(amazonDeadline.provider, 'amazon');
      assert.equal(amazonDeadline.allowedDays, 5);
      assert.equal(amazonDeadline.maxTransitDays, 7);
      assert.equal(amazonDeadline.feasible, false, '7-day transit exceeds 5-day deadline');

      // Amazon 10-day deadline
      const amazon10Day = await adapterRegistry.evaluateDeliveryDeadline('amazon', 'amz-b0c14v5q32', 'within 10 days');
      assert.equal(amazon10Day.feasible, true, '7-day transit meets 10-day deadline');

      // AliExpress 10-16 business days
      const aliDeadline = await adapterRegistry.evaluateDeliveryDeadline('aliexpress', 'ali-1005006281923', 'delivery within 7 days');
      assert.equal(aliDeadline.provider, 'aliexpress');
      assert.equal(aliDeadline.feasible, false, '16-day transit exceeds 7-day deadline');

      const ali20Day = await adapterRegistry.evaluateDeliveryDeadline('aliexpress', 'ali-1005006281923', 'delivery within 20 days');
      assert.equal(ali20Day.feasible, true, '16-day transit meets 20-day deadline');
    });
  });
});
