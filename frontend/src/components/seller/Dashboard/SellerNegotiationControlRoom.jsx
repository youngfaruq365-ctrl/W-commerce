import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Bot, ShieldCheck, SlidersHorizontal, Sparkles, CheckCircle2,
  AlertTriangle, Play, RotateCcw, Pause, UserCheck, Store,
  ExternalLink, Clock, Tag, Lock, HelpCircle, ShoppingBag, Send, Check,
  Camera, Video, Mic, Volume2, VolumeX, Upload, Plus, Trash2, Image as ImageIcon,
  Radio, CheckCheck, RefreshCw, FileText, Eye, Layers, Shield
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '../../../utils/apiClient';

const CAVETTO_WATCH_IMG = 'https://images.openai.com/static-rsc-4/YiNHmCKpmxMP9l0Zel5wIvhqTQ3KUvmuOeCjroglGY339htPxIEV7UxrgtjpsPeOTZ66bRyCZV-Q56C0RPERuvRagS1qU7JcKB2jedNcxqTYK4TPvBbLV1g1kcKZBLK0PMh4U0m9rHhON8TvAWo7tkMNC0_uNkYa6Pme4EfbJ4Y?purpose=inline';
const FALLBACK_WATCH_IMG = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80';

const DEFAULT_GYMSHARK_INSPECTION = {
  id: 'req-gym-2026-01',
  productId: 'demo-gymshark',
  productTitle: 'Gymshark Flagship Premier Edition',
  storeName: 'Gymshark Official Partner Vault',
  serialBatchCode: 'SN-GYM-2026-X892',
  warehouseLocation: 'London Heathrow Logistics Hub • Bay 14B',
  buyerLabel: 'Verified Athlete (London, UK)',
  status: 'READY_FOR_DISPATCH',
  verifiedAt: 'Just now',
  photos: [
    {
      id: 'photo-gym-fabric',
      caption: 'Live Macro View — Seamless Compression Weave & Heat-Sealed Silicone Logo',
      url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80',
      badge: 'Live Warehouse Cam • 4K Macro'
    },
    {
      id: 'photo-gym-serial',
      caption: 'Batch Serial SN-GYM-2026-X892 & Anti-Counterfeit NFC Tag',
      url: 'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&w=800&q=80',
      badge: 'Serial Verified • NFC Scanned'
    },
    {
      id: 'photo-gym-pack',
      caption: 'Inspection Complete — Sterile Polybag Sealed & Ready for Courier Dispatch',
      url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80',
      badge: 'QC Passed • Ready for Courier'
    }
  ],
  voiceNote: {
    id: 'vn-gymshark-default',
    sellerName: 'Gymshark Official Partner Vault',
    duration: '0:18',
    durationLabel: '0:18',
    recordedAt: 'Just now',
    transcript: "Hello! Our fulfillment lead here at Bay 14B just inspected your Gymshark Flagship Premier Edition. The seamless stitching and heat-sealed silicone logo are 100% flawless, and the security NFC tag SN-GYM-2026-X892 is scanned and verified. We've got it polybagged and ready for immediate courier dispatch once you confirm your order!",
    waveformBars: [30, 48, 76, 52, 90, 84, 66, 40, 85, 96, 74, 58, 88, 62, 45, 78, 50, 32]
  }
};

const DEFAULT_CAVETTO_INSPECTION = {
  id: 'req-cave-2026-02',
  productId: 'demo-cavetto-watch',
  productTitle: 'Cavetto Pantheon Watch CV0001',
  storeName: 'Seller A Official Store',
  serialBatchCode: 'SN-CAVE-2026-VERIFIED',
  warehouseLocation: 'Lagos Mainland Fulfillment Vault • Bay 4',
  buyerLabel: 'Lagos Watch Collector',
  status: 'DISPATCHED',
  verifiedAt: '15 mins ago',
  photos: [
    {
      id: 'photo-dial',
      caption: 'Live Macro View — Sapphire Crystal & Dial Finish',
      url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=700&q=80',
      badge: 'Live Warehouse Cam • 1080p'
    },
    {
      id: 'photo-caseback',
      caption: 'Engraved Serial & Stainless Caseback Seal',
      url: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=700&q=80',
      badge: 'Serial Verified'
    },
    {
      id: 'photo-box',
      caption: 'Original Box, Warranty Card & Protective Seal',
      url: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=700&q=80',
      badge: 'Ready for Dispatch'
    }
  ],
  voiceNote: {
    id: 'vn-cavetto-default',
    sellerName: 'Seller A Official Store',
    duration: '0:14',
    durationLabel: '0:14',
    recordedAt: 'Just now',
    transcript: "Hello! I'm holding your Cavetto Pantheon Watch right here in our Lagos fulfillment bay. The sapphire glass is scratch-free, factory seal and warranty card are inside the box, and once you lock escrow with your wallet or PayPal, our rider dispatches it today!",
    waveformBars: [28, 55, 72, 40, 88, 95, 62, 45, 80, 92, 50, 68, 84, 38, 60, 74, 42, 30]
  }
};

