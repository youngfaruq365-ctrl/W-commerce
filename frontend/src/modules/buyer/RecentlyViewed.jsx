import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Clock, Trash2, ShoppingCart, X, Eye, EyeOff, Calendar, ArrowRight, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const DEFAULT_HISTORY = [
  { id: 1, name: 'Sony WH-1000XM5 Headphones', price: 349.99, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=120&h=120&fit=crop', viewedAt: new Date(Date.now() - 1000 * 60 * 20).toISOString() },
  { id: 2, name: 'Apple AirPods Pro 2nd Gen', price: 249.00, image: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=120&h=120&fit=crop', viewedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString() },
  { id: 3, name: 'Logitech MX Master 3S Mouse', price: 99.99, image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=120&h=120&fit=crop', viewedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString() },
  { id: 4, name: 'Samsung 27" 4K Monitor', price: 449.00, image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=120&h=120&fit=crop', viewedAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString() },
  { id: 5, name: 'Keychron K2 Mechanical Keyboard', price: 89.99, image: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=120&h=120&fit=crop', viewedAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString() },
  { id: 6, name: 'DJI Mini 3 Pro Drone', price: 759.00, image: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=120&h=120&fit=crop', viewedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString() },
  { id: 7, name: 'iPad Pro 11" M4', price: 999.00, image: 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=120&h=120&fit=crop', viewedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString() },
];

function getGroup(viewedAt) {
  const now = new Date();
  const date = new Date(viewedAt);
  const diffHours = (now - date) / (1000 * 60 * 60);
  if (diffHours < 24) return 'Today';
  if (diffHours < 48) return 'Yesterday';
  return 'This Week';
}

function formatTime(viewedAt) {
  return new Date(viewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatRelative(viewedAt) {
  const now = new Date();
  const date = new Date(viewedAt);
  const diff = Math.floor((now - date) / (1000 * 60));
  if (diff < 60) return `${diff}m ago`;
  const hrs = Math.floor(diff / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const GROUP_ORDER = ['Today', 'Yesterday', 'This Week'];

export default function RecentlyViewed() {
  const [items, setItems] = useState(() => {
    try {
      const stored = localStorage.getItem('w_recently_viewed');
      return stored ? JSON.parse(stored) : DEFAULT_HISTORY;
    } catch {
      return DEFAULT_HISTORY;
    }
  });
  const [tracking, setTracking] = useState(true);
  const [addedToCart, setAddedToCart] = useState([]);

  const grouped = GROUP_ORDER.reduce((acc, g) => {
    const grpItems = items.filter(i => getGroup(i.viewedAt) === g);
    if (grpItems.length) acc[g] = grpItems;
    return acc;
  }, {});

  const handleClearAll = () => {
    setItems([]);
    try {
      localStorage.removeItem('w_recently_viewed');
      toast.success('Browsing history cleared');
    } catch (err) {
      toast.error('Failed to clear browsing history');
    }
  };

  const handleRemove = (id) => {
    setItems(prev => {
      const updated = prev.filter(i => i.id !== id);
      try {
        localStorage.setItem('w_recently_viewed', JSON.stringify(updated));
      } catch (err) {
        toast.error('Failed to update browsing history');
      }
      return updated;
    });
  };

  const handleAddToCart = (id) => {
    setAddedToCart(prev => [...prev, id]);
    toast.success('Added to cart');
    setTimeout(() => setAddedToCart(prev => prev.filter(i => i !== id)), 2000);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-main)] flex items-center gap-3">
              <Clock className="text-[var(--accent-gray)]" size={28} />
              Recently Viewed
            </h1>
            <p className="text-[var(--text-muted)] mt-1">{items.length} items in your browsing history</p>
          </div>
          {items.length > 0 && (
            <button onClick={handleClearAll} className="flex items-center gap-2 px-4 py-2 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/10 transition-all text-sm">
              <Trash2 size={14} /> Clear All
            </button>
          )}
        </div>

        {/* Tracking Banner */}
        <div className={`flex items-center justify-between p-4 rounded-2xl border mb-6 transition-all ${tracking ? 'bg-[var(--bg-card)] border-[var(--border-subtle)]' : 'bg-orange-500/10 border-orange-500/30'}`}>
          <div className="flex items-center gap-3">
            {tracking ? <Eye size={18} className="text-[var(--text-muted)]" /> : <EyeOff size={18} className="text-orange-400" />}
            <div>
              <p className="text-sm font-medium text-[var(--text-main)]">{tracking ? 'Browsing history is being tracked' : 'Browsing history tracking is off'}</p>
              <p className="text-xs text-[var(--text-muted)]">{tracking ? 'W-Commerce saves your viewed products for a better experience.' : 'Your browsing activity will not be saved.'}</p>
            </div>
          </div>
          <button onClick={() => setTracking(!tracking)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tracking ? 'text-[var(--text-muted)] border border-[var(--border-color)] hover:border-[var(--border-hover)] hover:text-[var(--text-main)]' : 'text-orange-400 border border-orange-500/30 hover:bg-orange-500/10'}`}>
            {tracking ? "Don't track my browsing" : 'Enable tracking'}
          </button>
        </div>

        {/* Empty State */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center mb-5">
              <Clock size={32} className="text-[var(--text-faint)]" />
            </div>
            <h2 className="text-xl font-semibold text-[var(--text-main)] mb-2">No browsing history yet</h2>
            <p className="text-[var(--text-muted)] mb-6 max-w-sm">Start exploring products and they'll appear here for quick access.</p>
            <Link to="/shop" className="flex items-center gap-2 px-6 py-3 bg-[var(--accent-gray)] text-[var(--bg-primary)] rounded-xl font-semibold hover:bg-white transition-all">
              Browse Shop <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([group, groupItems]) => (
              <div key={group}>
                <div className="flex items-center gap-3 mb-4">
                  <Calendar size={15} className="text-[var(--text-faint)]" />
                  <h2 className="text-[var(--text-muted)] text-sm font-semibold uppercase tracking-wider">{group}</h2>
                  <div className="flex-1 h-px bg-[var(--border-subtle)]" />
                  <span className="text-xs text-[var(--text-faint)]">{groupItems.length} items</span>
                </div>
                <div className="space-y-3">
                  {groupItems.map(item => (
                    <div key={item.id} className="flex items-center gap-4 p-4 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl hover:border-[var(--border-hover)] transition-all group">
                      <img src={item.image} alt={item.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[var(--text-main)] font-medium text-sm leading-snug mb-1 truncate pr-2">{item.name}</h3>
                        <div className="flex items-center gap-3">
                          <span className="text-[var(--text-main)] font-bold">₦{item.price}</span>
                          <span className="text-[var(--text-faint)] text-xs flex items-center gap-1">
                            <Clock size={10} /> {formatRelative(item.viewedAt)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => handleAddToCart(item.id)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${addedToCart.includes(item.id) ? 'bg-green-600 text-white' : 'bg-[var(--accent-gray)] text-[var(--bg-primary)] hover:bg-white'}`}>
                          <ShoppingCart size={12} />
                          <span className="hidden sm:inline">{addedToCart.includes(item.id) ? 'Added' : 'Add to Cart'}</span>
                        </button>
                        <button onClick={() => handleRemove(item.id)}
                          className="w-8 h-8 rounded-xl border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-faint)] hover:text-red-400 hover:border-red-500/30 transition-all opacity-0 group-hover:opacity-100">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
