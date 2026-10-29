import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, X, Search, ArrowRight, Loader2, Lightbulb, ShoppingBag, Wrench, Salad, Globe, ExternalLink } from 'lucide-react';
import { apiClient } from '@/utils/apiClient';
import { PLACEHOLDER_IMAGE } from '@/constants/placeholders';
import { QLOO_ASSIST_EVENT, dismissAssistFor } from '../../utils/qlooAssistSignals';

const AUTO_HIDE_MS = 45000;

const formatPrice = (n) => `₦${Number(n || 0).toLocaleString()}`;

const ProductChip = ({ product, onOpen }) => (
  <button
    type="button"
    onClick={() => onOpen(product)}
    className="flex items-center gap-3 w-full text-left p-2 rounded-xl hover:bg-[var(--bg-tertiary,rgba(127,127,127,0.12))] transition-colors"
  >
    <img
      src={product.imageUrl || PLACEHOLDER_IMAGE}
      alt={product.title}
      loading="lazy"
      onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMAGE; }}
      className="w-11 h-11 rounded-lg object-cover shrink-0"
    />
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-bold truncate">{product.title}</span>
      <span className="block text-xs text-[var(--text-muted)] truncate">
        {formatPrice(product.price)}{product.storeName ? ` · ${product.storeName}` : ''}
      </span>
    </span>
    <ArrowRight size={14} className="shrink-0 text-[var(--text-muted)]" />
  </button>
);

/**
 * Global proactive helper. Listens for `qloo:assist` events (fired by the search surfaces when the
 * shopper looks stuck) and offers verified substitutes plus live catalogue matches.
 */
