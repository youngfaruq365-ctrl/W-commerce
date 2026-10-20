'use strict';
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:C:/Users/HomePC/Documents/project12/database/prisma/dev.db';
}

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../utils/jwtSecret');
const prisma = require('../utils/prismaClient');
const app = require('../app.cjs');

describe('PayAI External Site Integration Endpoints', () => {
  let server;
  let baseUrl;
  let sellerUser;
  let sellerStore;
  let token;
  let session;

  before(async () => {
    // 1. Start test HTTP server on random free port
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
    console.log(`[Test] HTTP server listening on ${baseUrl}`);

    // 2. Create a test seller user
    const timestamp = Date.now();
    sellerUser = await prisma.user.create({
      data: {
        email: `seller-external-${timestamp}@test.com`,
        fullName: 'Test Global Seller',
        passwordHash: 'dummy-secret-hash',
        role: 'SELLER',
        subscriptionTier: 'PRO',
        hasPaidAccess: true,
        isVerified: true
      }
    });

    // 3. Create a store for this seller
    sellerStore = await prisma.store.create({
      data: {
        sellerId: sellerUser.id,
        storeName: `Test Global Flagship ${timestamp}`,
        country: 'US',
        approvalStatus: 'APPROVED',
        isVerified: true,
        sellerTier: 'PRO',
        portfolioConfig: JSON.stringify({
          globalStoreLinks: []
        })
      }
    });

    // 4. Generate JWT & userSession
    token = jwt.sign(
      { id: sellerUser.id, email: sellerUser.email, role: sellerUser.role },
      getJwtSecret(),
      { expiresIn: '1d' }
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);

    session = await prisma.userSession.create({
      data: {
        userId: sellerUser.id,
        token,
        isActive: true,
        expiresAt,
        ipAddress: '127.0.0.1',
        userAgent: 'IntegrationTestRunner'
      }
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    // Clean up test seller, store, products, and session
    try {
      if (sellerStore) {
        await prisma.product.deleteMany({ where: { storeId: sellerStore.id } });
        await prisma.store.delete({ where: { id: sellerStore.id } });
      }
      if (session) {
        await prisma.userSession.deleteMany({ where: { userId: sellerUser.id } });
      }
      if (sellerUser) {
        await prisma.user.delete({ where: { id: sellerUser.id } });
      }
    } catch (e) {
      console.debug('Cleanup notice:', e.message);
    }
    setTimeout(() => {
      process.exit(0);
    }, 500);
  });

  test('1. POST /api/v1/payai/seller/external-site/fetch-products returns HTTP 200 and extracted products catalog', async () => {
    const csrfToken = 'test-integration-csrf-token-1234567890';

    const res = await fetch(`${baseUrl}/api/v1/payai/seller/external-site/fetch-products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-csrf-token': csrfToken,
        'Cookie': `gx_csrf=${csrfToken}`
      },
      body: JSON.stringify({
        storeUrl: 'https://gymshark.com'
      })
    });

    assert.equal(res.status, 200, `Expected HTTP 200, got ${res.status}`);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.storeName);
    assert.ok(Array.isArray(data.products));
    assert.ok(data.products.length > 0, 'Should return at least 1 product');
    assert.ok(data.products[0].externalProductId);
    assert.ok(data.products[0].title);
    assert.ok(data.products[0].price > 0);
  });

  test('2. POST /api/v1/payai/seller/external-site/submit-products returns HTTP 200 and publishes products into W-Commerce', async () => {
    const csrfToken = 'test-integration-csrf-token-1234567890';
    const productsToSubmit = [
      {
        externalProductId: 'ext-test-prod-1',
        title: 'Seamless Training Apex Tee',
        description: 'Authentic imported moisture-wicking compression tee.',
        price: 38.00,
        originalPrice: 48.00,
        stock: 30,
        category: 'Apparel',
        imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80',
        url: 'https://gymshark.com/products/apex-tee',
        weightKg: 0.35
      },
      {
        externalProductId: 'ext-test-prod-2',
        title: 'Heavyweight Lifting Hoodie',
        description: 'Oversized fleece drop-shoulder lifting hoodie.',
        price: 65.00,
        originalPrice: 80.00,
        stock: 20,
        category: 'Apparel',
        imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80',
        url: 'https://gymshark.com/products/lifting-hoodie',
        weightKg: 0.8
      }
    ];

    const res = await fetch(`${baseUrl}/api/v1/payai/seller/external-site/submit-products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-csrf-token': csrfToken,
        'Cookie': `gx_csrf=${csrfToken}`
      },
      body: JSON.stringify({
        storeUrl: 'https://gymshark.com',
        storeName: 'Gymshark US Flagship',
        platform: 'shopify',
        description: 'Official Gymshark international merchandise direct to W-Commerce.',
        products: productsToSubmit
      })
    });

    assert.equal(res.status, 200, `Expected HTTP 200, got ${res.status}`);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.importedCount, 2);
    assert.equal(data.storeId, sellerStore.id);
    assert.ok(data.storeLink);
    assert.equal(data.storeLink.storeName, 'Gymshark US Flagship');

    // Verify products were persisted in Prisma DB with EXTERNAL_STORE tag
    const savedProducts = await prisma.product.findMany({
      where: { storeId: sellerStore.id }
    });
    assert.equal(savedProducts.length, 2);
    assert.ok(savedProducts[0].tags.includes('EXTERNAL_STORE'));
  });

  test('3. GET /api/v1/payai/global-store/discover-stores returns HTTP 200 and discoverable stores list', async () => {
    const res = await fetch(`${baseUrl}/api/v1/payai/global-store/discover-stores`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    assert.equal(res.status, 200, `Expected HTTP 200, got ${res.status}`);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.stores));
    assert.ok(data.stores.length > 0, 'Should return at least 1 discoverable store');

    // Find the store we submitted earlier
    const linked = data.stores.find(s => s.storeId === sellerStore.id);
    assert.ok(linked, 'Newly linked store should be present in discoverable stores');
    assert.equal(linked.storeName, 'Gymshark US Flagship');
    assert.equal(linked.platform, 'shopify');
    assert.ok(linked.sampleProducts.length > 0);
  });

  test('4. GET /api/v1/payai/global-store/store/:storeId/showcase returns HTTP 200 and external store showcase', async () => {
    const res = await fetch(`${baseUrl}/api/v1/payai/global-store/store/${sellerStore.id}/showcase`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    assert.equal(res.status, 200, `Expected HTTP 200, got ${res.status}`);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.store);
    assert.equal(data.store.storeId, sellerStore.id);
    assert.ok(Array.isArray(data.products));
    assert.ok(data.products.length > 0);
  });

  test('5. GET /api/v1/payai/global-store/store/global-store-1/showcase returns HTTP 200 for default verified global merchant', async () => {
    const res = await fetch(`${baseUrl}/api/v1/payai/global-store/store/global-store-1/showcase`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    assert.equal(res.status, 200, `Expected HTTP 200, got ${res.status}`);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.store);
    assert.equal(data.store.storeId, 'global-store-1');
    assert.ok(data.products.length > 0);
  });
});
