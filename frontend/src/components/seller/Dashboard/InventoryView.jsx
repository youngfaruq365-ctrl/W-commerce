import React, { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Plus, Archive, Edit2, Trash2, Tag, RefreshCw, BarChart2, Package } from 'lucide-react';
import { AIWritingState } from '../../states/AIStates';
import AiInsightsModal from '../../shared/AiInsightsModal';
import { gxDelete } from '../../shared/ui/GXDialog';

const InventoryView = ({ products, setIsAddProductModalOpen, setIsCreateDealModalOpen, setEditingProduct, setIsEditProductModalOpen, deleteProduct, restoreProduct, showNotification, useSellerStore }) => {
  const [aiInsight, setAiInsight] = useState(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const [aiModalData, setAiModalData] = useState(null);
  const [showProductAiModal, setShowProductAiModal] = useState(false);
  const [loadingProductId, setLoadingProductId] = useState(null);

  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [restoreProductItem, setRestoreProductItem] = useState(null);
  const [restoreStock, setRestoreStock] = useState('10');

  const fetchAiInsights = async () => {
    setIsLoadingInsight(true);
    setAiInsight(null);
    try {
      const res = await axios.post('/api/v1/ai-chat/inventory-insights', { products });
      if (res.data?.success) {
        setAiInsight(res.data.reply);
      } else {
        setAiInsight("Failed to generate AI insights.");
      }
    } catch (e) {
      setAiInsight("An error occurred while generating insights.");
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">My Inventory</h1>
          <p className="text-[var(--text-muted)] text-sm">Add, edit, and track your product stock in real-time.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={fetchAiInsights}
            disabled={isLoadingInsight}
            className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400 px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-5 h-5" /> AI Insights
          </button>
          <button 
            onClick={() => setIsAddProductModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
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
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800/30 p-6 rounded-2xl relative shadow-sm">
            <button onClick={() => setAiInsight(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <span className="sr-only">Close</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h3 className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2 mb-3 text-lg">
              <Sparkles className="w-5 h-5" /> Inventory Analysis
            </h3>
            <div className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed text-sm md:text-base">
              {aiInsight}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="mt-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Package className="w-6 h-6 text-blue-500" />
          Active Products
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
                {item.images?.[0] ? (
                  <img src={item.images[0]?.url || item.images[0]} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
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
              
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="font-bold text-gray-900 dark:text-white truncate mb-1" title={item.title}>{item.title}</h3>
                <div className="flex items-center justify-between mt-auto pt-4">
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setIsCreateDealModalOpen(true); }} 
                      className="p-2 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 rounded-lg transition-colors"
                      title="Promote"
                    >
                      <Tag className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); fetchProductAi(item.id); }}
                      className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors relative"
                      title="AI Analysis"
                    >
                      {loadingProductId === item.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BarChart2 className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditingProduct(item); setIsEditProductModalOpen(true); }} 
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Edit"
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
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete"
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
            onClick={() => setIsAddProductModalOpen(true)}
            className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 cursor-pointer transition-all flex flex-col items-center justify-center min-h-[280px] group"
          >
            <div className="w-16 h-16 rounded-full bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-all duration-300">
              <Plus className="w-8 h-8 text-gray-400 group-hover:text-blue-500 transition-colors" />
            </div>
            <span className="font-bold text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Add New Product</span>
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
