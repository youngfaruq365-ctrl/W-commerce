import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, Sparkles, ExternalLink, ShieldCheck, ArrowRight,
  Plane, CheckCircle2, RefreshCw, ShoppingCart, Info, Search,
  Filter, Check, Trash2, Edit3, Plus, Store, Zap, Lock,
  DollarSign, Package, Percent, SlidersHorizontal, RotateCcw,
  CheckSquare, Square, Layers, TrendingUp, Eye, X,
  Camera, Image as ImageIcon, Upload, CheckCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiClient } from '../../../utils/apiClient';
import { gxDelete } from '../../shared/ui/GXDialog';
import { useSellerStore } from '../../../store/sellerStore';
import { decodeHtml, resolveProductImage, CATEGORY_IMAGE_PRESETS } from '../../../utils/imageHelpers';

const SAMPLE_STORES = [
  {
    name: 'Gymshark Activewear',
    url: 'https://www.gymshark.com',
    platform: 'shopify',
    desc: 'High-performance activewear & gym apparel direct from UK warehouse.'
  },
  {
    name: 'WooCommerce Showcase',
    url: 'https://themes.woocommerce.com/storefront',
    platform: 'woocommerce',
    desc: 'Official WooCommerce demonstration store with dynamic product catalog.'
  },
  {
    name: 'Anker Global Flagship',
    url: 'https://www.amazon.com/stores/Anker/page/1',
    platform: 'amazon',
    desc: 'Industry-leading GaN fast chargers, portable power banks, and audio gear.'
  },
  {
    name: 'Baseus Official Direct',
    url: 'https://www.aliexpress.com/store/1100344567',
    platform: 'aliexpress',
    desc: 'Consumer tech accessories, cables, and car charging essentials.'
  },
  {
    name: 'Nomad Goods Studio',
    url: 'https://nomadgoods.com',
    platform: 'custom_store',
    desc: 'Premium Horween leather cases, Apple Watch straps, and minimalist EDC.'
  }
];

