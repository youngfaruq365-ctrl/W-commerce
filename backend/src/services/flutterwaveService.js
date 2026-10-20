// backend/src/services/flutterwaveService.js
const logger = require('../utils/logger');
const axios = require('axios');

const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
const { allowMockExternalApis } = require('../utils/providerConfig');
const NOT_CONFIGURED = !FLW_SECRET_KEY || FLW_SECRET_KEY.includes('REPLACE');
const IS_MOCK = NOT_CONFIGURED && allowMockExternalApis();

if (IS_MOCK) {
  logger.warn('[FLUTTERWAVE] Running in MOCK mode (ALLOW_MOCK_EXTERNAL_APIS=true, non-production).');
}

function assertConfigured() {
  if (NOT_CONFIGURED && !IS_MOCK) {
    throw new Error('Flutterwave is not configured (FLW_SECRET_KEY missing)');
  }
}

async function initializePayment(amount, email, reference, currency = 'NGN', redirectUrl = '') {
  assertConfigured();
  if (IS_MOCK) {
    logger.warn('[FLUTTERWAVE MOCK] initializePayment called. Returning simulated response.');
    return {
      success: true,
      payment_url: `https://checkout.flutterwave.com/v3/pay?reference=${reference}&mock=true`,
      reference,
      mock: true
    };
  }
  try {
    const response = await axios.post(
      'https://api.flutterwave.com/v3/payments',
      {
        tx_ref: reference,
        amount,
        currency,
        redirect_url: redirectUrl || process.env.FRONTEND_URL + '/payment/verify',
        customer: { email },
        customizations: {
          title: process.env.APP_NAME || 'W-Commerce',
          logo: process.env.LOGO_URL || ''
        }
      },
      { headers: { Authorization: `Bearer ${FLW_SECRET_KEY}`, 'Content-Type': 'application/json' } }
    );
    return {
      success: true,
      payment_url: response.data.data.link,
      reference,
      mock: false
    };
  } catch (error) {
    logger.error('[FLUTTERWAVE] initializePayment error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Flutterwave payment initialization failed');
  }
}

async function verifyTransaction(transactionId) {
  assertConfigured();
  if (IS_MOCK) {
    logger.warn('[FLUTTERWAVE MOCK] verifyTransaction called.');
    return { success: true, status: 'successful', transaction_id: transactionId, mock: true };
  }
  try {
    const response = await axios.get(
      `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
      { headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` } }
    );
    const data = response.data.data;
    return {
      success: data.status === 'successful',
      status: data.status,
      transaction_id: data.id,
      amount: data.amount,
      currency: data.currency,
      customer: data.customer,
      mock: false
    };
  } catch (error) {
    logger.error('[FLUTTERWAVE] verifyTransaction error:', error.response?.data || error.message);
    throw new Error('Flutterwave transaction verification failed');
  }
}

module.exports = { initializePayment, verifyTransaction };