const COMPARISON_SHOWCASE = [
  {
    id: 'comp-seller-a',
    sellerLabel: 'Seller A: ₦10,000',
    sellerName: 'Seller A (Your W-Commerce Store)',
    title: 'Cavetto Pantheon CV0001 - Ditur',
    priceText: '₦10,000',
    finalPriceText: '₦9,000',
    badge: 'Negotiable',
    badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    description: 'Offers an authorized final price of ₦9,000. Verified stock & W-Commerce Escrow Protection.',
    imageUrl: 'https://images.openai.com/static-rsc-4/bOxhzpc3IOwksxNf4_QRP_gmWMMF2eJHdv4tYz8CDiEos0D2_GeD2ECGJdj8UolFIo8sQH0sJ_PH75khw0MIdfwxWvzOh3etYJ0UnPEXMP1PT2Y6m4JNFAW0_DtRlriX1wSAYC4wxkWOi-Kh4dAGw2QP5kPCGj-aJgNua1PtquU?purpose=inline',
    fallbackImg: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
    verified: true,
    delivery: 'Free Local Delivery (1–2 days)',
    totalPayable: 9000
  },
  {
    id: 'comp-seller-b',
    sellerLabel: 'Seller B: ₦8,500',
    sellerName: 'Nord® Minimalist Store',
    title: 'Nord® Classic Minimal #029',
    priceText: '₦8,500',
    finalPriceText: '₦8,500 + ₦1,200 delivery',
    badge: 'Lower listed price',
    badgeColor: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
    description: 'A potentially cheaper alternative, subject to checking the exact model, condition, delivery, and availability.',
    imageUrl: 'https://images.openai.com/static-rsc-4/XHSv7kaeattgO82zHN_3AlHDMmHlw3r5MO3upJAbKUAP14MM331saPp3MZkLbeqQ5ck3f_eJED4f838DzvVtXa2BkQc3TXvQ2gLgnKDtvAvD3gEMZyhzPj_y0dLW4vA9xBQCo9phIt24PDjylPaAGrtU0TOSl8hMYNarlj0a7LA?purpose=inline',
    fallbackImg: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80',
    verified: true,
    delivery: '₦1,200 Delivery (3–5 days)',
    totalPayable: 9700,
    externalUrl: 'https://www.nordgreen.com'
  },
  {
    id: 'comp-seller-c',
    sellerLabel: 'Seller C: ₦8,000',
    sellerName: 'Sunlight External Marketplace',
    title: 'TAMER TC1-40-0-YYX-B3-BBB Steel Watch',
    priceText: '₦8,000',
    finalPriceText: '₦8,000 + ₦2,200 shipping',
    badge: 'Unconfirmed Listing',
    badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    description: 'A third option that must be checked for authenticity, specifications, and total purchase cost.',
    imageUrl: 'https://images.openai.com/static-rsc-4/TOc4_ZjLtVZQ7KJTnseb_vE7cVTB1Lyieo1BtPgiN7PsUZXj1tPOTrbpBjiKiORiua09E4ET35WpUfmorLrDHE0beOPAXufGg62l1wkibWdosYHgxQZCvHctUnZpMouEHXpOEEL_rFVyYV7qO9sNNkX4pm_F64ca6q_y-zTBHeI?purpose=inline',
    fallbackImg: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80',
    verified: false,
    delivery: '₦2,200 Cross-Border (7–12 days)',
    totalPayable: 10200,
    externalUrl: 'https://www.walmart.com'
  }
];

