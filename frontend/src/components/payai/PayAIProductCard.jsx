import React, { useState, useRef, useCallback } from 'react';
import { Sparkles, Eye, ShoppingCart, CheckCircle2, ExternalLink, MessageSquarePlus, Play } from 'lucide-react';
import { decodeHtml, resolveProductImage, isVideoUrl } from '../../utils/imageHelpers';

// Extract the raw video URL from an offer (before resolveProductImage converts it to a thumbnail)
function getRawVideoUrl(offer) {
  if (!offer) return null;
  const raw =
    offer.imageUrl ||
    offer.image ||
    (Array.isArray(offer.images)
      ? offer.images[0]?.url || offer.images[0]?.src || (typeof offer.images[0] === 'string' ? offer.images[0] : '')
      : '');
  return isVideoUrl(raw) ? raw : null;
}

const FX_RATE = 1480;

// Image 2 Editorial Masonry variable heights pattern
const HEIGHT_PATTERNS = [
  'h-[290px] sm:h-[320px]', // Corn flakes (medium)
  'h-[210px] sm:h-[230px]', // Multivitamin (short landscape)
  'h-[390px] sm:h-[440px]', // Diapers (tall portrait)
  'h-[440px] sm:h-[500px]', // Whole milk (extra tall portrait)
  'h-[240px] sm:h-[260px]', // Fried chicken meal (medium landscape)
  'h-[330px] sm:h-[360px]', // Smartwatch / tech (portrait)
];

