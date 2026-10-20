import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Heart, MessageCircle, Star, ShoppingCart, ChevronRight, Instagram, Twitter, Facebook, Package, CheckCircle, TrendingUp, Users } from 'lucide-react';
import { WButton, WBadge, WStarRating } from '../../design/components';

export default function PremiumPortfolio({ store = {} }) {
  const [followed, setFollowed] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [heroVisible, setHeroVisible] = useState(false);

  const {
    name = 'My Store',
    tagline = 'Welcome to our store',
    logo,
    banner,
    description = '',
    followerCount = 0,
    productCount = 0,
    rating = 0,
    reviewCount = 0,
    products = [],
    socialLinks = {},
    verified = false,
    categories = [],
    seller = {},
  } = store;

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const allCategories = ['All', ...categories];
  const filteredProducts = activeCategory === 'All'
    ? products
    : products.filter(p => p.category === activeCategory);

  const featuredProducts = products.slice(0, 3);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-main)]">
      {/* Animated Hero Banner */}
      <div className="relative h-64 sm:h-80 overflow-hidden bg-[var(--bg-secondary)]">
        {banner ? (
          <img
            src={banner}
            alt="Store banner"
            className={`w-full h-full object-cover transition-all duration-1000 ease-out ${heroVisible ? 'scale-100 opacity-100' : 'scale-110 opacity-0'}`}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-900 via-[var(--bg-secondary)] to-purple-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-black/40 to-transparent" />

        {/* Floating stats */}
        <div className={`absolute bottom-6 right-6 flex gap-3 transition-all duration-700 delay-300 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] rounded-xl px-4 py-2 text-center">
            <div className="font-bold text-white">{(followerCount / 1000).toFixed(1)}K</div>
            <div className="text-xs text-white/60">Followers</div>
          </div>
          <div className="bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] rounded-xl px-4 py-2 text-center">
            <div className="font-bold text-white">{rating.toFixed(1)}★</div>
            <div className="text-xs text-white/60">Rating</div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Store Identity */}
        <div
          className={`relative -mt-14 mb-8 flex flex-col sm:flex-row sm:items-end gap-4 transition-all duration-700 delay-150 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl border-4 border-[var(--bg-primary)] overflow-hidden bg-[var(--bg-tertiary)] shadow-[var(--shadow-lg)] flex-shrink-0">
            {logo ? (
              <img src={logo} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-[var(--text-faint)]">
                {name[0]}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 pt-2">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold">{name}</h1>
              {verified && <WBadge variant="success"><CheckCircle size={10} className="mr-1" />Verified</WBadge>}
            </div>
            <p className="text-[var(--text-muted)]">{tagline}</p>
            {seller.name && <p className="text-xs text-[var(--text-faint)] mt-1">by {seller.name}</p>}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <WButton variant={followed ? 'ghost' : 'primary'}
              size="sm"
              icon={<Heart size={14} className={followed ? 'fill-red-400 text-red-400' : ''} />}
              onClick={() => setFollowed(!followed)}
            >
              {followed ? 'Following' : 'Follow'}
            </WButton>
            <WButton variant="ghost" size="sm" icon={<MessageCircle size={14} />}>Message</WButton>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4 mb-10 p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl">
          {[
            { label: 'Products', value: productCount.toLocaleString(), icon: <Package size={16} /> },
            { label: 'Followers', value: followerCount.toLocaleString(), icon: <Users size={16} /> },
            { label: 'Rating', value: `${rating.toFixed(1)}★`, icon: <Star size={16} className="text-amber-400" /> },
            { label: 'Reviews', value: reviewCount.toLocaleString(), icon: <TrendingUp size={16} /> },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <div className="flex justify-center text-[var(--text-faint)] mb-1">{stat.icon}</div>
              <div className="font-bold text-lg">{stat.value}</div>
              <div className="text-xs text-[var(--text-faint)]">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Featured Products */}
        {featuredProducts.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Featured Products</h2>
              <WButton variant="ghost" size="sm" iconRight={<ChevronRight size={14} />}>View All</WButton>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {featuredProducts.map(product => (
                <div
                  key={product.id}
                  className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden group cursor-pointer hover:border-[var(--border-hover)] hover:shadow-[var(--shadow-md)] transition-all duration-300"
                >
                  <div className="relative aspect-square overflow-hidden bg-[var(--bg-tertiary)]">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-3 left-3">
                      <WBadge variant="warning">Featured</WBadge>
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100">
                      <WButton variant="primary" size="sm" icon={<ShoppingCart size={14} />}>Add to Cart</WButton>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold truncate mb-1">{product.name}</h3>
                    <div className="flex items-center gap-1 mb-2">
                      <Star size={12} className="fill-amber-400 text-amber-400" />
                      <span className="text-xs text-[var(--text-muted)]">{product.rating} ({product.reviews})</span>
                    </div>
                    <span className="font-bold text-lg">₦{product.price}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Category Filter + Products */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold">All Products</h2>
          </div>
          {/* Category Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
            {allCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeCategory === cat
                    ? 'bg-[var(--text-main)] text-[var(--bg-primary)]'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-subtle)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map(product => (
              <div
                key={product.id}
                className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden group cursor-pointer hover:border-[var(--border-hover)] transition-all duration-300"
              >
                <div className="aspect-square overflow-hidden bg-[var(--bg-tertiary)]">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm truncate mb-1">{product.name}</h3>
                  <div className="flex items-center justify-between">
                    <span className="font-bold">₦{product.price}</span>
                    <Star size={11} className="fill-amber-400 text-amber-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Contact Section */}
        <section className="mb-12 p-6 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-center">
          <h2 className="text-xl font-bold mb-2">Get in Touch</h2>
          <p className="text-[var(--text-muted)] mb-5">Have questions? Send us a message and we'll respond within 24 hours.</p>
          <WButton variant="primary" icon={<MessageCircle size={15} />}>Send Message</WButton>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-[var(--border-subtle)] py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[var(--text-faint)] text-sm">© 2026 {name} · Premium Store on W-Commerce</p>
          <div className="flex gap-4">
            {socialLinks.instagram && <a href={socialLinks.instagram} className="text-[var(--text-faint)] hover:text-[var(--text-main)] transition-colors"><Instagram size={18} /></a>}
            {socialLinks.twitter && <a href={socialLinks.twitter} className="text-[var(--text-faint)] hover:text-[var(--text-main)] transition-colors"><Twitter size={18} /></a>}
            {socialLinks.facebook && <a href={socialLinks.facebook} className="text-[var(--text-faint)] hover:text-[var(--text-main)] transition-colors"><Facebook size={18} /></a>}
          </div>
        </div>
      </footer>
    </div>
  );
}