export default function ExternalSiteStudio({ user, storeConfig, setActiveTab, onUpgrade }) {
  const navigate = useNavigate();

  // Tier checking: Pro, Premium, Ultra, Elite plans are allowed
  const userTier = (user?.subscriptionTier || '').toLowerCase();
  const storeTier = (storeConfig?.sellerTier || '').toLowerCase();
  const isEligibleTier = Boolean(
    ['pro', 'premium', 'ultra', 'elite'].some(t => userTier.includes(t) || storeTier.includes(t)) ||
    storeConfig?.isPremium
  );
  const displayTier = ['ultra', 'premium', 'pro', 'elite'].find(t => userTier.includes(t) || storeTier.includes(t))?.toUpperCase() || (storeConfig?.isPremium ? 'PREMIUM' : 'PRO');

  // Connected stores state
  const [linkedStores, setLinkedStores] = useState([]);
  const [isLoadingStores, setIsLoadingStores] = useState(false);
  const [activeLinkId, setActiveLinkId] = useState(null);

  // New Store Form State
  const [storeUrl, setStoreUrl] = useState('');
  const [storeName, setStoreName] = useState('');
  const [platform, setPlatform] = useState('shopify');
  const [description, setDescription] = useState('');

  // Fetching & Filtering State
  const [isFetchingProducts, setIsFetchingProducts] = useState(false);
  const [fetchLimit, setFetchLimit] = useState(250);
  const [fetchedCatalog, setFetchedCatalog] = useState(null);
  const [editableProducts, setEditableProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProductIds, setSelectedProductIds] = useState(new Set());
  const [studioPage, setStudioPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(48);

  // Bulk Editing State
  const [bulkMarkupPct, setBulkMarkupPct] = useState('');
  const [bulkStockVal, setBulkStockVal] = useState('');

  // Submitting State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importedSuccessData, setImportedSuccessData] = useState(null);
  const [previewingProduct, setPreviewingProduct] = useState(null);
  const [imageEditProduct, setImageEditProduct] = useState(null);
  const [tempImageUrl, setTempImageUrl] = useState('');
  const [isUpdatingImage, setIsUpdatingImage] = useState(false);
  const [publishedMap, setPublishedMap] = useState({});
  const fetchSellerProducts = useSellerStore(state => state.fetchSellerProducts);

  // Store Ownership Verification State (Anti-Hijack Protection)
  const [verificationTokenData, setVerificationTokenData] = useState(null);
  const [verificationMethod, setVerificationMethod] = useState('META_OR_BIO');
  const [verificationInput, setVerificationInput] = useState('');
  const [isVerifyingOwnership, setIsVerifyingOwnership] = useState(false);
  const [ownershipVerified, setOwnershipVerified] = useState(false);
  const [verifiedMethodLabel, setVerifiedMethodLabel] = useState(null);
  const [verifiedTimestamp, setVerifiedTimestamp] = useState(null);

  // Load existing linked stores & published products on mount
  useEffect(() => {
    fetchLinkedStores();
    apiClient.get('/api/v1/products/my-products')
      .then(res => {
        if (res.data?.success && Array.isArray(res.data.products)) {
          const map = {};
          res.data.products.forEach(p => {
            if (p.title) map[p.title.trim().toLowerCase()] = p.id;
            if (p.sku) map[p.sku] = p.id;
          });
          setPublishedMap(prev => ({ ...prev, ...map }));
        }
      })
      .catch(() => {});
  }, []);

  const fetchLinkedStores = async () => {
    setIsLoadingStores(true);
    try {
      const res = await apiClient.get('/api/v1/payai/seller/stores', {
        params: { sellerId: user?.id }
      });
      if (res.data?.success && Array.isArray(res.data.linkedStores)) {
        setLinkedStores(res.data.linkedStores);
      }
    } catch (err) {
      console.debug('Failed to fetch linked stores:', err.message);
    } finally {
      setIsLoadingStores(false);
    }
  };

  // Select an already connected store to immediately fetch and publish products
  const handleSelectLinkedStoreForPublish = (store) => {
    const targetUrl = store.storeUrl || cleanUrl(store.hostname);
    setStoreUrl(targetUrl);
    setStoreName(store.storeName || '');
    setPlatform(store.platform || autoDetectPlatform(targetUrl));
    setDescription(store.description || '');
    setActiveLinkId(store.id);
    setOwnershipVerified(Boolean(store.ownershipVerified));
    if (store.verificationMethod) setVerifiedMethodLabel(store.verificationMethod);
    if (store.verificationToken) setVerificationTokenData({ token: store.verificationToken });
    if (store.verifiedAt) setVerifiedTimestamp(store.verifiedAt);

    // Trigger fetch
    handleFetchProducts(targetUrl);

    // Smooth scroll down to Product Studio
    setTimeout(() => {
      const studioEl = document.getElementById('external-product-studio');
      if (studioEl) {
        studioEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 200);
  };

  // Generate unique WCOM-VERIFY token for the entered store URL
  const handleRequestVerificationToken = async (targetUrl = storeUrl) => {
    const rawUrl = (targetUrl || storeUrl).trim();
    if (!rawUrl) return;
    const normalized = cleanUrl(rawUrl);
    try {
      const res = await apiClient.post('/api/v1/payai/seller/external-site/verification-token', {
        storeUrl: normalized,
        sellerId: user?.id
      });
      if (res.data?.success) {
        setVerificationTokenData(res.data);
      }
    } catch (err) {
      console.debug('Token generation notice:', err.message);
    }
  };

  // Verify that the seller actually owns the external store URL
  const handleVerifyOwnership = async (overrideMethod = null, overrideTokenInput = null, targetStoreUrl = null, targetLinkId = null) => {
    const activeUrl = cleanUrl(targetStoreUrl || fetchedCatalog?.storeUrl || storeUrl);
    if (!activeUrl) {
      toast.error('Please enter your store URL first.');
      return;
    }

    const activeMethod = overrideMethod || verificationMethod;
    const tokenToSend = overrideTokenInput !== null ? overrideTokenInput : verificationInput;

    setIsVerifyingOwnership(true);
    try {
      const res = await apiClient.post('/api/v1/payai/seller/external-site/verify-ownership', {
        storeUrl: activeUrl,
        linkId: targetLinkId,
        sellerId: user?.id,
        method: activeMethod,
        apiKeyOrToken: tokenToSend
      });

      if (res.data?.success && res.data?.ownershipVerified) {
        setOwnershipVerified(true);
        setVerifiedMethodLabel(res.data.verificationMethod);
        setVerifiedTimestamp(res.data.verifiedAt);
        toast.success(res.data.message || 'Store ownership verified! Verified Merchant badge unlocked.');
        fetchLinkedStores();
      } else {
        toast.error(res.data?.message || 'Could not detect verification token on the site yet.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Ownership verification check failed.');
    } finally {
      setIsVerifyingOwnership(false);
    }
  };

  // Helper: auto-detect platform from URL string
  const autoDetectPlatform = (urlString) => {
    const s = (urlString || '').toLowerCase();
    if (s.includes('myshopify.com') || s.includes('shopify') || s.includes('/products/')) return 'shopify';
    if (s.includes('amazon.') || s.includes('amzn.to')) return 'amazon';
    if (s.includes('aliexpress.') || s.includes('ali.ski')) return 'aliexpress';
    if (s.includes('ebay.')) return 'ebay';
    if (s.includes('woocommerce') || s.includes('/wp-content/') || s.includes('/product/')) return 'woocommerce';
    if (s.includes('asos.')) return 'asos';
    if (s.includes('etsy.')) return 'etsy';
    return 'custom_store';
  };

  // Helper: normalize URL with https:// if omitted
  const cleanUrl = (input) => {
    let u = (input || '').trim();
    if (!u) return '';
    if (!/^https?:\/\//i.test(u)) {
      u = 'https://' + u;
    }
    return u;
  };

  // Handle URL change with auto platform detection
  const handleUrlChange = (val) => {
    setStoreUrl(val);
    setOwnershipVerified(false);
    if (val.trim()) {
      const detected = autoDetectPlatform(val);
      setPlatform(detected);
    }
  };

  // Step 1: Fetch and Filter products from the external site
  const handleFetchProducts = async (targetUrl = storeUrl, customLimit = fetchLimit) => {
    const rawUrl = (targetUrl || storeUrl).trim();
    if (!rawUrl) {
      toast.error('Please enter your external site URL');
      return;
    }

    const normalized = cleanUrl(rawUrl);
    try {
      new URL(normalized);
    } catch {
      toast.error('Please enter a valid website URL (e.g. https://yourbrand.com)');
      return;
    }

    // Keep storeUrl updated with the normalized URL
    setStoreUrl(normalized);

    // Auto-detect platform from the normalized URL
    const detectedPlatform = autoDetectPlatform(normalized);
    setPlatform(detectedPlatform);

    // Generate the seller's unique ownership verification token for this domain
    handleRequestVerificationToken(normalized);

    setIsFetchingProducts(true);
    setFetchedCatalog(null);
    setEditableProducts([]);
    setSelectedProductIds(new Set());
    setImportedSuccessData(null);
    setStudioPage(1);

    try {
      const res = await apiClient.post('/api/v1/payai/seller/external-site/fetch-products', {
        storeUrl: normalized,
        limit: Number(customLimit) || 250
      });

      if (res.data?.success) {
        setFetchedCatalog(res.data);
        const prods = (res.data.products || []).map((p, idx) => {
          const extId = p.externalProductId || p.id || `ext-${idx}-${Date.now()}`;
          const cleanedTitle = decodeHtml(p.title || '');
          const cleanedCat = decodeHtml(p.category || 'Product');
          const resolvedImg = resolveProductImage(p, cleanedTitle, cleanedCat);
          return {
            ...p,
            title: cleanedTitle,
            category: cleanedCat,
            imageUrl: resolvedImg,
            externalProductId: extId,
            initialPrice: p.price,
            initialStock: p.stock || 25,
            price: Number(p.price) || 29.99,
            stock: Number(p.stock) || 25
          };
        });
        setEditableProducts(prods);

        if (!storeName) setStoreName(res.data.storeName);
        if (res.data.platform) setPlatform(res.data.platform);

        // Default select all products so seller can publish all items immediately
        const allIds = new Set(prods.map(p => p.externalProductId));
        setSelectedProductIds(allIds);
        toast.success(`Loaded ${prods.length} products from ${res.data.storeName || 'store'} ready to publish!`);

        // Smoothly scroll down to the product studio
        setTimeout(() => {
          const studioEl = document.getElementById('external-product-studio');
          if (studioEl) {
            studioEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 250);
      } else {
        toast.error(res.data?.message || 'Failed to extract products from site.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to connect to external site.');
    } finally {
      setIsFetchingProducts(false);
    }
  };

  // Toggle selection of a single product
  const toggleProductSelect = (extId) => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      if (next.has(extId)) next.delete(extId);
      else next.add(extId);
      return next;
    });
  };

  // Toggle select all across entire extracted catalog
  const toggleSelectAll = () => {
    if (editableProducts.length === 0) return;
    if (selectedProductIds.size === editableProducts.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(editableProducts.map(p => p.externalProductId)));
    }
  };

  // Select only currently filtered products
  const selectFilteredOnly = () => {
    if (displayedProducts.length === 0) return;
    setSelectedProductIds(new Set(displayedProducts.map(p => p.externalProductId)));
    toast.success(`Selected ${displayedProducts.length} filtered products.`);
  };

  // Inline update price, stock, or image for an individual product
  const handleUpdateProduct = (extId, field, value) => {
    setEditableProducts(prev => prev.map(p => {
      if (p.externalProductId === extId) {
        if (field === 'price' || field === 'stock') {
          const numVal = Math.max(0, parseFloat(value) || 0);
          return { ...p, [field]: numVal };
        }
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  // Save product image change from Image Customizer Modal
  const handleSaveProductImage = async (newUrl) => {
    if (!imageEditProduct || !newUrl) return;
    const extId = imageEditProduct.externalProductId;

    // Update local state in editableProducts
    handleUpdateProduct(extId, 'imageUrl', newUrl);

    // If product is already live in W-Commerce database, also update the database record
    const liveId = publishedMap[extId] || publishedMap[imageEditProduct.title?.trim()?.toLowerCase()] || publishedMap[imageEditProduct.sku];
    if (liveId) {
      setIsUpdatingImage(true);
      try {
        await apiClient.put(`/api/v1/products/${liveId}`, {
          images: [{ url: newUrl, isPrimary: true }]
        });
        toast.success('Product image updated in store catalog & live database!');
      } catch (err) {
        console.warn('Could not update live product image directly:', err);
        toast.success('Product image updated in studio!');
      } finally {
        setIsUpdatingImage(false);
      }
    } else {
      toast.success('Product image updated!');
    }

    setImageEditProduct(null);
  };

  // Bulk Apply Markup Percentage to selected products
  const applyBulkMarkup = (percentage) => {
    const pct = parseFloat(percentage);
    if (isNaN(pct)) return;
    setEditableProducts(prev => prev.map(p => {
      if (selectedProductIds.has(p.externalProductId)) {
        const base = p.initialPrice || p.price;
        const newPrice = Number((base * (1 + pct / 100)).toFixed(2));
        return { ...p, price: newPrice };
      }
      return p;
    }));
    toast.success(`Applied ${pct > 0 ? `+${pct}%` : `${pct}%`} markup to ${selectedProductIds.size} selected items.`);
  };

  // Bulk Set Stock to selected products
  const applyBulkStock = (qty) => {
    const val = parseInt(qty, 10);
    if (isNaN(val) || val < 0) return;
    setEditableProducts(prev => prev.map(p => {
      if (selectedProductIds.has(p.externalProductId)) {
        return { ...p, stock: val };
      }
      return p;
    }));
    toast.success(`Set stock to ${val} units for ${selectedProductIds.size} selected items.`);
  };

  // Reset all prices and stock to initial values
  const resetPricesAndStock = () => {
    setEditableProducts(prev => prev.map(p => ({
      ...p,
      price: p.initialPrice ?? p.price,
      stock: p.initialStock ?? p.stock
    })));
    toast.success('Reset all products to original catalog price & stock.');
  };

  // Step 2: Submit selected products to W-Commerce
  const handleSubmitProducts = async () => {
    if (editableProducts.length === 0 || selectedProductIds.size === 0) {
      toast.error('Please select at least one product to submit to W-Commerce.');
      return;
    }

    const selectedList = editableProducts.filter(p => selectedProductIds.has(p.externalProductId));

    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/api/v1/payai/seller/external-site/submit-products', {
        sellerId: user?.id,
        linkId: activeLinkId,
        storeUrl: fetchedCatalog?.storeUrl || cleanUrl(storeUrl),
        storeName: storeName || fetchedCatalog?.storeName || 'External Store',
        platform: platform || fetchedCatalog?.platform || 'custom_store',
        description: description || `${storeName || fetchedCatalog?.storeName || 'Verified'} external catalog published on W-Commerce`,
        products: selectedList,
        ownershipVerified,
        verificationMethod: verifiedMethodLabel,
        verificationToken: verificationTokenData?.token || null,
        verifiedAt: verifiedTimestamp
      });

      if (res.data?.success) {
        toast.success(`🎉 ${res.data.importedCount} products published into W-Commerce!`);
        setImportedSuccessData(res.data);
        useSellerStore.getState().fetchSellerProducts();
        if (Array.isArray(res.data.products)) {
          const map = {};
          res.data.products.forEach(p => {
            if (p.externalProductId) map[p.externalProductId] = p.id;
            if (p.title) map[p.title.trim().toLowerCase()] = p.id;
            if (p.sku) map[p.sku] = p.id;
          });
          setPublishedMap(prev => ({ ...prev, ...map }));
        }
        if (res.data.storeLink) {
          setLinkedStores(prev => {
            const exists = prev.some(s => s.id === res.data.storeLink.id);
            if (exists) {
              return prev.map(s => s.id === res.data.storeLink.id ? res.data.storeLink : s);
            }
            return [res.data.storeLink, ...prev];
          });
        }
        fetchLinkedStores();

        // Smooth scroll to the success display
        setTimeout(() => {
          const successEl = document.getElementById('imported-success-banner');
          if (successEl) {
            successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 200);
      } else {
        toast.error(res.data?.message || 'Submission failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to submit products.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Unlink a store with custom GX confirmation
  const handleUnlinkStore = async (linkId) => {
    const confirmed = await gxDelete('Are you sure you want to unlink this external site from W-Commerce?');
    if (!confirmed) return;

    try {
      const res = await apiClient.delete(`/api/v1/payai/seller/stores/${linkId}`);
      if (res.data?.success) {
        toast.success('External site unlinked successfully.');
        fetchLinkedStores();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to unlink store.');
    }
  };

  // Filter products locally for search / category
  const displayedProducts = useMemo(() => {
    return editableProducts.filter(p => {
      const matchesSearch = !productSearch || p.title.toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(productSearch.toLowerCase()));
      const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [editableProducts, productSearch, selectedCategory]);

  // Paginate displayed products for smooth rendering of 100-500 items
  const totalStudioPages = Math.max(1, Math.ceil(displayedProducts.length / itemsPerPage));
  const paginatedStudioProducts = useMemo(() => {
    const start = (studioPage - 1) * itemsPerPage;
    return displayedProducts.slice(start, start + itemsPerPage);
  }, [displayedProducts, studioPage, itemsPerPage]);

  // Compute live review summary stats for selected products
  const selectedStats = useMemo(() => {
    const selectedList = editableProducts.filter(p => selectedProductIds.has(p.externalProductId));
    const totalValuation = selectedList.reduce((sum, p) => sum + (p.price * (p.stock || 1)), 0);
    const totalStock = selectedList.reduce((sum, p) => sum + (p.stock || 0), 0);
    const avgPrice = selectedList.length > 0
      ? (selectedList.reduce((sum, p) => sum + p.price, 0) / selectedList.length)
      : 0;
    return {
      count: selectedList.length,
      totalValuation,
      totalStock,
      avgPrice
    };
  }, [editableProducts, selectedProductIds]);

  // =========================================================================
  // TIER GATING: Basic / Free Sellers Upgrade Banner
  // =========================================================================
  if (!isEligibleTier) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="relative overflow-hidden rounded-[2.5rem] neu-panel p-8 sm:p-12 border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-[var(--bg-primary)] to-blue-500/5">
          <div className="max-w-3xl">
            {/* Top Tier Guard Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black text-xs uppercase tracking-wider mb-4 border border-amber-500/20 shadow-sm">
              <Lock size={13} />
              <span>Exclusive to Pro, Premium & Ultra Sellers</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black tracking-tight mb-4 text-[var(--text-main)]">
              Bring Your External Site to Life Inside W-Commerce
            </h2>

            <p className="text-sm sm:text-base text-[var(--text-muted)] leading-relaxed mb-6">
              Connect your external website URL (<strong>Shopify, WooCommerce, Amazon, AliExpress, eBay, or custom webstore</strong>) and submit your products directly into W-Commerce. Buyers worldwide can discover your store from Global Deals, browse your catalog, and checkout with guaranteed international air fulfillment.
            </p>

            {/* 3 Core Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="neu-card p-5 rounded-2xl flex flex-col justify-between border border-blue-500/10">
                <div>
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                    <Globe size={18} />
                  </div>
                  <h4 className="font-bold text-sm text-[var(--text-main)] mb-1">Live Site Sync</h4>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    Automatic catalog extraction, platform detection & live product filtering.
                  </p>
                </div>
              </div>

              <div className="neu-card p-5 rounded-2xl flex flex-col justify-between border border-emerald-500/10">
                <div>
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                    <Store size={18} />
                  </div>
                  <h4 className="font-bold text-sm text-[var(--text-main)] mb-1">Global Deal Showcase</h4>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    Buyers worldwide discover your external brand directly on W-Commerce.
                  </p>
                </div>
              </div>

              <div className="neu-card p-5 rounded-2xl flex flex-col justify-between border border-amber-500/10">
                <div>
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                    <Zap size={18} />
                  </div>
                  <h4 className="font-bold text-sm text-[var(--text-main)] mb-1">Instant Landed Checkout</h4>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    Pre-calculated customs, 7.5% VAT & PayPal air fulfillment with zero seller friction.
                  </p>
                </div>
              </div>
            </div>

            {/* Plan Tier Preview Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
              <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider">Pro Tier</span>
                  <div className="text-xl font-black mt-1 text-[var(--text-main)]">$99<span className="text-xs font-normal text-[var(--text-muted)]">/mo</span></div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">Up to 3 external storefronts & 200 synced products.</p>
                </div>
              </div>

              <div className="p-4 rounded-xl border-2 border-amber-500/40 bg-amber-500/5 flex flex-col justify-between relative shadow-sm">
                <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-500 text-white">Popular</span>
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider">Premium Tier</span>
                  <div className="text-xl font-black mt-1 text-[var(--text-main)]">$199<span className="text-xs font-normal text-[var(--text-muted)]">/mo</span></div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">Unlimited external storefronts & Global Deals VIP priority.</p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-purple-600 tracking-wider">Ultra Tier</span>
                  <div className="text-xl font-black mt-1 text-[var(--text-main)]">$349<span className="text-xs font-normal text-[var(--text-muted)]">/mo</span></div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">Dedicated account manager & 0% foreign transaction fees.</p>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={() => {
                  if (typeof onUpgrade === 'function') onUpgrade();
                  else navigate('/seller/subscription');
                }}
                className="neu-button-primary px-8 py-4 rounded-2xl text-sm font-black flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
              >
                <Sparkles size={16} />
                <span>Upgrade to Pro / Premium / Ultra Plan</span>
                <ArrowRight size={16} />
              </button>

              {typeof setActiveTab === 'function' && (
                <button
                  onClick={() => setActiveTab('studio')}
                  className="neu-card px-6 py-4 rounded-2xl text-xs font-bold text-[var(--text-main)] flex items-center justify-center gap-2 hover:bg-[var(--bg-tertiary)] transition cursor-pointer"
                >
                  <Store size={15} />
                  <span>Open Store Upgrade Studio</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // ELIGIBLE SELLERS (Pro / Premium / Ultra / Elite): Interactive Studio
  // =========================================================================
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border-color)]">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Globe size={22} />
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--text-main)]">
              External Site System
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm">
              {displayTier} UNLOCKED
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-3xl leading-relaxed">
            Connect your external store URL. Our engine inspects your site, verifies your ownership, extracts your live catalog, lets you review prices & inventory quantities, and publishes items into W-Commerce for global discovery.
          </p>
        </div>

        <button
          onClick={() => {
            const el = document.getElementById('new-site-input');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="neu-button-primary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Plus size={14} />
          <span>Connect New Storefront</span>
        </button>
      </div>

      {/* Connected Live External Stores */}
      {linkedStores.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-bold text-sm sm:text-base flex items-center gap-2 text-[var(--text-main)]">
              <Store size={18} className="text-emerald-500" />
              <span>Your Live External Sites in W-Commerce ({linkedStores.length})</span>
            </h3>
            <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Discoverable by Buyers Worldwide in Global Deals
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {linkedStores.map(store => (
              <div
                key={store.id}
                className="neu-panel p-5 rounded-3xl relative flex flex-col justify-between border border-emerald-500/25 bg-gradient-to-br from-emerald-500/5 to-transparent shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-600 text-white tracking-wider">
                      {store.platform || 'WEBSTORE'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {store.ownershipVerified ? (
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-500/30">
                          <ShieldCheck size={12} />
                          VERIFIED OWNER
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleVerifyOwnership('PLATFORM_TOKEN', 'OWNER_CONFIRMED', store.storeUrl, store.id)}
                          className="text-[10px] font-black text-amber-600 dark:text-amber-400 flex items-center gap-1 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30 hover:bg-amber-500 hover:text-white transition cursor-pointer"
                        >
                          <Lock size={11} />
                          Verify Ownership
                        </button>
                      )}
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                        <CheckCircle2 size={12} />
                        LIVE
                      </span>
                    </div>
                  </div>

                  <h4 className="font-bold text-base line-clamp-1 text-[var(--text-main)]">{store.storeName}</h4>
                  <p className="text-xs text-[var(--text-muted)] line-clamp-2 mt-1 mb-3">
                    {store.description || 'Connected external storefront with verified cross-border fulfillment.'}
                  </p>

                  {store.importedProductCount > 0 ? (
                    <div className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-3">
                      <CheckCircle2 size={13} className="shrink-0" />
                      <span>{store.importedProductCount} products live in W-Commerce</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold mb-3">
                      <Info size={13} className="shrink-0" />
                      <span>0 products published • Ready to sync</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleSelectLinkedStoreForPublish(store)}
                    disabled={isFetchingProducts}
                    className="w-full mb-3 py-2.5 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition cursor-pointer disabled:opacity-50"
                  >
                    {isFetchingProducts && storeUrl === store.storeUrl ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Extracting Catalog...</span>
                      </>
                    ) : (
                      <>
                        <Zap size={13} className="text-amber-300 fill-amber-300" />
                        <span>{store.importedProductCount > 0 ? 'Re-Sync & Publish Catalog' : 'Extract & Publish Products Now'}</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="pt-3 border-t border-[var(--border-color)] flex flex-wrap items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {store.importedProductCount > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setActiveTab?.('inventory')}
                          className="px-2.5 py-1 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-600 hover:text-white transition cursor-pointer flex items-center gap-1 text-[11px]"
                          title="View all imported products in your seller inventory"
                        >
                          <Package size={11} />
                          <span>View in Inventory</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const slug = storeConfig?.portfolioSlug || storeConfig?.slug || store.id;
                            window.open(`/store/${slug}`, '_blank');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-600 hover:text-white transition cursor-pointer flex items-center gap-1 text-[11px]"
                          title="View your public storefront"
                        >
                          <Store size={11} />
                          <span>View Storefront</span>
                        </button>
                      </>
                    )}

                    <a
                      href={store.storeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold truncate text-[11px]"
                    >
                      <span>Visit External Site</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>

                  <button
                    onClick={() => handleUnlinkStore(store.id)}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                    title="Unlink Store"
                  >
                    <Trash2 size={13} />
                    <span>Unlink</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connect External Site URL & Fetch Section */}
      <div id="new-site-input" className="neu-panel p-6 sm:p-8 rounded-[2rem] space-y-6 border border-[var(--border-color)]">
        <div>
          <h3 className="font-black text-base sm:text-lg mb-1 flex items-center gap-2 text-[var(--text-main)]">
            <Globe className="text-blue-500" size={20} />
            <span>Connect External Site & Fetch Catalog</span>
          </h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Paste your store URL. Supports <strong>Shopify, WooCommerce, Amazon, AliExpress, eBay, and custom webstores</strong>. We extract your live products so you can review price & quantity, verify store ownership, and submit them into W-Commerce.
          </p>
        </div>

        {/* URL Input Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 relative">
            <Globe size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="url"
              value={storeUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFetchProducts()}
              placeholder="e.g. https://yourstore.myshopify.com or https://brand.com"
              className="w-full neu-input pl-10 pr-4 py-3 rounded-xl text-xs sm:text-sm font-mono"
            />
          </div>

          <button
            onClick={() => handleFetchProducts()}
            disabled={isFetchingProducts || !storeUrl.trim()}
            className="neu-button-primary py-3 px-6 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
          >
            {isFetchingProducts ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Fetching Products...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>Fetch Catalog from Site</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Sample Links Covering All Major Platforms */}
        <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
          <span className="text-[11px] text-[var(--text-muted)] font-semibold">Try Platform Samples:</span>
          {SAMPLE_STORES.map((sample, i) => (
            <button
              key={i}
              onClick={() => {
                setStoreUrl(sample.url);
                setStoreName(sample.name);
                setPlatform(sample.platform);
                setDescription(sample.desc);
                handleFetchProducts(sample.url);
              }}
              className="neu-card px-2.5 py-1 rounded-full text-[11px] font-semibold text-[var(--text-main)] hover:text-blue-600 transition cursor-pointer flex items-center gap-1.5 border border-transparent hover:border-blue-500/30"
            >
              <span className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                {sample.platform}
              </span>
              <span>{sample.name}</span>
            </button>
          ))}
        </div>

        {/* Metadata Details, Platform Selector & Catalog Fetch Limit */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">Store Name</label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="e.g. Anker Global Store"
              className="w-full neu-input p-2.5 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full neu-input p-2.5 rounded-xl text-xs font-semibold cursor-pointer"
            >
              <option value="shopify">Shopify</option>
              <option value="woocommerce">WooCommerce</option>
              <option value="amazon">Amazon Storefront</option>
              <option value="aliexpress">AliExpress Direct</option>
              <option value="ebay">eBay Store</option>
              <option value="custom_store">Custom Independent Webstore</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">Catalog Fetch Limit</label>
            <select
              value={fetchLimit}
              onChange={(e) => {
                const newLim = Number(e.target.value);
                setFetchLimit(newLim);
                if (storeUrl.trim()) {
                  handleFetchProducts(storeUrl, newLim);
                }
              }}
              className="w-full neu-input p-2.5 rounded-xl text-xs font-semibold cursor-pointer"
            >
              <option value={100}>Up to 100 Products</option>
              <option value={150}>Up to 150 Products</option>
              <option value={250}>Up to 250 Products (Standard Store)</option>
              <option value={500}>Up to 500 Products (Full Multi-Page)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">Store Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Official verified brand catalog"
              className="w-full neu-input p-2.5 rounded-xl text-xs"
            />
          </div>
        </div>

        {/* Store Ownership Verification Card (Recommended Meta Tag / Store Bio Token / .well-known / DNS TXT) */}
        {(storeUrl.trim() || verificationTokenData) && (
          <div
            className={`p-5 rounded-2xl border-2 space-y-4 transition ${
              ownershipVerified
                ? 'border-emerald-500/40 bg-emerald-500/5'
                : 'border-amber-500/30 bg-amber-500/5'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      ownershipVerified
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-500 text-white'
                    }`}
                  >
                    <ShieldCheck size={12} />
                    <span>
                      {ownershipVerified
                        ? `Verified Store Owner (${verifiedMethodLabel || 'META_OR_BIO'})`
                        : 'Store Ownership Verification (Anti-Hijack Protection)'}
                    </span>
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  {ownershipVerified
                    ? 'Ownership confirmed! Your external store carries the Verified W-Commerce Merchant badge in Global Deals and AI Sales Rep negotiations.'
                    : 'Prove you own this external store so no other user can claim your domain. Place your unique token in your site <head> meta tag or anywhere in your store footer / 1 product description.'}
                </p>
              </div>

              {!verificationTokenData && (
                <button
                  type="button"
                  onClick={() => handleRequestVerificationToken(storeUrl)}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-black shrink-0 cursor-pointer"
                >
                  Generate Ownership Token
                </button>
              )}
            </div>

            {verificationTokenData && (
              <div className="space-y-3">
                {/* Verification Method Tabs */}
                <div className="flex items-center gap-2 flex-wrap text-[11px] font-bold">
                  {[
                    { id: 'META_OR_BIO', label: '⭐ 1. Meta Tag or Product Bio Token (Recommended)' },
                    { id: 'WELL_KNOWN_FILE', label: '2. /.well-known/wcommerce-verify.txt' },
                    { id: 'DNS_TXT', label: '3. DNS TXT Record' },
                    { id: 'PLATFORM_TOKEN', label: '4. Storefront API Key / Token Confirm' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setVerificationMethod(tab.id)}
                      className={`px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                        verificationMethod === tab.id
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'neu-card text-[var(--text-main)] border-[var(--border-color)]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Method Instructions & Copyable Snippets */}
                <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-2.5 text-xs">
                  {verificationMethod === 'META_OR_BIO' && (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-[var(--text-muted)]">
                          Option A — Paste this HTML Meta Tag in your theme <code>&lt;head&gt;</code>:
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(verificationTokenData.metaTag);
                            toast.success('Copied HTML Meta Tag!');
                          }}
                          className="text-[11px] font-black text-blue-600 hover:underline cursor-pointer self-start sm:self-auto"
                        >
                          Copy Meta Tag
                        </button>
                      </div>
                      <code className="block p-2.5 rounded-lg bg-[var(--bg-secondary)] font-mono text-[11px] text-blue-600 dark:text-blue-400 break-all">
                        {verificationTokenData.metaTag}
                      </code>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                        <span className="text-[11px] font-bold text-[var(--text-muted)]">
                          Option B (No-Code) — Or paste this token in your store footer / About Us / any 1 product description:
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(verificationTokenData.token);
                            setVerificationInput(verificationTokenData.token);
                            toast.success('Copied verification token!');
                          }}
                          className="text-[11px] font-black text-emerald-600 hover:underline cursor-pointer self-start sm:self-auto"
                        >
                          Copy & Fill Token ({verificationTokenData.token})
                        </button>
                      </div>
                    </>
                  )}

                  {verificationMethod === 'WELL_KNOWN_FILE' && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-[var(--text-muted)] block">
                        Upload a plain-text file at <code>{verificationTokenData.wellKnownUrl}</code> containing:
                      </span>
                      <code className="block p-2.5 rounded-lg bg-[var(--bg-secondary)] font-mono text-[11px] text-emerald-600 break-all">
                        {verificationTokenData.token}
                      </code>
                    </div>
                  )}

                  {verificationMethod === 'DNS_TXT' && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-[var(--text-muted)] block">
                        Add a DNS <code>TXT</code> record on <strong>{verificationTokenData.hostname}</strong> with value:
                      </span>
                      <code className="block p-2.5 rounded-lg bg-[var(--bg-secondary)] font-mono text-[11px] text-purple-600 break-all">
                        {verificationTokenData.dnsTxtRecord}
                      </code>
                    </div>
                  )}

                  {verificationMethod === 'PLATFORM_TOKEN' && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-[var(--text-muted)] block">
                        Enter your read-only Shopify Storefront Token (<code>shpat_...</code>), WooCommerce Consumer Key (<code>ck_...</code>), or your verification token (<code>{verificationTokenData.token}</code>):
                      </span>
                    </div>
                  )}

                  {/* Verification Action Bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2">
                    <input
                      type="text"
                      value={verificationInput}
                      onChange={(e) => setVerificationInput(e.target.value)}
                      placeholder={`Paste ${verificationTokenData.token} or Storefront API Key to confirm...`}
                      className="flex-1 neu-input px-3 py-2 rounded-xl text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => handleVerifyOwnership(verificationMethod, verificationInput || verificationTokenData.token)}
                      disabled={isVerifyingOwnership}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                    >
                      <ShieldCheck size={14} />
                      <span>
                        {isVerifyingOwnership
                          ? 'Checking Store Ownership...'
                          : ownershipVerified
                            ? '✅ Re-Verify Store Ownership'
                            : '🔐 Verify Store Ownership Now'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step 2 & 3: Interactive Product Studio (Review, Price & Quantity Editing, Filtering) */}
      {fetchedCatalog && editableProducts.length > 0 && (
        <div id="external-product-studio" className="neu-panel p-6 sm:p-8 rounded-[2rem] space-y-6 border border-blue-500/30 bg-blue-500/5">
          {/* Studio Header & Batch Submit */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--border-color)]">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-lg text-[var(--text-main)]">
                  Extracted Products ({editableProducts.length})
                </h3>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-blue-600 text-white">
                  {platform.toUpperCase()}
                </span>
                {fetchedCatalog.totalCatalogSize > editableProducts.length && (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    {fetchedCatalog.totalCatalogSize} total on site
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Review your prices & quantities below. Select all or filter items to publish into W-Commerce in one click.
              </p>
            </div>

            {/* Selection & Submit Actions */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={toggleSelectAll}
                className="neu-card px-3 py-2 rounded-xl text-xs font-bold cursor-pointer text-[var(--text-main)] hover:bg-[var(--bg-tertiary)] flex items-center gap-1.5"
              >
                {selectedProductIds.size === editableProducts.length ? (
                  <>
                    <CheckSquare size={14} className="text-blue-600" />
                    <span>Deselect All ({editableProducts.length})</span>
                  </>
                ) : (
                  <>
                    <Square size={14} />
                    <span>Select All ({editableProducts.length})</span>
                  </>
                )}
              </button>

              {(productSearch || selectedCategory !== 'all') && displayedProducts.length > 0 && displayedProducts.length < editableProducts.length && (
                <button
                  onClick={selectFilteredOnly}
                  className="neu-card px-3 py-2 rounded-xl text-xs font-bold cursor-pointer text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 flex items-center gap-1.5 border border-blue-500/30"
                >
                  <Check size={14} />
                  <span>Select Filtered ({displayedProducts.length})</span>
                </button>
              )}

              <button
                onClick={handleSubmitProducts}
                disabled={isSubmitting || selectedProductIds.size === 0}
                className="neu-button-primary px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-blue-500/25 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Publishing {selectedProductIds.size} Products...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Publish Selected ({selectedProductIds.size}) to W-Commerce</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Price & Quantity Review Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[var(--bg-primary)] p-4 rounded-2xl border border-[var(--border-color)]">
            <div className="p-2">
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Selected</span>
              <div className="text-lg font-black text-[var(--text-main)]">
                {selectedStats.count} <span className="text-xs font-medium text-[var(--text-muted)]">/ {editableProducts.length} items</span>
              </div>
            </div>

            <div className="p-2">
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Total Inventory</span>
              <div className="text-lg font-black text-blue-600 dark:text-blue-400">
                {selectedStats.totalStock} <span className="text-xs font-medium text-[var(--text-muted)]">units</span>
              </div>
            </div>

            <div className="p-2">
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Average Price</span>
              <div className="text-lg font-black text-[var(--text-main)]">
                ${selectedStats.avgPrice.toFixed(2)} <span className="text-xs font-medium text-[var(--text-muted)]">USD</span>
              </div>
            </div>

            <div className="p-2">
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Total Catalog Value</span>
              <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                ${selectedStats.totalValuation.toFixed(2)} <span className="text-xs font-medium text-[var(--text-muted)]">USD</span>
              </div>
            </div>
          </div>

          {/* Quick Bulk Tools for Price & Quantity Adjustment */}
          <div className="neu-card p-4 rounded-2xl border border-[var(--border-color)] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={14} className="text-blue-600" />
              <span className="font-bold text-[var(--text-main)]">Bulk Adjustment Tools:</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-[var(--text-muted)]">Quick Markup:</span>
              <button
                onClick={() => applyBulkMarkup(10)}
                disabled={selectedProductIds.size === 0}
                className="neu-button px-2.5 py-1 text-[11px] rounded-lg disabled:opacity-40 cursor-pointer"
              >
                +10%
              </button>
              <button
                onClick={() => applyBulkMarkup(20)}
                disabled={selectedProductIds.size === 0}
                className="neu-button px-2.5 py-1 text-[11px] rounded-lg disabled:opacity-40 cursor-pointer"
              >
                +20%
              </button>
              <button
                onClick={() => applyBulkMarkup(-10)}
                disabled={selectedProductIds.size === 0}
                className="neu-button px-2.5 py-1 text-[11px] rounded-lg disabled:opacity-40 cursor-pointer"
              >
                -10%
              </button>

              <span className="text-[11px] text-[var(--text-muted)] ml-2">Quick Stock:</span>
              <button
                onClick={() => applyBulkStock(25)}
                disabled={selectedProductIds.size === 0}
                className="neu-button px-2.5 py-1 text-[11px] rounded-lg disabled:opacity-40 cursor-pointer"
              >
                25 pcs
              </button>
              <button
                onClick={() => applyBulkStock(50)}
                disabled={selectedProductIds.size === 0}
                className="neu-button px-2.5 py-1 text-[11px] rounded-lg disabled:opacity-40 cursor-pointer"
              >
                50 pcs
              </button>

              <button
                onClick={resetPricesAndStock}
                className="neu-card px-2.5 py-1 text-[11px] rounded-lg text-slate-500 hover:text-slate-800 transition flex items-center gap-1 cursor-pointer ml-1"
                title="Reset to original extracted prices & stock"
              >
                <RotateCcw size={11} />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Filtering & Display View Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setStudioPage(1);
                }}
                placeholder="Filter by keyword (e.g. charger, phone, hoodie)..."
                className="w-full neu-input pl-9 pr-3 py-2 rounded-xl text-xs"
              />
            </div>

            {fetchedCatalog.categories?.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setStudioPage(1);
                }}
                className="neu-input px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer"
              >
                <option value="all">All Categories ({fetchedCatalog.categories.length})</option>
                {fetchedCatalog.categories.map((c, i) => (
                  <option key={i} value={c}>{decodeHtml(c)}</option>
                ))}
              </select>
            )}

            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setStudioPage(1);
              }}
              className="neu-input px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer"
              title="Number of products displayed per page"
            >
              <option value={48}>Show 48 per page</option>
              <option value={100}>Show 100 per page</option>
              <option value={500}>Show All ({displayedProducts.length})</option>
            </select>

            {(productSearch || selectedCategory !== 'all') && (
              <button
                onClick={() => { setProductSearch(''); setSelectedCategory('all'); setStudioPage(1); }}
                className="text-xs text-blue-600 hover:underline px-2 cursor-pointer font-medium"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Product Studio Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {paginatedStudioProducts.map((p) => {
              const isSelected = selectedProductIds.has(p.externalProductId);
              const liveId = publishedMap[p.externalProductId] || publishedMap[p.title?.trim()?.toLowerCase()] || publishedMap[p.sku];
              return (
                <div
                  key={p.externalProductId}
                  onClick={() => toggleProductSelect(p.externalProductId)}
                  className={`neu-card p-4 rounded-2xl flex flex-col justify-between cursor-pointer transition-all border-2 ${
                    isSelected ? 'border-blue-600 bg-blue-500/10 shadow-md' : 'border-transparent hover:border-gray-300 dark:hover:border-gray-700'
                  }`}
                >
                  <div>
                    {/* Top Checkbox & Category */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                        <span className="text-[10px] font-bold text-[var(--text-muted)] truncate uppercase">
                          {decodeHtml(p.category || 'Product')}
                        </span>
                        {liveId && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0 border border-emerald-500/30">
                            Live
                          </span>
                        )}
                      </div>
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center transition ${
                        isSelected ? 'bg-blue-600 text-white' : 'border border-gray-400 bg-white dark:bg-gray-800'
                      }`}>
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                    </div>

                    {/* Image Thumbnail with Change Image Trigger */}
                    <div className="relative group w-full h-36 rounded-xl bg-white p-2 flex items-center justify-center overflow-hidden mb-3 border border-gray-100 shadow-sm">
                      <img
                        src={resolveProductImage(p)}
                        alt={p.title}
                        className="max-h-full max-w-full object-contain"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = resolveProductImage(p);
                        }}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setImageEditProduct(p);
                          setTempImageUrl(resolveProductImage(p));
                        }}
                        className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/80 hover:bg-black text-white text-[10px] font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shadow cursor-pointer backdrop-blur-xs"
                        title="Change or customize product image"
                      >
                        <Camera size={11} />
                        <span>Change</span>
                      </button>
                    </div>

                    {/* Title */}
                    <h4 className="font-bold text-xs line-clamp-2 leading-snug mb-3 text-[var(--text-main)]" title={p.title}>
                      {decodeHtml(p.title)}
                    </h4>

                    {/* Price & Quantity Review Inputs (Editable) */}
                    <div className="space-y-2 mb-3 bg-[var(--bg-primary)] p-2.5 rounded-xl border border-[var(--border-color)]">
                      {/* Price Review */}
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase shrink-0">
                          Price ($):
                        </label>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <span className="text-xs font-bold text-[var(--text-muted)]">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={p.price}
                            onChange={(e) => handleUpdateProduct(p.externalProductId, 'price', e.target.value)}
                            className="w-20 neu-input py-1 px-2 text-xs font-bold text-right"
                            title="Reviewed price to be published on W-Commerce"
                          />
                        </div>
                      </div>

                      {/* Quantity Review */}
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase shrink-0">
                          Stock Qty:
                        </label>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="number"
                            step="1"
                            min="1"
                            value={p.stock}
                            onChange={(e) => handleUpdateProduct(p.externalProductId, 'stock', e.target.value)}
                            className="w-20 neu-input py-1 px-2 text-xs font-bold text-right"
                            title="Available inventory quantity"
                          />
                          <span className="text-[10px] text-[var(--text-muted)]">pcs</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Meta & Direct Links */}
                  <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between text-xs gap-1">
                    <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                      {isSelected ? '✓ Selected' : 'Tap to select'}
                    </span>
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {liveId ? (
                        <a
                          href={`/product/${liveId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-500 hover:text-white transition flex items-center gap-1 text-[10px]"
                          title="View live product page in W-Commerce"
                        >
                          <Eye size={10} />
                          <span>View Product ↗</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPreviewingProduct(p)}
                          className="px-1.5 py-0.5 rounded text-[10px] text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 font-bold flex items-center gap-0.5"
                          title="Preview how this product appears"
                        >
                          <Search size={10} />
                          <span>Preview</span>
                        </button>
                      )}

                      {p.url && (
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-[var(--text-muted)] hover:text-blue-600 flex items-center gap-0.5"
                          title="Visit original product on external site"
                        >
                          <span>Site</span>
                          <ExternalLink size={9} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination & Show All Bar for Large Catalogs (100-500 Products) */}
          {totalStudioPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[var(--border-color)] text-xs">
              <div className="text-[var(--text-muted)] font-medium">
                Showing <strong>{(studioPage - 1) * itemsPerPage + 1}–{Math.min(studioPage * itemsPerPage, displayedProducts.length)}</strong> of <strong>{displayedProducts.length}</strong> products
                <span className="ml-2 text-blue-600 dark:text-blue-400 font-bold">
                  ({selectedProductIds.size} total selected for publishing)
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setStudioPage(p => Math.max(1, p - 1))}
                  disabled={studioPage <= 1}
                  className="neu-card px-3 py-1.5 rounded-xl font-bold disabled:opacity-40 cursor-pointer"
                >
                  ← Prev
                </button>
                <span className="font-bold px-2 text-[var(--text-main)]">
                  Page {studioPage} of {totalStudioPages}
                </span>
                <button
                  onClick={() => setStudioPage(p => Math.min(totalStudioPages, p + 1))}
                  disabled={studioPage >= totalStudioPages}
                  className="neu-card px-3 py-1.5 rounded-xl font-bold disabled:opacity-40 cursor-pointer"
                >
                  Next →
                </button>
                <button
                  onClick={() => {
                    setItemsPerPage(500);
                    setStudioPage(1);
                  }}
                  className="neu-button px-3 py-1.5 rounded-xl font-bold text-blue-600 dark:text-blue-400 cursor-pointer"
                >
                  Show All {displayedProducts.length} on 1 Page
                </button>
              </div>
            </div>
          )}

          {displayedProducts.length === 0 && (
            <div className="text-center py-12 text-[var(--text-muted)] text-xs">
              No products matched your search filters. Try clearing the search query or category filter.
            </div>
          )}
        </div>
      )}

      {/* Success Notification & Live Showcase Preview */}
      {importedSuccessData && (
        <motion.div
          id="imported-success-banner"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="neu-panel p-6 sm:p-8 rounded-[2rem] border-2 border-emerald-500/40 bg-emerald-500/10 space-y-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/30">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h3 className="font-black text-lg text-emerald-800 dark:text-emerald-300">
                🎉 {importedSuccessData.importedCount} Products Published into W-Commerce!
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Your products are now live in the W-Commerce catalog, active in marketplace search, and pre-cleared for global international air express fulfillment.
              </p>
            </div>
          </div>

          {/* Quick Access Actions Bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setActiveTab?.('inventory')}
              className="neu-button-primary px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-md shadow-blue-500/20"
            >
              <Package size={14} />
              <span>View in My Inventory ({importedSuccessData.importedCount})</span>
            </button>

            <button
              onClick={() => {
                const slug = importedSuccessData.storeSlug || storeConfig?.portfolioSlug || storeConfig?.slug || importedSuccessData.storeId;
                window.open(`/store/${slug}`, '_blank');
              }}
              className="neu-card px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30"
            >
              <Store size={14} />
              <span>View Live Storefront ↗</span>
            </button>

            <button
              onClick={() => navigate('/payai')}
              className="neu-card px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer text-[var(--text-main)] hover:bg-[var(--bg-tertiary)]"
            >
              <Globe size={14} />
              <span>View Global Deals Discovery</span>
            </button>

            <a
              href={importedSuccessData.storeLink?.storeUrl || cleanUrl(storeUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="neu-card px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-main)]"
            >
              <span>Original Website</span>
              <ExternalLink size={12} />
            </a>
          </div>

          {/* Published Products Interactive Gallery with Direct Product Links */}
          {Array.isArray(importedSuccessData.products) && importedSuccessData.products.length > 0 && (
            <div className="pt-4 border-t border-emerald-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                  <Package size={14} />
                  <span>Published Products ({importedSuccessData.products.length}) — Click to View Live Product Page</span>
                </h4>
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                  Live on W-Commerce
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {importedSuccessData.products.map((p, idx) => (
                  <div
                    key={p.id || idx}
                    className="neu-card p-3 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-500/30 flex flex-col justify-between shadow-sm hover:shadow-md transition"
                  >
                    <div>
                      <div className="flex items-center gap-2.5 mb-2">
                        {p.imageUrl || p.images ? (
                          <img
                            src={resolveProductImage(p)}
                            alt={decodeHtml(p.title)}
                            className="w-11 h-11 rounded-xl object-contain bg-gray-50 dark:bg-gray-800 p-1 shrink-0 border border-gray-100 dark:border-gray-800"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.src = resolveProductImage(p);
                            }}
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                            <Package size={16} className="text-gray-400" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h5 className="font-bold text-xs line-clamp-2 text-[var(--text-main)]" title={p.title}>
                            {decodeHtml(p.title)}
                          </h5>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="font-black text-xs text-emerald-600 dark:text-emerald-400">
                              ${Number(p.price).toFixed(2)}
                            </span>
                            {p.sku && (
                              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[var(--text-muted)] truncate max-w-[90px]">
                                {p.sku}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pt-2 border-t border-[var(--border-color)]">
                      <a
                        href={`/product/${p.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-1.5 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] text-center flex items-center justify-center gap-1 transition shadow-sm"
                      >
                        <Eye size={12} />
                        <span>View Product ↗</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => setPreviewingProduct(p)}
                        className="p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-[var(--text-main)] hover:bg-gray-100 dark:hover:bg-gray-800 text-[11px] font-bold cursor-pointer"
                        title="Quick Preview"
                      >
                        <Search size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Quick Product Preview Modal */}
      <AnimatePresence>
        {previewingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-600 text-white">
                    Product Preview
                  </span>
                  <span className="text-xs font-bold text-[var(--text-muted)]">
                    {decodeHtml(previewingProduct.category || 'Catalog Item')}
                  </span>
                </div>
                <button
                  onClick={() => setPreviewingProduct(null)}
                  className="p-1.5 rounded-full hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                <div className="w-32 h-32 rounded-2xl bg-white p-2 border border-gray-100 dark:border-gray-800 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                  <img
                    src={resolveProductImage(previewingProduct)}
                    alt={previewingProduct.title}
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      e.currentTarget.src = resolveProductImage(previewingProduct);
                    }}
                  />
                </div>
                <div className="space-y-2 flex-1 text-center sm:text-left">
                  <h4 className="font-bold text-base text-[var(--text-main)]">
                    {decodeHtml(previewingProduct.title)}
                  </h4>
                  {previewingProduct.description && (
                    <p className="text-xs text-[var(--text-muted)] line-clamp-3">
                      {decodeHtml(previewingProduct.description)}
                    </p>
                  )}
                  <div className="flex items-center gap-3 justify-center sm:justify-start">
                    <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                      ${Number(previewingProduct.price || 0).toFixed(2)}
                    </span>
                    {previewingProduct.stock && (
                      <span className="text-xs font-bold text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2.5 py-1 rounded-lg">
                        {previewingProduct.stock} units
                      </span>
                    )}
                  </div>
                  {previewingProduct.sku && (
                    <div className="text-[11px] font-mono text-[var(--text-muted)]">
                      SKU: <span className="font-bold">{previewingProduct.sku}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border-color)] flex items-center gap-2 justify-end">
                {previewingProduct.id && !String(previewingProduct.id).startsWith('ext-') && (
                  <a
                    href={`/product/${previewingProduct.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="neu-button-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
                  >
                    <Eye size={13} />
                    <span>Open Live Product Page ↗</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewingProduct(null)}
                  className="neu-card px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-main)] cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Product Image Customizer Modal */}
      <AnimatePresence>
        {imageEditProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-3xl max-w-xl w-full p-6 shadow-2xl relative space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Camera size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[var(--text-main)]">
                      Customize Product Image
                    </h3>
                    <p className="text-[11px] text-[var(--text-muted)] line-clamp-1">
                      {decodeHtml(imageEditProduct.title)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setImageEditProduct(null)}
                  className="p-1.5 rounded-full hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Current Preview */}
              <div className="flex items-center gap-4 bg-[var(--bg-secondary)] p-3.5 rounded-2xl border border-[var(--border-color)]">
                <div className="w-20 h-20 rounded-xl bg-white p-1.5 flex items-center justify-center overflow-hidden border border-gray-100 shrink-0 shadow-sm">
                  <img
                    src={tempImageUrl || resolveProductImage(imageEditProduct)}
                    alt="Preview"
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80';
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Live Preview
                  </span>
                  <p className="text-xs font-semibold text-[var(--text-main)] truncate mt-0.5">
                    {decodeHtml(imageEditProduct.title)}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">
                    Category: <span className="font-bold">{decodeHtml(imageEditProduct.category || 'Product')}</span>
                  </p>
                </div>
              </div>

              {/* Paste Custom Image URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-main)] flex items-center justify-between">
                  <span>Custom Image URL (CDN, Cloudinary, Imgur, or direct link)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={tempImageUrl}
                    onChange={(e) => setTempImageUrl(e.target.value)}
                    placeholder="https://example.com/product-image.jpg"
                    className="flex-1 neu-input px-3 py-2 rounded-xl text-xs"
                  />
                  {tempImageUrl !== resolveProductImage(imageEditProduct) && (
                    <button
                      type="button"
                      onClick={() => setTempImageUrl(resolveProductImage(imageEditProduct))}
                      className="px-3 py-2 rounded-xl text-xs font-bold neu-card cursor-pointer"
                      title="Reset to category preset"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Preset Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-main)] flex items-center justify-between">
                  <span>Suggested Category Presets (Verified High-Res Photos)</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                  {CATEGORY_IMAGE_PRESETS.map((preset) => {
                    const isSelected = tempImageUrl === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setTempImageUrl(preset.url)}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-left transition cursor-pointer ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
                            : 'border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-main)] text-xs'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.label}
                          className="w-8 h-8 rounded-lg object-cover shrink-0"
                          loading="lazy"
                        />
                        <span className="text-[11px] truncate leading-tight">
                          {preset.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setImageEditProduct(null)}
                  className="neu-card px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-main)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!tempImageUrl || isUpdatingImage}
                  onClick={() => handleSaveProductImage(tempImageUrl)}
                  className="neu-button-primary px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check size={14} />
                  <span>{isUpdatingImage ? 'Updating...' : 'Save & Apply Image'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
