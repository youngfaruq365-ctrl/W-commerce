/**
 * W-Commerce PaymentClient
 * ─────────────────────────────────────────────────────────────────────────
 * Provider-agnostic payment abstraction.
 *
 * CheckoutOS never speaks directly to Paystack, Stripe, or Monnify.
 * It only calls this client and receives a normalized response.
 *
 * Normalized response contract:
 * {
 *   success:          boolean,
 *   provider:         'paystack' | 'stripe' | 'monnify' | 'wallet' | 'cod',
 *   reference:        string,       // payment reference (used for verification)
 *   orderId:          string,       // our DB order ID
 *   paymentId:        string,       // optional provider-specific payment ID
 *   accessCode:       string,       // Paystack inline popup access code
 *   authorizationUrl: string,       // Paystack hosted redirect URL (fallback)
 *   clientSecret:     string,       // Stripe client secret (if stripe)
 *   amount:           number,       // total in USD
 *   currency:         string,
 *   error:            string | null
 * }
 */

import axios from 'axios';

axios.defaults.withCredentials = true;

// ─── Core API call ────────────────────────────────────────────────────────────
async function apiPost(endpoint, body) {
  const response = await axios.post(endpoint, body, {
    headers: { 'Idempotency-Key': `wcom-${Date.now()}-${Math.random().toString(36).slice(2)}` },
  });
  return response.data;
}

async function apiGet(endpoint) {
  const response = await axios.get(endpoint);
  return response.data;
}

// ─── Normalize raw backend response to contract ───────────────────────────────
function normalize(raw, provider) {
  if (!raw?.success) {
    return { success: false, error: raw?.message || 'Payment initialization failed' };
  }
  return {
    success: true,
    provider:         (raw.provider || provider || 'paystack').toLowerCase(),
    reference:        raw.reference        || null,
    orderId:          raw.orderId          || null,
    paymentId:        raw.paymentId        || raw.reference || null,
    accessCode:       raw.access_code      || null,
    authorizationUrl: raw.authorization_url || raw.authorizationUrl || null,
    clientSecret:     raw.clientSecret     || null,
    amount:           raw.amount           || raw.totalAmountUSD || null,
    currency:         raw.currency         || 'NGN',
    error:            null,
  };
}

// ─── Paystack ─────────────────────────────────────────────────────────────────
async function initializePaystack(payload) {
  const raw = await apiPost('/api/v1/payment/create-intent', {
    ...payload,
    currency: 'NGN', // Force Paystack path
  });
  return normalize(raw, 'paystack');
}

// ─── Stripe ───────────────────────────────────────────────────────────────────
async function initializeStripe(payload) {
  const raw = await apiPost('/api/v1/payment/create-intent', {
    ...payload,
    currency: 'usd',
  });
  return normalize(raw, 'stripe');
}

// ─── Monnify ──────────────────────────────────────────────────────────────────
// Credentials are in .env (MK_TEST_PMKU16QC5D). Uses Monnify inline JS SDK.
// The backend initializes the transaction and returns a transactionRef.
// We then open the Monnify payment widget using that ref.
async function initializeMonnify(payload) {
  try {
    // Backend creates order + initializes Monnify transaction reference
    const raw = await apiPost('/api/v1/payment/monnify-intent', {
      ...payload,
      currency: 'NGN',
    });
    return normalize(raw, 'monnify');
  } catch (err) {
    return {
      success: false,
      error: err?.response?.data?.message || 'Monnify initialization failed',
    };
  }
}

/**
 * openMonnifyInline — loads the Monnify payment widget
 * Called by charge() when provider === 'monnify'
 */
