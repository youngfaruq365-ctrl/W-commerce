import React, { useState } from 'react';
import toast from 'react-hot-toast';
import {
  Heart, Plus, Lock, Globe, Share2, Edit2, Trash2, ShoppingCart,
  X, ChevronDown, Check, MoreHorizontal, Grid, List, ArrowRight,
  Copy, Link, Star
} from 'lucide-react';

const mockLists = [
  { id: 1, name: 'Default List', itemCount: 8, isPrivate: false, isDefault: true, createdAt: '2024-01-10' },
  { id: 2, name: 'Birthday Wishlist', itemCount: 5, isPrivate: true, isDefault: false, createdAt: '2024-03-15' },
  { id: 3, name: 'Home Decor Ideas', itemCount: 12, isPrivate: false, isDefault: false, createdAt: '2024-05-02' },
  { id: 4, name: 'Tech Gadgets', itemCount: 3, isPrivate: true, isDefault: false, createdAt: '2024-06-20' },
];

const mockProducts = [
  { id: 1, name: 'Sony WH-1000XM5 Headphones', price: 349.99, originalPrice: 399.99, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop', rating: 4.8, reviews: 2341 },
  { id: 2, name: 'Apple AirPods Pro 2nd Gen', price: 249.00, originalPrice: 249.00, image: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=300&h=300&fit=crop', rating: 4.9, reviews: 5678 },
  { id: 3, name: 'Logitech MX Master 3S Mouse', price: 99.99, originalPrice: 119.99, image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=300&h=300&fit=crop', rating: 4.7, reviews: 1234 },
  { id: 4, name: 'Samsung 27" 4K Monitor', price: 449.00, originalPrice: 549.00, image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=300&h=300&fit=crop', rating: 4.6, reviews: 892 },
];

function CreateListModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6 w-full max-w-md mx-4 shadow-[var(--shadow-lg)]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-[var(--text-main)]">Create New List</h3>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-1.5">List Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Birthday Wishlist"
              className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-[var(--text-main)] placeholder-[var(--text-faint)] outline-none focus:border-[var(--border-hover)] transition-colors"
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              {isPrivate ? <Lock size={16} className="text-[var(--text-muted)]" /> : <Globe size={16} className="text-[var(--text-muted)]" />}
              <span className="text-sm text-[var(--text-main)]">{isPrivate ? 'Private' : 'Public'}</span>
              <span className="text-xs text-[var(--text-faint)]">{isPrivate ? 'Only you can see this' : 'Anyone with link can view'}</span>
            </div>
            <button onClick={() => setIsPrivate(!isPrivate)} className={`w-11 h-6 rounded-full transition-colors relative ${isPrivate ? 'bg-[var(--accent-gray)]' : 'bg-[var(--bg-primary)]'} border border-[var(--border-color)]`}>
              <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${isPrivate ? 'left-6' : 'left-0.5'}`} />
            </button>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--border-hover)] transition-all text-sm">Cancel</button>
            <button
              onClick={() => { if (name.trim()) { onCreate(name.trim(), isPrivate); onClose(); } }}
              disabled={!name.trim()}
              className="flex-1 py-2.5 rounded-xl bg-[var(--accent-gray)] text-[var(--bg-primary)] font-semibold hover:bg-white transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >Create List</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShareModal({ list, onClose }) {
  const [copied, setCopied] = useState(false);
  const link = `https://wcommerce.app/wishlist/${list.id}`;
  const handleCopy = () => {
    navigator.clipboard.writeText(link)
      .then(() => {
        setCopied(true);
        toast.success('Link copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        toast.error('Failed to copy link');
      });
  };
  const shareItems = [
    { name: 'WhatsApp', color: '#25D366', icon: '💬' },
    { name: 'Twitter', color: '#1DA1F2', icon: '𝕏' },
    { name: 'Facebook', color: '#1877F2', icon: 'f' },
    { name: 'Email', color: '#6b7280', icon: '✉' },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6 w-full max-w-sm mx-4 shadow-[var(--shadow-lg)]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-[var(--text-main)]">Share "{list.name}"</h3>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"><X size={20} /></button>
        </div>
        <div className="grid grid-cols-4 gap-3 mb-5">
          {shareItems.map(s => (
            <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  key={s.name} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--accent-gray-glow)] transition-all">
              <span className="text-xl">{s.icon}</span>
              <span className="text-xs text-[var(--text-muted)]">{s.name}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 p-3 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-subtle)]">
          <Link size={14} className="text-[var(--text-faint)] flex-shrink-0" />
          <span className="text-xs text-[var(--text-muted)] truncate flex-1">{link}</span>
          <button onClick={handleCopy} className="flex-shrink-0 text-xs font-medium text-[var(--accent-gray)] hover:text-white transition-colors flex items-center gap-1">
            {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WishlistManager() {
  const [lists, setLists] = useState(mockLists);
  const [activeList, setActiveList] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [shareTarget, setShareTarget] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [moveDropdown, setMoveDropdown] = useState(null);
  const [addedToCart, setAddedToCart] = useState([]);

  const handleCreate = (name, isPrivate) => {
    const newList = { id: crypto.randomUUID(), name, itemCount: 0, isPrivate, isDefault: false, createdAt: new Date().toISOString().slice(0, 10) };
    setLists(prev => [...prev, newList]);
    toast.success('Wishlist created');
  };

  const handleDelete = (id) => {
    setLists(prev => prev.filter(l => l.id !== id));
    toast.success('Wishlist deleted');
  };

  const handleTogglePrivacy = (id) => {
    setLists(prev => prev.map(l => {
      if (l.id === id) {
        const next = !l.isPrivate;
        toast.success(`List is now ${next ? 'Private' : 'Public'}`);
        return { ...l, isPrivate: next };
      }
      return l;
    }));
  };

  const handleAddToCart = (productId) => {
    setAddedToCart(prev => [...prev, productId]);
    toast.success('Added to cart');
    setTimeout(() => setAddedToCart(prev => prev.filter(id => id !== productId)), 2000);
  };

  const handleAddAllToCart = () => {
    mockProducts.forEach(p => {
      setAddedToCart(prev => [...prev, p.id]);
    });
    toast.success('All items added to cart');
    setTimeout(() => setAddedToCart([]), 2000);
  };

  const toggleSelect = (id) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  if (activeList) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setActiveList(null)} className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors text-sm">
              <ArrowRight size={16} className="rotate-180" /> Back to Lists
            </button>
          </div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-main)]">{activeList.name}</h1>
              <p className="text-[var(--text-muted)] text-sm mt-1">{mockProducts.length} items</p>
            </div>
            <div className="flex items-center gap-3">
              {selectedItems.length > 0 && (
                <div className="flex items-center gap-2">
                  <button onClick={handleAddAllToCart} className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-gray)] text-[var(--bg-primary)] rounded-xl text-sm font-semibold hover:bg-white transition-all">
                    <ShoppingCart size={14} /> Add All to Cart
                  </button>
                  <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  className="flex items-center gap-2 px-4 py-2 border border-[var(--border-color)] text-[var(--text-muted)] rounded-xl text-sm hover:border-[var(--border-hover)] hover:text-[var(--text-main)] transition-all">
                    Move All
                  </button>
                </div>
              )}
              {!selectedItems.length && (
                <button onClick={handleAddAllToCart} className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-gray)] text-[var(--bg-primary)] rounded-xl text-sm font-semibold hover:bg-white transition-all">
                  <ShoppingCart size={14} /> Add All to Cart
                </button>
              )}
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {mockProducts.map(product => (
              <div key={product.id} className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden group hover:border-[var(--border-hover)] transition-all hover:shadow-[var(--shadow-md)]">
                <div className="relative">
                  <input type="checkbox" checked={selectedItems.includes(product.id)} onChange={() => toggleSelect(product.id)}
                    className="absolute top-3 left-3 z-10 w-4 h-4 accent-white cursor-pointer" />
                  <img src={product.image} alt={product.name} className="w-full h-40 object-cover" />
                  <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  className="absolute top-3 right-3 w-8 h-8 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-red-400 hover:text-red-300 transition-colors">
                    <Heart size={14} fill="currentColor" />
                  </button>
                </div>
                <div className="p-3">
                  <p className="text-[var(--text-main)] text-sm font-medium leading-tight mb-1 line-clamp-2">{product.name}</p>
                  <div className="flex items-center gap-1 mb-2">
                    <Star size={11} className="text-yellow-400" fill="currentColor" />
                    <span className="text-xs text-[var(--text-muted)]">{product.rating} ({product.reviews.toLocaleString()})</span>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[var(--text-main)] font-bold">${product.price}</span>
                    {product.originalPrice > product.price && (
                      <span className="text-[var(--text-faint)] text-xs line-through">${product.originalPrice}</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleAddToCart(product.id)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1 ${addedToCart.includes(product.id) ? 'bg-green-600 text-white' : 'bg-[var(--accent-gray)] text-[var(--bg-primary)] hover:bg-white'}`}>
                      {addedToCart.includes(product.id) ? <><Check size={12} /> Added</> : <><ShoppingCart size={12} /> Add to Cart</>}
                    </button>
                    <div className="relative">
                      <button onClick={() => setMoveDropdown(moveDropdown === product.id ? null : product.id)}
                        className="h-full px-2 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--border-hover)] hover:text-[var(--text-main)] transition-all flex items-center gap-1 text-xs">
                        Move <ChevronDown size={10} />
                      </button>
                      {moveDropdown === product.id && (
                        <div className="absolute bottom-full right-0 mb-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-[var(--shadow-lg)] py-1 min-w-[140px] z-20">
                          {lists.filter(l => l.id !== activeList.id).map(l => (
                            <button key={l.id} onClick={() => setMoveDropdown(null)}
                              className="w-full text-left px-3 py-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-tertiary)] transition-colors">
                              {l.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-main)] flex items-center gap-3">
              <Heart className="text-red-400" size={28} fill="currentColor" />
              My Wishlists
            </h1>
            <p className="text-[var(--text-muted)] mt-1">{lists.length} lists · {lists.reduce((a, l) => a + l.itemCount, 0)} total items</p>
          </div>
          <button onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[var(--accent-gray)] text-[var(--bg-primary)] rounded-xl font-semibold hover:bg-white transition-all shadow-[0_0_20px_var(--accent-gray-dim)]">
            <Plus size={18} /> Create List
          </button>
        </div>

        {/* Lists Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lists.map(list => (
            <div key={list.id} className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-5 hover:border-[var(--border-hover)] transition-all hover:shadow-[var(--shadow-md)] group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-[var(--text-main)] font-semibold text-lg truncate">{list.name}</h3>
                    {list.isDefault && (
                      <span className="px-2 py-0.5 bg-[var(--accent-gray-dim)] text-[var(--accent-gray)] text-xs rounded-full border border-[var(--glass-border)] flex-shrink-0">Default</span>
                    )}
                  </div>
                  <p className="text-[var(--text-muted)] text-sm">{list.itemCount} items · Created {list.createdAt}</p>
                </div>
                <div className="flex items-center gap-1 ml-3">
                  <button onClick={() => setShareTarget(list)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-faint)] hover:text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] transition-all">
                    <Share2 size={15} />
                  </button>
                  <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-faint)] hover:text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] transition-all">
                    <Edit2 size={15} />
                  </button>
                  {!list.isDefault && (
                    <button onClick={() => handleDelete(list.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-faint)] hover:text-red-400 hover:bg-red-400/10 transition-all">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* Privacy Toggle */}
              <div className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-xl mb-4">
                <div className="flex items-center gap-2">
                  {list.isPrivate ? <Lock size={14} className="text-[var(--text-muted)]" /> : <Globe size={14} className="text-[var(--text-muted)]" />}
                  <span className="text-sm text-[var(--text-muted)]">{list.isPrivate ? 'Private' : 'Public'}</span>
                </div>
                <button onClick={() => handleTogglePrivacy(list.id)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${list.isPrivate ? 'bg-[var(--accent-gray)]' : 'bg-[var(--bg-primary)]'} border border-[var(--border-color)]`}>
                  <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all ${list.isPrivate ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>

              {/* Open Button */}
              <button onClick={() => setActiveList(list)}
                className="w-full py-2.5 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--border-hover)] hover:bg-[var(--accent-gray-glow)] transition-all text-sm font-medium flex items-center justify-center gap-2">
                View Items <ArrowRight size={14} />
              </button>
            </div>
          ))}

          {/* Add List Card */}
          <button onClick={() => setShowCreateModal(true)}
            className="border-2 border-dashed border-[var(--border-subtle)] rounded-2xl p-5 flex flex-col items-center justify-center gap-3 text-[var(--text-faint)] hover:text-[var(--text-muted)] hover:border-[var(--border-color)] transition-all min-h-[180px]">
            <Plus size={24} />
            <span className="text-sm font-medium">New List</span>
          </button>
        </div>
      </div>

      {showCreateModal && <CreateListModal onClose={() => setShowCreateModal(false)} onCreate={handleCreate} />}
      {shareTarget && <ShareModal list={shareTarget} onClose={() => setShareTarget(null)} />}
    </div>
  );
}
