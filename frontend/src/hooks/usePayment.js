/**
 * usePayment — React hook that wraps PaymentClient
 *
 * Provides a clean state machine for the checkout payment flow:
 *   idle → initializing → processing → verifying → success | error | cancelled
 *
 * The hook owns all payment-related state so CheckoutOS stays declarative.
 */

import { useState, useCallback } from 'react';
import { charge, verifyPayment } from '../lib/paymentClient';

export const PAYMENT_STATUS = {
  IDLE:         'idle',
  INITIALIZING: 'initializing',  // contacting backend to create order
  PROCESSING:   'processing',    // Paystack popup open
  VERIFYING:    'verifying',     // hitting /api/v1/payment/verify
  SUCCESS:      'success',
  ERROR:        'error',
  CANCELLED:    'cancelled',
};

export function usePayment() {
  const [status,    setStatus]    = useState(PAYMENT_STATUS.IDLE);
  const [error,     setError]     = useState(null);
  const [result,    setResult]    = useState(null);   // verified payment result
  const [initData,  setInitData]  = useState(null);   // raw init response from backend

  const reset = useCallback(() => {
    setStatus(PAYMENT_STATUS.IDLE);
    setError(null);
    setResult(null);
    setInitData(null);
  }, []);

  /**
   * pay({ provider, cart, email, onSuccess, onError, onCancel })
   *
   * cart = {
   *   items:           Array<{ productId, quantity, price, seller, sellerId }>
   *   shippingAddress: object
   *   promoCode?:      string
   *   isConsolidated?: boolean
   *   region?:         string
   * }
   */
  const pay = useCallback(async ({ provider = 'paystack', cart, email, onSuccess, onCancel }) => {
    setStatus(PAYMENT_STATUS.INITIALIZING);
    setError(null);
    setResult(null);
    let successHandled = false;

    try {
      const outcome = await charge({
        provider,
        cart,
        email,
        callbacks: {
          onInitializing: () => setStatus(PAYMENT_STATUS.INITIALIZING),
          onInitialized:  (data) => { setInitData(data); setStatus(PAYMENT_STATUS.PROCESSING); },
          onOpening:      () => setStatus(PAYMENT_STATUS.PROCESSING),
          onVerifying:    () => setStatus(PAYMENT_STATUS.VERIFYING),
          onSuccess:      (verifiedResult) => {
            successHandled = true;
            setResult(verifiedResult);
            setStatus(PAYMENT_STATUS.SUCCESS);
            onSuccess?.(verifiedResult);
          },
          onCancelled:    () => {
            setStatus(PAYMENT_STATUS.CANCELLED);
            onCancel?.();
          },
          onError:        (msg) => {
            setError(msg);
            setStatus(PAYMENT_STATUS.ERROR);
          },
        },
      });

      // Wallet / COD / Bank Transfer complete synchronously
      if (outcome?.success && !outcome?.redirecting && !successHandled) {
        setResult(outcome);
        setStatus(PAYMENT_STATUS.SUCCESS);
        onSuccess?.(outcome);
      }

      return outcome;
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Unexpected payment error';
      setError(msg);
      setStatus(PAYMENT_STATUS.ERROR);
      return { success: false, error: msg };
    }
  }, []);

  /**
   * verifyCallback(reference)
   * Called from the Paystack redirect callback page (fallback hosted flow).
   */
  const verifyCallback = useCallback(async (reference) => {
    setStatus(PAYMENT_STATUS.VERIFYING);
    const outcome = await verifyPayment(reference);
    if (outcome.verified) {
      setResult(outcome);
      setStatus(PAYMENT_STATUS.SUCCESS);
    } else {
      setError(outcome.error || 'Verification failed');
      setStatus(PAYMENT_STATUS.ERROR);
    }
    return outcome;
  }, []);

  return {
    status,
    error,
    result,
    initData,
    pay,
    verifyCallback,
    reset,
    isIdle:         status === PAYMENT_STATUS.IDLE,
    isInitializing: status === PAYMENT_STATUS.INITIALIZING,
    isProcessing:   status === PAYMENT_STATUS.PROCESSING,
    isVerifying:    status === PAYMENT_STATUS.VERIFYING,
    isSuccess:      status === PAYMENT_STATUS.SUCCESS,
    isError:        status === PAYMENT_STATUS.ERROR,
    isCancelled:    status === PAYMENT_STATUS.CANCELLED,
    isBusy: [
      PAYMENT_STATUS.INITIALIZING,
      PAYMENT_STATUS.PROCESSING,
      PAYMENT_STATUS.VERIFYING,
    ].includes(status),
  };
}
