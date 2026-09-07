/**
 * Monnify Payment Controller
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles Monnify Reserve Account + Payment Widget initialization.
 *
 * Flow:
 *   POST /api/v1/payment/monnify-intent
 *     → Validates cart items against DB
 *     → Creates PENDING Order
 *     → Initializes Monnify transaction (gets transactionReference)
 *     → Returns normalized response to frontend
 *
 *   GET  /api/v1/payment/verify/:reference
 *     → Handled by existing paymentController.verifyTransaction
 *     → We add Monnify verification path here
 *
 *   POST /api/v1/webhooks/monnify
 *     → Monnify sends PAID event
 *     → Calls finalizeOrder() (same as Paystack/Stripe)
 */

const https   = require('https');
const crypto  = require('crypto');
const prisma  = require('../utils/prismaClient');
const logger  = require('../utils/logger');

// ─── Monnify API helper ────────────────────────────────────────────────────────

function getMonnifyAuth() {
  const apiKey    = process.env.MONNIFY_API_KEY;
  const secretKey = process.env.MONNIFY_SECRET_KEY;
  if (!apiKey || !secretKey) throw new Error('Monnify credentials not configured');
  return Buffer.from(`${apiKey}:${secretKey}`).toString('base64');
}

function monnifyRequest(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const isTest    = process.env.NODE_ENV !== 'production';
    const hostname  = isTest ? 'sandbox.monnify.com' : 'api.monnify.com';
    const auth      = getMonnifyAuth();
    const postData  = body ? JSON.stringify(body) : null;

    const options = {
      hostname,
      path:    `/api/v1${endpoint}`,
      method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type':  'application/json',
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Invalid Monnify response')); }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

// ─── Tax / shipping helper (matches paymentController) ───────────────────────
function getTaxRate(region) {
  switch (region) {
    case 'EU': return 0.21;
    case 'UK': return 0.20;
    case 'MENA': return 0.05;
    case 'NG':   return 0.075;
    default:     return 0.08;
  }
}

// ─── Initialize Monnify Payment ────────────────────────────────────────────────

exports.createMonnifyPayment = async (req, res) => {
  try {
    const { items, shippingAddress, isConsolidated, region = 'NG' } = req.body;
    const userId = req.user.id;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty.' });
    }

    // 1. Backend price validation (never trust frontend prices)
    let subtotal = 0;
    const orderItemsData = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: String(item.productId) },
      });
      if (!product) {
        return res.status(404).json({ success: false, message: `Product ${item.productId} not found.` });
      }
      const finalPrice = (product.isFlashSale && product.flashPrice)
        ? Number(product.flashPrice)
        : Number(product.price);
      subtotal += finalPrice * item.quantity;
      orderItemsData.push({ productId: product.id, quantity: item.quantity, priceAtTime: finalPrice });
    }

    // 2. Shipping + Tax
    const sellerCount   = new Set(items.map(i => i.seller).filter(Boolean)).size || 1;
    let shippingCost    = sellerCount * 15;
    if (isConsolidated) shippingCost = Math.max(15, shippingCost * 0.6);
    const discount      = subtotal > 150 ? 10.00 : (subtotal > 80 ? 5.00 : 0);
    const rate          = getTaxRate(region);
    const taxableAmount = Math.max(0, subtotal + shippingCost - discount);
    const taxAmount     = taxableAmount * rate;
    const totalAmountUSD = subtotal + shippingCost - discount + taxAmount;

    // 3. Create PENDING order
    const primarySellerId = items[0]?.sellerId || null;
    const COMMISSION_RATE = parseFloat(process.env.PLATFORM_COMMISSION_RATE || '0.10');

    const order = await prisma.order.create({
      data: {
        buyerId:          userId,
        totalAmount:      totalAmountUSD,
        shippingCost,
        taxAmount,
        status:           'PENDING',
        paymentStatus:    'PENDING',
        paymentMethod:    'MONNIFY',
        sellerId:         primarySellerId,
        commissionRate:   COMMISSION_RATE,
        commissionAmount: totalAmountUSD * COMMISSION_RATE,
        sellerAmount:     totalAmountUSD * (1 - COMMISSION_RATE),
        items:            { create: orderItemsData },
        shippingAddress:  typeof shippingAddress === 'string'
          ? shippingAddress
          : JSON.stringify(shippingAddress),
      },
    });

    // 4. Get exchange rate (USD → NGN) — use stored rate or default
    const exchangeRates = require('../utils/exchangeRates');
    const ngnRate       = exchangeRates.getRate('USD', 'NGN') || 1500;
    const amountNGN     = totalAmountUSD * ngnRate;

    // 5. Initialize Monnify transaction
    const user    = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, fullName: true, phone: true } });
    const reference = `WCOM-MNF-${order.id.substring(0, 8).toUpperCase()}-${Date.now()}`;

    const monnifyPayload = {
      amount:               amountNGN,
      customerName:         user.fullName,
      customerEmail:        user.email,
      paymentReference:     reference,
      paymentDescription:   `W-Commerce Order #${order.id.substring(0, 8)}`,
      currencyCode:         'NGN',
      contractCode:         process.env.MONNIFY_CONTRACT_CODE,
      redirectUrl:          `${process.env.FRONTEND_URL}/checkout/callback?reference=${reference}`,
      paymentMethods:       ['CARD', 'ACCOUNT_TRANSFER', 'USSD', 'PHONE_NUMBER'],
    };

    const monnifyRes = await monnifyRequest('/merchant/transactions/init-transaction', 'POST', monnifyPayload);

    if (!monnifyRes.requestSuccessful) {
      throw new Error(monnifyRes.responseMessage || 'Monnify init failed');
    }

    // Save reference to order
    await prisma.order.update({
      where: { id: order.id },
      data:  { stripePaymentId: reference }, // reuse ref field
    });

    logger.info(`[MONNIFY] Transaction initialized for Order ${order.id}, ref: ${reference}`);

    return res.json({
      success:          true,
      provider:         'MONNIFY',
      reference,
      access_code:      monnifyRes.responseBody?.checkoutUrl || null, // Monnify uses a checkout URL, not access_code
      authorization_url:monnifyRes.responseBody?.checkoutUrl || null,
      orderId:          order.id,
      amount:           totalAmountUSD,
      currency:         'NGN',
    });

  } catch (error) {
    logger.error(`[MONNIFY] Init Error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Monnify payment initialization failed', error: error.message });
  }
};

// ─── Verify Monnify Transaction ────────────────────────────────────────────────

exports.verifyMonnifyTransaction = async (req, res) => {
  try {
    const { reference } = req.params;

    const verifyRes = await monnifyRequest(
      `/merchant/transactions/query?paymentReference=${encodeURIComponent(reference)}`
    );

    if (!verifyRes.requestSuccessful) {
      return res.json({ success: false, message: verifyRes.responseMessage || 'Verification failed' });
    }

    const txn = verifyRes.responseBody;
    if (txn.paymentStatus === 'PAID') {
      const orderId = reference.split('-').slice(0, -1).join('-'); // extract order portion
      // Find the actual order by the reference stored in stripePaymentId
      const order = await prisma.order.findFirst({
        where: { stripePaymentId: reference },
      });

      if (order) {
        const { finalizeOrder } = require('./paymentController');
        if (typeof finalizeOrder === 'function') {
          await finalizeOrder(order.id, reference, txn.amountPaid / 100, req.user?.id, 'MONNIFY');
        }
      }

      return res.json({
        success: true,
        message: 'Payment verified successfully',
        data:    txn,
      });
    }

    return res.json({
      success: false,
      message: 'Payment not successful',
      status:  txn.paymentStatus,
    });

  } catch (error) {
    logger.error(`[MONNIFY] Verify Error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Verification failed', error: error.message });
  }
};

