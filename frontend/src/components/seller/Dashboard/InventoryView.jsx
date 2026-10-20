import React, { useState } from 'react';
import { apiClient as axios } from '@/utils/apiClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Plus, Archive, Edit2, Trash2, Tag, RefreshCw, BarChart2, Package, Zap } from 'lucide-react';
import { AIWritingState } from '../../states/AIStates';
import AiInsightsModal from '../../shared/AiInsightsModal';
import { gxDelete } from '../../shared/ui/GXDialog';
import { showRewardedAd } from '../../../services/adMobService';
import { getImageUrl, isVideoUrl } from '../../../utils/imageHelpers';
import { useSellerStore } from '../../../store/sellerStore';

const InventoryView = ({ products, setIsAddProductModalOpen, setIsCreateDealModalOpen, setEditingProduct, setIsEditProductModalOpen, deleteProduct, restoreProduct, showNotification }) => {
  const [aiInsight, setAiInsight] = useState(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const [aiModalData, setAiModalData] = useState(null);
  const [showProductAiModal, setShowProductAiModal] = useState(false);
  const [loadingProductId, setLoadingProductId] = useState(null);
  const [loadingAdBoostId, setLoadingAdBoostId] = useState(null);

  const store = useSellerStore(state => state.store);
  const fetchSellerProducts = useSellerStore(state => state.fetchSellerProducts);
  const [isRefreshing, setIsRefreshing] = useState(false);

  React.useEffect(() => {
    fetchSellerProducts();
  }, [fetchSellerProducts]);

  const isPremium = store?.isPremium || store?.sellerTier === 'PREMIUM' || store?.sellerTier === 'ELITE';
  const activeProductsCount = products?.filter(p => !p.isArchived).length || 0;
  const canAddProduct = isPremium || activeProductsCount < 10;

  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [restoreProductItem, setRestoreProductItem] = useState(null);
  const [restoreStock, setRestoreStock] = useState('10');

  const generateLocalInventoryAnalysis = (items) => {
    if (!items || items.length === 0) {
      return "📦 **Inventory Status: Catalog is Empty**\n\n" +
        "You haven't listed any products yet. To receive real-time AI inventory insights:\n\n" +
        "• Click **+ Add Product** above to add your first item.\n" +
        "• Specify your available stock quantity, price, and category.\n" +
        "• PayAI will automatically track stock velocity, highlight bestsellers, and suggest flash deals.";
    }

    const total = items.length;
    const outOfStock = items.filter(p => Number(p.stock) <= 0);
    const lowStock = items.filter(p => Number(p.stock) > 0 && Number(p.stock) <= (p.lowStockThreshold || 5));
    const healthyStock = items.filter(p => Number(p.stock) > (p.lowStockThreshold || 5));
    const topSellers = [...items].sort((a, b) => (Number(b.soldCount) || 0) - (Number(a.soldCount) || 0)).filter(p => Number(p.soldCount) > 0).slice(0, 3);
    const slowMovers = items.filter(p => (Number(p.soldCount) || 0) === 0 && Number(p.stock) > 10);

    const lines = [];
    lines.push("📊 **Executive Inventory Health Summary**");
    lines.push(`• **Catalog Overview:** ${total} active products listed across your storefront.`);
    lines.push(`• **Stock Status:** ${healthyStock.length} healthy • ${lowStock.length} low stock • ${outOfStock.length} out of stock.`);

    if (outOfStock.length > 0) {
      lines.push("\n🚨 **Immediate Restock Urgency (Lost Sales Risk)**");
      outOfStock.slice(0, 3).forEach(p => {
        lines.push(`• **${p.title}**: 0 units left. Potential buyers cannot purchase. Immediate restocking recommended.`);
      });
    }

    if (lowStock.length > 0) {
      lines.push("\n⚠️ **Low-Stock Warnings (Restock Soon)**");
      lowStock.slice(0, 3).forEach(p => {
        lines.push(`• **${p.title}**: Only ${p.stock} units remaining (Threshold: ${p.lowStockThreshold || 5}). At current velocity, stock may deplete within days.`);
      });
    }

    if (topSellers.length > 0) {
      lines.push("\n🏆 **Top Performing Bestsellers**");
      topSellers.forEach(p => {
        lines.push(`• **${p.title}**: ${p.soldCount || 0} units sold (${p.viewCount || 0} views). Recommendation: Feature this item on your store banner.`);
      });
    }

    if (slowMovers.length > 0) {
      lines.push("\n💡 **Capital Optimization & Flash Deal Recommendations**");
      slowMovers.slice(0, 2).forEach(p => {
        lines.push(`• **${p.title}** (${p.stock} units, 0 sales): Suggest launching a 10%–15% Flash Sale or bundling with top sellers to accelerate turnover.`);
      });
    } else if (outOfStock.length === 0 && lowStock.length === 0) {
      lines.push("\n✨ **Growth Opportunity**");
      lines.push("• All listed items have healthy inventory reserves! Consider activating **Ad Boost** on your highest-margin items to drive more buyer traffic.");
    }

    lines.push("\n🎯 **AI Next Step:** Keep pricing competitive and monitor buyer activity to maintain strong seller ratings.");
    return lines.join('\n');
  };

  const fetchAiInsights = async () => {
    setIsLoadingInsight(true);
    setAiInsight(null);
    try {
      const res = await axios.post('/api/v1/ai-chat/inventory-insights', { products });
      if (res.data?.success && (res.data.reply || res.data.insights)) {
        setAiInsight(res.data.reply || res.data.insights);
      } else {
        setAiInsight(generateLocalInventoryAnalysis(products));
      }
    } catch (e) {
      setAiInsight(generateLocalInventoryAnalysis(products));
    } finally {
      setIsLoadingInsight(false);
    }
  };

  const fetchProductAi = async (productId) => {
    setLoadingProductId(productId);
    try {
      const res = await axios.get(`/api/v1/products/${productId}/ai-insights`);
      if (res.data?.success) {
        setAiModalData(res.data);
        setShowProductAiModal(true);
      } else {
        showNotification("Failed to fetch product AI insights", "error");
      }
    } catch (e) {
      showNotification("Error fetching AI data", "error");
    } finally {
      setLoadingProductId(null);
    }
  };

  const handleToggleAdBoost = async (productId) => {
    // Check if we are activating or deactivating Ad Boost
    const product = products.find(p => p.id === productId);
    
    if (product && !product.isAdBoosted) {
      // Activating Ad Boost: Force user to watch AdMob Ad
      setLoadingAdBoostId(productId);
      
      try {
        await showRewardedAd(async (reward) => {
          // Once reward is earned, boost the product
          setLoadingAdBoostId(productId); // Re-enable spinner during API call
          try {
            const res = await axios.post(`/api/v1/products/${productId}/ad-boost`);
            if (res.data?.success) {
              showNotification("Ad completed! Product is now boosted.", "success");
              useSellerStore.getState().fetchSellerProducts();
            }
          } catch (e) {
            showNotification(e.response?.data?.message || "Error toggling Ad Boost", "error");
          } finally {
            setLoadingAdBoostId(null);
          }
        });
        setLoadingAdBoostId(null); // Clear spinner after ad is presented or fails silently
      } catch (err) {
        showNotification("Failed to load Ad", "error");
        setLoadingAdBoostId(null);
      }
    } else {
      // Deactivating Ad Boost: No ad needed
      setLoadingAdBoostId(productId);
      try {
        const res = await axios.post(`/api/v1/products/${productId}/ad-boost`);
        if (res.data?.success) {
          showNotification(res.data.message, "success");
          useSellerStore.getState().fetchSellerProducts();
        }
      } catch (e) {
        showNotification(e.response?.data?.message || "Error toggling Ad Boost", "error");
      } finally {
        setLoadingAdBoostId(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] mb-2 tracking-tight">My Inventory</h1>
          <p className="text-[var(--text-muted)] text-sm font-medium">Add, edit, and track your product stock in real-time.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button 
            onClick={() => {
              setIsRefreshing(true);
              fetchSellerProducts().finally(() => setIsRefreshing(false));
            }}
            disabled={isRefreshing}
            className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2.5 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh Inventory"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button 
            onClick={fetchAiInsights}
            disabled={isLoadingInsight}
            className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400 px-4 sm:px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-5 h-5" /> AI Insights
          </button>
          <button 
            onClick={() => {
              if (!canAddProduct) {
                showNotification("Basic plan limit reached (10 max). Upgrade to Premium to add more products.", "error");
                return;
              }
              setIsAddProductModalOpen(true);
            }}
            className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-bold transition-colors shadow-lg ${canAddProduct ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20' : 'bg-gray-400 text-white cursor-not-allowed'}`}
          >
            <Plus className="w-5 h-5" /> Add Product
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isLoadingInsight && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/30 p-6 rounded-2xl overflow-hidden">
            <AIWritingState />
          </motion.div>
        )}
        
        {aiInsight && !isLoadingInsight && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-300 dark:border-emerald-700/50 p-6 rounded-2xl relative shadow-md">
            <button onClick={() => setAiInsight(null)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 transition-colors p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10">
              <span className="sr-only">Close</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h3 className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 mb-3 text-lg">
              <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Inventory Analysis
            </h3>
            <div className="text-slate-800 dark:text-slate-100 whitespace-pre-line leading-relaxed text-sm md:text-base font-medium">
              {aiInsight}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="mt-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-500" />
            <span>Active Products ({activeProductsCount})</span>
          </div>
          {activeProductsCount > 0 && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              Live in Storefront & Global Deals
            </span>
          )}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products?.filter(p => !p.isArchived).map((item, i) => (
            <motion.div 
              key={item.id} 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: i * 0.05 }}
              className="bg-white dark:bg-[#111] rounded-2xl overflow-hidden border border-[var(--accent-gray)] shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col h-full"
            >
              <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 overflow-hidden">
                {item.images?.[0] ? (() => {
                  const mediaSrc = getImageUrl(item.images[0]?.url || item.images[0]);
                  const isVideo = isVideoUrl(mediaSrc);
                  return isVideo ? (
                    <video
                      src={mediaSrc}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <img
                      src={mediaSrc}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23111827'/%3E%3Ctext x='50' y='54' text-anchor='middle' dominant-baseline='middle' font-family='sans-serif' font-size='11' fill='%236b7280'%3ENo Image%3C/text%3E%3C/svg%3E`;
                      }}
                    />
                  );
                })() : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-12 h-12 text-gray-300 dark:text-gray-700" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute top-3 right-3 bg-emerald-500/90 backdrop-blur text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                  Active
                </div>
                <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0">
                  <span className="font-mono text-white font-bold text-lg drop-shadow-md">₦{Number(item.price || 0).toLocaleString()}</span>
                  <span className="text-white text-xs font-medium bg-black/50 backdrop-blur-sm px-2 py-1 rounded-md">Stock: {item.stock || 0}</span>
                </div>
              </div>
              
              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate mb-1.5" title={item.title}>
                    {item.title}
                  </h3>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-mono font-black text-sm sm:text-base text-emerald-600 dark:text-emerald-400">
                      ₦{Number(item.price || 0).toLocaleString()}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] sm:text-xs shrink-0 ${
                      Number(item.stock) > 5 
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' 
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                    }`}>
                      Stock: {item.stock || 0}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800/80 gap-1 flex-wrap">
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setIsCreateDealModalOpen(true); }} 
                      className="p-1.5 sm:p-2 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 rounded-lg transition-colors cursor-pointer"
                      title="Promote / Deal"
                    >
                      <Tag className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleToggleAdBoost(item.id); }} 
                      className={`p-1.5 sm:p-2 rounded-lg transition-colors relative cursor-pointer ${item.isAdBoosted ? 'text-amber-500 bg-amber-50 dark:bg-amber-500/10' : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10'}`}
                      title={item.isAdBoosted ? "Ad Boost Active (Click to disable)" : "Enable Ad Boost"}
                    >
                      <RefreshCw className={`w-4 h-4 animate-spin ${loadingAdBoostId === item.id ? 'block' : 'hidden'}`} />
                      <Zap className={`w-4 h-4 ${item.isAdBoosted ? 'fill-current' : ''} ${loadingAdBoostId !== item.id ? 'block' : 'hidden'}`} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); fetchProductAi(item.id); }}
                      className="p-1.5 sm:p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors relative cursor-pointer"
                      title="AI Analysis"
                    >
                      <RefreshCw className={`w-4 h-4 animate-spin ${loadingProductId === item.id ? 'block' : 'hidden'}`} />
                      <BarChart2 className={`w-4 h-4 ${loadingProductId !== item.id ? 'block' : 'hidden'}`} />
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditingProduct(item); setIsEditProductModalOpen(true); }} 
                      className="p-1.5 sm:p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors cursor-pointer"
                      title="Edit Product"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={async (e) => {
                        e.stopPropagation();
                        const ok = await gxDelete('This product will be permanently deleted from your inventory.', { title: 'Delete Product?', confirmLabel: 'Yes, Delete' });
                        if (ok) {
                          const success = await deleteProduct(item.id);
                          if (success) showNotification('Product deleted successfully', 'success');
                          else showNotification(useSellerStore.getState().error || 'Failed to delete product', 'error');
                        }
                      }}
                      className="p-1.5 sm:p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer"
                      title="Delete Product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: (products?.filter(p => !p.isArchived).length || 0) * 0.05 }}
            onClick={() => {
              if (!canAddProduct) {
                showNotification("Basic plan limit reached (10 max). Upgrade to Premium to add more products.", "error");
                return;
              }
              setIsAddProductModalOpen(true);
            }}
            className={`bg-gray-50 dark:bg-gray-900/50 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 transition-all flex flex-col items-center justify-center min-h-[280px] group ${canAddProduct ? 'hover:border-blue-500 cursor-pointer' : 'opacity-75 cursor-not-allowed'}`}
          >
            <div className={`w-16 h-16 rounded-full bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center mb-4 transition-all duration-300 ${canAddProduct ? 'group-hover:scale-110 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20' : ''}`}>
              <Plus className={`w-8 h-8 transition-colors ${canAddProduct ? 'text-gray-400 group-hover:text-blue-500' : 'text-gray-300'}`} />
            </div>
            <span className={`font-bold transition-colors ${canAddProduct ? 'text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
              {canAddProduct ? 'Add New Product' : 'Upgrade to Add More'}
            </span>
          </motion.div>
        </div>
      </div>

      {products?.some(p => p.isArchived) && (
        <div className="mt-12 pt-8 border-t border-[var(--accent-gray)]">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Archive className="w-6 h-6 text-gray-500" /> 
            Out of Stock / Archived
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products?.filter(p => p.isArchived).map((item, i) => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white dark:bg-[#111] rounded-2xl overflow-hidden border border-[var(--accent-gray)] opacity-75 hover:opacity-100 transition-opacity flex flex-col h-full"
              >
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 truncate mb-1">{item.title}</h3>
                  <p className="text-xs text-red-500 font-medium mb-4">Stock: 0 units</p>
                  <div className="mt-auto flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-800">
                    <span className="font-mono text-gray-500">₦{Number(item.price || 0).toLocaleString()}</span>
                    <button 
                      onClick={() => {
                        setRestoreProductItem(item);
                        setRestoreStock('10');
                        setRestoreModalOpen(true);
                      }}
                      className="flex items-center gap-1 text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Restore
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {restoreModalOpen && restoreProductItem && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-[#111] border border-[var(--accent-gray)] rounded-2xl w-full max-w-sm p-6 shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4">
                <RefreshCw className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Restore Product</h3>
              <p className="text-sm text-[var(--text-muted)] mb-6 leading-relaxed">
                Enter new stock quantity to make <span className="font-semibold text-gray-900 dark:text-white">{restoreProductItem.title}</span> active again.
              </p>
              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Stock Quantity</label>
                <input 
                  type="number" 
                  min="1"
                  value={restoreStock}
                  onChange={(e) => setRestoreStock(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-[var(--accent-gray)] rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => { setRestoreModalOpen(false); setRestoreProductItem(null); }}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    const stockNum = parseInt(restoreStock, 10);
                    if (stockNum > 0) {
                      const success = await restoreProduct(restoreProductItem.id, stockNum);
                      if (success) showNotification('Product restored successfully!', 'success');
                      else showNotification('Failed to restore product', 'error');
                    }
                    setRestoreModalOpen(false);
                    setRestoreProductItem(null);
                  }}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                >
                  Restore Product
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AiInsightsModal 
        isOpen={showProductAiModal}
        onClose={() => setShowProductAiModal(false)}
        data={aiModalData}
      />
    </div>
  );
};

export default InventoryView;
