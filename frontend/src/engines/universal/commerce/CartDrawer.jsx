import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePreview } from '../commerce/PreviewContext';
import { X, Plus, Minus, ShoppingBag, ArrowRight, Package } from 'lucide-react';

const CartItem = ({ item, style }) => {
  const { updateQty, removeFromCart } = usePreview();
  return (
    <div className="flex gap-4 py-4 border-b border-[var(--s-border,#f0f0f0)]">
      <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded-[var(--s-radius,8px)] flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm truncate">{item.name}</div>
        <div className="text-[var(--s-primary)] font-bold mt-1">${item.price}</div>
        <div className="flex items-center gap-2 mt-2">
          <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <Minus size={12} />
          </button>
          <span className="text-sm font-bold w-5 text-center">{item.qty}</span>
          <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <Plus size={12} />
          </button>
        </div>
      </div>
      <button onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-black transition-colors self-start">
        <X size={16} />
      </button>
    </div>
  );
};

const CartFooter = ({ onCheckout }) => {
  const { cartTotal, cart } = usePreview();
  const shipping = cartTotal > 100 ? 0 : 9.99;
  return (
    <div className="p-6 border-t border-[var(--s-border,#f0f0f0)] space-y-4">
      <div className="flex justify-between text-sm"><span className="opacity-60">Subtotal</span><span className="font-bold">${cartTotal.toFixed(2)}</span></div>
      <div className="flex justify-between text-sm"><span className="opacity-60">Shipping</span><span className="font-bold">{shipping === 0 ? 'Free' : `$${shipping}`}</span></div>
      <div className="h-px bg-gray-100"></div>
      <div className="flex justify-between font-black text-lg"><span>Total</span><span>${(cartTotal + shipping).toFixed(2)}</span></div>
      <button onClick={onCheckout} disabled={cart.length === 0}
        className="w-full py-4 bg-[var(--s-primary,#000)] text-[var(--s-bg,#fff)] font-bold rounded-[var(--s-radius,8px)] disabled:opacity-40 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
        Checkout <ArrowRight size={16} />
      </button>
    </div>
  );
};

// SideDrawer Cart
export const SideDrawerCart = ({ onClose, onCheckout }) => {
  const { cart, cartCount } = usePreview();
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 z-[80]" onClick={onClose} />
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 200 }}
        className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-[var(--s-bg,#fff)] text-[var(--s-text,#111)] z-[81] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-[var(--s-border,#f0f0f0)]">
          <div className="flex items-center gap-2 font-black text-xl">
            <ShoppingBag size={20} /> Cart {cartCount > 0 && <span className="text-sm bg-[var(--s-primary)] text-[var(--s-bg)] rounded-full w-6 h-6 flex items-center justify-center">{cartCount}</span>}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {cart.length === 0
            ? <div className="flex flex-col items-center justify-center h-full gap-4 opacity-40">
                <Package size={48} />
                <p className="font-bold">Your cart is empty</p>
              </div>
            : cart.map(item => <CartItem key={item.id} item={item} />)}
        </div>
        <CartFooter onCheckout={onCheckout} />
      </motion.div>
    </AnimatePresence>
  );
};

// Floating Panel Cart
export const FloatingPanelCart = ({ onClose, onCheckout }) => {
  const { cart, cartCount } = usePreview();
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="absolute bottom-6 right-6 w-96 bg-[var(--s-bg,#fff)] text-[var(--s-text,#111)] rounded-2xl shadow-2xl z-[81] flex flex-col border border-[var(--s-border,#f0f0f0)] overflow-hidden max-h-[70vh]">
        <div className="flex items-center justify-between p-4 border-b border-[var(--s-border,#f0f0f0)]">
          <div className="font-black">Cart ({cartCount})</div>
          <button onClick={onClose}><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4">
          {cart.map(item => <CartItem key={item.id} item={item} />)}
        </div>
        <CartFooter onCheckout={onCheckout} />
      </motion.div>
    </AnimatePresence>
  );
};

// Minimal Panel Cart
export const MinimalPanelCart = ({ onClose, onCheckout }) => {
  const { cart, cartTotal } = usePreview();
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
        className="absolute top-20 right-4 w-80 bg-white rounded-xl shadow-2xl z-[81] p-4 border border-gray-100">
        {cart.map(item => (
          <div key={item.id} className="flex justify-between items-center py-2 text-sm border-b border-gray-50">
            <span className="font-medium truncate flex-1 mr-2">{item.name}</span>
            <span className="font-bold">${(item.price * item.qty).toFixed(2)}</span>
          </div>
        ))}
        <div className="flex justify-between font-black mt-4 mb-3">
          <span>Total</span><span>${cartTotal.toFixed(2)}</span>
        </div>
        <button onClick={onCheckout} className="w-full py-3 bg-black text-white font-bold rounded-lg">Checkout</button>
      </motion.div>
    </AnimatePresence>
  );
};

// Cart selector by style
export const CartDrawer = ({ style, onClose, onCheckout }) => {
  // Enforcing the right slide/overlay for all cart interactions
  return <SideDrawerCart onClose={onClose} onCheckout={onCheckout} />;
};
