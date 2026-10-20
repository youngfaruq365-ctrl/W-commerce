'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const sellerExternalSiteService = require('../services/payai/sellerExternalSiteService');

describe('SellerExternalSiteService & SSRF Security Audit Test Suite', () => {

  describe('1. SSRF Protection & URL Validation', () => {
    test('strictly blocks 127.0.0.1 and loopback IPs in 127.0.0.0/8', () => {
      const loopbacks = [
        'http://127.0.0.1',
        'http://127.0.0.2',
        'http://127.1.2.3',
        'http://127.255.255.254',
        'http://localhost',
        'http://localhost:3000',
        'http://[::1]',
        'http://0.0.0.0',
        'http://2130706433', // 127.0.0.1 in integer notation
        'http://0x7f000001', // 127.0.0.1 in hex notation
        'http://0177.0.0.1'   // 127.0.0.1 with octal prefix
      ];

      for (const url of loopbacks) {
        assert.throws(
          () => sellerExternalSiteService.validateUrlSecurity(url),
          /forbidden|private/i,
          `Expected ${url} to be blocked by validateUrlSecurity`
        );
      }
    });

    test('strictly blocks RFC 1918 private IP ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)', () => {
      const privateIps = [
        'http://10.0.0.1',
        'http://10.254.1.5',
        'http://172.16.0.1',
        'http://172.24.10.20',
        'http://172.31.255.255',
        'http://192.168.0.1',
        'http://192.168.1.100',
        'http://192.168.254.254'
      ];

      for (const url of privateIps) {
        assert.throws(
          () => sellerExternalSiteService.validateUrlSecurity(url),
          /forbidden|private/i,
          `Expected ${url} to be blocked by validateUrlSecurity`
        );
      }
    });

    test('strictly blocks RFC 3927 link-local and cloud metadata endpoints (169.254.169.254)', () => {
      const metadataUrls = [
        'http://169.254.169.254',
        'http://169.254.169.254/latest/meta-data/',
        'http://169.254.1.1',
        'http://169.254.254.254',
        'http://metadata.google.internal',
        'http://instance-data'
      ];

      for (const url of metadataUrls) {
        assert.throws(
          () => sellerExternalSiteService.validateUrlSecurity(url),
          /forbidden|private/i,
          `Expected ${url} to be blocked by validateUrlSecurity`
        );
      }
    });

    test('strictly blocks internal/local TLDs and DNS rebinding hosts', () => {
      const internalHosts = [
        'http://service.local',
        'http://app.internal',
        'http://backend.lan',
        'http://cluster.localdomain',
        'http://router.home.arpa',
        'http://corp.intranet',
        'http://127.0.0.1.nip.io',
        'http://customer.sslip.io'
      ];

      for (const url of internalHosts) {
        assert.throws(
          () => sellerExternalSiteService.validateUrlSecurity(url),
          /forbidden|private/i,
          `Expected ${url} to be blocked by validateUrlSecurity`
        );
      }
    });

    test('strictly blocks non-http(s) protocols', () => {
      const nonHttp = [
        'file:///etc/passwd',
        'file:///c:/windows/win.ini',
        'ftp://anonymous:pass@example.com/file.txt',
        'javascript:alert(1)',
        'data:text/html;base64,PHNjcmlwdD4=',
        'gopher://gopher.example.com'
      ];

      for (const url of nonHttp) {
        assert.throws(
          () => sellerExternalSiteService.validateUrlSecurity(url),
          /Unsupported protocol|Invalid URL format/i,
          `Expected ${url} to be blocked due to invalid/non-http protocol`
        );
      }
    });

    test('rejects empty, null, or malformed URL input', () => {
      const invalidInputs = [null, undefined, '', '   ', 'not-a-url', 12345];
      for (const input of invalidInputs) {
        assert.throws(
          () => sellerExternalSiteService.validateUrlSecurity(input),
          /valid URL string|Invalid URL format/i
        );
      }
    });

    test('allows legitimate public HTTP and HTTPS URLs', () => {
      const validUrls = [
        'https://myshopify-store.myshopify.com',
        'https://www.nike.com/products',
        'http://shop.example.com',
        'https://fashion-hub.co.uk/store'
      ];

      for (const url of validUrls) {
        const parsed = sellerExternalSiteService.validateUrlSecurity(url);
        assert.ok(parsed);
        assert.ok(['http:', 'https:'].includes(parsed.protocol));
      }
    });
  });

  describe('2. Platform Detection', () => {
    test('detects Shopify from myshopify.com or /products/ path', () => {
      assert.equal(sellerExternalSiteService.detectPlatform('https://brand.myshopify.com'), 'shopify');
      assert.equal(sellerExternalSiteService.detectPlatform('https://coolbrand.com/products/summer-tee'), 'shopify');
      assert.equal(sellerExternalSiteService.detectPlatform('https://coolbrand.com/collections/frontpage'), 'shopify');
    });

    test('detects WooCommerce from /wp-content/ or /product/ path', () => {
      assert.equal(sellerExternalSiteService.detectPlatform('https://artisan-shop.com/product/ceramic-mug'), 'woocommerce');
      assert.equal(sellerExternalSiteService.detectPlatform('https://artisan-shop.com/wp-content/themes/store'), 'woocommerce');
    });

    test('detects major marketplaces (Amazon, AliExpress, eBay, ASOS)', () => {
      assert.equal(sellerExternalSiteService.detectPlatform('https://www.amazon.com/dp/B08N5WRWNW'), 'amazon');
      assert.equal(sellerExternalSiteService.detectPlatform('https://www.aliexpress.com/item/100500123.html'), 'aliexpress');
      assert.equal(sellerExternalSiteService.detectPlatform('https://www.ebay.com/itm/123456789'), 'ebay');
      assert.equal(sellerExternalSiteService.detectPlatform('https://www.asos.com/prd/123456'), 'asos');
    });

    test('defaults unknown stores to custom_store', () => {
      assert.equal(sellerExternalSiteService.detectPlatform('https://independent-boutique.com'), 'custom_store');
    });
  });

  describe('3. Multi-Platform Extraction & Synthetic Fallback', () => {
    test('extracts schema.org Product items recursively from JSON-LD graph and ItemList', () => {
      const sampleGraph = {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebSite',
            name: 'Test Store'
          },
          {
            '@type': 'Product',
            name: 'Graph Vintage Jacket',
            description: 'Classic leather jacket',
            category: 'Outerwear',
            offers: {
              price: '129.99',
              priceCurrency: 'USD'
            },
            image: {
              url: 'https://images.unsplash.com/photo-jacket.jpg'
            }
          }
        ]
      };

      const products = sellerExternalSiteService._extractSchemaProducts(sampleGraph);
      assert.equal(products.length, 1);
      assert.equal(products[0].name, 'Graph Vintage Jacket');
    });

    test('extracts schema.org Product items from ItemList with itemListElement', () => {
      const sampleItemList = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            item: {
              '@type': 'Product',
              name: 'Catalog Item 1',
              offers: [{ price: 49.99 }]
            }
          },
          {
            '@type': 'ListItem',
            position: 2,
            item: {
              '@type': 'Product',
              name: 'Catalog Item 2',
              offers: { lowPrice: 69.99 }
            }
          }
        ]
      };

      const products = sellerExternalSiteService._extractSchemaProducts(sampleItemList);
      assert.equal(products.length, 2);
      assert.equal(products[0].name, 'Catalog Item 1');
      assert.equal(products[1].name, 'Catalog Item 2');
    });

    test('generates realistic synthetic fallback products for custom webstores lacking public APIs', async () => {
      // Pointing to a dummy domain that will fail network calls and trigger synthetic fallback
      const result = await sellerExternalSiteService.fetchProductsFromExternalUrl({
        storeUrl: 'https://aurora-boutique-unique-test.com',
        limit: 10
      });

      assert.equal(result.success, true);
      assert.ok(result.products.length > 0, 'Must provide synthetic starter products');
      assert.ok(result.products.some(p => p.title.includes('Aurora') || p.title.includes('Premier')));
      assert.ok(result.categories.length > 0, 'Categories must be populated');
      assert.ok(result.totalCount > 0);
      assert.equal(result.storeName, 'Aurora-boutique-unique-test');
    });

    test('synthesizes query-matching starter items when query is provided', async () => {
      const result = await sellerExternalSiteService.fetchProductsFromExternalUrl({
        storeUrl: 'https://zenith-athletics-test.com',
        query: 'sneakers'
      });

      assert.equal(result.success, true);
      assert.ok(result.products.length > 0);
      // Query search should surface matching items
      const hasMatch = result.products.some(p =>
        p.title.toLowerCase().includes('sneakers') ||
        p.description.toLowerCase().includes('sneakers') ||
        p.category.toLowerCase().includes('sneakers')
      );
      assert.ok(hasMatch, 'Query search for "sneakers" should match synthetic products');
    });
  });

  describe('4. Filtering, Search, Price Range, and Pagination', () => {
    test('filters synthetic or extracted catalog by price range (minPrice, maxPrice)', async () => {
      const resultAll = await sellerExternalSiteService.fetchProductsFromExternalUrl({
        storeUrl: 'https://benchmark-store-test.com',
        limit: 20
      });

      const minPrice = 50;
      const maxPrice = 100;
      const resultFiltered = await sellerExternalSiteService.fetchProductsFromExternalUrl({
        storeUrl: 'https://benchmark-store-test.com',
        minPrice,
        maxPrice,
        limit: 20
      });

      assert.equal(resultFiltered.success, true);
      for (const p of resultFiltered.products) {
        assert.ok(p.price >= minPrice, `Product price ${p.price} must be >= ${minPrice}`);
        assert.ok(p.price <= maxPrice, `Product price ${p.price} must be <= ${maxPrice}`);
      }
    });

    test('filters by category accurately and ignores "all"', async () => {
      const resultCategory = await sellerExternalSiteService.fetchProductsFromExternalUrl({
        storeUrl: 'https://benchmark-store-test.com',
        category: 'Electronics',
        limit: 20
      });

      assert.equal(resultCategory.success, true);
      for (const p of resultCategory.products) {
        assert.match(p.category, /Electronics/i);
      }

      // "all" should return all categories
      const resultAll = await sellerExternalSiteService.fetchProductsFromExternalUrl({
        storeUrl: 'https://benchmark-store-test.com',
        category: 'all',
        limit: 20
      });
      assert.ok(resultAll.products.length >= resultCategory.products.length);
    });

    test('supports pagination with limit and page numbers', async () => {
      const page1 = await sellerExternalSiteService.fetchProductsFromExternalUrl({
        storeUrl: 'https://benchmark-store-test.com',
        limit: 3,
        page: 1
      });

      const page2 = await sellerExternalSiteService.fetchProductsFromExternalUrl({
        storeUrl: 'https://benchmark-store-test.com',
        limit: 3,
        page: 2
      });

      assert.equal(page1.success, true);
      assert.equal(page2.success, true);
      assert.equal(page1.products.length, 3);
      assert.equal(page1.page, 1);
      assert.equal(page2.page, 2);
      assert.notEqual(page1.products[0].externalProductId, page2.products[0].externalProductId);
    });
  });

});
