import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, X, CheckCircle2, Tag, AlertCircle, ShoppingCart,
  MessageSquare, ShieldCheck, Bot, Send, Layers, Scale,
  ExternalLink, Bell, RefreshCw, ArrowRight, Lock, Wallet, Camera, Mic, Volume2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '../../utils/apiClient';
import { decodeHtml, resolveProductImage } from '../../utils/imageHelpers';

const FX_RATE = 1480;

export default function PayAINegotiationModal({
  isOpen,
  onClose,
  offer,
  sessionId,
  destinationCountry = 'NG',
  formatLocalPrice,
  onApplyNegotiation,
  onWalletCheckout,
  onChatNegotiate,
}) {
  const isNairaNative = offer?.currency === 'NGN' || Number(offer?.price) >= 1000;
  const originalPriceUSD = isNairaNative
    ? Number((Number(offer?.price) / FX_RATE).toFixed(2))
    : Number(offer?.price) || 10;
  const originalPriceNGN = isNairaNative
    ? Math.round(Number(offer?.price))
    : Math.round(originalPriceUSD * FX_RATE);

  const sellerName = offer?.seller?.name || offer?.sellerName || 'Seller A Official Store';
  const productTitle = offer?.title || 'Cavetto Pantheon CV0001 Watch';
  const productId = offer?.externalProductId || offer?.id;

  const [activeView, setActiveView] = useState('negotiate'); // 'negotiate' | 'compare'
  const [quantity, setQuantity] = useState(1);
  const [rejectedOffersCount, setRejectedOffersCount] = useState(0);
  const [currentStage, setCurrentStage] = useState('STAGE_1_UNDERSTAND');
  const [buyerInput, setBuyerInput] = useState('');
  const [customOfferNGN, setCustomOfferNGN] = useState(Math.round(originalPriceNGN * 0.85));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [latestTurnResult, setLatestTurnResult] = useState(null);
  const [comparisons, setComparisons] = useState([]);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [liveSellerPush, setLiveSellerPush] = useState(null);
  const [isPlayingVoiceNote, setIsPlayingVoiceNote] = useState(false);

  const [messages, setMessages] = useState([
    {
      role: 'ai',
      stage: 'STAGE_1_UNDERSTAND',
      stageBadge: 'Stage 1 • Understand Buyer',
      text: `Hi! I'm the PayAI Sales Representative for ${sellerName}. The listed price for "${productTitle}" is ₦${originalPriceNGN.toLocaleString()} ($${originalPriceUSD.toFixed(2)}). Ask me any questions about the item, or let me know your budget and I'll check our authorized discounts for you!`,
    }
  ]);

  useEffect(() => {
    setCustomOfferNGN(Math.round(originalPriceNGN * 0.85));
    setRejectedOffersCount(0);
    setCurrentStage('STAGE_1_UNDERSTAND');
    setLatestTurnResult(null);
    setMessages([
      {
        role: 'ai',
        stage: 'STAGE_1_UNDERSTAND',
        stageBadge: 'Stage 1 • Understand Buyer',
        text: `Hi! I'm the PayAI Sales Representative for ${sellerName}. The listed price for "${productTitle}" is ₦${originalPriceNGN.toLocaleString()} ($${originalPriceUSD.toFixed(2)}). Ask me any questions about the item, or let me know your budget and I'll check our authorized discounts for you!`,
      }
    ]);
  }, [offer?.id, originalPriceNGN]);

  // Poll for live Seller Custom Price Locks & Automated Promo Drop Alerts
  useEffect(() => {
    if (!isOpen || !offer) return;
    let mounted = true;
    const checkLiveUpdates = async () => {
      try {
        const res = await apiClient.get('/api/v1/payai/negotiate/live-updates', {
          params: { productId }
        });
        if (mounted && res.data?.success && Array.isArray(res.data.pushes) && res.data.pushes.length > 0) {
          setLiveSellerPush(res.data.pushes[0]);
        }
      } catch (e) {}
    };
    checkLiveUpdates();
    const interval = setInterval(checkLiveUpdates, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [isOpen, productId]);

  const handlePlayVoiceNote = (transcriptText) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(transcriptText);
      utter.rate = 1.02;
      utter.onstart = () => setIsPlayingVoiceNote(true);
      utter.onend = () => setIsPlayingVoiceNote(false);
      utter.onerror = () => setIsPlayingVoiceNote(false);
      window.speechSynthesis.speak(utter);
    } else {
      setIsPlayingVoiceNote(true);
      toast.success('Playing Seller Warehouse Voice Note (0:14)...');
      setTimeout(() => setIsPlayingVoiceNote(false), 4000);
    }
  };

  const sendNegotiationTurn = async ({ messageText, offerAmountNGN, actionType = null, nextQuantity = quantity }) => {
    if (isSubmitting) return;
    const displayBuyerMsg = messageText || `Can you do ₦${Number(offerAmountNGN).toLocaleString()}?`;

    setMessages((prev) => [
      ...prev,
      { role: 'buyer', text: displayBuyerMsg }
    ]);
    setBuyerInput('');
    setIsSubmitting(true);

    try {
      const res = await apiClient.post('/api/v1/payai/negotiate/turn', {
        sessionId,
        productId,
        productTitle,
        originalPrice: originalPriceNGN,
        currency: 'NGN',
        quantity: nextQuantity,
        buyerMessage: displayBuyerMsg,
        buyerOfferPrice: offerAmountNGN ? Number(offerAmountNGN) : null,
        rejectedOffersCount,
        action: actionType,
      });

      if (res.data?.success) {
        const data = res.data;
        setLatestTurnResult(data);
        setCurrentStage(data.stage || 'STAGE_2_OPENING_OFFER');
        if (typeof data.rejectedOffersCount === 'number') {
          setRejectedOffersCount(data.rejectedOffersCount);
        }
        if (Array.isArray(data.comparisons) && data.comparisons.length > 0) {
          setComparisons(data.comparisons);
        }

        const stageLabels = {
          STAGE_1_UNDERSTAND: 'Stage 1 • Understand Buyer',
          STAGE_2_OPENING_OFFER: 'Stage 2 • Opening Offer',
          STAGE_2_BUNDLE_OPTION: 'Stage 2 • 2-Item Bundle Option',
          STAGE_3_FINAL_OFFER: 'Stage 3 • Seller Final Authorized Price',
          STAGE_4_DEAL_LOCKED: 'Stage 4 • Deal Locked & Verified',
          STAGE_4_ENDED_BELOW_FLOOR: 'Stage 4 • Ended Polite (Below Floor)',
          PAUSED: 'Seller Manual Mode',
        };

        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            stage: data.stage,
            stageBadge: stageLabels[data.stage] || data.stage,
            text: data.reply,
            currentOffer: data.currentOffer,
            ruleCode: data.ruleCode,
            warehouseInspection: data.warehouseInspection || null,
          }
        ]);

        if (data.action === 'COMPARE_ALTERNATIVES') {
          setActiveView('compare');
        }
      }
    } catch (err) {
      console.error('Negotiation turn error:', err);
      toast.error('Could not reach AI Sales Representative');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoadComparisons = async () => {
    setActiveView('compare');
    if (comparisons.length > 0) return;
    setLoadingCompare(true);
    try {
      const finalFloorNGN = latestTurnResult?.deterministic?.finalAuthorizedUnitPrice || Math.round(originalPriceNGN * 0.9);
      const res = await apiClient.post('/api/v1/payai/negotiate/compare', {
        productId,
        query: productTitle,
        originalPrice: originalPriceNGN,
        finalAuthorizedPrice: finalFloorNGN,
        currency: 'NGN',
        sellerName,
      });
      if (res.data?.success && Array.isArray(res.data.comparisons)) {
        setComparisons(res.data.comparisons);
      }
    } catch (e) {
      console.error('Compare stores error:', e);
    } finally {
      setLoadingCompare(false);
    }
  };

  const handleLockAndApplyToCart = () => {
    const activeOffer = latestTurnResult?.currentOffer;
    const unitPriceNGN = activeOffer?.unitPrice || Math.round(originalPriceNGN * 0.95);
    const totalPriceNGN = activeOffer?.totalPrice || unitPriceNGN * quantity;
    const unitPriceUSD = isNairaNative
      ? unitPriceNGN
      : Number((unitPriceNGN / FX_RATE).toFixed(2));
    const discountPct = activeOffer?.discountPct || Math.round(((originalPriceNGN - unitPriceNGN) / originalPriceNGN) * 100);
    const savingsUSD = Number((originalPriceUSD - (isNairaNative ? unitPriceNGN / FX_RATE : unitPriceUSD)).toFixed(2));

    onApplyNegotiation({
      offer: {
        ...offer,
        provider: 'w-commerce',
        sellerName,
        quantity: activeOffer?.quantity || quantity,
      },
      status: 'accepted',
      originalPrice: originalPriceUSD,
      newPrice: isNairaNative ? Number((unitPriceNGN / FX_RATE).toFixed(2)) : unitPriceUSD,
      newPriceNGN: unitPriceNGN,
      totalPriceNGN,
      discountPct,
      savings: Math.max(0, savingsUSD),
      sellerNote: `AI Sales Rep locked ₦${unitPriceNGN.toLocaleString()} unit price (${discountPct}% off) for ${activeOffer?.quantity || quantity} item(s). Verified against seller rules.`
    });
    toast.success(`Locked ₦${unitPriceNGN.toLocaleString()} (-${discountPct}%) into your cart!`);
    onClose();
  };

  const stageStepIndex = {
    STAGE_1_UNDERSTAND: 1,
    STAGE_2_OPENING_OFFER: 2,
    STAGE_2_BUNDLE_OPTION: 2,
    STAGE_3_FINAL_OFFER: 3,
    STAGE_4_DEAL_LOCKED: 4,
    STAGE_4_ENDED_BELOW_FLOOR: 4,
  }[currentStage] || 1;

  if (!isOpen || !offer) return null;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 12 }}
        className="modal-panel w-full max-w-2xl neu-panel p-4 sm:p-6 rounded-[2rem] bg-[var(--bg-primary)]/95 backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-2xl relative overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border-color)] shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Bot size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base">PayAI Sales Representative</h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  Deterministic Engine
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                AI controls the conversation • Seller controls business rules & hard floor
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveView('negotiate')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  activeView === 'negotiate'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                Negotiate
              </button>
              <button
                type="button"
                onClick={handleLoadComparisons}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  activeView === 'compare'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <Scale size={12} /> Compare Stores
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full neu-button text-[var(--text-muted)] hover:text-red-500 flex items-center justify-center cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* FEATURE 1, 2 & 3 BANNER: Live Seller Custom Price Lock, Warehouse Proof Dispatch, OR Automated Watchlist Promo Drop */}
        {liveSellerPush && (
          <div className="mb-3 p-3 rounded-2xl bg-gradient-to-r from-purple-600/15 via-indigo-600/15 to-emerald-500/15 border border-purple-500/35 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
            <div className="text-xs">
              <div className="flex items-center gap-1.5 font-black text-purple-700 dark:text-purple-300">
                <Sparkles size={13} className="animate-spin" />
                <span>
                  {liveSellerPush.type === 'WATCHLIST_PROMO_DROP'
                    ? '🎉 Automated Promo Drop Alert Unlocked!'
                    : liveSellerPush.type === 'WAREHOUSE_MEDIA_DISPATCH'
                      ? `📸 Live Warehouse Proof Dispatched by ${liveSellerPush.storeName}!`
                      : `🔓 Live Custom Price Lock from ${liveSellerPush.storeName}!`}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-main)] mt-0.5">
                {liveSellerPush.type === 'WAREHOUSE_MEDIA_DISPATCH' ? (
                  <span>Verified Batch <strong>{liveSellerPush.serialBatchCode}</strong> • {liveSellerPush.warehouseLocation} • Live Macro Photos & Seller Voice Note Ready</span>
                ) : (
                  <><strong>₦{Number(liveSellerPush.unitPrice).toLocaleString()}</strong> (-{liveSellerPush.discountPct}% off) • &quot;{liveSellerPush.sellerNote}&quot;</>
                )}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {liveSellerPush.type === 'WAREHOUSE_MEDIA_DISPATCH' ? (
                <button
                  type="button"
                  onClick={() => {
                    const insp = liveSellerPush.warehouseInspection;
                    if (insp) {
                      setMessages((prev) => [
                        ...prev,
                        {
                          role: 'ai',
                          stage: 'STAGE_2_OPENING_OFFER',
                          stageBadge: 'Warehouse Proof',
                          text: `📸 **Verified Warehouse Proof Received!**\nFulfillment at **${insp.warehouseLocation}** dispatched live inspection photos and voice note confirmation for batch **${insp.serialBatchCode}**.`,
                          warehouseInspection: insp,
                        }
                      ]);
                      toast.success(`Loaded live warehouse proof for batch ${insp.serialBatchCode}!`);
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Camera size={12} />
                  <span>View Proof Media</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setLatestTurnResult((prev) => ({
                        ...(prev || {}),
                        stage: 'STAGE_4_DEAL_LOCKED',
                        currentOffer: {
                          quantity: liveSellerPush.quantity || 1,
                          unitPrice: liveSellerPush.unitPrice,
                          totalPrice: liveSellerPush.totalPrice,
                          savings: liveSellerPush.savings,
                          discountPct: liveSellerPush.discountPct,
                        }
                      }));
                      toast.success(`Unlocked ₦${Number(liveSellerPush.unitPrice).toLocaleString()} deal!`);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold cursor-pointer"
                  >
                    Unlock ₦{Number(liveSellerPush.unitPrice).toLocaleString()}
                  </button>
                  {onWalletCheckout && (
                    <button
                      type="button"
                      onClick={() => {
                        onWalletCheckout({
                          offer,
                          totalNGN: liveSellerPush.totalPrice,
                          totalUSD: Number((liveSellerPush.totalPrice / FX_RATE).toFixed(2)),
                          quantity: liveSellerPush.quantity || 1,
                          optionalBuyerMessage: `Accepted Live Seller Lock (${liveSellerPush.offerId})`
                        });
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Wallet size={12} /> Wallet Pay
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* 4-Stage Progress Indicator */}
        <div className="grid grid-cols-4 gap-1.5 mb-3 shrink-0">
          {[
            { step: 1, label: '1. Understand' },
            { step: 2, label: '2. Progressive Offer' },
            { step: 3, label: '3. Final Floor' },
            { step: 4, label: '4. Close / Compare' },
          ].map((item) => (
            <div
              key={item.step}
              className={`px-2 py-1.5 rounded-xl text-center text-[10px] font-bold border transition-all ${
                stageStepIndex === item.step
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : stageStepIndex > item.step
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-black/5 dark:bg-white/5 text-[var(--text-muted)] border-transparent'
              }`}
            >
              {item.label}
            </div>
          ))}
        </div>

        {/* Product Snapshot & Quantity Toggle */}
        <div className="neu-card p-3 rounded-2xl flex items-center justify-between gap-3 mb-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 border border-gray-100 overflow-hidden">
              <img
                src={resolveProductImage(offer)}
                alt={decodeHtml(productTitle)}
                onError={(e) => {
                  e.currentTarget.src = resolveProductImage(offer);
                }}
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase text-indigo-600 block">
                {sellerName}
              </span>
              <h4 className="font-bold text-xs truncate">{decodeHtml(productTitle)}</h4>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-black text-xs text-[var(--text-main)]">
                  Original: ₦{originalPriceNGN.toLocaleString()}
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  (${originalPriceUSD.toFixed(2)} USD)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setQuantity(1)}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all ${
                quantity === 1
                  ? 'bg-indigo-600 text-white'
                  : 'neu-card text-[var(--text-muted)]'
              }`}
            >
              1 Item
            </button>
            <button
              type="button"
              onClick={() => {
                setQuantity(2);
                sendNegotiationTurn({
                  messageText: 'What is your bundle discount if I buy 2 items?',
                  nextQuantity: 2
                });
              }}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all ${
                quantity === 2
                  ? 'bg-indigo-600 text-white'
                  : 'neu-card text-[var(--text-muted)]'
              }`}
            >
              Buy 2 (Bundle)
            </button>
          </div>
        </div>

        {activeView === 'negotiate' ? (
          <>
            {/* Conversation Transcript */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 mb-3 min-h-[210px] max-h-[300px]">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.role === 'buyer' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl p-3 text-xs leading-relaxed ${
                      msg.role === 'buyer'
                        ? 'bg-indigo-600 text-white rounded-br-xs'
                        : 'neu-card border border-indigo-500/15 text-[var(--text-main)] rounded-bl-xs'
                    }`}
                  >
                    {msg.role === 'ai' && msg.stageBadge && (
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                          {msg.stageBadge}
                        </span>
                        {msg.currentOffer && (
                          <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                            Offer: ₦{Number(msg.currentOffer.totalPrice).toLocaleString()} (-{msg.currentOffer.discountPct}%)
                          </span>
                        )}
                      </div>
                    )}
                    <p>{msg.text}</p>

                    {/* FEATURE 2: Embedded Live Warehouse Photo Gallery & Seller Voice Note Player */}
                    {msg.warehouseInspection && (
                      <div className="mt-2.5 pt-2.5 border-t border-[var(--border-color)] space-y-2.5">
                        <div className="flex items-center justify-between text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                          <span>📍 {msg.warehouseInspection.warehouseLocation}</span>
                          <span className="font-mono">{msg.warehouseInspection.serialBatchCode}</span>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          {(msg.warehouseInspection.photos || []).map((photo) => (
                            <div key={photo.id} className="rounded-xl overflow-hidden border border-[var(--border-color)] bg-white p-1">
                              <img src={photo.url} alt={photo.caption} className="w-full h-16 object-cover rounded-lg" />
                              <span className="block text-[9px] font-bold text-slate-700 truncate mt-1 px-0.5">
                                {photo.badge}
                              </span>
                            </div>
                          ))}
                        </div>

                        {msg.warehouseInspection.voiceNote && (
                          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <button
                                type="button"
                                onClick={() => handlePlayVoiceNote(msg.warehouseInspection.voiceNote.transcript)}
                                className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                              >
                                <Volume2 size={12} className={isPlayingVoiceNote ? 'animate-bounce' : ''} />
                                <span>{isPlayingVoiceNote ? 'Playing...' : 'Play Voice Note'}</span>
                              </button>
                              <div className="flex items-end gap-0.5 h-4">
                                {(msg.warehouseInspection.voiceNote.waveformBars || []).map((h, bIdx) => (
                                  <span
                                    key={bIdx}
                                    style={{ height: `${Math.max(25, h)}%` }}
                                    className={`w-1 rounded-full ${isPlayingVoiceNote ? 'bg-indigo-500 animate-pulse' : 'bg-indigo-400/70'}`}
                                  />
                                ))}
                              </div>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-indigo-600 shrink-0">
                              {msg.warehouseInspection.voiceNote.duration}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isSubmitting && (
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] px-2">
                  <Sparkles size={14} className="animate-spin text-indigo-500" />
                  <span>AI Sales Rep is checking seller pricing rules...</span>
                </div>
              )}
            </div>

            {/* Quick Buyer Negotiation Moves */}
            <div className="flex flex-wrap gap-1.5 mb-3 shrink-0">
              <button
                type="button"
                onClick={() =>
                  sendNegotiationTurn({
                    messageText: `I like this item, but ₦${originalPriceNGN.toLocaleString()} is too expensive. Can you reduce the price?`,
                  })
                }
                className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 cursor-pointer transition-all"
              >
                "Too expensive, reduce price?"
              </button>
              <button
                type="button"
                onClick={() =>
                  sendNegotiationTurn({
                    messageText: `Still too much. Can you do ₦${Math.round(originalPriceNGN * 0.8).toLocaleString()}?`,
                    offerAmountNGN: Math.round(originalPriceNGN * 0.8),
                  })
                }
                className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 cursor-pointer transition-all"
              >
                "Can you do ₦{Math.round(originalPriceNGN * 0.8).toLocaleString()}?"
              </button>
              <button
                type="button"
                onClick={() =>
                  sendNegotiationTurn({
                    messageText: `No, I only want one. This is my last offer: ₦${Math.round(originalPriceNGN * 0.85).toLocaleString()}.`,
                    offerAmountNGN: Math.round(originalPriceNGN * 0.85),
                    nextQuantity: 1,
                  })
                }
                className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 cursor-pointer transition-all"
              >
                "Only want 1 • Final price?"
              </button>
              <button
                type="button"
                onClick={handleLoadComparisons}
                className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center gap-1 cursor-pointer transition-all"
              >
                <Scale size={12} /> Compare Other Stores
              </button>
              <button
                type="button"
                onClick={() =>
                  sendNegotiationTurn({
                    messageText: buyerInput.trim() || `Hi ${sellerName}, are you online? I want to discuss "${productTitle}" (${quantity}x) at ₦${Number(customOfferNGN).toLocaleString()}.`,
                    offerAmountNGN: Number(customOfferNGN),
                    actionType: 'QUICK_CHAT_SELLER',
                  })
                }
                className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 flex items-center gap-1 cursor-pointer transition-all"
                title="If AI is paused or you want human confirmation, check if product owner is online and quick-chat directly"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Quick Chat Seller (Live)</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  sendNegotiationTurn({
                    messageText: `Can you share a live warehouse photo and seller voice note confirming "${productTitle}" before I pay with my wallet?`,
                    actionType: 'REQUEST_WAREHOUSE_MEDIA',
                  })
                }
                className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 flex items-center gap-1 cursor-pointer transition-all"
                title="Request live warehouse photo & seller voice note inspection"
              >
                <Camera size={12} />
                <span>Warehouse Photo & Voice Note</span>
              </button>
            </div>

            {/* Live Seller Presence Banner when AI is Paused or Quick Chat is Active */}
            {latestTurnResult?.sellerPresence && (
              <div className="mb-2.5 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${latestTurnResult.sellerPresence.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <span className="font-bold text-blue-900 dark:text-blue-200">
                    {latestTurnResult.sellerPresence.storeName}: {latestTurnResult.sellerPresence.statusLabel}
                  </span>
                </div>
                <span className="text-[10px] text-[var(--text-muted)] font-semibold">
                  {latestTurnResult.sellerPresence.responseEta}
                </span>
              </div>
            )}

            {/* Custom Counter-Offer + Free Text Input (Optional Message) */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 mb-3 shrink-0">
              <div className="sm:col-span-5 flex items-center gap-1.5 neu-card-pressed px-3 py-2 rounded-xl">
                <span className="text-xs font-black text-indigo-600">₦</span>
                <input
                  type="number"
                  value={customOfferNGN}
                  onChange={(e) => setCustomOfferNGN(e.target.value)}
                  className="w-full bg-transparent text-xs font-black outline-none"
                  placeholder="Your offer (NGN)"
                />
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() =>
                    sendNegotiationTurn({
                      messageText: buyerInput.trim()
                        ? `${buyerInput.trim()} (Offer: ₦${Number(customOfferNGN).toLocaleString()})`
                        : `My counter-offer is ₦${Number(customOfferNGN).toLocaleString()}.`,
                      offerAmountNGN: Number(customOfferNGN),
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[10px] font-bold shrink-0 cursor-pointer hover:bg-indigo-700"
                >
                  Offer
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!buyerInput.trim()) return;
                  sendNegotiationTurn({ messageText: buyerInput.trim() });
                }}
                className="sm:col-span-7 flex items-center gap-1.5 neu-card-pressed px-3 py-2 rounded-xl"
              >
                <input
                  type="text"
                  value={buyerInput}
                  onChange={(e) => setBuyerInput(e.target.value)}
                  placeholder="Optional message to AI or online Seller..."
                  className="w-full bg-transparent text-xs outline-none"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !buyerInput.trim()}
                  className="p-1.5 rounded-lg bg-indigo-600 text-white disabled:opacity-40 cursor-pointer"
                >
                  <Send size={13} />
                </button>
              </form>
            </div>

            {/* Active Authorized Offer Banner & Checkout Lock */}
            {latestTurnResult?.currentOffer && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <Lock size={14} className="text-emerald-600" />
                    <span className="text-xs font-black text-emerald-800 dark:text-emerald-300">
                      Authorized Offer: ₦{Number(latestTurnResult.currentOffer.totalPrice).toLocaleString()} ({latestTurnResult.currentOffer.quantity}x @ ₦{Number(latestTurnResult.currentOffer.unitPrice).toLocaleString()})
                    </span>
                  </div>
                  <p className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80">
                    You save ₦{Number(latestTurnResult.currentOffer.savings).toLocaleString()} ({latestTurnResult.currentOffer.discountPct}% off) • Stock & price floor verified
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                  <button
                    type="button"
                    onClick={handleLockAndApplyToCart}
                    className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <CheckCircle2 size={14} />
                    <span>Lock to Cart</span>
                  </button>
                  {onWalletCheckout && (
                    <button
                      type="button"
                      onClick={() => {
                        const activeOffer = latestTurnResult?.currentOffer;
                        const totalNGN = activeOffer?.totalPrice || Math.round(originalPriceNGN * 0.95);
                        const totalUSD = Number((totalNGN / FX_RATE).toFixed(2));
                        onWalletCheckout({
                          offer,
                          totalNGN,
                          totalUSD,
                          quantity: activeOffer?.quantity || quantity,
                          optionalBuyerMessage: buyerInput.trim() || ''
                        });
                        onClose();
                      }}
                      className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <Wallet size={14} />
                      <span>Pay with Wallet</span>
                    </button>
                  )}
                  {latestTurnResult.stage === 'STAGE_4_ENDED_BELOW_FLOOR' && (
                    <button
                      type="button"
                      onClick={() =>
                        sendNegotiationTurn({
                          messageText: 'Save this product and notify me if a promotion reaches my budget.',
                          actionType: 'SAVE_WATCHLIST_ALERT',
                          offerAmountNGN: customOfferNGN,
                        })
                      }
                      className="px-3 py-2 rounded-xl neu-card text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Bell size={12} /> Notify Me
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Cross-Store Equivalent Product Comparison View */
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs">
              <p className="font-bold text-indigo-900 dark:text-indigo-200">
                Cross-Store Equivalent Product Comparison
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Comparing final payable price (including delivery) and distinguishing verified W-Commerce offers from unconfirmed external listings.
              </p>
            </div>

            {loadingCompare ? (
              <div className="py-10 text-center text-xs text-[var(--text-muted)]">
                Scanning connected stores & external listings...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {comparisons.map((comp) => (
                  <div
                    key={comp.id}
                    className={`p-3.5 rounded-2xl border flex flex-col justify-between ${
                      comp.isCurrentSeller
                        ? 'border-indigo-500 bg-indigo-500/5'
                        : 'border-[var(--border-color)] neu-card'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-300">
                          {comp.badge}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            comp.verifiedPrice
                              ? 'bg-emerald-500/15 text-emerald-600'
                              : 'bg-amber-500/15 text-amber-600'
                          }`}
                        >
                          {comp.verifiedPrice ? 'Verified' : 'Unconfirmed'}
                        </span>
                      </div>

                      <div className="h-24 rounded-xl bg-white p-2 flex items-center justify-center mb-2 border border-gray-100 overflow-hidden">
                        <img
                          src={comp.imageUrl}
                          alt={comp.title}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>

                      <p className="text-[11px] font-black text-[var(--text-main)]">{comp.sellerLabel}</p>
                      <p className="text-[11px] font-semibold text-[var(--text-muted)] line-clamp-1 mb-2">
                        {comp.title}
                      </p>

                      <div className="space-y-1 text-[11px] border-t border-[var(--border-color)] pt-2">
                        <div className="flex justify-between">
                          <span className="text-[var(--text-muted)]">Listed Price:</span>
                          <span className="font-bold">₦{Number(comp.listedPrice).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--text-muted)]">Final Unit Price:</span>
                          <span className="font-black text-emerald-600">
                            ₦{Number(comp.authorizedFinalPrice).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--text-muted)]">Delivery Fee:</span>
                          <span>₦{Number(comp.deliveryFee).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-black pt-1 border-t border-dashed border-[var(--border-color)]">
                          <span>Total Payable:</span>
                          <span>₦{Number(comp.totalPayablePrice).toLocaleString()}</span>
                        </div>
                      </div>

                      <p className="text-[10px] text-[var(--text-muted)] mt-2 leading-relaxed">
                        {comp.verificationNote}
                      </p>
                    </div>

                    <div className="mt-3 pt-2">
                      {comp.isCurrentSeller ? (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveView('negotiate');
                            handleLockAndApplyToCart();
                          }}
                          className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold cursor-pointer"
                        >
                          Stay with Seller A (₦{Number(comp.authorizedFinalPrice).toLocaleString()})
                        </button>
                      ) : (
                        <a
                          href={comp.productUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2 px-3 rounded-xl neu-card hover:bg-black/5 dark:hover:bg-white/5 text-[11px] font-bold flex items-center justify-center gap-1 text-[var(--text-main)]"
                        >
                          <span>Inspect Store Listing</span>
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
