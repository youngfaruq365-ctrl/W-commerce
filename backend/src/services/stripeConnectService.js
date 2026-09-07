/**
 * Stripe Connect Service - Split Payments for Marketplaces
 * Handles Connect accounts for sellers and split payments
 */

let Stripe;
try {
  Stripe = require('stripe');
} catch (e) {
  console.warn('[STRIPE] stripe package not installed. Payments disabled.');
}

const logger = require('../utils/logger');
const { allowMockExternalApis, isStripeSecretConfigured } = require('../utils/providerConfig');

let stripe = null;

function getStripeUnavailableError(action) {
  return new Error(`Stripe Connect is not configured. Cannot ${action} until STRIPE_SECRET_KEY is set.`);
}

/**
 * Initialize Stripe with API key
 */
function initializeStripe() {
  if (!Stripe) {
    logger.warn('[STRIPE] stripe package not installed. Payments disabled.');
    return;
  }

  if (isStripeSecretConfigured()) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    logger.info('[STRIPE] Stripe initialized with Connect support');
  } else if (allowMockExternalApis()) {
    stripe = null;
    logger.warn('[STRIPE] Explicit mock mode enabled for Stripe Connect');
  } else {
    stripe = null;
    logger.warn('[STRIPE] Stripe Connect unavailable: STRIPE_SECRET_KEY not configured');
  }
}

/**
 * Check if Stripe is configured
 */
function isConfigured() {
  return stripe !== null;
}

/**
 * Create a Stripe Connect account for a seller
 */
async function createConnectAccount(seller) {
  if (!stripe) {
    if (!allowMockExternalApis()) {
      throw getStripeUnavailableError('create a Connect account');
    }
    return { id: `acct_mock_${seller.id}`, mock: true };
  }

  try {
    const account = await stripe.accounts.create({
      type: 'express',
      country: seller.country || 'US',
      email: seller.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      },
      business_type: 'individual',
      individual: {
        first_name: seller.fullName?.split(' ')[0] || '',
        last_name: seller.fullName?.split(' ').slice(1).join(' ') || '',
        email: seller.email
      }
    });

    logger.info(`[STRIPE] Created Connect account: ${account.id}`);
    return account;
  } catch (error) {
    logger.error('[STRIPE] Failed to create Connect account:', error);
    throw error;
  }
}

/**
 * Create account link for onboarding
 */
async function createAccountLink(accountId, returnUrl, refreshUrl) {
  if (!stripe) {
    if (!allowMockExternalApis()) {
      throw getStripeUnavailableError('create an account onboarding link');
    }
    return { url: returnUrl, mock: true };
  }

  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding'
    });

    return accountLink;
  } catch (error) {
    logger.error('[STRIPE] Failed to create account link:', error);
    throw error;
  }
}

/**
 * Get Connect account status
 */
async function getAccountStatus(accountId) {
  if (!stripe) {
    if (!allowMockExternalApis()) {
      throw getStripeUnavailableError('fetch account status');
    }
    return { mock: true, charges_enabled: true, payouts_enabled: true };
  }

  try {
    const account = await stripe.accounts.retrieve(accountId);
    return {
      id: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      requirements: account.requirements
    };
  } catch (error) {
    logger.error('[STRIPE] Failed to get account status:', error);
    throw error;
  }
}

/**
 * Create split payment (payment intent with transfer)
 */
async function createSplitPayment(paymentIntentData) {
  const { amount, currency, sellerId, sellerStripeAccountId, platformFee, metadata } = paymentIntentData;

  if (!stripe) {
    if (!allowMockExternalApis()) {
      throw getStripeUnavailableError('create a split payment');
    }
    const mockId = `pi_mock_${Date.now()}`;
    logger.warn(`[STRIPE MOCK] Split payment: ${amount} ${currency}, fee: ${platformFee}`);
    return {
      id: mockId,
      client_secret: `${mockId}_secret`,
      status: 'requires_payment_method',
      mock: true
    };
  }

  try {
    // Calculate platform fee (default 10%)
    const fee = platformFee || Math.round(amount * 0.10);

    // Create payment intent with transfer data
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: currency || 'usd',
      payment_method_types: ['card'],
      metadata: {
        ...metadata,
        sellerId,
        platformFee: fee.toString()
      },
      transfer_data: sellerStripeAccountId ? {
        destination: sellerStripeAccountId,
        amount: amount - fee
      } : undefined,
      application_fee_amount: sellerStripeAccountId ? fee : undefined
    });

    logger.info(`[STRIPE] Created split payment: ${paymentIntent.id}, fee: ${fee}`);
    return paymentIntent;
  } catch (error) {
    logger.error('[STRIPE] Failed to create split payment:', error);
    throw error;
  }
}

/**
 * Create direct transfer to seller
 */
async function createTransfer(amount, destinationAccountId, transferGroup) {
  if (!stripe) {
    if (!allowMockExternalApis()) {
      throw getStripeUnavailableError('create a seller transfer');
    }
    return { id: `tr_mock_${Date.now()}`, mock: true };
  }

  try {
    const transfer = await stripe.transfers.create({
      amount,
      currency: 'usd',
      destination: destinationAccountId,
      transfer_group: transferGroup
    });

    logger.info(`[STRIPE] Created transfer: ${transfer.id}`);
    return transfer;
  } catch (error) {
    logger.error('[STRIPE] Failed to create transfer:', error);
    throw error;
  }
}

/**
 * Create refund with proportional return to buyer
 */
async function createRefund(paymentIntentId, amount, reason) {
  if (!stripe) {
    if (!allowMockExternalApis()) {
      throw getStripeUnavailableError('create a refund');
    }
    return { id: `re_mock_${Date.now()}`, mock: true };
  }

  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount,
      reason: reason || 'requested_by_customer'
    });

    logger.info(`[STRIPE] Created refund: ${refund.id}`);
    return refund;
  } catch (error) {
    logger.error('[STRIPE] Failed to create refund:', error);
    throw error;
  }
}

/**
 * Get payment details
 */
async function getPaymentIntent(paymentIntentId) {
  if (!stripe) {
    if (!allowMockExternalApis()) {
      throw getStripeUnavailableError('fetch payment intent details');
    }
    return { id: paymentIntentId, mock: true };
  }

  try {
    return await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (error) {
    logger.error('[STRIPE] Failed to get payment intent:', error);
    throw error;
  }
}

/**
 * Create checkout session for direct payment
 */
async function createCheckoutSession(sessionData) {
  const { lineItems, successUrl, cancelUrl, sellerStripeAccountId, metadata } = sessionData;

  if (!stripe) {
    if (!allowMockExternalApis()) {
      throw getStripeUnavailableError('create a checkout session');
    }
    return { url: successUrl, mock: true };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        ...metadata,
        sellerId: metadata?.sellerId
      },
      payment_intent_data: sellerStripeAccountId ? {
        application_fee_amount: Math.round(lineItems[0].price_data.unit_amount * 0.10),
        transfer_data: {
          destination: sellerStripeAccountId
        }
      } : undefined
    });

    return session;
  } catch (error) {
    logger.error('[STRIPE] Failed to create checkout session:', error);
    throw error;
  }
}

initializeStripe();

module.exports = {
  initializeStripe,
  isConfigured,
  createConnectAccount,
  createAccountLink,
  getAccountStatus,
  createSplitPayment,
  createTransfer,
  createRefund,
  getPaymentIntent,
  createCheckoutSession
};