export default function PayAIProductCard({
  offer,
  index = 0,
  onNegotiate,
  onAddToCart,
  onAddToChat,
  onQuickView,
  formatLocalPrice,
  negotiationStatus, // { status: 'accepted'|'counter'|'fixed', newPrice, originalPrice, savings, sellerNote }
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const videoRef = useRef(null);

  // Detect if this product has a raw video URL
  const rawVideoUrl = getRawVideoUrl(offer);
  const hasVideo = Boolean(rawVideoUrl);
  const thumbnailUrl = resolveProductImage(offer);

  const handleMouseEnter = useCallback(() => {
    if (!hasVideo) return;
    setIsPlayingVideo(true);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [hasVideo]);

  const handleMouseLeave = useCallback(() => {
    if (!hasVideo) return;
    setIsPlayingVideo(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [hasVideo]);

  const providerLower = (offer.provider || '').toLowerCase();
  const isExternalStore = ['amazon', 'aliexpress', 'ebay', 'asos'].includes(providerLower) || Boolean(offer.isExternal);

  const sellerName = offer.seller?.name || offer.sellerName || 'Alpha Tech Store';
  const storeBadge = isExternalStore
    ? `${offer.provider?.toUpperCase() || 'GLOBAL'} • Reference`
    : sellerName;

  // Dual pricing calculation
  const rawPrice = Number(offer.price) || 0;
  const isPricedInNGN =
    offer.currency === 'NGN' ||
    (!isExternalStore && rawPrice >= 500 && offer.currency !== 'USD_NORMALIZED');

  const basePriceNGN = offer.priceNGN
    ? Math.round(Number(offer.priceNGN))
    : isPricedInNGN
    ? Math.round(rawPrice)
    : Math.round(rawPrice * FX_RATE);

  const basePriceUSD = offer.priceUSD
    ? Number(Number(offer.priceUSD).toFixed(2))
    : isPricedInNGN
    ? Number((rawPrice / FX_RATE).toFixed(2))
    : Number(rawPrice.toFixed(2));

  const negRaw = negotiationStatus?.newPrice != null ? Number(negotiationStatus.newPrice) : null;
  const currentPriceNGN =
    (negotiationStatus?.status === 'accepted' || negotiationStatus?.status === 'counter') && negRaw != null
      ? negRaw >= 500
        ? Math.round(negRaw)
        : Math.round(negRaw * FX_RATE)
      : basePriceNGN;

  const currentPriceUSD = Number((currentPriceNGN / FX_RATE).toFixed(2));

  const isNegotiable = offer.isNegotiable !== false && offer.canNegotiate !== false;

  const normalizedOfferPayload = {
    ...offer,
    provider: offer.provider || 'w-commerce',
    isNative: !isExternalStore,
    price: currentPriceUSD,
    priceUSD: currentPriceUSD,
    priceNGN: currentPriceNGN,
    originalPriceNGN: basePriceNGN,
    originalPriceUSD: basePriceUSD,
    currency: 'USD_NORMALIZED',
    _normalizedPrices: true,
    sellerName
  };

  const handleAdd = async (e) => {
    e.stopPropagation();
    if (isAdding || isExternalStore) return;
    setIsAdding(true);
    try {
      await onAddToCart({
        ...normalizedOfferPayload,
        negotiated: !!negotiationStatus,
        discountPct:
          negotiationStatus?.discountPct ||
          (negotiationStatus?.savings ? Math.round(((basePriceNGN - currentPriceNGN) / basePriceNGN) * 100) : null),
        originalPrice: basePriceUSD
      });
    } finally {
      setIsAdding(false);
    }
  };

  const cardHeight = HEIGHT_PATTERNS[Math.abs(Number(index) || 0) % HEIGHT_PATTERNS.length];

  return (
    <div
      onClick={() => onQuickView && onQuickView(normalizedOfferPayload)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative rounded-3xl overflow-hidden group cursor-pointer shadow-sm hover:shadow-2xl transition-all duration-300 w-full select-none ${cardHeight} border border-black/[0.06] dark:border-white/[0.08] bg-slate-200 dark:bg-zinc-800`}
    >
      {/* Skeleton shimmer while loading */}
      {!imgLoaded && (
        <div className="absolute inset-0 bg-slate-200 dark:bg-zinc-800 animate-pulse flex items-center justify-center">
          <div className="w-full h-full anim-skeleton-shimmer" />
        </div>
      )}

      {/* Thumbnail image — always rendered, fades out when video plays */}
      <img
        src={thumbnailUrl}
        alt={decodeHtml(offer.title)}
        className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ease-out ${
          imgLoaded ? 'opacity-100' : 'opacity-0'
        } ${isPlayingVideo ? 'opacity-0' : 'group-hover:scale-105'}`}
        loading="lazy"
        onLoad={() => setImgLoaded(true)}
        onError={(e) => {
          e.currentTarget.src = thumbnailUrl;
          setImgLoaded(true);
        }}
      />

      {/* Video element — preloaded silently, visible only on hover */}
      {hasVideo && (
        <video
          ref={videoRef}
          src={rawVideoUrl}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            isPlayingVideo ? 'opacity-100' : 'opacity-0'
          }`}
          muted
          playsInline
          loop
          preload="none"
        />
      )}

      {/* Video badge — shown on cards that have video */}
      {hasVideo && !isPlayingVideo && imgLoaded && (
        <div className="absolute bottom-16 right-3 z-10 flex items-center gap-1 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/20 pointer-events-none">
          <Play size={9} className="fill-white" />
          <span>Video</span>
        </div>
      )}

      {/* Editorial Gradient Scrim */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

      {/* Top Header Badges */}
      <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-1.5 z-10 pointer-events-none">
        <span className="text-[10px] font-bold text-white/95 bg-black/45 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15 truncate max-w-[65%] shadow-xs">
          {storeBadge}
        </span>

        {isExternalStore ? (
          <span className="text-[10px] font-bold text-purple-200 bg-purple-950/70 backdrop-blur-md px-2 py-0.5 rounded-full border border-purple-400/30">
            Global Ref
          </span>
        ) : (
          <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/70 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-1 shadow-xs">
            <CheckCircle2 size={11} className="text-emerald-400" />
            <span>Verified</span>
          </span>
        )}
      </div>

      {/* Center Quick Actions on Hover */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-auto z-20">
        {isNegotiable && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNegotiate && onNegotiate(normalizedOfferPayload);
            }}
            className="bg-[#006cff]/90 hover:bg-[#006cff] text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
            title="Negotiate with AI Sales Rep"
          >
            <Sparkles size={12} />
            <span>Negotiate</span>
          </button>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onQuickView && onQuickView(normalizedOfferPayload);
          }}
          className="bg-black/60 hover:bg-black/85 text-white text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg flex items-center gap-1.5 transition-transform active:scale-95 border border-white/20 cursor-pointer"
          title="Quick View Details"
        >
          <Eye size={12} />
          <span>View</span>
        </button>

        {onAddToChat && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddToChat(normalizedOfferPayload);
            }}
            className="bg-purple-600/90 hover:bg-purple-600 text-white p-2 rounded-full backdrop-blur-md shadow-lg flex items-center justify-center transition-transform active:scale-95 cursor-pointer border border-white/20"
            title="Attach to AI Chat"
          >
            <MessageSquarePlus size={13} />
          </button>
        )}
      </div>

      {/* Bottom Content Bar (Title, Price on left, Cart Button on right) */}
      <div className="absolute bottom-0 inset-x-0 p-3.5 sm:p-4 z-10 flex items-end justify-between gap-3">
        {/* Left: Product Title & Price */}
        <div className="min-w-0 flex-1">
          <h4 className="text-white font-bold text-sm sm:text-base leading-snug line-clamp-2 drop-shadow-md mb-1 group-hover:text-amber-200 transition-colors">
            {decodeHtml(offer.title)}
          </h4>

          <div className="flex items-baseline gap-2 flex-wrap drop-shadow-md">
            <span className="text-white/95 font-black text-sm sm:text-base tracking-tight">
              {isExternalStore ? `$${currentPriceUSD.toFixed(2)} USD` : `₦${currentPriceNGN.toLocaleString()}`}
            </span>
            {!isExternalStore && (
              <span className="text-white/60 text-xs font-medium">
                (${currentPriceUSD.toFixed(2)})
              </span>
            )}
            {negotiationStatus?.status === 'accepted' && (
              <span className="text-emerald-300 text-[10px] font-bold bg-emerald-950/80 backdrop-blur-xs px-1.5 py-0.5 rounded-md border border-emerald-400/30">
                Locked -{negotiationStatus.discountPct || 10}%
              </span>
            )}
            {negotiationStatus?.status === 'counter' && (
              <span className="text-amber-300 text-[10px] font-bold bg-amber-950/80 backdrop-blur-xs px-1.5 py-0.5 rounded-md border border-amber-400/30">
                Offer: ₦{currentPriceNGN.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Right: Floating Cart Button or External Store Link */}
        {isExternalStore ? (
          <a
            href={offer.url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="w-9 h-9 rounded-full bg-white/25 hover:bg-white text-white hover:text-slate-900 backdrop-blur-md flex items-center justify-center transition-all duration-200 active:scale-90 shadow-md shrink-0 border border-white/20"
            title="Visit External Store"
          >
            <ExternalLink size={15} />
          </a>
        ) : (
          <button
            type="button"
            onClick={handleAdd}
            disabled={isAdding}
            className="w-9 h-9 rounded-full bg-white/25 hover:bg-white text-white hover:text-slate-900 backdrop-blur-md flex items-center justify-center transition-all duration-200 active:scale-90 shadow-md shrink-0 border border-white/20 cursor-pointer"
            title="Add to Cart"
          >
            {isAdding ? (
              <span className="w-4 h-4 border-2 border-white/90 border-t-transparent rounded-full animate-spin" />
            ) : (
              <ShoppingCart size={16} />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
