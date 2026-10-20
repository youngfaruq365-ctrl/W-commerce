/**
 * Paystack Service for Nigerian Escrow Payments
 * Production-ready version (fixed + hardened)
 */

const https = require('https');
const crypto = require('crypto');
const logger = require('../utils/logger');

// ENV
const PAYSTACK_SECRET =
  process.env.PAYSTACK_PRIMARY_SECRET_KEY ||
  process.env.PAYSTACK_SECRET_KEY;

const PAYSTACK_BASE_URL = 'api.paystack.co';

/**
 * 🔧 Helper: Build query string
 */
const buildQuery = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return query ? `?${query}` : '';
};

const ApiClient = require('../utils/apiClient');

/**
 * 🔧 Core Paystack Request Function
 */
const paystackRequest = async (endpoint, method = 'GET', data = null) => {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // ApiClient throws on status === false
  const response = await ApiClient.paystack(path, method, data);
  
  // Legacy paystackService methods expect just the unwrapped .data object
  return response.data;
};

//////////////////////////////////////////////////////////////////
// 💳 TRANSACTIONS
//////////////////////////////////////////////////////////////////

exports.initializeTransaction = async ({
  email,
  amount,
  currency = 'NGN',
  reference,
  metadata
}) => {
  try {
    const payload = {
      email,
      amount: Math.round(amount * 100),
      currency,
      reference,
      metadata: metadata || {},
      callback_url: `${process.env.CLIENT_URL}/payment-success`
    };

    const res = await paystackRequest('transaction/initialize', 'POST', payload);

    return {
      authorizationUrl: res.authorization_url,
      reference: res.reference,
      accessCode: res.access_code
    };
  } catch (err) {
    logger.error('Initialize transaction failed:', err);
    throw err;
  }
};

exports.verifyTransaction = async (reference) => {
  try {
    const res = await paystackRequest(`transaction/verify/${reference}`);

    return {
      status: res.status,
      reference: res.reference,
      amount: res.amount / 100,
      currency: res.currency,
      customer: res.customer,
      metadata: res.metadata,
      paidAt: res.paid_at
    };
  } catch (err) {
    logger.error('Verify transaction failed:', err);
    throw err;
  }
};

//////////////////////////////////////////////////////////////////
// 🏦 BANKING
//////////////////////////////////////////////////////////////////

exports.getBanks = async () => {
  try {
    return await paystackRequest('bank?country=nigeria');
  } catch (err) {
    logger.error('Fetch banks failed:', err);
    throw err;
  }
};

exports.verifyAccount = async (accountNumber, bankCode) => {
  try {
    return await paystackRequest(
      `bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`
    );
  } catch (err) {
    logger.error('Verify account failed:', err);
    throw err;
  }
};

//////////////////////////////////////////////////////////////////
// 🧾 SUBACCOUNT (FOR MARKETPLACE)
//////////////////////////////////////////////////////////////////

exports.createSubaccount = async ({
  businessName,
  accountNumber,
  bankCode,
  percentage
}) => {
  try {
    const payload = {
      business_name: businessName,
      account_number: accountNumber,
      bank_code: bankCode,
      percentage_charge: percentage // Paystack expects % not *100
    };

    const res = await paystackRequest('subaccount', 'POST', payload);

    return {
      subaccountCode: res.subaccount_code,
      businessName: res.business_name
    };
  } catch (err) {
    logger.error('Create subaccount failed:', err);
    throw err;
  }
};

//////////////////////////////////////////////////////////////////
// 💸 TRANSFERS (PAYOUTS)
//////////////////////////////////////////////////////////////////

exports.createTransferRecipient = async ({
  name,
  accountNumber,
  bankCode,
  type = 'nuban'
}) => {
  try {
    const payload = {
      type,
      name,
      account_number: accountNumber,
      bank_code: bankCode,
      currency: 'NGN'
    };
    const res = await paystackRequest('transferrecipient', 'POST', payload);
    
    return {
      recipientCode: res.recipient_code
    };
  } catch (err) {
    if (err.message && err.message.includes('resolve account') && require('../utils/providerConfig').allowMockExternalApis()) {
      logger.warn('Mocking recipient creation due to Paystack test account resolution limits.');
      return { recipientCode: `RCP_MOCK_${Date.now()}` };
    }
    logger.error('Create recipient failed:', err);
    throw err;
  }
};

exports.initiateTransfer = async (amount, recipientCode, reason) => {
  try {
    if (recipientCode.startsWith('RCP_MOCK_')) {
      if (!require('../utils/providerConfig').allowMockExternalApis()) {
        throw new Error('Cannot transfer to a mock recipient. Seller must re-add a valid bank account.');
      }
      logger.warn('Short-circuiting transfer for mock recipient.');
      return {
        reference: `MOCK_TX_${Date.now()}`,
        status: 'success',
        data: { mocked: true }
      };
    }
    
    const payload = {
      source: 'balance',
      amount: Math.round(amount * 100), // Paystack expects amount in kobo
      recipient: recipientCode,
      reason
    };
    const res = await paystackRequest('transfer', 'POST', payload);
    
    return {
      reference: res.reference,
      status: res.status,
      data: res
    };
  } catch (err) {
    if (err.message && err.message.includes('starter business') && require('../utils/providerConfig').allowMockExternalApis()) {
      logger.warn('Mocking transfer success due to Paystack Starter Business limitations.');
      return {
        reference: `MOCK_TX_${Date.now()}`,
        status: 'success',
        data: { mocked: true }
      };
    }
    logger.error('Transfer failed:', err);
    throw err;
  }
};

//////////////////////////////////////////////////////////////////
// 🔁 REFUNDS
//////////////////////////////////////////////////////////////////

exports.createRefund = async ({
  transactionReference,
  amount,
  note
}) => {
  try {
    const payload = {
      transaction: transactionReference,
      amount: amount ? Math.round(amount * 100) : undefined,
      customer_note: note
    };

    const res = await paystackRequest('refund', 'POST', payload);

    return {
      reference: res.reference,
      status: res.status
    };
  } catch (err) {
    logger.error('Refund failed:', err);
    throw err;
  }
};

//////////////////////////////////////////////////////////////////
// 📊 TRANSACTIONS LIST
//////////////////////////////////////////////////////////////////

exports.listTransactions = async ({ perPage = 50, page = 1, status }) => {
  try {
    const query = buildQuery({ perPage, page, status });
    const res = await paystackRequest(`transaction${query}`);

    return res;
  } catch (err) {
    logger.error('List transactions failed:', err);
    throw err;
  }
};

//////////////////////////////////////////////////////////////////
// 💰 BALANCE
//////////////////////////////////////////////////////////////////

exports.getBalance = async () => {
  try {
    const res = await paystackRequest('balance');

    return {
      balance: res[0].balance / 100,
      currency: res[0].currency
    };
  } catch (err) {
    logger.error('Get balance failed:', err);
    throw err;
  }
};

//////////////////////////////////////////////////////////////////
// 🔐 WEBHOOK SECURITY
//////////////////////////////////////////////////////////////////

exports.verifyWebhookSignature = (payload, signature) => {
  try {
    const hash = crypto
      .createHmac('sha512', PAYSTACK_SECRET)
      .update(payload)
      .digest('hex');

    return hash === signature;
  } catch (err) {
    logger.error('Webhook verification failed:', err);
    return false;
  }
};