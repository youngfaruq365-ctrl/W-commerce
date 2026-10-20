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

const prisma = require('../utils/prismaClient');
const catalogSearchService = require('../services/payai/catalogSearchService');
const pricingService = require('../services/payai/pricingService');
const cartService = require('../services/payai/cartService');
const payaiOrchestrator = require('../services/payai/payaiOrchestrator');

describe('W-Commerce Product Search, Inventory & Last Price Dynamic Negotiation', () => {
  let testStore;
  let negotiableProduct;
  let fixedPriceProduct;
  let outOfStockProduct;

  before(async () => {
    // Setup test seller store and products
    const seller = await prisma.user.create({
      data: {
        email: `test-seller-${Date.now()}@example.com`,
        fullName: 'Test Merchant Alpha',
        passwordHash: 'dummy-hash',
        role: 'SELLER'
      }
    });

    testStore = await prisma.store.create({
      data: {
        sellerId: seller.id,
        storeName: 'Alpha Tech Store',
        country: 'NG',
        approvalStatus: 'APPROVED',
        isVerified: true,
        averageRating: 4.9
      }
    });

    // 1. Product with negotiation enabled and bottomPrice
    negotiableProduct = await prisma.product.create({
      data: {
        storeId: testStore.id,
        title: 'PayAI Quantum Wireless Headphones',
        description: 'Premium noise-canceling headphones with spatial audio.',
        price: 50000.0,
        stock: 15,
        lowStockThreshold: 3,
        shippingFee: 2500.0,
        category: 'electronics',
        subCategory: 'audio',
        tags: '["audio", "headphones", "wireless", "payai"]',
        isNegotiable: true,
        bottomPrice: 40000.0 // Minimum acceptable seller price: 40,000
      }
    });

    // 2. Fixed price product (isNegotiable = false)
    fixedPriceProduct = await prisma.product.create({
      data: {
        storeId: testStore.id,
        title: 'PayAI Ultra Smartwatch Pro',
        description: 'Flagship smartwatch with biometric tracking.',
        price: 80000.0,
        stock: 8,
        shippingFee: 1500.0,
        category: 'electronics',
        subCategory: 'wearables',
        tags: '["smartwatch", "wearable"]',
        isNegotiable: false,
        bottomPrice: null
      }
    });

    // 3. Out of stock product
    outOfStockProduct = await prisma.product.create({
      data: {
        storeId: testStore.id,
        title: 'PayAI Limited Edition Drone',
        description: 'Autonomous 4K camera drone.',
        price: 150000.0,
        stock: 0,
        shippingFee: 5000.0,
        category: 'electronics',
        isNegotiable: true,
        bottomPrice: 120000.0
      }
    });
  });

  after(async () => {
    // Cleanup test data
    try {
      if (negotiableProduct) await prisma.product.delete({ where: { id: negotiableProduct.id } }).catch(() => {});
      if (fixedPriceProduct) await prisma.product.delete({ where: { id: fixedPriceProduct.id } }).catch(() => {});
      if (outOfStockProduct) await prisma.product.delete({ where: { id: outOfStockProduct.id } }).catch(() => {});
      if (testStore) {
        await prisma.store.delete({ where: { id: testStore.id } }).catch(() => {});
        await prisma.user.delete({ where: { id: testStore.sellerId } }).catch(() => {});
      }
    } catch {
      // Ignore cleanup error
    }
  });

  describe('1. Product Search & Real-Time Inventory Checks', () => {
    test('Searches native products by title and returns inventory + negotiability metadata', async () => {
      const results = await catalogSearchService.search({
        marketCode: 'NIGERIA',
        query: 'Quantum Wireless Headphones',
        limit: 5
      });

      assert.equal(results.marketCode, 'NIGERIA');
      assert.ok(results.items.length > 0, 'Should find at least 1 product');
      const item = results.items.find(i => i.id === negotiableProduct.id);
      assert.ok(item, 'Should include the test headphones');
      assert.equal(item.title, 'PayAI Quantum Wireless Headphones');
      assert.equal(item.price, 50000);
      assert.equal(item.stock, 15);
      assert.equal(item.inStock, true);
      assert.equal(item.isNegotiable, true);
      assert.equal(item.canNegotiate, true);
      // Ensure secret bottomPrice is NOT leaked in buyer search results
      assert.equal(item.bottomPrice, undefined, 'bottomPrice must never be leaked to public search');
    });

    test('Performs real-time stock and availability check for in-stock item', async () => {
      const check = await catalogSearchService.checkProductStock(negotiableProduct.id, 2);
      assert.equal(check.found, true);
      assert.equal(check.available, true);
      assert.equal(check.inStock, true);
      assert.equal(check.stock, 15);
      assert.equal(check.stockCount, 15);
      assert.equal(check.canNegotiate, true);
      assert.equal(check.lowStockThreshold, 3);
      assert.equal(check.isLowStock, false);
      assert.ok(check.deliveryLeadTime, 'Should include delivery lead time');
      assert.equal(check.bottomPrice, undefined, 'bottomPrice must never be leaked to stock check response');
    });

    test('Searches native products by description, tags, category, and subCategory', async () => {
      // By description
      const descSearch = await catalogSearchService.search({
        marketCode: 'NIGERIA',
        query: 'spatial audio'
      });
      assert.ok(descSearch.items.some(i => i.id === negotiableProduct.id), 'Matches on description');

      // By tag
      const tagSearch = await catalogSearchService.search({
        marketCode: 'NIGERIA',
        query: 'wireless'
      });
      assert.ok(tagSearch.items.some(i => i.id === negotiableProduct.id), 'Matches on tags');

      // By subCategory
      const subCatSearch = await catalogSearchService.search({
        marketCode: 'NIGERIA',
        query: 'audio'
      });
      assert.ok(subCatSearch.items.some(i => i.id === negotiableProduct.id), 'Matches on subCategory');

      // By category filter
      const catSearch = await catalogSearchService.search({
        marketCode: 'NIGERIA',
        category: 'electronics'
      });
      assert.ok(catSearch.items.some(i => i.id === negotiableProduct.id), 'Matches on category');
    });

    test('Reports out of stock properly when stock is 0', async () => {
      const check = await catalogSearchService.checkProductStock(outOfStockProduct.id, 1);
      assert.equal(check.found, true);
      assert.equal(check.available, false);
      assert.equal(check.inStock, false);
      assert.equal(check.stock, 0);
      assert.equal(check.stockCount, 0);
      assert.match(check.reason, /out of stock/i);
    });
  });

  describe('2. Dynamic Price Negotiation Engine', () => {
    test('Rule A: Rejects negotiation on fixed price product (isNegotiable: false)', async () => {
      const result = await catalogSearchService.negotiateProductPrice({
        productId: fixedPriceProduct.id,
        proposedPrice: 70000
      });

      assert.equal(result.success, true);
      assert.equal(result.accepted, false);
      assert.equal(result.isNegotiable, false);
      assert.match(result.message, /fixed price/i);
      assert.match(result.message, /not enabled/i);
    });

    test('Rule B: Accepts offer when proposed price >= seller bottom price', async () => {
      // Listing: 50,000, Bottom: 40,000, Offer: 42,000
      const result = await catalogSearchService.negotiateProductPrice({
        productId: negotiableProduct.id,
        proposedPrice: 42000
      });

      assert.equal(result.success, true);
      assert.equal(result.accepted, true);
      assert.equal(result.isNegotiable, true);
      assert.equal(result.originalPrice, 50000);
      assert.equal(result.negotiatedPrice, 42000);
      assert.equal(result.savings, 8000);
      assert.equal(result.discountPct, 16);
      assert.match(result.message, /Deal accepted/i);
      assert.match(result.message, /42,000/);
    });

    test('Rule C: Counter-offers when proposed offer < seller bottom price', async () => {
      // Listing: 50,000, Bottom: 40,000, Offer: 25,000 (< 40,000 bottom)
      const result = await catalogSearchService.negotiateProductPrice({
        productId: negotiableProduct.id,
        proposedPrice: 25000
      });

      assert.equal(result.success, true);
      assert.equal(result.accepted, false);
      assert.equal(result.counterOffer, true);
      assert.equal(result.minimumAcceptablePrice, 40000);
      assert.ok(result.counterOfferPrice >= 40000, 'Counter offer must be at least bottom price');
      assert.match(result.message, /cannot go below ₦40,000/i);
      assert.match(result.message, /Would you like to accept this deal\?/i);
    });

    test('Rule D: Accepts offer at full listing price', async () => {
      const result = await catalogSearchService.negotiateProductPrice({
        productId: negotiableProduct.id,
        proposedPrice: 50000
      });

      assert.equal(result.success, true);
      assert.equal(result.accepted, true);
      assert.equal(result.negotiatedPrice, 50000);
      assert.equal(result.savings, 0);
    });

    test('Rule E: Strictly rejects price negotiation on external store links and non-W-Commerce providers', async () => {
      // 1. External store URL
      const urlResult = await catalogSearchService.negotiateProductPrice({
        url: 'https://www.amazon.com/dp/B0BDHWDR12',
        proposedPrice: 80
      });
      assert.equal(urlResult.success, false);
      assert.equal(urlResult.accepted, false);
      assert.equal(urlResult.rejected, true);
      assert.equal(urlResult.message, 'Price negotiation is exclusively supported for native W-Commerce sellers. External store items cannot be negotiated.');

      // 2. External provider (Amazon / AliExpress / eBay / ASOS)
      const providerResult = await catalogSearchService.negotiateProductPrice({
        provider: 'amazon',
        productId: 'amz-b0bdhwdr12',
        proposedPrice: 85
      });
      assert.equal(providerResult.success, false);
      assert.equal(providerResult.rejected, true);
      assert.equal(providerResult.message, 'Price negotiation is exclusively supported for native W-Commerce sellers. External store items cannot be negotiated.');

      const aliResult = await catalogSearchService.negotiateProductPrice({
        provider: 'aliexpress',
        productId: 'ali-1005004918239',
        proposedPrice: 40
      });
      assert.equal(aliResult.success, false);
      assert.equal(aliResult.rejected, true);
      assert.equal(aliResult.message, 'Price negotiation is exclusively supported for native W-Commerce sellers. External store items cannot be negotiated.');
    });

    test('Rule F: PayAI Orchestrator strictly rejects negotiation on external store items/links', async () => {
      const orchestratorExternal = await payaiOrchestrator.executeTool({
        toolName: 'request_seller_negotiation',
        toolArgs: {
          provider: 'amazon',
          productId: 'amz-b0bdhwdr12',
          proposedPrice: 80
        }
      });

      assert.equal(orchestratorExternal.success, false);
      assert.equal(orchestratorExternal.rejected, true);
      assert.equal(orchestratorExternal.message, 'Price negotiation is exclusively supported for native W-Commerce sellers. External store items cannot be negotiated.');

      const orchestratorUrl = await payaiOrchestrator.executeTool({
        toolName: 'request_seller_negotiation',
        toolArgs: {
          url: 'https://www.aliexpress.com/item/1005006281923.html',
          proposedPrice: 30
        }
      });

      assert.equal(orchestratorUrl.success, false);
      assert.equal(orchestratorUrl.rejected, true);
      assert.equal(orchestratorUrl.message, 'Price negotiation is exclusively supported for native W-Commerce sellers. External store items cannot be negotiated.');
    });

    test('Rule G: Seller last-price bottomPrice is verified in DB, and strictly hidden in buyer responses', async () => {
      const productInDb = await prisma.product.findUnique({
        where: { id: negotiableProduct.id }
      });
      assert.ok(productInDb.isNegotiable, 'DB product isNegotiable should be true');
      assert.equal(Number(productInDb.bottomPrice), 40000, 'DB product bottomPrice must match seller setup');

      // Public search response must NEVER include bottomPrice
      const publicSearch = await catalogSearchService.search({
        marketCode: 'NIGERIA',
        query: 'Quantum Wireless Headphones'
      });
      const foundItem = publicSearch.items.find(i => i.id === negotiableProduct.id);
      assert.ok(foundItem);
      assert.strictEqual(foundItem.bottomPrice, undefined, 'Public search item must not leak bottomPrice');

      // checkProductStock must NEVER leak bottomPrice
      const stockCheck = await catalogSearchService.checkProductStock(negotiableProduct.id);
      assert.strictEqual(stockCheck.bottomPrice, undefined, 'Stock check must not leak bottomPrice');
    });
  });

  describe('3. Shipping Calculation & Free Shipping Thresholds', () => {
    test('Calculates standard domestic shipping below free shipping threshold', () => {
      const shipping = pricingService.calculateShippingFees({
        items: [{ title: 'Small Item', price: 10000, weightKg: 1.0, quantity: 1, currency: 'NGN' }],
        destinationCountry: 'NG',
        isDomestic: true,
        marketCode: 'NIGERIA'
      });

      assert.equal(shipping.isDomestic, true);
      assert.equal(shipping.carrier, 'W-Commerce Express Courier');
      assert.equal(shipping.currency, 'NGN');
      assert.equal(shipping.qualifiesForFreeShipping, false);
      assert.equal(shipping.finalShippingFee, 2500);
      assert.equal(shipping.freeShippingThreshold, 35000);
      assert.equal(shipping.amountNeededForFreeShipping, 25000); // 35,000 - 10,000 = 25,000
    });

    test('Unlocks free domestic shipping when subtotal >= ₦35,000 threshold', () => {
      const shipping = pricingService.calculateShippingFees({
        items: [{ title: 'Premium Item', price: 45000, weightKg: 1.5, quantity: 1, currency: 'NGN' }],
        destinationCountry: 'NG',
        isDomestic: true,
        marketCode: 'NIGERIA'
      });

      assert.equal(shipping.isDomestic, true);
      assert.equal(shipping.qualifiesForFreeShipping, true);
      assert.equal(shipping.finalShippingFee, 0); // Shipping is ₦0
      assert.ok(shipping.freeShippingSavings > 0, 'Shows positive savings');
      assert.equal(shipping.amountNeededForFreeShipping, 0);
    });

    test('Unlocks free international shipping when order exceeds $150 threshold', () => {
      const shipping = pricingService.calculateShippingFees({
        items: [{ title: 'International Tech', price: 180, weightKg: 1.2, quantity: 1, currency: 'USD' }],
        destinationCountry: 'NG',
        isDomestic: false,
        marketCode: 'INTERNATIONAL'
      });

      assert.equal(shipping.isDomestic, false);
      assert.equal(shipping.qualifiesForFreeShipping, true);
      assert.equal(shipping.finalShippingFee, 0);
      assert.equal(shipping.freeShippingThreshold, 150);
      assert.equal(shipping.amountNeededForFreeShipping, 0);
    });
  });

  describe('4. PayAI Orchestrator Tool Integration', () => {
    test('Executes request_seller_negotiation on behalf of seller', async () => {
      const orchestratorResult = await payaiOrchestrator.executeTool({
        toolName: 'request_seller_negotiation',
        toolArgs: {
          productId: negotiableProduct.id,
          proposedPrice: 45000
        },
        marketCode: 'NIGERIA'
      });

      assert.equal(orchestratorResult.success, true);
      assert.equal(orchestratorResult.accepted, true);
      assert.equal(orchestratorResult.negotiatedPrice, 45000);
    });

    test('Executes check_product_stock tool via orchestrator', async () => {
      const stockResult = await payaiOrchestrator.executeTool({
        toolName: 'check_product_stock',
        toolArgs: {
          productId: negotiableProduct.id,
          quantity: 1
        }
      });

      assert.equal(stockResult.found, true);
      assert.equal(stockResult.available, true);
      assert.equal(stockResult.stock, 15);
    });

    test('Executes get_shipping_estimate tool with free shipping calculation', async () => {
      const shipResult = await payaiOrchestrator.executeTool({
        toolName: 'get_shipping_estimate',
        toolArgs: {
          productId: negotiableProduct.id, // price: 50,000 (> 35,000)
          price: 50000
        },
        marketCode: 'NIGERIA',
        destinationCountry: 'NG'
      });

      assert.equal(shipResult.destinationCountry, 'NG');
      assert.equal(shipResult.qualifiesForFreeShipping, true);
      assert.equal(shipResult.shippingCost, 0);
    });
  });
});
