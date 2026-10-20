import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw, Check } from 'lucide-react';
import { apiClient as axios } from '@/utils/apiClient';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { celebrate } from '../CelebrationController';
import { PLACEHOLDER_IMAGE } from '@/constants/placeholders';

export default function BuyProductAgain({ products = [] }) {
  const [items, setItems] = useState([]);
  const [addedIds, setAddedIds] = useState(new Set());
  const addToCart = useCartStore(state => state.addToCart);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  useEffect(() => {
    let alive = true;
    const fetchBuyAgain = async () => {
      if (isAuthenticated) {
        try {
          const res = await axios.get('/api/v1/orders/buy-again');
          if (alive && res.data?.success && res.data.suggestions?.length > 0) {
            const mappedSuggestions = res.data.suggestions.map(s => ({
              id: s.productId,
              productId: s.productId,
              title: s.title,
              price: s.price || 0,
              image: s.primaryImage || PLACEHOLDER_IMAGE,
              storeName: s.store?.storeName || 'Verified Store',
            }));
            setItems(mappedSuggestions);
            return;
          }
        } catch {
          // Fall back gracefully to available products
        }
      }

      if (alive && products && products.length > 0) {
        const fallbackItems = products.slice(0, 6).map(p => ({
          id: p.id,
          productId: p.id,
          title: p.title || p.name || 'Product',
          price: p.price || 0,
          image: p.coverUrl || p.images?.[0]?.url || PLACEHOLDER_IMAGE,
          storeName: p.store?.storeName || 'Verified Store',
        }));
        setItems(fallbackItems);
      }
    };

    fetchBuyAgain();
    return () => { alive = false; };
  }, [isAuthenticated, products]);

  const handleBuyAgain = async (item, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      celebrate('standard', e);
    }
    try {
      await addToCart(item.productId || item.id, 1);
      toast.success(`Added ${item.title} to cart`);
      setAddedIds(prev => new Set(prev).add(item.id));
      setTimeout(() => {
        setAddedIds(prev => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }, 2000);
    } catch {
      toast.error('Failed to add item to cart');
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="py-6" aria-label="Buy product again">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {items.map(item => {
          const isAdded = addedIds.has(item.id);
          return (
            <div
              key={item.id}
              className="neu-card group hover:-translate-y-1 transition-transform p-3 rounded-2xl flex flex-col justify-between bg-[var(--bg-primary)] border border-[var(--border-color)]"
            >
              <Link to={`/product/${item.productId || item.id}`} className="block">
                <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-[var(--bg-secondary)] mb-3">
                  <img
                    src={item.image}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <h4 className="font-bold text-sm text-[var(--text-main)] line-clamp-1 mb-1" title={item.title}>
                  {item.title}
                </h4>
                <p className="text-xs text-[var(--text-muted)] truncate mb-2">
                  {item.storeName}
                </p>
              </Link>

              <div className="flex items-center justify-between mt-auto pt-2 border-t border-[var(--border-color)]">
                <span className="font-black text-sm text-[var(--text-main)]">
                  ₦{Number(item.price || 0).toLocaleString()}
                </span>
                <button
                  type="button"
                  onClick={(e) => handleBuyAgain(item, e)}
                  className={`neu-button !py-1 !px-2.5 text-xs font-bold flex items-center gap-1 transition-all ${
                    isAdded
                      ? '!bg-green-600 !text-white'
                      : '!bg-[var(--text-main)] !text-[var(--bg-primary)] hover:opacity-90'
                  }`}
                  title="Buy again"
                >
                  {isAdded ? (
                    <>
                      <Check size={12} className="shrink-0" />
                      <span>Added</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw size={12} className="shrink-0" />
                      <span>Buy again</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