const QlooAssistPopup = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [data, setData] = useState(null);
  const [activeQuery, setActiveQuery] = useState('');
  const hideTimer = useRef(null);
  const requestId = useRef(0);

  const clearTimer = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = null;
  };

  const close = useCallback((remember = true) => {
    clearTimer();
    setOpen(false);
    if (remember && activeQuery) dismissAssistFor(activeQuery);
  }, [activeQuery]);

  const armAutoHide = useCallback(() => {
    clearTimer();
    hideTimer.current = setTimeout(() => setOpen(false), AUTO_HIDE_MS);
  }, []);

  const handleAssist = useCallback(async (event) => {
    const { query, reason, resultCount, recentQueries } = event.detail || {};
    if (!query) return;

    const myRequest = ++requestId.current;
    setActiveQuery(query);
    setError(false);
    setLoading(true);
    setData(null);
    setOpen(true);
    armAutoHide();

    try {
      const res = await apiClient.post('/api/v1/payai/qloo/assist', { query, reason, resultCount, recentQueries });
      if (myRequest !== requestId.current) return; // a newer request superseded this one
      if (res.data?.success) {
        setData(res.data);
      } else {
        setError(true);
      }
    } catch {
      if (myRequest === requestId.current) setError(true);
    } finally {
      if (myRequest === requestId.current) setLoading(false);
    }
  }, [armAutoHide]);

  useEffect(() => {
    window.addEventListener(QLOO_ASSIST_EVENT, handleAssist);
    return () => {
      window.removeEventListener(QLOO_ASSIST_EVENT, handleAssist);
      clearTimer();
    };
  }, [handleAssist]);

  const openProduct = (product) => {
    setOpen(false);
    navigate(`/product/${product.id}`);
  };

  const searchTerm = (term) => {
    setOpen(false);
    navigate(`/search?q=${encodeURIComponent(term)}`);
  };

  const askPayAI = () => {
    setOpen(false);
    navigate(`/payai?action=sourcing&q=${encodeURIComponent(activeQuery)}`);
  };

  const DomainIcon = data?.domain === 'material' ? Wrench : Salad;
  const hasSubs = data?.substitutes?.length > 0;
  const hasDirect = data?.directProducts?.length > 0;
  const hasRelated = data?.relatedProducts?.length > 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          key="qloo-assist"
          role="dialog"
          aria-live="polite"
          aria-label="Qloo AI shopping assistant"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 280, damping: 26 }}
          onMouseEnter={clearTimer}
          onMouseLeave={armAutoHide}
          className="fixed z-[90] right-3 bottom-24 sm:bottom-6 sm:right-6 w-[calc(100vw-1.5rem)] sm:w-[380px] max-h-[75vh] flex flex-col rounded-3xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-main)] shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-indigo-600/15 via-purple-600/15 to-blue-600/15 border-b border-[var(--border-color)]">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg">
              {loading ? <Loader2 size={18} className="text-white animate-spin" /> : <Sparkles size={18} className="text-white" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Qloo AI</p>
              <h3 className="text-sm font-extrabold leading-snug">
                {loading ? `Looking for "${activeQuery}"…` : (data?.headline || 'Need a hand finding that?')}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => close(true)}
              aria-label="Dismiss assistant"
              className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary,rgba(127,127,127,0.12))] text-[var(--text-muted)]"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 overflow-y-auto space-y-4">
            {loading && (
              <p className="text-sm text-[var(--text-muted)]">Checking the marketplace and asking Qloo for good alternatives…</p>
            )}

            {error && !loading && (
              <div className="text-sm space-y-3">
                <p className="text-[var(--text-muted)]">I couldn't reach my sourcing brain just now, but PayAI can still hunt this down for you.</p>
                <button type="button" onClick={askPayAI} className="neu-button-primary px-4 py-2 rounded-xl text-sm font-bold inline-flex items-center gap-2">
                  <Sparkles size={14} /> Ask PayAI
                </button>
              </div>
            )}

            {data && !loading && (
              <>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">{data.message}</p>

                {hasDirect && (
                  <section>
                    <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wide mb-1">
                      <ShoppingBag size={13} className="text-emerald-500" /> Available now
                    </h4>
                    {data.directProducts.map((p) => <ProductChip key={p.id} product={p} onOpen={openProduct} />)}
                  </section>
                )}

                {hasSubs && (
                  <section>
                    <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wide mb-2">
                      <DomainIcon size={13} className="text-indigo-500" /> Trusted alternatives
                    </h4>
                    <div className="space-y-3">
                      {data.substitutes.map((s) => (
                        <div key={s.term} className="rounded-2xl border border-[var(--border-color)] p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-extrabold capitalize">{s.term}</span>
                            <button
                              type="button"
                              onClick={() => searchTerm(s.term)}
                              className="text-xs font-bold text-indigo-500 hover:underline inline-flex items-center gap-1 shrink-0"
                            >
                              <Search size={12} /> Search
                            </button>
                          </div>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">{s.note}</p>
                          {s.products.length > 0 && (
                            <div className="mt-2">
                              {s.products.map((p) => <ProductChip key={p.id} product={p} onOpen={openProduct} />)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {hasRelated && (
                  <section>
                    <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wide mb-1">
                      <Lightbulb size={13} className="text-amber-500" /> Shoppers with your taste also buy
                    </h4>
                    {data.relatedProducts.map((p) => <ProductChip key={p.id} product={p} onOpen={openProduct} />)}
                  </section>
                )}

                {data.qloo?.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {data.qloo.tags.map((t) => (
                      <span key={t} className="text-[10px] font-bold px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-500 capitalize">{t}</span>
                    ))}
                  </div>
                )}

                {data.externalLinks?.length > 0 && (
                  <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-tertiary,rgba(127,127,127,0.06))] p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide">
                        <Globe size={13} className="text-blue-500" /> External Stores
                      </h4>
                      <span className="text-[10px] text-[var(--text-muted)] font-medium">Link & Escrow</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] leading-snug">
                      Not in local inventory? Find on these verified marketplaces and paste the link in PayAI to import:
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {data.externalLinks.map((ext) => (
                        <a
                          key={ext.site}
                          href={ext.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col p-2 rounded-xl border border-[var(--border-color)] hover:border-indigo-500 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-all group"
                        >
                          <div className="flex items-center justify-between text-xs font-bold text-[var(--text-main)] group-hover:text-indigo-500">
                            <span>{ext.name}</span>
                            <ExternalLink size={12} className="opacity-60 group-hover:opacity-100 shrink-0 ml-1" />
                          </div>
                          <span className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate">{ext.badge}</span>
                        </a>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {!loading && (
            <div className="p-3 border-t border-[var(--border-color)] flex items-center gap-2">
              <button type="button" onClick={askPayAI} className="flex-1 neu-button-primary px-4 py-2.5 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2">
                <Sparkles size={14} /> Let PayAI source it
              </button>
              <button type="button" onClick={() => close(true)} className="px-3 py-2.5 rounded-xl text-xs font-bold text-[var(--text-muted)] hover:bg-[var(--bg-tertiary,rgba(127,127,127,0.12))]">
                No thanks
              </button>
            </div>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
};

export default QlooAssistPopup;
