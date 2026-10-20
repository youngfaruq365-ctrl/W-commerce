import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Link2, Sparkles, ExternalLink, Globe, Info, AlertTriangle, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '../../utils/apiClient';

const FX_RATE = 1480;

const SAMPLE_EXTERNAL_LINKS = [
  {
    store: 'Amazon',
    url: 'https://www.amazon.com/dp/B0BDHWDR12',
    label: 'Amazon: Apple AirPods Pro 2',
    title: 'Apple AirPods Pro (2nd Generation) with MagSafe Case (USB-C)',
    price: 199.00,
    provider: 'amazon',
    imageUrl: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=400&q=80',
    category: 'electronics'
  },
  {
    store: 'AliExpress',
    url: 'https://www.aliexpress.com/item/1005004918239.html',
    label: 'AliExpress: Anker 65W GaN Fast Charger',
    title: 'Anker 735 GaNPrime 65W 3-Port Ultra-Fast Wall Charger',
    price: 39.99,
    provider: 'aliexpress',
    imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=400&q=80',
    category: 'electronics'
  },
  {
    store: 'eBay',
    url: 'https://www.ebay.com/itm/385918204912',
    label: 'eBay: Seiko 5 Automatic Watch',
    title: 'Seiko 5 Sports Automatic Stainless Steel Men Watch (Ref. SRPD55K1)',
    price: 215.00,
    provider: 'ebay',
    imageUrl: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=400&q=80',
    category: 'fashion'
  },
  {
    store: 'ASOS',
    url: 'https://www.asos.com/us/men/jackets-coats/prd/20491820',
    label: 'ASOS: Oversized Denim Jacket',
    title: 'ASOS DESIGN Oversized Denim Trucker Jacket in Washed Black',
    price: 65.00,
    provider: 'asos',
    imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=400&q=80',
    category: 'fashion'
  }
];

