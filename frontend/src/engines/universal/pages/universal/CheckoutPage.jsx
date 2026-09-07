import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePreview } from '../../commerce/PreviewContext';
import { ArrowRight, CheckCircle, Package, Truck, Star, Lock, CreditCard, MapPin, Phone, User, Mail } from 'lucide-react';

const formatPrice = (amount) => {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);
};

// ─── Simple Checkout (Essential $5-8) ─────────────────────────────────────────
const SimpleCheckout = () => {
  const { cartTotal, placeOrder, setActivePage, orderComplete } = usePreview();
  if (orderComplete) return (
    <div className="max-w-md mx-auto text-center py-20 animate-[fadeIn_0.5s_ease-out]">
      <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(34,197,94,0.2)]">
        <CheckCircle size={48} className="text-green-600" />
      </div>
      <h2 className="text-4xl font-black mb-4 tracking-tight">Order Placed!</h2>
      <p className="text-slate-500 mb-10 text-lg">Thank you for your demo purchase.</p>
      <button onClick={() => setActivePage('home')} className="px-10 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all hover:shadow-xl hover:-translate-y-1">Continue Shopping</button>
    </div>
  );
  return (
    <div className="max-w-lg mx-auto pt-12 px-4 pb-24">
      <h1 className="text-4xl font-black mb-10 tracking-tight">Checkout</h1>
      <div className="space-y-6">
        {[['Name','John Doe'],['Email','john@example.com'],['Address','123 Main St'],['Card Number','•••• •••• •••• 4242']].map(([label, placeholder]) => (
          <div key={label} className="group">
            <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-slate-500 group-focus-within:text-indigo-600 transition-colors">{label}</label>
            <input readOnly defaultValue={placeholder} className="w-full border border-slate-200 rounded-xl px-5 py-4 text-base bg-white/50 backdrop-blur-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm group-hover:border-slate-300" />
          </div>
        ))}
        <div className="pt-6 border-t border-slate-100 flex justify-between font-black text-2xl mt-4">
          <span className="text-slate-800">Total</span><span className="text-indigo-600">{formatPrice(cartTotal)}</span>
        </div>
        <button onClick={placeOrder} className="w-full py-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white font-bold rounded-xl text-lg mt-8 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">Place Order</button>
      </div>
    </div>
  );
};

