// backend/src/services/flutterwaveService.js
const logger = require('../utils/logger');
const axios = require('axios');

const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
const IS_MOCK = !FLW_SECRET_KEY || FLW_SECRET_KEY.includes('REPLACE');

if (IS_MOCK) {
  logger.warn('[FLUTTERWAVE] No FLW_SECRET_KEY found. Running in MOCK mode. Set FLW_SECRET_KEY in .env for live payments.');
}

async function initializePayment(amount, email, reference, currency = 'NGN', redirectUrl = '') {
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