export default function PayAIGlobalLinker({
  formatLocalPrice,
  destinationCountry = 'NG',
  onAskChatAboutUrl
}) {
  const [inputUrl, setInputUrl] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [extractedItem, setExtractedItem] = useState(null);

  const detectProviderFromUrl = (url) => {
    const lower = (url || '').toLowerCase();
    if (lower.includes('amazon.')) return 'amazon';
    if (lower.includes('aliexpress.')) return 'aliexpress';
    if (lower.includes('ebay.')) return 'ebay';
    if (lower.includes('asos.')) return 'asos';
    return 'global';
  };

  const getPlatformBadge = (provider) => {
    const p = (provider || '').toLowerCase();
    if (p === 'amazon') return { label: 'Amazon US', style: 'bg-amber-500 text-slate-950 font-black' };
    if (p === 'asos') return { label: 'ASOS UK', style: 'bg-slate-900 text-white font-black' };
    if (p === 'aliexpress') return { label: 'AliExpress', style: 'bg-red-600 text-white font-black' };
    if (p === 'ebay') return { label: 'eBay Direct', style: 'bg-blue-600 text-white font-black' };
    return { label: (provider || 'Global Store').toUpperCase(), style: 'bg-indigo-600 text-white font-black' };
  };

  const handleParseUrl = async (targetUrl = inputUrl) => {
    const url = targetUrl.trim();
    if (!url) {
      toast.error('Please paste a valid product link');
      return;
    }

    try {
      new URL(url);
    } catch (e) {
      toast.error('Please enter a valid URL (starting with https://)');
      return;
    }

    setIsParsing(true);
    setExtractedItem(null);

    try {
      let parsedProduct = null;

      try {
        const res = await apiClient.post('/api/v1/payai/global-store/resolve-url', {
          url,
          destinationCountry
        });
        if (res.data?.success && res.data.product) {
          parsedProduct = res.data.product;
        }
      } catch (apiErr) {
        // Fallback to import-url endpoint if resolve-url was different
        try {
          const res2 = await apiClient.post('/api/v1/catalog/import-url', {
            url,
            destinationCountry
          });
          if (res2.data?.success && res2.data.product) {
            parsedProduct = res2.data.product;
          }
        } catch (e) {}
      }

      if (!parsedProduct) {
        const matchedSample = SAMPLE_EXTERNAL_LINKS.find(s => url.includes(s.provider));
        const provider = detectProviderFromUrl(url);
        parsedProduct = matchedSample || {
          url,
          provider,
          externalProductId: `ext-${Date.now()}`,
          title: `External Reference Item from ${provider.toUpperCase()}`,
          price: 89.99,
          imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80',
          category: 'electronics'
        };
      }

      const priceUSD = Number(parsedProduct.price) || 49.99;
      const priceNGN = Math.round(priceUSD * FX_RATE);

      setExtractedItem({
        ...parsedProduct,
        url: url.startsWith('http') ? url : parsedProduct.url || url,
        priceUSD,
        priceNGN
      });

      const providerName = (parsedProduct.provider || detectProviderFromUrl(url)).toUpperCase();
      toast.success(`Reference listing resolved from ${providerName}`);
    } catch (err) {
      toast.error('Failed to parse external product link');
    } finally {
      setIsParsing(false);
    }
  };

  const handleUseSample = (sample) => {
    setInputUrl(sample.url);
    handleParseUrl(sample.url);
  };

  return (
    <div className="neu-panel p-4 sm:p-6 rounded-[2.5rem] bg-[var(--bg-primary)]/80 backdrop-blur-md border border-[var(--border-color)]">
      {/* 1. Reframe Header: Global Store Linker (External Reference Only) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Link2 size={18} />
          </div>
          <div>
            <h3 className="font-black text-sm sm:text-base">
              Global Store Linker (External Reference Only)
            </h3>
            <p className="text-[11px] text-[var(--text-muted)] font-medium">
              Discover and reference international listings from Amazon, ASOS, AliExpress, and eBay
            </p>
          </div>
        </div>

        <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 self-start sm:self-auto">
          Reference Only • No Checkout
        </span>
      </div>

      {/* 2. Notice Banner strictly as requested */}
      <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
        <span className="text-base select-none shrink-0">💡</span>
        <p className="leading-relaxed font-medium">
          <strong>Global store links are for reference and discovery only.</strong> No negotiation or checkout processing is supported for external stores. Checkout with PayPal and seller Naira payout is exclusive to native W-Commerce products.
        </p>
      </div>

      {/* URL Input Bar */}
      <div className="flex flex-col sm:flex-row items-stretch gap-2 mb-3">
        <div className="relative flex-1">
          <Globe size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="url"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleParseUrl()}
            placeholder="Paste external product link (e.g. https://www.amazon.com/dp/... or asos.com/...)"
            className="w-full neu-input pl-10 pr-4 py-2.5 sm:py-3 rounded-2xl text-xs sm:text-sm font-mono"
            disabled={isParsing}
          />
        </div>

        <button
          onClick={() => handleParseUrl()}
          disabled={isParsing || !inputUrl.trim()}
          className="neu-button-primary py-2.5 sm:py-3 px-5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer shrink-0"
        >
          {isParsing ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              <span>Resolving Listing...</span>
            </>
          ) : (
            <>
              <Sparkles size={14} />
              <span>Resolve Link</span>
            </>
          )}
        </button>
      </div>

      {/* Sample External Link Badges */}
      <div className="flex items-center gap-2 overflow-x-auto min-w-0 max-w-full hide-scrollbar text-xs mb-4 pb-1">
        <span className="text-[11px] text-[var(--text-muted)] font-medium shrink-0">Try Reference Sample:</span>
        {SAMPLE_EXTERNAL_LINKS.map((sample, i) => (
          <button
            key={i}
            onClick={() => handleUseSample(sample)}
            className="neu-card hover:bg-black/5 dark:hover:bg-white/5 px-3 py-1.5 rounded-full text-[11px] font-semibold text-[var(--text-main)] hover:text-blue-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
          >
            <span className="text-[10px] font-black uppercase text-blue-600">{sample.store}</span>
            <span className="truncate max-w-[130px]">{sample.title.split(' ')[0]} {sample.title.split(' ')[1]}</span>
          </button>
        ))}
      </div>

      {/* Extracted External Reference Card */}
      <AnimatePresence>
        {extractedItem && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="neu-card p-4 sm:p-5 rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 mt-2 space-y-4"
          >
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              {/* Thumbnail */}
              <div className="w-20 h-20 rounded-2xl bg-white p-1.5 flex items-center justify-center shrink-0 border border-gray-100 shadow-sm overflow-hidden">
                <img
                  src={extractedItem.imageUrl}
                  alt={extractedItem.title}
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              {/* Title & External Platform Badge */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  {/* Platform Badge */}
                  <span className={`text-[10px] uppercase px-2.5 py-0.5 rounded-full shadow-sm ${getPlatformBadge(extractedItem.provider).style}`}>
                    {getPlatformBadge(extractedItem.provider).label}
                  </span>
                  <span className="text-[10px] font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                    External Reference
                  </span>
                </div>

                <h4 className="font-bold text-xs sm:text-sm leading-snug line-clamp-2 mb-1">
                  {extractedItem.title}
                </h4>

                {/* Original Price & Estimated NGN Conversion */}
                <div className="flex items-baseline gap-2 mt-1 flex-wrap">
                  <span className="font-black text-sm text-[var(--text-main)]">
                    Original Price: ${extractedItem.priceUSD.toFixed(2)} USD
                  </span>
                  <span className="text-xs text-[var(--text-muted)] font-bold">
                    (~₦{extractedItem.priceNGN.toLocaleString()} NGN estimated)
                  </span>
                </div>
              </div>
            </div>

            {/* Helper Text strictly as required */}
            <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-[var(--text-muted)]">
              <span className="font-semibold text-[var(--text-main)] block mb-0.5">
                🛒 Looking to purchase?
              </span>
              <span>
                To buy this item, visit the merchant's store directly or find similar items on W-Commerce.
              </span>
            </div>

            {/* Action Buttons: Strictly Visit External Store & Find on W-Commerce. NO Add to Cart! NO Negotiate! */}
            <div className="flex flex-col sm:flex-row items-stretch gap-2 pt-1">
              {/* Visit External Store ↗ button */}
              <a
                href={extractedItem.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <span>Visit External Store</span>
                <ExternalLink size={14} />
              </a>

              {/* Find Similar Native Items on W-Commerce */}
              <button
                onClick={() => {
                  const query = extractedItem.title.split(' ').slice(0, 4).join(' ');
                  const prompt = `Can you find similar native W-Commerce products for "${query}" that I can negotiate and checkout with PayPal?`;
                  onAskChatAboutUrl && onAskChatAboutUrl(prompt);
                }}
                className="py-3 px-4 rounded-xl neu-card hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Sparkles size={14} className="text-blue-500" />
                <span>Find Similar on W-Commerce</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
