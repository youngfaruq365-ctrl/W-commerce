import React from 'react';
import { Heart, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PLACEHOLDER_IMAGE } from '@/constants/placeholders';

const BuyerWishlistTab = ({ wishlist = [], onRemove, onAddToCart }) => {
  const navigate = useNavigate();

  if (!wishlist || wishlist.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h2 className="text-2xl font-bold mb-6">My Wishlist</h2>
        <div className="premium-glass p-16 rounded-xl border border-[var(--border-color)] flex flex-col items-center justify-center text-center">
          <Heart size={40} className="text-[var(--text-muted)] mb-4" />
          <h3 className="text-2xl font-bold text-black mb-3">Your Wishlist is Empty</h3>
          <p className="text-[var(--text-muted)] max-w-md">Save items you like so you can find them later when you're ready to buy.</p>
          <button onClick={() => navigate('/shop')} className="mt-6 px-6 py-3 bg-[var(--accent-gray)] text-black font-bold rounded-lg hover:brightness-110 transition-all">
            Browse Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">My Wishlist</h2>
        <span className="text-sm text-[var(--text-muted)]">{wishlist.length} item{wishlist.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {wishlist.map(item => {
          if (!item || !item.product) return null;
          const productId = item.productId || item.product?.id;
          return (
            <div key={item.id || productId} className="premium-glass rounded-xl border border-[var(--border-color)] overflow-hidden group hover:border-[var(--accent-gray)] transition-all">
              <div className="h-48 relative bg-white">
                <img
                  src={item.product?.images?.[0]?.url || PLACEHOLDER_IMAGE}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  alt="product"
                  loading="lazy"
                />
                <button
                  onClick={() => onRemove(productId)}
                  title="Remove from wishlist"
                  className="absolute top-3 right-3 bg-white/60 p-2 rounded-full backdrop-blur-md text-[var(--accent-gray)] hover:bg-gray-500/30 transition-colors"
                >
                  <Heart size={20} fill="currentColor" />
                </button>
                {item.product?.store?.storeName && (
                  <div className="absolute bottom-3 left-3 bg-white/60 px-2 py-1 rounded-full backdrop-blur-md">
                    <p className="text-xs text-gray-800">{item.product.store.storeName}</p>
                  </div>
                )}
              </div>
              <div className="p-5">
                <h3 className="font-bold text-lg mb-1 line-clamp-1">{item.product?.title}</h3>
                <p className="text-2xl font-extrabold text-black mb-4">₦{parseFloat(item.product?.price || 0).toFixed(2)}</p>
                <button
                  onClick={() => onAddToCart(productId)}
                  className="w-full py-3 bg-[var(--accent-gray)] text-black font-bold rounded-lg hover:brightness-110 transition-all flex items-center justify-center gap-2"
                >
                  <ShoppingBag size={18} /> Add to Cart
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BuyerWishlistTab;
