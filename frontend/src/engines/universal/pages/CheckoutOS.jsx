import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePreview } from '../commerce/PreviewContext';
import { useAuthStore } from '../../../store/authStore';
import { usePayment, PAYMENT_STATUS } from '../../../hooks/usePayment';
import {
  CheckCircle2, ChevronRight, ChevronLeft, Lock, CreditCard,
  Package, User, MapPin, AlertCircle, Loader2, Wallet,
  Building2, RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useOperationStore } from '../../../store/operationStore';
import { WGenerationExperience } from '../../../components/motion/WGenerationExperience';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STEPS = ['Information', 'Shipping', 'Payment', 'Review'];

const StepIndicator = ({ currentStep }) => (
  <div className="flex items-center justify-between mb-12 relative">
    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-gray-100 -z-10" />
    <div
      className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-black -z-10 transition-all duration-500"
      style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
    />
    {STEPS.map((label, idx) => (
      <div key={label} className="flex flex-col items-center gap-2 bg-white px-2">
        <motion.div
          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300 ${
            idx < currentStep  ? 'bg-black text-white' :
            idx === currentStep ? 'bg-black text-white ring-4 ring-black/10' :
                                  'bg-gray-100 text-gray-400'
          }`}
        >
          {idx < currentStep ? <CheckCircle2 size={16} /> : idx + 1}
        </motion.div>
        <span className={`text-[10px] font-black uppercase tracking-widest ${idx <= currentStep ? 'text-black' : 'text-gray-400'}`}>
          {label}
        </span>
      </div>
    ))}
  </div>
);

const OrderSummary = ({ cart, cartTotal }) => {
  const shipping = cartTotal > 100 ? 0 : 9.99;
  const tax      = cartTotal * 0.075; // NGN 7.5% VAT
  return (
    <div className="bg-gray-50 rounded-2xl p-6 md:p-8 sticky top-24 border border-gray-100">
      <h2 className="text-xl font-black mb-6">Order Summary</h2>
      <div className="space-y-4 mb-6 max-h-[40vh] overflow-y-auto pr-1">
        {cart.map(item => (
          <div key={item.id} className="flex gap-3 items-center">
            <div className="relative shrink-0">
              <img
                src={item.image}
                alt={item.name}
                className="w-14 h-14 rounded-xl object-cover bg-gray-100"
              />
              <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-black text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                {item.qty}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm truncate">{item.name}</div>
              <div className="text-gray-400 text-xs flex items-center gap-1.5 mt-0.5">
                {item.discount > 0 && (
                  <span className="bg-[#00b873]/10 text-[#00b873] px-1.5 py-0.5 rounded-md font-bold text-[10px] leading-none border border-[#00b873]/20">
                    -{item.discount}%
                  </span>
                )}
                <span>₦{item.price} each</span>
              </div>
            </div>
            <div className="font-black text-sm">₦{(item.price * item.qty).toFixed(2)}</div>
          </div>
        ))}
      </div>
      <div className="space-y-2 text-sm border-t pt-4">
        <div className="flex justify-between text-gray-500">
          <span>Subtotal</span><span className="font-bold text-black">₦{cartTotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>Shipping</span>
          <span className="font-bold text-black">{shipping === 0 ? '🎉 Free' : `₦${shipping.toFixed(2)}`}</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>VAT (7.5%)</span><span className="font-bold text-black">₦{tax.toFixed(2)}</span>
        </div>
      </div>
      <div className="flex justify-between mt-4 pt-4 border-t">
        <span className="font-black text-lg">Total</span>
        <span className="font-black text-2xl">₦{(cartTotal + shipping + tax).toFixed(2)}</span>
      </div>
    </div>
  );
};

// ─── Auth Gate ─────────────────────────────────────────────────────────────────
const AuthGateModal = ({ onContinue }) => {
  const { login } = useAuthStore();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    const result = await login(email, password);
    setLoading(false);
    if (result.success) onContinue();
    else setError(result.message || 'Login failed');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ y: 30, opacity: 0, scale: 0.97 }}
        animate={{ y: 0,  opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock size={24} className="text-white" />
          </div>
          <h2 className="text-2xl font-black">Sign in to continue</h2>
          <p className="text-gray-500 mt-2 text-sm">You need an account to complete checkout.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email" placeholder="Email address" value={email}
            onChange={e => setEmail(e.target.value)} required
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-black outline-none"
          />
          <input
            type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)} required
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-black outline-none"
          />
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-xl p-3">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          <button
            type="submit" disabled={loading}
            className="w-full py-4 bg-black text-white font-black rounded-xl hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            {loading ? 'Signing in…' : 'Continue to Checkout'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-400 mt-6">
          Don't have an account?{' '}
          <a href="/signup" className="text-black font-bold underline">Sign up free</a>
        </p>
      </motion.div>
    </motion.div>
  );
};

// ─── Payment Status Overlay ────────────────────────────────────────────────────
// Replaced by WGenerationExperience driven by operationStore

// ─── Success Screen ────────────────────────────────────────────────────────────
const SuccessScreen = ({ order, onReturnToStore }) => {
  useEffect(() => {
    confetti({
      particleCount: 180,
      spread: 80,
      origin: { y: 0.55 },
      colors: ['#000', '#6366f1', '#c9a96e', '#10b981'],
    });
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 14 }}
        className="w-24 h-24 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-black/20"
      >
        <CheckCircle2 size={48} />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="text-4xl md:text-5xl font-black mb-3"
      >
        Order Confirmed!
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="text-gray-500 text-lg mb-10"
      >
        Thank you! Your order ID is{' '}
        <span className="font-black text-black">{order?.orderId || order?.id || 'WCOM-XXXXX'}</span>
      </motion.p>

      {/* Receipt */}
      {order?.items && order.items.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-gray-50 rounded-2xl p-6 mb-10 text-left border border-gray-100"
        >
          <div className="font-black text-sm uppercase tracking-widest text-gray-400 mb-4">Receipt</div>
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
              <div className="flex gap-3 items-center">
                <img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover" />
                <div>
                  <div className="font-bold text-sm">{item.name}</div>
                  <div className="text-xs text-gray-400">×{item.qty}</div>
                </div>
              </div>
              <div className="font-black">₦{(item.price * item.qty).toFixed(2)}</div>
            </div>
          ))}
          <div className="flex justify-between font-black text-lg mt-4 pt-4 border-t">
            <span>Total Paid</span>
            <span>₦{order.total?.toFixed(2) ?? '—'}</span>
          </div>
        </motion.div>
      )}

      <motion.button
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        onClick={onReturnToStore}
        className="px-12 py-4 bg-black text-white font-black rounded-2xl hover:opacity-90 text-lg"
      >
        Continue Shopping
      </motion.button>
    </div>
  );
};

// ─── Main CheckoutOS ───────────────────────────────────────────────────────────
export const CheckoutOS = () => {
  const { cart, cartTotal, checkoutState, setCheckoutState, orders, setActivePage, clearCart } = usePreview();
  const { user, isAuthenticated } = useAuthStore();
  const payment = usePayment();

  const [step, setStep]               = useState(0);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState('paystack');

  // ── Empty cart guard ────────────────────────────────────────────────────────
  if (cart.length === 0 && !completedOrder) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
        <Package size={52} className="opacity-15 mb-6" />
        <h1 className="text-3xl font-black mb-3">Your cart is empty</h1>
        <p className="text-gray-400 mb-8">Add some items and come back!</p>
        <button onClick={() => setActivePage('products')} className="px-8 py-3 bg-black text-white font-bold rounded-xl hover:opacity-90">
          Browse Products
        </button>
      </div>
    );
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (completedOrder) {
    return <SuccessScreen order={completedOrder} onReturnToStore={() => setActivePage('home')} />;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  const shipping = cartTotal > 100 ? 0 : 9.99;
  const tax      = cartTotal * 0.075;
  const total    = cartTotal + shipping + tax;

  const updateShipping = (key, value) =>
    setCheckoutState(p => ({ ...p, shipping: { ...p.shipping, [key]: value } }));

  const handleProceedToPayment = () => {
    if (!isAuthenticated) { setShowAuthGate(true); return; }
    setStep(2);
  };

  const handlePayNow = async () => {
    const { start, update, complete, fail, reset } = useOperationStore.getState();

    start({
      operation: 'checkout',
      steps: [
        { id: 'preparing', label: 'Preparing payment' },
        { id: 'connecting', label: 'Connecting to payment provider' },
        { id: 'waiting', label: 'Waiting for payment' },
        { id: 'verifying', label: 'Verifying transaction' },
        { id: 'confirming', label: 'Confirming order' }
      ],
      step: 'preparing',
      message: 'Preparing your payment...',
    });

    const cartPayload = {
      items: cart.map(item => ({
        productId: item.id,
        quantity:  item.qty,
        price:     item.price,
        seller:    item.seller   || null,
        sellerId:  item.sellerId || null,
      })),
      shippingAddress: checkoutState.shipping,
      region:          checkoutState.shipping.country === 'NG' ? 'NG' : 'US',
      isConsolidated:  false,
      promoCode:       checkoutState.promoCode || null,
    };

    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

    await wait(800);
    update({ step: 'connecting', message: 'Connecting to secure provider...' });

    await wait(800);
    update({ step: 'waiting', message: 'Waiting for your payment...' });

    await payment.pay({
      provider: selectedProvider,
      cart:     cartPayload,
      email:    user?.email || checkoutState.email,
      onSuccess: async (verifiedResult) => {
        update({ step: 'verifying', message: 'Verifying transaction with server...' });
        await wait(1200);
        update({ step: 'confirming', message: 'Confirming order details...' });
        await wait(1200);

        const receipt = {
          orderId: verifiedResult.orderId,
          id:      verifiedResult.orderId,
          items:   [...cart],
          total,
          reference: verifiedResult.reference,
        };
        
        complete('Payment successful!');
        await wait(1500);
        reset();
        clearCart();
        setCompletedOrder(receipt);
      },
      onCancel: () => {
        reset();
      },
      onError: (err) => {
        fail(err || 'Payment verification failed');
      }
    });
  };

  return (
    <>
      {/* Auth Gate */}
      {showAuthGate && (
        <AuthGateModal onContinue={() => { setShowAuthGate(false); setStep(2); }} />
      )}

      {/* Payment processing overlay via Motion OS */}
      <AnimatePresence>
        {useOperationStore(state => state.operation) === 'checkout' && useOperationStore(state => state.status) !== 'idle' && (
          <WGenerationExperience
            steps={useOperationStore.getState().steps}
            onCancel={() => {
              payment.reset();
              useOperationStore.getState().reset();
            }}
            onFinish={() => {
              if (useOperationStore.getState().status === 'error') {
                 useOperationStore.getState().reset();
                 payment.reset();
              }
            }}
          />
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">

            {/* ── Left: Flow ─────────────────────────────────────────────── */}
            <div className="lg:col-span-7 flex flex-col">
              <StepIndicator currentStep={step} />

              <AnimatePresence mode="wait">

                {/* Step 0 — Contact + Address */}
                {step === 0 && (
                  <motion.div key="s0"
                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
                    className="flex-1"
                  >
                    <h2 className="text-2xl font-black mb-1 flex items-center gap-3"><User size={22} /> Contact</h2>
                    <p className="text-gray-400 text-sm mb-6">
                      {isAuthenticated ? `Signed in as ${user?.email}` : <>
                        <span className="cursor-pointer text-black font-bold underline" onClick={() => setShowAuthGate(true)}>Sign in</span>{' '}
                        or continue as guest.
                      </>}
                    </p>

                    {!isAuthenticated && (
                      <input
                        type="email" placeholder="Email address" value={checkoutState.email}
                        onChange={e => setCheckoutState(p => ({ ...p, email: e.target.value }))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 mb-6 focus:ring-2 focus:ring-black outline-none"
                      />
                    )}

                    <h2 className="text-2xl font-black mb-4 flex items-center gap-3"><MapPin size={22} /> Shipping Address</h2>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { key: 'firstName', label: 'First name', col: 1 },
                        { key: 'lastName',  label: 'Last name',  col: 1 },
                        { key: 'address',   label: 'Street address', col: 2 },
                        { key: 'city',      label: 'City', col: 1 },
                        { key: 'zip',       label: 'Postal code', col: 1 },
                        { key: 'country',   label: 'Country', col: 2 },
                      ].map(f => (
                        <input
                          key={f.key}
                          placeholder={f.label}
                          value={checkoutState.shipping[f.key] || ''}
                          onChange={e => updateShipping(f.key, e.target.value)}
                          className={`col-span-${f.col} bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 focus:ring-2 focus:ring-black outline-none`}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => setStep(1)}
                      disabled={!checkoutState.email && !isAuthenticated}
                      className="w-full mt-8 py-4 bg-black text-white font-black rounded-xl flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-40"
                    >
                      Continue to Shipping <ChevronRight size={18} />
                    </button>
                  </motion.div>
                )}

                {/* Step 1 — Shipping Method */}
                {step === 1 && (
                  <motion.div key="s1"
                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
                    className="flex-1"
                  >
                    <h2 className="text-2xl font-black mb-6">Shipping Method</h2>
                    <div className="space-y-4 mb-8">
                      {[
                        { id: 'standard', label: 'Standard Shipping', sub: '3–5 business days', price: cartTotal > 100 ? 'Free' : '$9.99', default: true },
                        { id: 'express',  label: 'Express Shipping',   sub: '1–2 business days', price: '$14.99' },
                      ].map(opt => (
                        <label key={opt.id} className={`flex items-center justify-between p-5 rounded-2xl border-2 cursor-pointer transition-colors ${opt.default ? 'border-black' : 'border-gray-100 hover:border-gray-200'}`}>
                          <div className="flex items-center gap-4">
                            <input type="radio" name="shipping_method" defaultChecked={opt.default} className="w-4 h-4 accent-black" />
                            <div>
                              <div className="font-bold">{opt.label}</div>
                              <div className="text-sm text-gray-400">{opt.sub}</div>
                            </div>
                          </div>
                          <div className="font-black">{opt.price}</div>
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setStep(0)} className="px-5 py-4 text-gray-400 font-bold hover:text-black flex items-center gap-2"><ChevronLeft size={18} /> Back</button>
                      <button onClick={handleProceedToPayment} className="flex-1 py-4 bg-black text-white font-black rounded-xl flex items-center justify-center gap-2 hover:opacity-90">
                        Continue to Payment <ChevronRight size={18} />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Step 2 — Payment */}
                {step === 2 && (
                  <motion.div key="s2"
                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
                    className="flex-1"
                  >
                    <h2 className="text-2xl font-black mb-2">Payment</h2>
                    <p className="text-sm text-gray-400 flex items-center gap-2 mb-6"><Lock size={14} /> All transactions are secured and verified server-side.</p>

                    {/* Provider Selection */}
                    <div className="grid grid-cols-3 gap-3 mb-8">
                      {[
                        { id: 'paystack',      label: 'Card / Paystack', icon: <CreditCard size={18} /> },
                        { id: 'wallet',        label: 'Wallet',          icon: <Wallet size={18} /> },
                        { id: 'bank_transfer', label: 'Bank Transfer',   icon: <Building2 size={18} /> },
                      ].map(p => (
                        <button
                          key={p.id}
                          onClick={() => setSelectedProvider(p.id)}
                          className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 font-bold text-sm transition-colors ${
                            selectedProvider === p.id ? 'border-black bg-black text-white' : 'border-gray-100 hover:border-gray-200'
                          }`}
                        >
                          {p.icon}{p.label}
                        </button>
                      ))}
                    </div>

                    {/* Paystack — Express buttons */}
                    {selectedProvider === 'paystack' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 mb-6">
                          <button
                            onClick={handlePayNow}
                            className="h-14 bg-black text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                          >
                            <img src="https://upload.wikimedia.org/wikipedia/commons/b/b0/Apple_Pay_logo.svg" alt="Apple Pay" className="h-5 invert" />
                          </button>
                          <button
                            onClick={handlePayNow}
                            className="h-14 bg-white border border-gray-200 rounded-xl font-bold flex items-center justify-center hover:shadow-md transition-all"
                          >
                            <img src="https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg" alt="Google Pay" className="h-5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-3 text-gray-300 text-sm font-bold">
                          <div className="flex-1 h-px bg-gray-100" />or pay with card<div className="flex-1 h-px bg-gray-100" />
                        </div>
                        <p className="text-sm text-gray-500 bg-blue-50 rounded-xl p-4 border border-blue-100">
                          💳 Clicking <strong>Pay Now</strong> will open the Paystack secure payment popup. Your card details are handled entirely by Paystack.
                        </p>
                      </div>
                    )}

                    {selectedProvider === 'wallet' && (
                      <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                        <div className="flex items-center gap-3 mb-2"><Wallet size={20} /> <span className="font-bold">Pay with W-Commerce Wallet</span></div>
                        <p className="text-sm text-gray-400">Your wallet balance will be deducted immediately upon confirmation.</p>
                      </div>
                    )}

                    {selectedProvider === 'bank_transfer' && (
                      <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                        <div className="flex items-center gap-3 mb-2"><Building2 size={20} /> <span className="font-bold">Bank Transfer</span></div>
                        <p className="text-sm text-gray-400">An order will be created and you will receive bank details to complete the transfer. Upload proof to the Seller Dashboard.</p>
                      </div>
                    )}

                    <div className="flex gap-3 mt-8">
                      <button onClick={() => setStep(1)} className="px-5 py-4 text-gray-400 font-bold hover:text-black flex items-center gap-2"><ChevronLeft size={18} /> Back</button>
                      <button onClick={() => setStep(3)} className="flex-1 py-4 bg-black text-white font-black rounded-xl flex items-center justify-center gap-2 hover:opacity-90">
                        Review Order <ChevronRight size={18} />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Step 3 — Review */}
                {step === 3 && (
                  <motion.div key="s3"
                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
                    className="flex-1"
                  >
                    <h2 className="text-2xl font-black mb-6">Review Order</h2>

                    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 mb-6 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Contact</div>
                          <div className="font-medium">{user?.email || checkoutState.email}</div>
                        </div>
                        <button onClick={() => setStep(0)} className="text-sm font-bold underline text-gray-400 hover:text-black">Edit</button>
                      </div>
                      <div className="h-px bg-gray-200" />
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Ship to</div>
                          <div className="font-medium">
                            {[checkoutState.shipping.address, checkoutState.shipping.city, checkoutState.shipping.country]
                              .filter(Boolean).join(', ') || '—'}
                          </div>
                        </div>
                        <button onClick={() => setStep(0)} className="text-sm font-bold underline text-gray-400 hover:text-black">Edit</button>
                      </div>
                      <div className="h-px bg-gray-200" />
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Payment</div>
                          <div className="font-medium capitalize">{selectedProvider.replace('_', ' ')}</div>
                        </div>
                        <button onClick={() => setStep(2)} className="text-sm font-bold underline text-gray-400 hover:text-black">Edit</button>
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700 flex gap-3 mb-8">
                      <Lock size={16} className="shrink-0 mt-0.5" />
                      <span>Payment will be verified by our backend before your order is confirmed. Your cart will only be cleared after successful payment.</span>
                    </div>

                    <div className="flex gap-3">
                      <button onClick={() => setStep(2)} disabled={payment.isBusy} className="px-5 py-4 text-gray-400 font-bold hover:text-black flex items-center gap-2 disabled:opacity-40">
                        <ChevronLeft size={18} /> Back
                      </button>
                      <button
                        onClick={handlePayNow}
                        disabled={payment.isBusy}
                        className="flex-1 py-4 bg-black text-white font-black rounded-xl flex items-center justify-center gap-3 hover:opacity-90 disabled:opacity-60 transition-all"
                      >
                        {payment.isBusy ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
                        {payment.isBusy ? 'Processing…' : `Pay $${total.toFixed(2)}`}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Right: Summary ──────────────────────────────────────────── */}
            <div className="lg:col-span-5 hidden lg:block">
              <OrderSummary cart={cart} cartTotal={cartTotal} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