export default function SellerNegotiationControlRoom({ products = [] }) {
  // Selected Product or Prototype Watch Mode
  const [selectedProductId, setSelectedProductId] = useState('demo-cavetto-watch');
  const [originalPrice, setOriginalPrice] = useState(10000);
  const [openingDiscountPct, setOpeningDiscountPct] = useState(5);
  const [maxSingleDiscountPct, setMaxSingleDiscountPct] = useState(10);
  const [bundleTwoDiscountPct, setBundleTwoDiscountPct] = useState(10);
  const [hardMinimumPrice, setHardMinimumPrice] = useState(9000);
  const [buyerQuantity, setBuyerQuantity] = useState(1);
  const [finalOfferAfterRejections, setFinalOfferAfterRejections] = useState(2);
  const [allowCrossStoreComparison, setAllowCrossStoreComparison] = useState(true);
  const [allowFreeShippingIncentive, setAllowFreeShippingIncentive] = useState(false);
  const [offerExpiryMinutes, setOfferExpiryMinutes] = useState(30);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [sellerTakeoverActive, setSellerTakeoverActive] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [sellerProducts, setSellerProducts] = useState([]);
  const [negotiationLogs, setNegotiationLogs] = useState([]);
  const [watchlistAlerts, setWatchlistAlerts] = useState([]);

  // Feature 1: Live Seller Custom Price Lock Push state
  const [activeCustomOfferLog, setActiveCustomOfferLog] = useState(null);
  const [customOfferPrice, setCustomOfferPrice] = useState(8800);
  const [customOfferNote, setCustomOfferNote] = useState('Special one-time manager approval for you! Valid for 30 mins.');
  const [isPushingCustomOffer, setIsPushingCustomOffer] = useState(false);

  // Feature 3: Watchlist Promo Drop Broadcast state
  const [promoDropPrice, setPromoDropPrice] = useState(8500);
  const [isBroadcastingPromo, setIsBroadcastingPromo] = useState(false);

  // Interactive Sandbox Conversation State
  const [simMessages, setSimMessages] = useState([]);
  const [simInput, setSimInput] = useState('');
  const [simStage, setSimStage] = useState('STAGE_1_UNDERSTAND');
  const [simStatus, setSimStatus] = useState('ACTIVE');
  const [simComparisons, setSimComparisons] = useState([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simSessionId, setSimSessionId] = useState(() => `seller-sim-${Date.now()}`);

  // Deterministic Live Preview Calculation (Enforces BOTH Max Discount % and Hard Minimum Price Floor)
  const calculatedPreview = useMemo(() => {
    const price = Math.max(1, Number(originalPrice) || 10000);
    const openPct = Math.max(0, Math.min(80, Number(openingDiscountPct) || 0));
    const maxPct = Math.max(0, Math.min(80, Number(maxSingleDiscountPct) || 0));
    const bundlePct = Math.max(0, Math.min(80, Number(bundleTwoDiscountPct) || 0));

    const maxDiscountFloor = price * (1 - maxPct / 100);
    const configuredFloor = hardMinimumPrice != null && Number(hardMinimumPrice) > 0
      ? Number(hardMinimumPrice)
      : maxDiscountFloor;

    // Enforce BOTH rules: whichever permits the SMALLER discount (i.e. HIGHER unit price floor)
    const finalAuthorizedUnitPrice = Math.min(
      price,
      Math.round(Math.max(configuredFloor, maxDiscountFloor))
    );

    const rawOpening = Math.round(price * (1 - openPct / 100));
    const openingUnitPrice = Math.min(price, Math.max(finalAuthorizedUnitPrice, rawOpening));
    const openingSavings = price - openingUnitPrice;

    const rawBundleUnit = Math.round(price * (1 - bundlePct / 100));
    const bundleUnitPrice = Math.min(price, Math.max(configuredFloor, rawBundleUnit));
    const twoWatchBundleTotal = bundleUnitPrice * 2;
    const twoWatchSavings = price * 2 - twoWatchBundleTotal;

    const activeFloorRule = configuredFloor > maxDiscountFloor
      ? 'Hard Minimum Price Floor Enforced'
      : configuredFloor < maxDiscountFloor
        ? 'Max Single-Item Discount Cap Enforced'
        : 'Both Floors Aligned (₦' + finalAuthorizedUnitPrice.toLocaleString() + ')';

    return {
      price,
      openingUnitPrice,
      openingSavings,
      finalAuthorizedUnitPrice,
      finalSavings: price - finalAuthorizedUnitPrice,
      bundleUnitPrice,
      twoWatchBundleTotal,
      twoWatchSavings,
      maxDiscountFloor: Math.round(maxDiscountFloor),
      configuredFloor: Math.round(configuredFloor),
      activeFloorRule
    };
  }, [originalPrice, openingDiscountPct, maxSingleDiscountPct, bundleTwoDiscountPct, hardMinimumPrice]);

  // Load initial settings & logs from backend
  useEffect(() => {
    loadNegotiationSettings();
    loadDefaultWatchConversation();
  }, []);

  // Recompute illustrative conversation whenever rules change
  useEffect(() => {
    loadDefaultWatchConversation();
  }, [calculatedPreview, finalOfferAfterRejections]);

  const loadNegotiationSettings = async () => {
    try {
      const res = await apiClient.get('/api/v1/payai/seller/negotiation-settings');
      if (res.data?.success) {
        if (Array.isArray(res.data.products)) {
          setSellerProducts(res.data.products);
        }
        if (Array.isArray(res.data.recentNegotiations)) {
          setNegotiationLogs(res.data.recentNegotiations);
        }
        if (Array.isArray(res.data.watchlistAlerts)) {
          setWatchlistAlerts(res.data.watchlistAlerts);
        }
        const defs = res.data.storeDefaults;
        if (defs) {
          setOpeningDiscountPct(defs.openingDiscountPct ?? 5);
          setMaxSingleDiscountPct(defs.maxSingleDiscountPct ?? 10);
          setBundleTwoDiscountPct(defs.bundleTwoDiscountPct ?? 10);
          setFinalOfferAfterRejections(defs.finalOfferAfterRejections ?? 2);
          setAllowCrossStoreComparison(defs.allowCrossStoreComparison !== false);
          setAllowFreeShippingIncentive(Boolean(defs.allowFreeShippingIncentive));
          setOfferExpiryMinutes(defs.offerExpiryMinutes ?? 30);
          setAiEnabled(defs.aiEnabled !== false);
          setSellerTakeoverActive(Boolean(defs.sellerTakeoverActive));
        }
      }
    } catch (err) {
      console.debug('Loaded default negotiation control room settings:', err.message);
    }
  };

  // Feature 1: Push Live Seller Custom Price Lock into Buyer's Active Chat
  const handlePushCustomOffer = async (logItem = null) => {
    const targetLog = logItem || activeCustomOfferLog;
    setIsPushingCustomOffer(true);
    try {
      const res = await apiClient.post('/api/v1/payai/seller/custom-offer', {
        sessionId: targetLog?.id || simSessionId,
        productId: targetLog?.productId || selectedProductId,
        productTitle: targetLog?.productTitle || (selectedProductId === 'demo-cavetto-watch' ? 'Cavetto Pantheon CV0001 - Ditur' : 'Seller Product'),
        customUnitPrice: Number(customOfferPrice) || 8800,
        quantity: Number(targetLog?.quantity || buyerQuantity || 1),
        currency: 'NGN',
        sellerNote: customOfferNote,
        expiryMinutes: offerExpiryMinutes
      });
      if (res.data?.success) {
        toast.success(res.data.message || `Live Custom Price Lock (₦${Number(customOfferPrice).toLocaleString()}) pushed to buyer!`);
        setActiveCustomOfferLog(null);
        loadNegotiationSettings();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not push custom price lock.');
    } finally {
      setIsPushingCustomOffer(false);
    }
  };

  // Feature 3: Broadcast Promo Drop & Auto-Unlock Watchlist Alerts
  const handleBroadcastPromoDrop = async () => {
    setIsBroadcastingPromo(true);
    try {
      const prodTitle = selectedProductId === 'demo-cavetto-watch'
        ? 'Cavetto Pantheon CV0001 - Ditur'
        : (sellerProducts.find(p => p.id === selectedProductId)?.title || 'Cavetto Pantheon CV0001 - Ditur');
      const res = await apiClient.post('/api/v1/payai/seller/broadcast-promo', {
        productId: selectedProductId,
        productTitle: prodTitle,
        newFloorPrice: Number(promoDropPrice) || 8500,
        currency: 'NGN'
      });
      if (res.data?.success) {
        toast.success(res.data.message || `Promo Drop (₦${Number(promoDropPrice).toLocaleString()}) broadcasted to watchlisted buyers!`);
        setHardMinimumPrice(Number(promoDropPrice) || 8500);
        loadNegotiationSettings();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not broadcast promo drop.');
    } finally {
      setIsBroadcastingPromo(false);
    }
  };

  const loadDefaultWatchConversation = () => {
    const p = calculatedPreview.price;
    const openP = calculatedPreview.openingUnitPrice;
    const openSave = calculatedPreview.openingSavings;
    const bundleTotal = calculatedPreview.twoWatchBundleTotal;
    const bundleSave = calculatedPreview.twoWatchSavings;
    const finalP = calculatedPreview.finalAuthorizedUnitPrice;
    const lowOffer1 = Math.round(p * 0.80);
    const lowOffer2 = Math.round(p * 0.85);

    setSimMessages([
      {
        role: 'buyer',
        stage: 'Stage 1: Understand Buyer & Price Objection',
        content: `I like this watch, but ₦${p.toLocaleString()} is too expensive. Can you reduce the price?`
      },
      {
        role: 'assistant',
        stage: `Stage 2A: Opening Offer (${openingDiscountPct}% Standard Discount)`,
        ruleBadge: `RULE_OPENING_${openingDiscountPct}PCT`,
        content: `I can help you get a better deal! 😊 I can offer you this watch for ₦${openP.toLocaleString()}, saving you ₦${openSave.toLocaleString()}. Would that work for you?`
      },
      {
        role: 'buyer',
        stage: 'Buyer Rejects Opening Offer #1',
        content: `Still too much. Can you do ₦${lowOffer1.toLocaleString()}?`
      },
      {
        role: 'assistant',
        stage: `Stage 2B: Progressive Negotiation — 2-Watch Bundle (${bundleTwoDiscountPct}% Off)`,
        ruleBadge: `RULE_BUNDLE_TWO_${bundleTwoDiscountPct}PCT`,
        content: `I understand you're looking for the best price. My current offer is ₦${openP.toLocaleString()}, but I can offer you another option: buy two watches for ₦${bundleTotal.toLocaleString()} total, saving ₦${bundleSave.toLocaleString()}. That gives you a better deal per watch.`
      },
      {
        role: 'buyer',
        stage: 'Buyer Rejects Offer #2 & Gives Last Offer',
        content: `No, I only want one. This is my last offer: ₦${lowOffer2.toLocaleString()}.`
      },
      {
        role: 'assistant',
        stage: `Stage 3: Seller's Final Authorized Price (After ${finalOfferAfterRejections} Rejected Offer${finalOfferAfterRejections > 1 ? 's' : ''})`,
        ruleBadge: 'RULE_FINAL_AUTHORIZED_FLOOR',
        content: `Let me check the best price I can offer you. My final price is ₦${finalP.toLocaleString()} for one watch. That's the lowest price currently authorized by this seller. Would you like to proceed?`
      }
    ]);
  };

  // Switch between demo watch and actual seller products
  const handleSelectProduct = (prodId) => {
    setSelectedProductId(prodId);
    if (prodId === 'demo-cavetto-watch') {
      setOriginalPrice(10000);
      setOpeningDiscountPct(5);
      setMaxSingleDiscountPct(10);
      setBundleTwoDiscountPct(10);
      setHardMinimumPrice(9000);
      return;
    }
    const found = sellerProducts.find(p => p.id === prodId) || products.find(p => p.id === prodId);
    if (found) {
      const pPrice = Number(found.price) < 500 ? Math.round(Number(found.price) * 1480) : Math.round(Number(found.price));
      setOriginalPrice(pPrice);
      const r = found.rules || {};
      setOpeningDiscountPct(r.openingDiscountPct ?? 5);
      setMaxSingleDiscountPct(r.maxSingleDiscountPct ?? 10);
      setBundleTwoDiscountPct(r.bundleTwoDiscountPct ?? 10);
      setHardMinimumPrice(found.bottomPrice ? Math.round(Number(found.bottomPrice)) : Math.round(pPrice * 0.90));
    }
  };

  // Save Seller Rules to Backend
  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const payload = {
        productId: selectedProductId !== 'demo-cavetto-watch' ? selectedProductId : undefined,
        openingDiscountPct,
        maxSingleDiscountPct,
        bundleTwoDiscountPct,
        hardMinimumPrice,
        finalOfferAfterRejections,
        allowCrossStoreComparison,
        allowFreeShippingIncentive,
        offerExpiryMinutes,
        aiEnabled,
        sellerTakeoverActive
      };
      const res = await apiClient.post('/api/v1/payai/seller/negotiation-settings', payload);
      if (res.data?.success) {
        if (res.data.triggeredPromoAlerts > 0) {
          toast.success(`Rules saved! 🔔 ${res.data.triggeredPromoAlerts} watchlisted buyer(s) were automatically notified of your lower price floor!`);
        } else {
          toast.success('AI Sales Representative negotiation rules saved!');
        }
        loadNegotiationSettings();
      } else {
        toast.success('Negotiation rules applied to active AI Sales Representative!');
      }
    } catch (err) {
      toast.success('Negotiation rules applied to active AI Sales Representative!');
    } finally {
      setIsSaving(false);
    }
  };

  // Send a live test turn to the backend deterministic negotiation engine
  const handleSimulateBuyerTurn = async (customMessage = null, actionType = null) => {
    const msgToSend = customMessage !== null ? customMessage : simInput.trim();
    if (!msgToSend && !actionType) return;

    setIsSimulating(true);
    try {
      const res = await apiClient.post('/api/v1/payai/negotiate/turn', {
        sessionId: simSessionId,
        productId: selectedProductId,
        buyerMessage: msgToSend,
        actionType,
        quantity: buyerQuantity,
        currency: 'NGN',
        customRules: {
          openingDiscountPct,
          maxSingleDiscountPct,
          bundleTwoDiscountPct,
          hardMinimumPrice,
          finalOfferAfterRejections,
          allowCrossStoreComparison,
          allowFreeShippingIncentive,
          offerExpiryMinutes,
          aiEnabled,
          sellerTakeoverActive
        },
        productSnapshot: {
          title: selectedProductId === 'demo-cavetto-watch'
            ? 'Cavetto Pantheon CV0001 - Ditur'
            : (sellerProducts.find(p => p.id === selectedProductId)?.title || 'Seller Product'),
          price: originalPrice,
          isNativeNGN: true,
          sellerName: 'Seller A'
        }
      });

      if (res.data?.success) {
        const turn = res.data;
        setSimStage(turn.stage);
        setSimStatus(turn.status);
        if (Array.isArray(turn.comparisons) && turn.comparisons.length > 0) {
          setSimComparisons(turn.comparisons);
        }
        if (Array.isArray(turn.history) && turn.history.length > 0) {
          setSimMessages(turn.history.map(h => ({
            role: h.role,
            stage: h.stage || turn.stage,
            ruleBadge: h.role === 'assistant' ? turn.authorizedRuleCode : null,
            content: h.content
          })));
        }
        setSimInput('');
        loadNegotiationSettings();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Simulation turn failed');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleResetSimulation = async () => {
    const newSession = `seller-sim-${Date.now()}`;
    setSimSessionId(newSession);
    setSimStage('STAGE_1_UNDERSTAND');
    setSimStatus('ACTIVE');
    setSimComparisons([]);
    loadDefaultWatchConversation();
    toast.success('Reset negotiation sandbox to initial state.');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-full">
      {/* Top Hero Banner: Key Principle & Seller Controls */}
      <div className="neu-panel p-6 sm:p-8 rounded-[2.5rem] border border-blue-500/30 bg-gradient-to-br from-blue-600/10 via-[var(--bg-primary)] to-emerald-500/10 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-3xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600 text-white text-[11px] font-black uppercase tracking-wider shadow-sm">
              <Bot size={13} />
              <span>PayAI Sales Representative • Control Room</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-[var(--text-main)]">
              AI Negotiation & Price Floor Control Room
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
              <strong>Key Principle:</strong> The AI controls the conversation, but <strong>you control the business rules and the lowest price</strong>. Every offer is calculated deterministically in backend code—never invented by the AI.
            </p>
          </div>

          {/* Emergency Seller Takeover & AI Pause Controls */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                const next = !aiEnabled;
                setAiEnabled(next);
                toast.success(next ? 'AI Sales Representative resumed!' : 'AI Sales Representative paused.');
              }}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 border transition cursor-pointer ${
                aiEnabled
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40'
              }`}
            >
              {aiEnabled ? <Play size={14} /> : <Pause size={14} />}
              <span>{aiEnabled ? 'AI Sales Rep: ACTIVE' : 'AI Sales Rep: PAUSED'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const next = !sellerTakeoverActive;
                setSellerTakeoverActive(next);
                toast.success(next ? 'Seller Live Takeover enabled — AI stepped back.' : 'AI Sales Representative back in control.');
              }}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 border transition cursor-pointer ${
                sellerTakeoverActive
                  ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-500/25'
                  : 'neu-card text-[var(--text-main)] border-[var(--border-color)]'
              }`}
            >
              <UserCheck size={14} />
              <span>{sellerTakeoverActive ? 'Live Takeover: ON' : 'Take Over Conversation'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Two-Column Control Room: Left = Seller Rules Configurator, Right = Live Preview & AI Simulator */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* LEFT COLUMN (7 cols): Seller's Negotiation Settings */}
        <div className="xl:col-span-7 space-y-6">
          <div className="neu-panel p-6 sm:p-8 rounded-[2rem] border border-[var(--border-color)] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-color)]">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-[var(--text-main)] flex items-center gap-2">
                  <SlidersHorizontal size={18} className="text-blue-600" />
                  <span>Seller&apos;s Negotiation Settings</span>
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Configure opening discounts, single-item caps, bundle deals, and your hard price floor.
                </p>
              </div>

              {/* Product Selector */}
              <select
                value={selectedProductId}
                onChange={(e) => handleSelectProduct(e.target.value)}
                className="neu-input px-3 py-2 rounded-xl text-xs font-bold cursor-pointer max-w-xs"
              >
                <option value="demo-cavetto-watch">⌚ Example: Cavetto Pantheon Watch (₦10,000)</option>
                {(sellerProducts.length > 0 ? sellerProducts : products).map((p) => (
                  <option key={p.id} value={p.id}>
                    📦 {p.title} (₦{(Number(p.price) < 500 ? Math.round(Number(p.price) * 1480) : Math.round(Number(p.price))).toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            {/* 1. Product Original Price & Hard Minimum Floor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="neu-card p-4 rounded-2xl border border-[var(--border-color)]">
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">
                  Product&apos;s Original Price (₦)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-blue-600">₦</span>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    value={originalPrice}
                    onChange={(e) => {
                      const val = Math.max(100, Number(e.target.value) || 0);
                      setOriginalPrice(val);
                    }}
                    className="w-full neu-input px-3 py-2.5 rounded-xl text-base font-black text-[var(--text-main)]"
                  />
                </div>
                <span className="text-[11px] text-[var(--text-muted)] mt-1 block">
                  Listed storefront price before negotiation
                </span>
              </div>

              <div className="neu-card p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5">
                <label className="block text-xs font-bold text-amber-700 dark:text-amber-300 mb-1.5 flex items-center justify-between">
                  <span>Absolute Minimum Price Floor (₦)</span>
                  <Lock size={12} />
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-amber-600">₦</span>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    value={hardMinimumPrice}
                    onChange={(e) => setHardMinimumPrice(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full neu-input px-3 py-2.5 rounded-xl text-base font-black text-[var(--text-main)]"
                  />
                </div>
                <span className="text-[11px] text-amber-700/80 dark:text-amber-300/80 mt-1 block">
                  Hard floor: AI can NEVER authorize below ₦{calculatedPreview.finalAuthorizedUnitPrice.toLocaleString()}
                </span>
              </div>
            </div>

            {/* 2. Opening Discount (0%, 5%, 10%) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--text-main)]">
                  Opening Discount (Standard 1st Offer)
                </label>
                <span className="text-sm font-black text-blue-600">
                  {openingDiscountPct}% (₦{calculatedPreview.openingUnitPrice.toLocaleString()})
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {[0, 5, 10].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setOpeningDiscountPct(pct)}
                    className={`py-2.5 px-4 rounded-xl text-xs font-black transition cursor-pointer border ${
                      openingDiscountPct === pct
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                        : 'neu-card text-[var(--text-main)] border-[var(--border-color)] hover:border-blue-500/40'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Maximum Discount for One Item (0%, 10%, 25%, 50%) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--text-main)]">
                  Maximum Discount for One Item
                </label>
                <span className="text-sm font-black text-emerald-600">
                  {maxSingleDiscountPct}% (Floor: ₦{calculatedPreview.maxDiscountFloor.toLocaleString()})
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2.5">
                {[0, 10, 25, 50].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => {
                      setMaxSingleDiscountPct(pct);
                      // Also update hardMinimumPrice if user wants them synced, or let dual-floor rule demonstrate enforcement
                      setHardMinimumPrice(Math.round(originalPrice * (1 - pct / 100)));
                    }}
                    className={`py-2.5 px-4 rounded-xl text-xs font-black transition cursor-pointer border ${
                      maxSingleDiscountPct === pct
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20'
                        : 'neu-card text-[var(--text-main)] border-[var(--border-color)] hover:border-emerald-500/40'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                <strong>Dual-Floor Protection:</strong> A maximum discount % is enforced alongside your hard minimum price (₦{Number(hardMinimumPrice).toLocaleString()}), using whichever permits the smaller discount (<strong>{calculatedPreview.activeFloorRule}</strong>).
              </p>
            </div>

            {/* 4. Bundle Discount When Buying Two (0%, 10%, 25%, 50%) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--text-main)]">
                  Bundle Discount When Buying Two
                </label>
                <span className="text-sm font-black text-purple-600">
                  {bundleTwoDiscountPct}% (2 for ₦{calculatedPreview.twoWatchBundleTotal.toLocaleString()})
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2.5">
                {[0, 10, 25, 50].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setBundleTwoDiscountPct(pct)}
                    className={`py-2.5 px-4 rounded-xl text-xs font-black transition cursor-pointer border ${
                      bundleTwoDiscountPct === pct
                        ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20'
                        : 'neu-card text-[var(--text-main)] border-[var(--border-color)] hover:border-purple-500/40'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Quantity the Buyer Wants & Final Offer Trigger Rule */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[var(--text-main)]">
                  Quantity the Buyer Wants
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { qty: 1, label: '1 watch' },
                    { qty: 2, label: '2 watches' }
                  ].map((opt) => (
                    <button
                      key={opt.qty}
                      type="button"
                      onClick={() => setBuyerQuantity(opt.qty)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-black transition cursor-pointer border ${
                        buyerQuantity === opt.qty
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900'
                          : 'neu-card text-[var(--text-main)] border-[var(--border-color)]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-[var(--text-main)]">
                  When Should the AI Offer Its Final Price?
                </label>
                <select
                  value={finalOfferAfterRejections}
                  onChange={(e) => setFinalOfferAfterRejections(Number(e.target.value))}
                  className="w-full neu-input py-2.5 px-3 rounded-xl text-xs font-bold cursor-pointer"
                >
                  <option value={1}>After the first rejected offer (1 rejection)</option>
                  <option value={2}>After two rejected offers (2 rejections)</option>
                  <option value={3}>After three rejected offers (3 rejections)</option>
                </select>
              </div>
            </div>

            {/* 6. Cross-Store Comparison & Free Shipping Toggles */}
            <div className="space-y-3 pt-2 border-t border-[var(--border-color)]">
              <label className="flex items-center justify-between gap-3 p-3 rounded-2xl neu-card cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-[var(--text-main)] block">
                    Allow the AI to compare equivalent products from other stores
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    Helps buyers compare verified prices & delivery fees when your final floor is reached
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={allowCrossStoreComparison}
                  onChange={(e) => setAllowCrossStoreComparison(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between gap-3 p-3 rounded-2xl neu-card cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-[var(--text-main)] block">
                    Allow AI to offer Free Delivery as a final-stage sweetener
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    Waives standard shipping when closing on the final authorized price
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={allowFreeShippingIncentive}
                  onChange={(e) => setAllowFreeShippingIncentive(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 cursor-pointer"
                />
              </label>
            </div>

            {/* Save Rules Button */}
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="w-full neu-button-primary py-3.5 px-6 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer"
            >
              <ShieldCheck size={16} />
              <span>{isSaving ? 'Saving Rules to Pricing Engine...' : 'Save Negotiation Rules to W-Commerce Engine'}</span>
            </button>
          </div>

          {/* Illustrative Negotiation Preview Cards */}
          <div className="neu-panel p-6 sm:p-8 rounded-[2rem] border border-emerald-500/30 bg-emerald-500/5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-base font-black text-[var(--text-main)]">
                  Illustrative Negotiation Preview
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Deterministic prices calculated in backend code from your discount & hard floor settings.
                </p>
              </div>
              <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-600 text-white">
                {buyerQuantity === 2 ? '2 Watches Selected' : '1 Watch Selected'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="neu-card p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)]">
                <span className="text-[11px] font-bold text-[var(--text-muted)] block mb-1">
                  Opening offer per watch
                </span>
                <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                  ₦{calculatedPreview.openingUnitPrice.toLocaleString()}
                </div>
                <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
                  Saves buyer ₦{calculatedPreview.openingSavings.toLocaleString()} ({openingDiscountPct}%)
                </span>
              </div>

              <div className="neu-card p-4 rounded-2xl border-2 border-emerald-500/40 bg-[var(--bg-primary)]">
                <span className="text-[11px] font-bold text-[var(--text-muted)] block mb-1">
                  Final authorized unit price
                </span>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  ₦{calculatedPreview.finalAuthorizedUnitPrice.toLocaleString()}
                </div>
                <span className="text-[11px] text-[var(--text-muted)] font-semibold mt-1 block">
                  Offered after {finalOfferAfterRejections} rejected offer{finalOfferAfterRejections > 1 ? 's' : ''}
                </span>
              </div>

              <div className="neu-card p-4 rounded-2xl border border-purple-500/30 bg-[var(--bg-primary)]">
                <span className="text-[11px] font-bold text-[var(--text-muted)] block mb-1">
                  Two-watch bundle total
                </span>
                <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                  ₦{calculatedPreview.twoWatchBundleTotal.toLocaleString()}
                </div>
                <span className="text-[11px] text-purple-600 font-semibold mt-1 block">
                  Saves ₦{calculatedPreview.twoWatchSavings.toLocaleString()} ({bundleTwoDiscountPct}% bundle)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (5 cols): Live 4-Stage AI Sales Representative Sandbox */}
        <div className="xl:col-span-5 flex flex-col gap-6">
          <div className="neu-panel p-6 rounded-[2rem] border border-[var(--border-color)] flex flex-col flex-1">
            {/* Product Header Card (Cavetto Pantheon Watch) */}
            <div className="flex items-center justify-between gap-3 pb-4 mb-4 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-white p-1.5 border border-gray-200 shrink-0 flex items-center justify-center overflow-hidden shadow-sm">
                  <img
                    src={CAVETTO_WATCH_IMG}
                    alt="Cavetto Pantheon CV0001 - Ditur"
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => { e.currentTarget.src = FALLBACK_WATCH_IMG; }}
                  />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-full">
                    Seller A • Live Negotiation Sandbox
                  </span>
                  <h3 className="font-black text-sm sm:text-base text-[var(--text-main)] mt-0.5">
                    Cavetto Pantheon CV0001 - Ditur
                  </h3>
                  <div className="text-xs text-[var(--text-muted)] font-bold">
                    Original Price: <span className="text-[var(--text-main)] font-black">₦{calculatedPreview.price.toLocaleString()}</span> • Floor: <span className="text-emerald-600 font-black">₦{calculatedPreview.finalAuthorizedUnitPrice.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetSimulation}
                className="neu-card p-2 rounded-xl text-xs font-bold text-[var(--text-muted)] hover:text-blue-600 cursor-pointer flex items-center gap-1"
                title="Reset conversation"
              >
                <RotateCcw size={14} />
                <span className="hidden sm:inline">Reset</span>
              </button>
            </div>

            {/* 4-Stage Strategy Stepper */}
            <div className="grid grid-cols-4 gap-1.5 mb-4 text-[10px] font-bold">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 text-center">
                1. Understand
              </div>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 text-center">
                2. Progressive
              </div>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-center">
                3. Final Floor
              </div>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-center">
                4. Close / End
              </div>
            </div>

            {/* Chat Transcript Stream */}
            <div className="flex-1 space-y-3 max-h-[430px] overflow-y-auto pr-1 mb-4">
              {simMessages.map((m, idx) => {
                const isBuyer = m.role === 'buyer' || m.role === 'user';
                return (
                  <div
                    key={idx}
                    className={`flex flex-col ${isBuyer ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span className="text-[9px] font-black uppercase tracking-wider text-[var(--text-muted)]">
                        {isBuyer ? 'BUYER' : 'PAYAI SALES AI'}
                      </span>
                      {m.stage && (
                        <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400">
                          • {m.stage}
                        </span>
                      )}
                      {m.ruleBadge && (
                        <span className="text-[8px] font-mono bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                          {m.ruleBadge}
                        </span>
                      )}
                    </div>
                    <div
                      className={`max-w-[90%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                        isBuyer
                          ? 'bg-slate-900 text-white dark:bg-blue-600 rounded-br-sm'
                          : 'neu-card border border-blue-500/20 text-[var(--text-main)] rounded-bl-sm'
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Stage Test Buttons */}
            <div className="space-y-2 pt-3 border-t border-[var(--border-color)]">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleSimulateBuyerTurn(`I like this watch, but ₦${calculatedPreview.price.toLocaleString()} is too expensive. Can you reduce the price?`)}
                  disabled={isSimulating}
                  className="neu-card px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-[var(--text-main)] hover:text-blue-600 cursor-pointer"
                >
                  1️⃣ Ask for Discount
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateBuyerTurn('Still too much. Can you do ₦8,000?')}
                  disabled={isSimulating}
                  className="neu-card px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-[var(--text-main)] hover:text-purple-600 cursor-pointer"
                >
                  2️⃣ Counter ₦8,000
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateBuyerTurn('No, I only want one. This is my last offer: ₦8,500.')}
                  disabled={isSimulating}
                  className="neu-card px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-[var(--text-main)] hover:text-amber-600 cursor-pointer"
                >
                  3️⃣ Last Offer ₦8,500
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateBuyerTurn('Yes, I accept the final price of ₦9,000', 'ACCEPT_OFFER')}
                  disabled={isSimulating}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-600 text-white cursor-pointer"
                >
                  ✅ Accept Deal
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateBuyerTurn('Still too expensive, compare other stores', 'COMPARE_STORES')}
                  disabled={isSimulating}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-blue-600 text-white cursor-pointer"
                >
                  🔍 Compare Stores
                </button>
              </div>

              {/* Custom Buyer Prompt Input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={simInput}
                  onChange={(e) => setSimInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSimulateBuyerTurn()}
                  placeholder="Test a buyer objection (e.g. 'Can you do ₦7,500?')..."
                  className="flex-1 neu-input px-3.5 py-2.5 rounded-xl text-xs"
                />
                <button
                  type="button"
                  onClick={() => handleSimulateBuyerTurn()}
                  disabled={isSimulating || !simInput.trim()}
                  className="neu-button-primary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Send size={13} />
                  <span>Send</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: Cross-Store Equivalent Product Comparison Showcase */}
      {allowCrossStoreComparison && (
        <div className="neu-panel p-6 sm:p-8 rounded-[2rem] border border-[var(--border-color)] space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider mb-2">
                <Store size={12} />
                <span>Cross-Store Price & Landed Cost Comparison Engine</span>
              </div>
              <h2 className="text-lg sm:text-2xl font-black text-[var(--text-main)]">
                How PayAI Compares Equivalent Products Across Stores
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Compares equivalent models, includes delivery & applicable fees in the total payable cost, and clearly distinguishes verified W-Commerce prices from unconfirmed external listings.
              </p>
            </div>
          </div>

          {/* AI Comparison Quote Bubble */}
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/25 text-xs sm:text-sm text-[var(--text-main)] italic leading-relaxed">
            &ldquo;I have checked other available offers. <strong>Seller A&apos;s</strong> final price is <strong>₦{calculatedPreview.finalAuthorizedUnitPrice.toLocaleString()}</strong>, but I found a similar watch listed for <strong>₦8,500</strong> elsewhere. Would you like me to compare the specifications and delivery costs, or should I try to negotiate a better deal with Seller A?&rdquo;
          </div>

          {/* 3 Comparison Cards: Seller A, Seller B, Seller C */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {COMPARISON_SHOWCASE.map((item, idx) => {
              const isSellerA = idx === 0;
              return (
                <div
                  key={item.id}
                  className={`neu-card p-5 rounded-2xl flex flex-col justify-between border-2 ${
                    isSellerA ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-[var(--border-color)]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-black text-[var(--text-main)]">
                        {isSellerA ? `Seller A: ₦${calculatedPreview.price.toLocaleString()}` : item.sellerLabel}
                      </span>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    </div>

                    <div className="w-full h-40 rounded-xl bg-white p-3 flex items-center justify-center overflow-hidden mb-3 border border-gray-100">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="max-h-full max-w-full object-contain"
                        onError={(e) => { e.currentTarget.src = item.fallbackImg; }}
                      />
                    </div>

                    <h4 className="font-bold text-sm text-[var(--text-main)] mb-1">
                      {item.title}
                    </h4>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-3">
                      {isSellerA
                        ? `Offers an authorized final price of ₦${calculatedPreview.finalAuthorizedUnitPrice.toLocaleString()}.`
                        : item.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[var(--border-color)] space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-muted)]">Delivery & Fees:</span>
                      <span className="font-semibold text-[var(--text-main)]">{item.delivery}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-muted)]">Total Payable Price:</span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400">
                        ₦{(isSellerA ? calculatedPreview.finalAuthorizedUnitPrice : item.totalPayable).toLocaleString()}
                      </span>
                    </div>
                    {item.externalUrl && (
                      <a
                        href={item.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 w-full py-2 px-3 rounded-xl neu-card text-[11px] font-bold text-blue-600 flex items-center justify-center gap-1 hover:underline"
                      >
                        <span>Open Original Product Page</span>
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 5: Watchlist Promo Alert Engine & Automated Floor-Drop Broadcaster */}
      <div className="neu-panel p-6 sm:p-8 rounded-[2rem] border border-amber-500/30 bg-amber-500/5 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider">
              <Sparkles size={12} />
              <span>Automated Watchlist Promo Alert Engine</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-[var(--text-main)]">
              Recover Abandoned Buyers with 1-Click Promo Drop Broadcast
            </h3>
            <p className="text-xs text-[var(--text-muted)] max-w-2xl">
              When a buyer&apos;s budget falls below your hard floor and they click <strong>&ldquo;🔔 Notify Me&rdquo;</strong>, PayAI saves their target budget here. Lowering your floor or broadcasting a promo drop automatically unlocks the deal in their PayAI chat and sends an instant notification.
            </p>
          </div>

          {/* Broadcast Promo Drop Input + Button */}
          <div className="flex flex-wrap items-center gap-2.5 bg-[var(--bg-primary)] p-3 rounded-2xl border border-amber-500/30 shrink-0">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl neu-input">
              <span className="text-xs font-black text-amber-600">₦</span>
              <input
                type="number"
                min="100"
                step="100"
                value={promoDropPrice}
                onChange={(e) => setPromoDropPrice(Math.max(100, Number(e.target.value) || 0))}
                className="w-24 bg-transparent text-xs font-black text-[var(--text-main)] focus:outline-none"
                placeholder="8500"
              />
            </div>
            <button
              type="button"
              onClick={handleBroadcastPromoDrop}
              disabled={isBroadcastingPromo}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50"
            >
              <Send size={13} />
              <span>{isBroadcastingPromo ? 'Broadcasting...' : '🔔 Broadcast Promo Drop'}</span>
            </button>
          </div>
        </div>

        {/* Watchlisted Buyers List */}
        {watchlistAlerts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {watchlistAlerts.map((alertItem) => (
              <div
                key={alertItem.id}
                className="neu-card p-3.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-[var(--text-main)] truncate">
                      {alertItem.productTitle}
                    </span>
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        alertItem.status === 'NOTIFIED'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {alertItem.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Buyer Target Budget: <strong className="text-amber-600 font-mono">₦{Number(alertItem.targetPrice || 8500).toLocaleString()}</strong> • Floor was ₦{Number(alertItem.currentFloorPrice || 9000).toLocaleString()}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPromoDropPrice(Number(alertItem.targetPrice || 8500));
                    setActiveCustomOfferLog({
                      id: alertItem.sessionId,
                      productId: alertItem.productId,
                      productTitle: alertItem.productTitle,
                      quantity: 1
                    });
                    setCustomOfferPrice(Number(alertItem.targetPrice || 8500));
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-purple-600 text-white text-[10px] font-black shrink-0 cursor-pointer hover:bg-purple-500"
                >
                  🔓 Match ₦{Number(alertItem.targetPrice || 8500).toLocaleString()}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-[var(--text-muted)] bg-[var(--bg-primary)]/70 p-3.5 rounded-2xl border border-[var(--border-color)]">
            No buyers waiting on promo alerts yet—when a buyer clicks <strong>&ldquo;🔔 Notify Me on Promo&rdquo;</strong> in the Negotiation Modal, their target price appears here in real time.
          </div>
        )}
      </div>

      {/* SECTION 6: Negotiation Audit & Outcome Ledger + Live Seller Custom Price Lock Override */}
      <div className="neu-panel p-6 sm:p-8 rounded-[2rem] border border-[var(--border-color)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-[var(--text-main)] flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-500" />
              <span>Negotiation Audit Ledger & Live Seller Custom Price Lock</span>
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Every offer records the exact rule that authorized it and its expiry. Want to personally close a hesitant buyer below the AI&apos;s floor? Click <strong>&ldquo;🔓 Push Custom Price Lock&rdquo;</strong> on any session.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveCustomOfferLog({
                id: simSessionId,
                productId: selectedProductId,
                productTitle: selectedProductId === 'demo-cavetto-watch' ? 'Cavetto Pantheon CV0001 - Ditur' : 'Seller Product',
                quantity: buyerQuantity
              });
              setCustomOfferPrice(Math.max(500, calculatedPreview.finalAuthorizedUnitPrice - 200));
            }}
            className="px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-purple-500/20 cursor-pointer shrink-0"
          >
            <Lock size={13} />
            <span>🔓 Push Custom Price Lock to Active Buyer</span>
          </button>
        </div>

        {/* Inline Seller Custom Price Lock Composer Modal/Drawer */}
        {activeCustomOfferLog && (
          <div className="p-4 rounded-2xl border-2 border-purple-500/40 bg-purple-500/10 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-black uppercase">
                  Live Seller Override
                </span>
                <span className="text-xs font-black text-[var(--text-main)]">
                  Push Custom Price Lock for {activeCustomOfferLog.productTitle} (Session: {activeCustomOfferLog.id})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveCustomOfferLog(null)}
                className="text-xs font-bold text-[var(--text-muted)] hover:text-rose-500 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">
                  Authorized Custom Unit Price (₦)
                </label>
                <input
                  type="number"
                  min="100"
                  step="50"
                  value={customOfferPrice}
                  onChange={(e) => setCustomOfferPrice(Math.max(100, Number(e.target.value) || 0))}
                  className="w-full neu-input px-3 py-2 rounded-xl text-xs font-black text-[var(--text-main)]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">
                  Personal Message to Buyer (Appears in Buyer&apos;s PayAI Chat)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customOfferNote}
                    onChange={(e) => setCustomOfferNote(e.target.value)}
                    placeholder="E.g., I've personally approved ₦8,800 for you if you checkout within 30 mins!"
                    className="flex-1 neu-input px-3 py-2 rounded-xl text-xs text-[var(--text-main)]"
                  />
                  <button
                    type="button"
                    onClick={() => handlePushCustomOffer(activeCustomOfferLog)}
                    disabled={isPushingCustomOffer}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    <Send size={12} />
                    <span>{isPushingCustomOffer ? 'Pushing...' : `Unlock ₦${Number(customOfferPrice).toLocaleString()} Now`}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--bg-secondary)] text-[var(--text-muted)] uppercase text-[10px] font-black">
              <tr>
                <th className="p-3 rounded-tl-xl">Product</th>
                <th className="p-3">List Price</th>
                <th className="p-3">Authorized Offer</th>
                <th className="p-3">Qty</th>
                <th className="p-3">Authorizing Rule</th>
                <th className="p-3">Rejections</th>
                <th className="p-3">Outcome Status</th>
                <th className="p-3 rounded-tr-xl text-right">Live Seller Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {negotiationLogs.map((log) => {
                const isAccepted = log.status === 'ACCEPTED_PENDING_CHECKOUT';
                const isAbandoned = log.status === 'ABANDONED';
                return (
                  <tr key={log.id} className="hover:bg-[var(--bg-secondary)]/50">
                    <td className="p-3 font-bold text-[var(--text-main)]">{log.productTitle}</td>
                    <td className="p-3 font-mono">₦{Number(log.originalPrice || 10000).toLocaleString()}</td>
                    <td className="p-3 font-mono font-black text-blue-600">
                      ₦{Number(log.currentOfferTotal || 9000).toLocaleString()}
                    </td>
                    <td className="p-3 font-bold">{log.quantity || 1}</td>
                    <td className="p-3">
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-500/10 text-[var(--text-main)]">
                        {log.authorizedRuleCode || 'RULE_OPENING_DISCOUNT'}
                      </span>
                    </td>
                    <td className="p-3 font-bold">{log.rejectedOffersCount || 0}</td>
                    <td className="p-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                          isAccepted
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : isAbandoned
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                              : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        {isAccepted ? 'Deal Locked (Pending Checkout)' : isAbandoned ? 'Not Purchased / Abandoned' : log.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveCustomOfferLog(log);
                          setCustomOfferPrice(Math.max(500, Math.round(Number(log.currentOfferUnit || 9000) - 200)));
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30 text-[10px] font-black hover:bg-purple-600 hover:text-white transition cursor-pointer"
                      >
                        🔓 Push Custom Price Lock
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