// ─── Monnify Webhook ───────────────────────────────────────────────────────────

exports.handleMonnifyWebhook = async (req, res) => {
  try {
    // Verify Monnify webhook signature
    const monnifySecret    = process.env.MONNIFY_SECRET_KEY;
    const receivedHash     = req.headers['monnify-signature'];
    const computedHash     = crypto
      .createHmac('sha512', monnifySecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (receivedHash && receivedHash !== computedHash) {
      logger.error('[MONNIFY WEBHOOK] Invalid signature');
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    const event     = req.body;
    const eventType = event.eventType;
    logger.info(`[MONNIFY WEBHOOK] Event: ${eventType}`);

    if (eventType === 'SUCCESSFUL_TRANSACTION') {
      const txn       = event.eventData;
      const reference = txn.paymentReference;

      // Find order by reference
      const order = await prisma.order.findFirst({
        where: { stripePaymentId: reference },
      });

      if (order && order.status !== 'PAID') {
        const { finalizeOrder } = require('./paymentController');
        if (typeof finalizeOrder === 'function') {
          await finalizeOrder(order.id, reference, Number(txn.amountPaid), order.buyerId, 'MONNIFY');
          logger.info(`[MONNIFY WEBHOOK] Order ${order.id} finalized via webhook`);
        }
      }
    }

    return res.json({ received: true });
  } catch (error) {
    logger.error(`[MONNIFY WEBHOOK] Error: ${error.message}`);
    return res.status(500).json({ success: false });
  }
};