// ─── Step Checkout (Plus $9-12) ────────────────────────────────────────────────
const StepCheckout = () => {
  const { cartTotal, placeOrder, setActivePage, orderComplete } = usePreview();
  const [step, setStep] = useState(0);
  const steps = ['Contact', 'Shipping', 'Payment', 'Review'];
  if (orderComplete) return <div className="max-w-md mx-auto text-center py-20 animate-[fadeIn_0.5s_ease-out]">
    <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(34,197,94,0.2)]"><CheckCircle size={48} className="text-green-600" /></div>
    <h2 className="text-4xl font-black mb-4 tracking-tight">Order Confirmed!</h2>
    <p className="text-slate-500 mb-10 text-lg">Estimated delivery: 3-5 business days</p>
    <button onClick={() => setActivePage('home')} className="px-10 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all hover:shadow-xl hover:-translate-y-1">Back to Shop</button>
  </div>;
  return (
    <div className="max-w-2xl mx-auto pt-12 px-4 pb-24">
      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-12">
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <div className={`flex items-center gap-3 ${i <= step ? 'text-slate-900' : 'text-slate-300'} transition-colors duration-300`}>
              <div className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center shadow-sm transition-all duration-300 ${i < step ? 'bg-indigo-600 text-white shadow-indigo-500/30' : i === step ? 'bg-slate-900 text-white shadow-slate-900/30' : 'bg-slate-100 text-slate-400'}`}>
                {i < step ? <CheckCircle size={16} /> : i + 1}
              </div>
              <span className="hidden sm:block text-sm font-bold tracking-wide">{s}</span>
            </div>
            {i < steps.length - 1 && <div className={`flex-1 h-1 rounded-full transition-colors duration-300 ${i < step ? 'bg-indigo-600' : 'bg-slate-100'}`} />}
          </React.Fragment>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20, scale: 0.98 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -20, scale: 0.98 }} transition={{ duration: 0.3 }} className="space-y-6">
          {step === 0 && <><h2 className="text-3xl font-black mb-8 tracking-tight text-slate-900">Contact Info</h2>
            <div className="space-y-4">
              <input readOnly defaultValue="John Doe" placeholder="Full Name" className="w-full border border-slate-200 rounded-xl px-5 py-4 bg-white/50 backdrop-blur-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm" />
              <input readOnly defaultValue="john@example.com" placeholder="Email" className="w-full border border-slate-200 rounded-xl px-5 py-4 bg-white/50 backdrop-blur-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm" />
              <input readOnly defaultValue="+1 (555) 123-4567" placeholder="Phone" className="w-full border border-slate-200 rounded-xl px-5 py-4 bg-white/50 backdrop-blur-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm" />
            </div></>}
          {step === 1 && <><h2 className="text-3xl font-black mb-8 tracking-tight text-slate-900">Shipping Address</h2>
            <div className="space-y-4">
              <input readOnly defaultValue="123 Main Street" className="w-full border border-slate-200 rounded-xl px-5 py-4 bg-white/50 backdrop-blur-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm" />
              <div className="grid grid-cols-2 gap-4">
                <input readOnly defaultValue="New York" className="border border-slate-200 rounded-xl px-5 py-4 bg-white/50 backdrop-blur-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm" />
                <input readOnly defaultValue="NY 10001" className="border border-slate-200 rounded-xl px-5 py-4 bg-white/50 backdrop-blur-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm" />
              </div>
            </div></>}
          {step === 2 && <><h2 className="text-3xl font-black mb-8 tracking-tight text-slate-900">Payment</h2>
            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6 text-slate-700"><CreditCard size={28} className="text-indigo-600" /><span className="font-bold text-lg">Card Details</span></div>
              <input readOnly defaultValue="•••• •••• •••• 4242" className="w-full border border-slate-200 rounded-xl px-5 py-4 mb-4 bg-slate-50 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all" />
              <div className="grid grid-cols-2 gap-4">
                <input readOnly defaultValue="12/26" className="border border-slate-200 rounded-xl px-5 py-4 bg-slate-50 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all" />
                <input readOnly defaultValue="•••" className="border border-slate-200 rounded-xl px-5 py-4 bg-slate-50 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all" />
              </div>
            </div></>}
          {step === 3 && <><h2 className="text-3xl font-black mb-8 tracking-tight text-slate-900">Review Order</h2>
            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-8 shadow-sm">
              <div className="flex justify-between text-base mb-3"><span className="text-slate-500 font-medium">Subtotal</span><span className="font-bold text-slate-900">{formatPrice(cartTotal)}</span></div>
              <div className="flex justify-between text-base mb-6"><span className="text-slate-500 font-medium">Shipping</span><span className="font-bold text-green-600">Free</span></div>
              <div className="flex justify-between font-black text-3xl border-t border-slate-200 pt-6"><span className="text-slate-900">Total</span><span className="text-indigo-600">{formatPrice(cartTotal)}</span></div>
            </div></>}
        </motion.div>
      </AnimatePresence>
      <div className="flex gap-4 mt-12">
        {step > 0 && <button onClick={() => setStep(s => s - 1)} className="px-8 py-4 border border-slate-200 font-bold text-slate-700 rounded-xl hover:bg-slate-50 transition-all">Back</button>}
        <button onClick={() => step < steps.length - 1 ? setStep(s => s + 1) : placeOrder()} className="flex-1 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">
          {step < steps.length - 1 ? <>Continue <ArrowRight size={18} /></> : <>Place Order <CheckCircle size={18} /></>}
        </button>
      </div>
    </div>
  );
};

// ─── Premium Split Checkout (Studio / Signature) ──────────────────────────────
const PremiumSplitCheckout = () => {
  const { cart, cartTotal, placeOrder, setActivePage, orderComplete } = usePreview();
  const [step, setStep] = useState(0);
  if (orderComplete) return (
    <div className="min-h-screen bg-[var(--s-bg,#fff)] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }} className="text-center px-8 py-16 bg-white/50 backdrop-blur-2xl border border-[var(--s-border,#f0f0f0)] rounded-[2.5rem] shadow-2xl max-w-lg w-full">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
          className="w-28 h-28 bg-[var(--s-primary,#000)] rounded-[2rem] shadow-[0_20px_40px_rgba(0,0,0,0.2)] flex items-center justify-center mx-auto mb-10 rotate-3">
          <CheckCircle size={48} className="text-[var(--s-bg,#fff)]" />
        </motion.div>
        <h1 className="text-4xl sm:text-5xl font-black mb-5 tracking-tight text-[var(--s-text,#111)]">Order Complete</h1>
        <p className="text-lg opacity-60 mb-12 text-[var(--s-text,#111)]">A confirmation has been sent to your inbox.</p>
        <button onClick={() => setActivePage('home')} className="w-full py-5 bg-[var(--s-primary,#000)] text-[var(--s-bg,#fff)] font-bold rounded-2xl text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-xl">
          Continue Shopping
        </button>
      </motion.div>
    </div>
  );
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[var(--s-bg,#fff)]">
      {/* Left — Form */}
      <div className="flex-1 p-8 md:p-16 lg:p-24 flex flex-col justify-center bg-white/40 backdrop-blur-xl">
        <div className="max-w-md mx-auto w-full">
          <div className="flex gap-8 mb-12 border-b border-gray-100">
            {['Details', 'Shipping', 'Payment'].map((s, i) => (
              <button key={s} onClick={() => setStep(i)} className={`text-sm tracking-wide font-bold pb-4 transition-all duration-300 relative ${i <= step ? 'text-[var(--s-primary,#000)]' : 'text-gray-400 hover:text-gray-600'}`}>
                {s}
                {i <= step && <motion.div layoutId="split-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--s-primary,#000)]" />}
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, y: 15, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -15, filter: "blur(4px)" }} transition={{ duration: 0.3 }} className="space-y-8">
              {step === 0 && <><h2 className="text-4xl font-black mb-10 tracking-tight text-[var(--s-text,#111)]">Your Details</h2>
                {[['Full Name','John Doe'],['Email','john@example.com'],['Phone','+1 (555) 123-4567']].map(([l,v]) => (
                  <div key={l} className="group relative">
                    <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 group-focus-within:text-[var(--s-primary,#000)] transition-colors block mb-2">{l}</label>
                    <input readOnly defaultValue={v} className="w-full border-b-2 border-gray-200 focus:border-[var(--s-primary,#000)] hover:border-gray-300 transition-colors outline-none pb-3 bg-transparent text-xl font-medium text-[var(--s-text,#111)]" />
                  </div>
                ))}</>}
              {step === 1 && <><h2 className="text-4xl font-black mb-10 tracking-tight text-[var(--s-text,#111)]">Delivery</h2>
                {[['Address','123 Main Street'],['City','New York'],['Postcode','NY 10001']].map(([l,v]) => (
                  <div key={l} className="group relative">
                    <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 group-focus-within:text-[var(--s-primary,#000)] transition-colors block mb-2">{l}</label>
                    <input readOnly defaultValue={v} className="w-full border-b-2 border-gray-200 focus:border-[var(--s-primary,#000)] hover:border-gray-300 transition-colors outline-none pb-3 bg-transparent text-xl font-medium text-[var(--s-text,#111)]" />
                  </div>
                ))}</>}
              {step === 2 && <><h2 className="text-4xl font-black mb-10 tracking-tight text-[var(--s-text,#111)]">Payment</h2>
                {[['Card','•••• •••• •••• 4242'],['Expiry','12/26'],['CVV','•••']].map(([l,v]) => (
                  <div key={l} className="group relative">
                    <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 group-focus-within:text-[var(--s-primary,#000)] transition-colors block mb-2">{l}</label>
                    <input readOnly defaultValue={v} className="w-full border-b-2 border-gray-200 focus:border-[var(--s-primary,#000)] hover:border-gray-300 transition-colors outline-none pb-3 bg-transparent text-xl font-medium text-[var(--s-text,#111)]" />
                  </div>
                ))}</>}
            </motion.div>
          </AnimatePresence>
          <div className="flex gap-4 mt-14">
            {step > 0 && <button onClick={() => setStep(s => s-1)} className="px-8 py-4 border border-gray-200 text-gray-600 rounded-2xl font-bold hover:bg-gray-50 transition-colors">Back</button>}
            <button onClick={() => step < 2 ? setStep(s => s+1) : placeOrder()} className="flex-1 py-5 bg-[var(--s-primary,#000)] text-[var(--s-bg,#fff)] font-bold rounded-2xl text-lg hover:-translate-y-1 hover:shadow-2xl transition-all shadow-lg active:scale-95">
              {step < 2 ? 'Continue' : 'Complete Order'}
            </button>
          </div>
        </div>
      </div>
      {/* Right — Order Summary */}
      <div className="md:w-[450px] bg-[var(--s-surface,#fafafa)] p-8 md:p-12 lg:p-16 border-l border-[var(--s-border,#f0f0f0)] shadow-[-20px_0_40px_rgba(0,0,0,0.02)] flex flex-col h-full">
        <h3 className="font-black text-2xl mb-10 text-[var(--s-text,#111)]">Order Summary</h3>
        <div className="space-y-6 mb-auto flex-1 overflow-y-auto pr-2 scrollbar-hide">
          {cart.map(item => (
            <div key={item.id} className="flex gap-5 group">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                  <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-[var(--s-primary,#000)] text-[var(--s-bg,#fff)] text-xs rounded-full flex items-center justify-center font-bold shadow-md">{item.qty}</div>
              </div>
              <div className="flex flex-col justify-center">
                <div className="font-bold text-base text-[var(--s-text,#111)]">{item.name}</div>
                <div className="text-sm font-medium opacity-60 text-[var(--s-text,#111)]">{formatPrice(item.price)}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-4 border-t-2 border-dashed border-gray-200 pt-8 mt-8">
          <div className="flex justify-between text-base"><span className="opacity-60 font-medium text-[var(--s-text,#111)]">Subtotal</span><span className="font-bold text-[var(--s-text,#111)]">{formatPrice(cartTotal)}</span></div>
          <div className="flex justify-between text-base"><span className="opacity-60 font-medium text-[var(--s-text,#111)]">Shipping</span><span className="font-bold text-green-500 tracking-wide">FREE</span></div>
          <div className="flex justify-between items-end border-t border-[var(--s-border,#f0f0f0)] pt-6 mt-4">
            <span className="font-bold opacity-60 text-[var(--s-text,#111)]">Total</span>
            <span className="font-black text-4xl text-[var(--s-primary,#000)] tracking-tight">{formatPrice(cartTotal)}</span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 mt-10 text-xs opacity-40 font-medium text-[var(--s-text,#111)]"><Lock size={14} /><span>Secured by GLOBALX Commerce</span></div>
      </div>
    </div>
  );
};

// Checkout selector by tier
export const CheckoutPage = ({ style = 'simple' }) => {
  switch (style) {
    case 'step':
    case 'animated':   return <StepCheckout />;
    case 'split':
    case 'immersive':  return <PremiumSplitCheckout />;
    default:           return <SimpleCheckout />;
  }
};
