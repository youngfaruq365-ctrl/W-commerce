import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Star } from 'lucide-react';
import { apiClient } from '@/utils/apiClient';

const timeAgo = (d) => {
  const s = Math.max(1, Math.floor((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 3600) return `${Math.floor(s / 60) || 1}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const Avatar = ({ url, name, size = 'w-14 h-14', text = 'text-lg' }) =>
  url ? (
    <img src={url} alt={name} loading="lazy" className={`${size} rounded-full object-cover`} />
  ) : (
    <div className={`${size} rounded-full bg-[var(--bg-secondary)] flex items-center justify-center font-black ${text} text-[var(--text-muted)]`}>
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );

export const SectionHeader = ({ title, action }) => {
  if (!title && !action) return null;
  return (
    <div className="flex items-end justify-between mb-6">
      <div>
        {title && <h2 className="text-2xl md:text-3xl font-black tracking-tight">{title}</h2>}
      </div>
      {action}
    </div>
  );
};

export function useDiscoveryData() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    apiClient.get('/api/v1/home/discovery')
      .then(r => {
        if (alive) {
          setData(r.data || {});
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (alive) {
          setData({});
          setIsLoading(false);
        }
      });
    return () => { alive = false; };
  }, []);

  return {
    stories: data?.stories || [],
    stores: data?.stores || [],
    posts: data?.posts || [],
    collections: data?.collections || [],
    country: data?.country,
    isLoading,
  };
}

export function SellerStoriesSection({ stories = [] }) {
  const navigate = useNavigate();
  if (!stories || stories.length === 0) return null;

  return (
    <section className="py-4" aria-label="Seller stories">
      <div className="flex gap-5 overflow-x-auto pb-2 hide-scrollbar">
        {stories.map(s => (
          <button
            key={s.id}
            id={`story-${s.id}`}
            onClick={() => navigate('/feed')}
            className="flex flex-col items-center gap-2 shrink-0 group cursor-pointer"
          >
            <div className="p-[3px] rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-violet-600 group-hover:scale-105 transition-transform duration-300">
              <div className="p-[2px] rounded-full bg-[var(--bg-primary)]">
                <Avatar url={s.avatarUrl} name={s.name} size="w-16 h-16 md:w-20 md:h-20" text="text-xl md:text-2xl" />
              </div>
            </div>
            <span className="text-xs font-medium text-[var(--text-muted)] truncate w-20 text-center">{s.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function StoresNearYouSection({ stores = [] }) {
  if (!stores || stores.length === 0) return null;
  const storeLink = (s) => (s.portfolioSlug ? `/store/${s.portfolioSlug}` : `/seller/${s.sellerId}`);

  return (
    <section className="py-4" aria-label="Stores near you">
      <div className="flex gap-6 overflow-x-auto pb-2 hide-scrollbar snap-x">
        {stores.map(s => (
          <Link
            key={s.id}
            to={storeLink(s)}
            className="flex flex-col items-center gap-2 shrink-0 group snap-start cursor-pointer"
          >
            <div className="p-[3px] rounded-full bg-gradient-to-tr from-emerald-400 via-teal-500 to-indigo-600 group-hover:scale-105 transition-transform duration-300 shadow-sm">
              <div className="p-[2px] rounded-full bg-[var(--bg-primary)]">
                <Avatar url={s.logoUrl} name={s.storeName} size="w-16 h-16 md:w-20 md:h-20" text="text-xl md:text-2xl" />
              </div>
            </div>
            <span className="text-xs font-bold text-[var(--text-main)] truncate w-20 md:w-24 text-center">
              {s.storeName}
            </span>
            <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] -mt-1">
              {s.totalReviews > 0 ? (
                <span className="flex items-center gap-0.5 font-bold text-amber-500">
                  <Star size={10} className="fill-amber-400 text-amber-400" />
                  {Number(s.averageRating).toFixed(1)}
                </span>
              ) : (
                <span className="truncate max-w-[80px] text-center">{s.country || 'Store'}</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function SellerPostsSection({ posts = [] }) {
  if (!posts || posts.length === 0) return null;

  return (
    <section className="py-6" aria-label="What sellers are posting">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {posts.map(p => (
          <Link
            key={p.id}
            to={p.productId ? `/product/${p.productId}` : '/feed'}
            className="neu-card overflow-hidden hover:-translate-y-1 transition-transform"
          >
            {p.mediaUrl && (
              /\.(mp4|webm|mov)(\?|$)/i.test(p.mediaUrl) ? (
                <video src={p.mediaUrl} muted playsInline preload="metadata" className="w-full h-48 object-cover bg-black" />
              ) : (
                <img src={p.mediaUrl} alt={p.caption || 'Post'} loading="lazy" className="w-full h-48 object-cover" />
              )
            )}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Avatar url={p.author?.avatarUrl} name={p.author?.name} size="w-7 h-7" text="text-xs" />
                <span className="text-sm font-semibold truncate">{p.author?.name}</span>
                <span className="text-xs text-[var(--text-muted)] ml-auto shrink-0">{timeAgo(p.createdAt)}</span>
              </div>
              {p.caption && <p className="text-sm text-[var(--text-muted)] line-clamp-2">{p.caption}</p>}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--border-color)] text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1"><Heart size={13} /> {p.likes}</span>
                <span className="flex items-center gap-1"><MessageCircle size={13} /> {p.comments}</span>
                {p.product?.title && <span className="ml-auto truncate max-w-[50%]">{p.product.title}</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function ShopByCategoriesSection({ collections = [] }) {
  if (!collections || collections.length === 0) return null;

  return (
    <section className="py-6" aria-label="Shop by categories">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {collections.map(c => (
          <Link
            key={c.category}
            to={`/search?q=${encodeURIComponent(c.category)}`}
            className="relative h-40 md:h-48 rounded-2xl overflow-hidden group bg-[var(--bg-secondary)]"
          >
            {c.coverUrl && (
              <img src={c.coverUrl} alt={c.category} loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-0 p-4">
              <h3 className="text-white font-bold text-lg leading-tight">{c.category}</h3>
              <span className="text-white/70 text-xs">{c.items} {c.items === 1 ? 'item' : 'items'}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function DiscoverySections() {
  const { stories, stores, posts, collections, isLoading } = useDiscoveryData();

  if (isLoading) {
    return (
      <div className="py-8 flex gap-4 overflow-hidden" aria-busy="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="w-16 h-16 rounded-full bg-gray-200/20 animate-pulse shrink-0" />
        ))}
      </div>
    );
  }

  return (
    <>
      <SellerStoriesSection stories={stories} />
      <StoresNearYouSection stores={stores} />
    </>
  );
}