export function openMonnifyInline({ amount, email, name, reference, description, callbacks }) {
  const MONNIFY_API_KEY       = import.meta.env.VITE_MONNIFY_API_KEY;
  const MONNIFY_CONTRACT_CODE = import.meta.env.VITE_MONNIFY_CONTRACT_CODE;

  if (!MONNIFY_API_KEY || !MONNIFY_CONTRACT_CODE) {
    callbacks?.onError?.('Monnify public credentials are not set');
    return Promise.resolve({ success: false, error: 'Missing Monnify credentials' });
  }

  return new Promise((resolve) => {
    const existing = document.getElementById('monnify-inline-script');
    const load = existing
      ? Promise.resolve()
      : new Promise((res, rej) => {
          const script = document.createElement('script');
          script.id    = 'monnify-inline-script';
          script.src   = 'https://sdk.monnify.com/plugin/monnify.js';
          script.onload = res;
          script.onerror = rej;
          document.head.appendChild(script);
        });

    load.then(() => {
      if (!window.MonnifySDK) throw new Error('MonnifySDK not available');
      window.MonnifySDK.initialize({
        amount,
        currency:     'NGN',
        reference,
        customerFullName: name || 'Customer',
        customerEmail: email,
        apiKey:        MONNIFY_API_KEY,
        contractCode:  MONNIFY_CONTRACT_CODE,
        paymentDescription: description || 'W-Commerce Order',
        isTestMode:    import.meta.env.VITE_APP_ENV !== 'production',
        onLoadStart:   () => {},
        onLoadComplete:() => {},
        onComplete: (response) => {
          // ⚠️ Same rule as Paystack — verify server-side before confirming success
          resolve({ success: response.paymentStatus === 'PAID', reference: response.transactionReference });
        },
        onClose: (data) => {
          if (data.paymentStatus === 'PAID') {
            resolve({ success: true, reference: data.transactionReference });
          } else {
            callbacks?.onCancel?.();
            resolve({ success: false, cancelled: true });
          }
        },
      });
    }).catch(err => {
      callbacks?.onError?.(err.message);
      resolve({ success: false, error: err.message });
    });
  });
}

// ─── Wallet ───────────────────────────────────────────────────────────────────
async function payWithWallet(payload) {
  const raw = await apiPost('/api/v1/payment/pay-wallet', payload);
  return normalize(raw, 'wallet');
}

// ─── Bank Transfer (COD / manual) ─────────────────────────────────────────────
async function initializeBankTransfer(payload) {
  const raw = await apiPost('/api/v1/payment/bank-transfer', payload);
  return normalize(raw, 'bank_transfer');
}

// ─── Cash on Delivery ─────────────────────────────────────────────────────────
async function initializeCOD(payload) {
  const raw = await apiPost('/api/v1/payment/cod-order', payload);
  return normalize(raw, 'cod');
}

