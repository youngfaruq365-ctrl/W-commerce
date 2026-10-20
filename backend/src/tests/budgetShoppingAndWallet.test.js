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
const payaiOrchestrator = require('../services/payai/payaiOrchestrator');
const cartService = require('../services/payai/cartService');

describe('PayAI Budget-Based Wallet Shopping & Financial Controls', () => {
  let testBuyer;
  let testSeller;
  let testStore;
  let budgetProduct1;
  let budgetProduct2;
  let expensiveProduct;
  let testSession;

  before(async () => {
    // 1. Create test buyer with funded Wallet
    testBuyer = await prisma.user.create({
      data: {
        email: `buyer-budget-${Date.now()}@example.com`,
        fullName: 'Budget Shopper VIP',
        passwordHash: 'dummy-hash',
        role: 'BUYER'
      }
    });

    await prisma.wallet.create({
      data: {
        userId: testBuyer.id,
        gongAvailable: 50000.0, // ₦50,000 NGN balance
        gxAvailable: 0,
        status: 'ACTIVE'
      }
    });

    // 2. Create test seller and store
    testSeller = await prisma.user.create({
      data: {
        email: `seller-budget-${Date.now()}@example.com`,
        fullName: 'Budget Mart Merchant',
        passwordHash: 'dummy-hash',
        role: 'SELLER'
      }
    });

    testStore = await prisma.store.create({
      data: {
        sellerId: testSeller.id,
        storeName: 'Budget Mart Verified Store',
        country: 'NG',
        approvalStatus: 'APPROVED',
        isVerified: true
      }
    });

    // 3. Create products with varied prices
    budgetProduct1 = await prisma.product.create({
      data: {
        storeId: testStore.id,
        title: 'Wireless Gaming Mouse',
        description: 'Ergonomic high-precision RGB gaming mouse.',
        price: 15000.0,
        stock: 20,
        shippingFee: 2000.0,
        category: 'electronics',
        isNegotiable: true,
        bottomPrice: 12000.0
      }
    });

    budgetProduct2 = await prisma.product.create({
      data: {
        storeId: testStore.id,
        title: 'Mechanical Number Pad',
        description: 'Hot-swappable custom switch numpad.',
        price: 12000.0,
        stock: 15,
        shippingFee: 1500.0,
        category: 'electronics',
        isNegotiable: true,
        bottomPrice: 10000.0
      }
    });

    expensiveProduct = await prisma.product.create({
      data: {
        storeId: testStore.id,
        title: 'Ultra Curved Gaming Monitor 49-inch',
        description: 'Premium ultra-wide OLED display.',
        price: 350000.0,
        stock: 5,
        shippingFee: 15000.0,
        category: 'electronics',
        isNegotiable: false
      }
    });

    // 4. Create PayAI session
    const sessionRes = await payaiOrchestrator.createSession({
      userId: testBuyer.id,
      marketCode: 'NIGERIA',
      destinationCountry: 'NG'
    });
    testSession = sessionRes.session;
  });

  after(async () => {
    try {
      if (budgetProduct1) await prisma.product.delete({ where: { id: budgetProduct1.id } }).catch(() => {});
      if (budgetProduct2) await prisma.product.delete({ where: { id: budgetProduct2.id } }).catch(() => {});
      if (expensiveProduct) await prisma.product.delete({ where: { id: expensiveProduct.id } }).catch(() => {});
      if (testStore) await prisma.store.delete({ where: { id: testStore.id } }).catch(() => {});
      if (testBuyer) {
        await prisma.walletLedgerEntry.deleteMany({ where: { userId: testBuyer.id } }).catch(() => {});
        await prisma.wallet.deleteMany({ where: { userId: testBuyer.id } }).catch(() => {});
        await prisma.payAIOrder.deleteMany({ where: { userId: testBuyer.id } }).catch(() => {});
        await prisma.user.delete({ where: { id: testBuyer.id } }).catch(() => {});
      }
      if (testSeller) await prisma.user.delete({ where: { id: testSeller.id } }).catch(() => {});
      if (testSession) {
        await prisma.payAIMessage.deleteMany({ where: { sessionId: testSession.id } }).catch(() => {});
        await prisma.payAISession.delete({ where: { id: testSession.id } }).catch(() => {});
      }
    } catch (_) {}
  });

  describe('1. Intent Detection for Budget Shopping & Wallet Balance', () => {
    test('Routes "within my available balance" to budget_shopping_plan', () => {
      const intent = payaiOrchestrator._detectIntent('Find electronics within my available balance', testSession);
      assert.equal(intent.toolName, 'budget_shopping_plan');
    });

    test('Routes "use my wallet" to budget_shopping_plan (without auto-deducting)', () => {
      const intent = payaiOrchestrator._detectIntent('I want to use my wallet to buy something', testSession);
      assert.equal(intent.toolName, 'budget_shopping_plan');
    });

    test('Routes explicit "pay with wallet" command to checkout_with_wallet', () => {
      const intent = payaiOrchestrator._detectIntent('Authorize payment and pay with wallet ₦20,000', testSession);
      assert.equal(intent.toolName, 'checkout_with_wallet');
    });
  });

  describe('2. Safe Budget Shopping Plan (Zero Unapproved Deductions)', () => {
    test('Looks up user wallet via prisma.wallet.findUnique and presents feasible plan', async () => {
      const result = await payaiOrchestrator.executeTool({
        toolName: 'budget_shopping_plan',
        toolArgs: { query: 'gaming' },
        sessionId: testSession.id,
        userId: testBuyer.id,
        marketCode: 'NIGERIA'
      });

      assert.equal(result.success, true);
      assert.equal(result.isFeasible, true);
      assert.equal(result.availableBalanceNGN, 50000);
      assert.equal(result.fundsCommitted, false, 'CRITICAL: Funds must NOT be committed or deducted!');
      assert.ok(result.items.length > 0, 'Plan includes affordable items');
      assert.ok(result.financialSummary.totalRequiredNGN <= 50000, 'Total fits within available balance');
      assert.ok(result.actionCard, 'Action card is provided for explicit user approval');
      assert.match(result.actionCard.buttonLabel, /Authorize & Pay/i);

      // Verify DB wallet balance was NOT touched
      const walletCheck = await prisma.wallet.findUnique({ where: { userId: testBuyer.id } });
      assert.equal(Number(walletCheck.gongAvailable), 50000, 'Wallet balance remains strictly intact');
    });

    test('PayAI conversational chat presents plan with action card button and zero unapproved deductions', async () => {
      const chatRes = await payaiOrchestrator.handleUserMessage({
        sessionId: testSession.id,
        userId: testBuyer.id,
        userMessage: 'Show me what I can buy within my available balance'
      });

      assert.ok(chatRes.message);
      assert.match(chatRes.message.content, /PayAI Budget Shopping Plan/i);
      assert.match(chatRes.message.content, /50,000/);
      assert.match(chatRes.message.content, /Funds have NOT been deducted/i);
      assert.match(chatRes.message.content, /Authorize & Pay/i);

      // Verify DB wallet balance still 50,000
      const walletCheck = await prisma.wallet.findUnique({ where: { userId: testBuyer.id } });
      assert.equal(Number(walletCheck.gongAvailable), 50000);
    });
  });

  describe('3. Authorized Wallet Checkout, Idempotency & Dual-Cart Sync', () => {
    test('Deducts funds only upon explicit checkout, generates unique idempotency keys and clears dual carts', async () => {
      // 1. Add item to dual carts first
      const cart = await cartService.getOrCreateCart({ userId: testBuyer.id, sessionId: testSession.id, marketCode: 'NIGERIA' });
      await cartService.addItem(cart.id, {
        productId: budgetProduct1.id,
        quantity: 1,
        title: budgetProduct1.title,
        price: budgetProduct1.price,
        currency: 'NGN'
      });

      let userMainCart = await prisma.cart.findUnique({ where: { userId: testBuyer.id } });
      if (!userMainCart) {
        userMainCart = await prisma.cart.create({ data: { userId: testBuyer.id } });
      }
      await prisma.cartItem.create({
        data: {
          cartId: userMainCart.id,
          productId: budgetProduct1.id,
          quantity: 1
        }
      });

      // Verify carts have items
      const prePayAiCart = await cartService.getCart(cart.id);
      assert.equal(prePayAiCart.items.length, 1);
      const preMainItems = await prisma.cartItem.findMany({ where: { cartId: userMainCart.id } });
      assert.equal(preMainItems.length, 1);

      // 2. Explicitly authorize checkout with wallet for ₦17,000 (item + shipping)
      const checkoutResult = await payaiOrchestrator.executeTool({
        toolName: 'checkout_with_wallet',
        toolArgs: {
          amountNGN: 17000,
          items: [{ title: budgetProduct1.title, price: 17000, quantity: 1 }]
        },
        sessionId: testSession.id,
        userId: testBuyer.id,
        destinationCountry: 'NG'
      });

      assert.equal(checkoutResult.success, true);
      assert.equal(checkoutResult.status, 'PAID_IN_ESCROW');
      assert.equal(checkoutResult.grandTotalNGN, 17000);
      assert.equal(checkoutResult.remainingWalletNGN, 33000); // 50,000 - 17,000 = 33,000
      assert.ok(checkoutResult.orderNumber);
      assert.ok(checkoutResult.trackingNumber);

      // 3. Verify Wallet in DB is decremented
      const walletAfter = await prisma.wallet.findUnique({ where: { userId: testBuyer.id } });
      assert.equal(Number(walletAfter.gongAvailable), 33000, 'Wallet decremented accurately');

      // 4. Verify WalletLedgerEntry created with idempotencyKey
      const ledgerEntry = await prisma.walletLedgerEntry.findFirst({
        where: { referenceId: checkoutResult.orderNumber }
      });
      assert.ok(ledgerEntry, 'Ledger entry created');
      assert.equal(ledgerEntry.direction, 'DEBIT');
      assert.equal(Number(ledgerEntry.amount), 17000);
      assert.equal(ledgerEntry.idempotencyKey, `LEDGER-${checkoutResult.orderNumber}`, 'Uses unique idempotency key');

      // 5. Verify PayAIOrder created in DB with idempotencyKey and fulfillmentStatus: 'PAID_IN_ESCROW'
      const orderInDb = await prisma.payAIOrder.findFirst({
        where: { orderNumber: checkoutResult.orderNumber }
      });
      assert.ok(orderInDb, 'Order record created in DB');
      assert.equal(orderInDb.paymentStatus, 'VERIFIED');
      assert.equal(orderInDb.fulfillmentStatus, 'PAID_IN_ESCROW');
      assert.equal(orderInDb.idempotencyKey, `ORDER-${checkoutResult.orderNumber}`, 'Order has unique idempotency key');

      // 6. Verify Dual-Cart Synchronization: Both PayAICart and main prisma.cart are cleanly cleared
      const postPayAiCart = await cartService.getCart(cart.id);
      assert.equal(postPayAiCart.items.length, 0, 'PayAI session cart is cleared');

      const postMainItems = await prisma.cartItem.findMany({ where: { cartId: userMainCart.id } });
      assert.equal(postMainItems.length, 0, 'User main cart is cleanly synchronized and cleared');
    });

    test('Rejects wallet checkout when requested amount exceeds available balance', async () => {
      await assert.rejects(
        async () => {
          await payaiOrchestrator.executeTool({
            toolName: 'checkout_with_wallet',
            toolArgs: { amountNGN: 90000 }, // Balance is 33,000
            sessionId: testSession.id,
            userId: testBuyer.id,
            destinationCountry: 'NG'
          });
        },
        /Insufficient W-Commerce Wallet balance/i
      );

      // Verify wallet balance remained untouched
      const walletCheck = await prisma.wallet.findUnique({ where: { userId: testBuyer.id } });
      assert.equal(Number(walletCheck.gongAvailable), 33000);
    });
  });
});
