import React, { useState, useEffect } from 'react';
import { ShoppingBag, X, Plus, Minus, Trash2, ArrowRight } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useNavigate } from 'react-router-dom';

const PortfolioCartModal = ({ store }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { cartItems, updateQuantity, removeFromCart, fetchCart } = useCartStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Filter items for THIS seller
  const sellerItems = cartItems.filter(item => 
    item.sellerId === store.sellerId || item.seller === store.storeName
  );

  const totalItems = sellerItems.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = sellerItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleQuickCheckout = () => {
    setIsOpen(false);
    // Navigate to global cart and pre-select this seller's direct checkout
    // Pass state to auto-trigger the checkout flow for this seller if desired
    navigate('/cart', { state: { quickCheckoutSeller: store.storeName } });
  };

  return (
    <>
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 z-50 bg-[var(--accent-gray)] text-black w-14 h-14 rounded-full flex items-center justify-center shadow-[0_0_20px_var(--accent-gray-dim)] hover:scale-110 transition-transform group"
      >
        <ShoppingBag size={24} />
        {totalItems > 0 && (
          <span className="absolute -top-2 -right-2 bg-white text-[var(--accent-gray)] border border-[var(--accent-gray)] text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
            {totalItems}
          </span>
        )}
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[100] flex justify-end">
          {/* Modal Content */}
          <div className="w-full max-w-md bg-[var(--bg-secondary)] border-l border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] h-full flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-[slideInRight_0.3s_ease-out]">
            <div className="p-6 border-b border-[var(--accent-gray)] shadow-[0_2px_10px_var(--accent-gray-dim)] flex justify-between items-center bg-white/40">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <ShoppingBag size={20} className="text-[var(--accent-gray)]" /> 
                {store.storeName}'s Cart
              </h2>
              <button onClick={() => setIsOpen(false)} className="text-[var(--text-muted)] hover:text-black transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {sellerItems.length === 0 ? (
                <div className="text-center text-[var(--text-muted)] mt-10">
                  <ShoppingBag size={48} className="mx-auto mb-4 opacity-20" />
                  <p>Your cart is empty for this seller.</p>
                </div>
              ) : (
                sellerItems.map(item => (
                  <div key={item.id} className="flex gap-4 p-4 rounded-xl border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] bg-[var(--bg-tertiary)] group hover:border-[var(--accent-gray)] transition-colors">
                    <img src={item.image} alt={item.title} className="w-20 h-20 object-cover rounded-lg bg-white filter group-hover:brightness-110 transition-all" />
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-sm line-clamp-2">{item.title}</h4>
                        <button onClick={() => removeFromCart(item.productId)} className="text-[var(--text-muted)] hover:text-gray-700 500 transition-colors"><Trash2 size={16} /></button>
                      </div>
                      <div className="flex justify-between items-end mt-2">
                        <span className="font-bold text-[var(--accent-gray)]"> ₦{Number(item.price).toFixed(2)}</span>
                        <div className="flex items-center gap-3 bg-white rounded-lg p-1 border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)]">
                          <button onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variants)} disabled={item.quantity <= 1} className="w-6 h-6 rounded text-black hover:bg-[var(--bg-secondary)] disabled:opacity-50 flex items-center justify-center">-</button>
                          <span className="w-4 text-center font-bold text-sm">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variants)} className="w-6 h-6 rounded text-black hover:bg-[var(--bg-secondary)] flex items-center justify-center">+</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {sellerItems.length > 0 && (
              <div className="p-6 border-t border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] bg-white/60 backdrop-blur-md">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-[var(--text-muted)]">Subtotal ({totalItems} items)</span>
                  <span className="text-2xl font-bold"> ₦{totalPrice.toFixed(2)}</span>
                </div>
                <div className="space-y-3">
                  <button onClick={handleQuickCheckout} className="w-full py-4 bg-[var(--accent-gray)] text-black font-extrabold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-[0_0_20px_var(--accent-gray-dim)]">
                    Quick Checkout <ArrowRight size={18} />
                  </button>
                  <button onClick={() => { setIsOpen(false); navigate('/cart'); }} className="w-full py-3 border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] text-black font-bold rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors">
                    View Global Cart
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default PortfolioCartModal;