// ─── Verification (backend is always the authority) ───────────────────────────
async function verifyPayment(reference) {
  try {
    const raw = await apiGet(`/api/v1/payment/verify/${reference}`);
    if (raw?.success) {
      return {
        success: true,
        verified: true,
        orderId: raw.data?.metadata?.orderId || null,
        status:  raw.data?.status || 'success',
        amount:  raw.data?.amount ? raw.data.amount / 100 : null,
        reference,
      };
    }
    return {
      success: false,
      verified: false,
      error: raw?.message || 'Verification returned unsuccessful',
      status: raw?.status || 'failed',
      reference,
    };
  } catch (err) {
    return {
      success: false,
      verified: false,
      error: err?.response?.data?.message || err.message || 'Network error during verification',
      reference,
    };
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * initializePayment(provider, cartPayload)
 *
 * cartPayload = {
 *   items:           Array<{ productId, quantity, price, seller, sellerId }>
 *   shippingAddress: object
 *   promoCode?:      string
 *   isConsolidated?: boolean
 *   region?:         'NG' | 'US' | 'EU' | 'UK' | 'MENA'
 * }
 */
export async function initializePayment(provider = 'paystack', cartPayload) {
  switch (provider) {
    case 'paystack':      return initializePaystack(cartPayload);
    case 'stripe':        return initializeStripe(cartPayload);
    case 'monnify':       return initializeMonnify(cartPayload);
    case 'wallet':        return payWithWallet(cartPayload);
    case 'bank_transfer': return initializeBankTransfer(cartPayload);
    case 'cod':           return initializeCOD(cartPayload);
    default:
      return { success: false, error: `Unknown payment provider: ${provider}` };
  }
}

export { verifyPayment };

/**
 * openPaystackInline(accessCode, callbacks)
 *
 * Loads the Paystack inline JS popup. The `accessCode` comes from
 * the normalized initializePayment() response.
 *
 * callbacks = { onSuccess(reference), onCancel(), onError(error) }
 *
 * Security: onSuccess MUST trigger backend verifyPayment() — never
 * trust the frontend that payment succeeded merely because the popup closed.
 */
export function openPaystackInline({ accessCode, email, amount, reference, callbacks }) {
  return new Promise((resolve) => {
    const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

    if (!PAYSTACK_PUBLIC_KEY) {
      callbacks?.onError?.('VITE_PAYSTACK_PUBLIC_KEY is not set in .env');
      return resolve({ success: false, error: 'Missing Paystack public key' });
    }

    // Load Paystack Inline script if not already present
    const existing = document.getElementById('paystack-inline-script');
    const load = existing
      ? Promise.resolve()
      : new Promise((res, rej) => {
          const script = document.createElement('script');
          script.id = 'paystack-inline-script';
          script.src = 'https://js.paystack.co/v2/inline.js';
          script.onload = res;
          script.onerror = rej;
          document.head.appendChild(script);
        });

    load
      .then(() => {
        if (!window.PaystackPop) {
          throw new Error('PaystackPop not available after script load');
        }
        const handler = window.PaystackPop.setup({
          key:          PAYSTACK_PUBLIC_KEY,
          email,
          amount:       Math.round(amount * 100), // kobo
          ref:          reference,
          access_code:  accessCode,
          onClose: () => {
            callbacks?.onCancel?.();
            resolve({ success: false, cancelled: true });
          },
          callback: (response) => {
            // ⚠️ DO NOT trust this as proof of payment.
            // Always verify server-side via verifyPayment(reference).
            resolve({ success: true, reference: response.reference });
          },
        });
        handler.openIframe();
      })
      .catch((err) => {
        callbacks?.onError?.(err.message);
        resolve({ success: false, error: err.message });
      });
  });
}

/**
 * Convenience: Initialize Paystack + open inline popup in one call.
 * Returns after backend verification.
 *
 * Usage in CheckoutOS:
 *   const result = await PaymentClient.charge({ provider, cart, email, callbacks });
 */
export async function charge({ provider = 'paystack', cart, email, callbacks }) {
  // 1. Initialize payment with backend (creates order, reserves stock)
  callbacks?.onInitializing?.();
  const init = await initializePayment(provider, cart);

  if (!init.success) {
    callbacks?.onError?.(init.error);
    return { success: false, error: init.error };
  }

  callbacks?.onInitialized?.(init);

  // 2. For Paystack → open inline popup
  if (provider === 'paystack' && init.accessCode) {
    callbacks?.onOpening?.();
    const popupResult = await openPaystackInline({
      accessCode: init.accessCode,
      email,
      amount: init.amount,
      reference: init.reference,
      callbacks: {
        onCancel:  callbacks?.onCancel,
        onError:   callbacks?.onError,
      },
    });

    if (!popupResult.success) {
      if (popupResult.cancelled) callbacks?.onCancelled?.();
      return popupResult;
    }

    // 3. ✅ Backend verification — ONLY source of truth
    callbacks?.onVerifying?.();
    const verification = await verifyPayment(popupResult.reference || init.reference);

    if (verification.verified) {
      callbacks?.onSuccess?.(verification);
    } else {
      callbacks?.onError?.(verification.error || 'Payment could not be verified');
    }
    return verification;
  }

  // 4. Paystack hosted fallback (if no access_code)
  if (provider === 'paystack' && init.authorizationUrl) {
    // Store reference in sessionStorage so the callback page can verify
    sessionStorage.setItem('wcom_pending_reference', init.reference);
    sessionStorage.setItem('wcom_pending_order_id',  init.orderId);
    window.location.href = init.authorizationUrl;
    return { success: true, redirecting: true };
  }

  // 5. Monnify inline widget
  if (provider === 'monnify' && init.reference) {
    callbacks?.onOpening?.();
    const widgetResult = await openMonnifyInline({
      amount:      init.amount,
      email,
      reference:   init.reference,
      description: 'W-Commerce Order',
      callbacks: {
        onCancel: callbacks?.onCancel,
        onError:  callbacks?.onError,
      },
    });

    if (!widgetResult.success) {
      if (widgetResult.cancelled) callbacks?.onCancelled?.();
      return widgetResult;
    }

    // ✅ Always verify server-side
    callbacks?.onVerifying?.();
    const verification = await verifyPayment(widgetResult.reference || init.reference);
    if (verification.verified) callbacks?.onSuccess?.(verification);
    else callbacks?.onError?.(verification.error || 'Monnify payment could not be verified');
    return verification;
  }

  // 5. Wallet / COD / Bank Transfer — no popup needed
  if (['wallet', 'cod', 'bank_transfer'].includes(provider)) {
    callbacks?.onSuccess?.(init);
    return init;
  }

  // 6. Stripe → caller handles clientSecret with Stripe Elements
  if (provider === 'stripe') {
    return init; // caller drives Stripe Elements
  }

  return { success: false, error: 'Unhandled provider flow' };
}
