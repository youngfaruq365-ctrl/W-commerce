import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Star, Heart, MessageCircle, ExternalLink, Instagram, Twitter, Facebook, ShoppingCart, MapPin, Package } from 'lucide-react';
import { WButton, WBadge, WStarRating } from '../../design/components';

export default function FreePortfolio({ store = {} }) {
  const [followed, setFollowed] = useState(false);
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
  } = store;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-main)]">
      {/* Banner */}
      <div className="relative h-48 sm:h-64 overflow-hidden bg-[var(--bg-secondary)]">
        {banner ? (
          <img src={banner} alt="Store banner" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-[var(--bg-secondary)] to-[var(--bg-tertiary)]" />
        )}
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Store Header */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="relative -mt-12 sm:-mt-16 mb-6 flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl border-4 border-[var(--bg-primary)] overflow-hidden bg-[var(--bg-tertiary)] flex-shrink-0">
            {logo ? (
              <img src={logo} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-[var(--text-faint)]">
                {name[0]}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 pt-2">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-main)]">{name}</h1>
              {verified && <WBadge variant="success">Verified</WBadge>}
            </div>
            <p className="text-[var(--text-muted)] text-sm">{tagline}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <WButton 
              variant={followed ? 'ghost' : 'primary'}
              size="sm"
              icon={<Heart size={14} className={followed ? 'fill-red-400 text-red-400' : ''} />}
              onClick={() => setFollowed(!followed)}
            >
              {followed ? 'Following' : 'Follow'}
            </WButton>
            <WButton onClick={() => toast('Feature coming soon', { icon: '🚀' })}  variant="ghost" size="sm" icon={<MessageCircle size={14} />}>Message</WButton>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex gap-6 border-y border-[var(--border-subtle)] py-4 mb-8 text-sm">
          <div className="text-center">
            <div className="font-bold text-lg text-[var(--text-main)]">{productCount.toLocaleString()}</div>
            <div className="text-[var(--text-faint)]">Products</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-lg text-[var(--text-main)]">{followerCount.toLocaleString()}</div>
            <div className="text-[var(--text-faint)]">Followers</div>
          </div>
          <div className="text-center flex items-center gap-1">
            <div>
              <div className="font-bold text-lg text-[var(--text-main)]">{rating.toFixed(1)}</div>
              <div className="text-[var(--text-faint)]">Rating</div>
            </div>
          </div>
          <div className="text-center">
            <div className="font-bold text-lg text-[var(--text-main)]">{reviewCount.toLocaleString()}</div>
            <div className="text-[var(--text-faint)]">Reviews</div>
          </div>
        </div>

        {/* Products Grid */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-[var(--text-main)] mb-6">All Products</h2>
          {products.length === 0 ? (
            <div className="text-center py-16 text-[var(--text-faint)]">
              <Package size={40} className="mx-auto mb-3 opacity-40" />
              <p>No products yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {products.map(product => (
                <div
                  key={product.id}
                  className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden group cursor-pointer"
                >
                  <div className="aspect-square overflow-hidden bg-[var(--bg-tertiary)]">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-[var(--text-main)] mb-1 truncate">{product.name}</h3>
                    <div className="flex items-center gap-1 mb-2">
                      <Star size={12} className="fill-amber-400 text-amber-400" />
                      <span className="text-xs text-[var(--text-muted)]">{product.rating} ({product.reviews})</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[var(--text-main)]">₦{product.price}</span>
                      <WButton onClick={() => toast('Feature coming soon', { icon: '🚀' })}  variant="ghost" size="xs" icon={<ShoppingCart size={12} />}>Add</WButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* About Section */}
        {description && (
          <section className="mb-12 p-6 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl">
            <h2 className="text-xl font-bold text-[var(--text-main)] mb-3">About This Store</h2>
            <p className="text-[var(--text-muted)] leading-relaxed">{description}</p>
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {categories.map(cat => (
                  <span key={cat} className="px-3 py-1 rounded-full text-xs bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
                    {cat}
                  </span>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-[var(--border-subtle)] mt-12 py-8">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[var(--text-faint)] text-sm">© 2026 {name} · Powered by W-Commerce</p>
          <div className="flex gap-4">
            {socialLinks.instagram && (
              <a href={socialLinks.instagram} className="text-[var(--text-faint)] hover:text-[var(--text-main)] transition-colors">
                <Instagram size={18} />
              </a>
            )}
            {socialLinks.twitter && (
              <a href={socialLinks.twitter} className="text-[var(--text-faint)] hover:text-[var(--text-main)] transition-colors">
                <Twitter size={18} />
              </a>
            )}
            {socialLinks.facebook && (
              <a href={socialLinks.facebook} className="text-[var(--text-faint)] hover:text-[var(--text-main)] transition-colors">
                <Facebook size={18} />
              </a>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
