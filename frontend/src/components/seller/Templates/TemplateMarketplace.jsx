import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Sparkles, LayoutTemplate, Zap, Download } from 'lucide-react';
import TemplateCard from './TemplateCard';
import TemplatePreviewModal from './TemplatePreviewModal';
import TemplateCustomizer from './TemplateCustomizer';

const CATEGORIES = [
  { id: 'all', name: 'All Templates' },
  { id: 'seller-achievement', name: 'Achievements' },
  { id: 'sales-funnel', name: 'Sales Funnels' },
  { id: 'promotions', name: 'Promotions' },
  { id: 'cart', name: 'Cart & Checkout' }
];

const TemplateMarketplace = () => {
  const [templates, setTemplates] = useState([]);
  const [ownedTemplates, setOwnedTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [customizeTemplate, setCustomizeTemplate] = useState(null);

  const fetchMarketplace = async () => {
    try {
      const res = await axios.get('/api/v1/templates');
      const data = res.data;
      if (data.success) {
        setTemplates(data.templates);
      }
      // Fetch error
  };

  const fetchOwned = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      const res = await axios.get('/api/v1/seller/templates', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = res.data;
      if (data.success) {
        setOwnedTemplates(data.templates);
      }
      // Fetch error
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchMarketplace(), fetchOwned()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePurchaseSuccess = () => {
    setPreviewTemplate(null);
    loadData(); // refresh owned status
  };

  const handleCloseCustomize = () => {
    setCustomizeTemplate(null);
    loadData(); // refresh in case it was applied
  };

  // Filter templates
  const displayTemplates = templates.filter(t => {
    if (activeCategory !== 'all' && t.category !== activeCategory) return false;
    if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  if (customizeTemplate) {
    return (
      <TemplateCustomizer 
        sellerTemplate={customizeTemplate} 
        onClose={handleCloseCustomize} 
      />
    );
  }

  return (
    <div className="h-full w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-2xl p-6 relative overflow-hidden flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-black mb-1 flex items-center gap-2">
            <LayoutTemplate className="text-[var(--accent-gray-dark)]" size={24} />
            Template Marketplace
          </h2>
          <p className="text-[var(--text-muted)] text-sm">
            Premium popups, banners, and store experiences.
          </p>
        </div>
        
        <div className="relative w-full md:w-64">
          <input 
            type="text" 
            placeholder="Search templates..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-[var(--border-color)] text-black pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-[var(--accent-gray)] focus:ring-1 focus:ring-[var(--accent-gray)] transition-all"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-6 pb-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all ${
              activeCategory === cat.id 
                ? 'bg-black text-white shadow-md' 
                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          {displayTemplates.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              No templates found for this criteria.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {displayTemplates.map(template => {
                const ownedRecord = ownedTemplates.find(ot => ot.templateId === template.id);
                
                return (
                  <TemplateCard 
                    key={template.id} 
                    template={template} 
                    ownedRecord={ownedRecord}
                    onPreview={() => setPreviewTemplate(template)}
                    onCustomize={() => setCustomizeTemplate(ownedRecord)}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Preview Modal */}
      <AnimatePresence>
        {previewTemplate && (
          <TemplatePreviewModal 
            template={previewTemplate}
            ownedRecord={ownedTemplates.find(ot => ot.templateId === previewTemplate.id)}
            onClose={() => setPreviewTemplate(null)}
            onPurchaseSuccess={handlePurchaseSuccess}
            onCustomize={(ownedRecord) => {
              setPreviewTemplate(null);
              setCustomizeTemplate(ownedRecord);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TemplateMarketplace;
