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

/**
 * 🔧 Core Paystack Request Function
 */
const paystackRequest = (endpoint, method = 'GET', data = null) => {
  return new Promise((resolve, reject) => {
    if (!PAYSTACK_SECRET) {
      logger.error('Paystack secret key not configured');
      return reject(new Error('Paystack not configured'));
    }

    const options = {
      hostname: PAYSTACK_BASE_URL,
      port: 443,
      path: `/${endpoint}`,
      method,
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => (body += chunk));

      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);

          if (parsed.status) {
            resolve(parsed.data);
          } else {
            logger.error('Paystack API Error:', parsed);
            reject(new Error(parsed.message || 'Paystack API error'));
          }
        } catch (err) {
          logger.error('Paystack parse error:', err);
          reject(err);
        }
      });
    });

    req.on('error', (err) => {
      logger.error('Paystack request error:', err);
      reject(err);
    });

    if (data && method !== 'GET') {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
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
    logger.error('Create recipient failed:', err);
    throw err;
  }
};

exports.initiateTransfer = async (amount, recipientCode, reason) => {
  try {
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