import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, Check, Filter, X, SlidersHorizontal } from 'lucide-react';
import StoreCard from './StoreCard';
import { getStoresByEngine } from '../../store-config/storeRegistry';

const StoreMarketplace = () => {
  const [activeEngine, setActiveEngine] = useState('all');
  const [priceRange, setPriceRange] = useState([0, 25]);
  const [activeTiers, setActiveTiers] = useState([]);
  const [activeFeatures, setActiveFeatures] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('relevance');

  // Mobile Drawers State
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isSortDrawerOpen, setIsSortDrawerOpen] = useState(false);


  const engines = ['restaurant', 'fashion', 'creator', 'property', 'healthcare', 'automotive', 'portfolio', 'html'];
  const tiers = ['essential', 'plus', 'pro', 'studio', 'signature'];
  const featureList = ['AI', 'Analytics', 'Booking', 'Loyalty', 'Automation'];

  const toggleTier = (tier) => {
    setActiveTiers(prev => prev.includes(tier) ? prev.filter(t => t !== tier) : [...prev, tier]);
  };

  const toggleFeature = (feat) => {
    setActiveFeatures(prev => prev.includes(feat) ? prev.filter(f => f !== feat) : [...prev, feat]);
  };

  // Filter Logic
  let displayStores = getStoresByEngine(activeEngine);
  if (activeTiers.length > 0) {
    displayStores = displayStores.filter(s => activeTiers.includes(s.tier));
  }
  displayStores = displayStores.filter(s => s.price >= priceRange[0] && s.price <= priceRange[1]);
  if (searchQuery) {
    displayStores = displayStores.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }

  // Sort Logic
  if (sortBy === 'price-low') displayStores.sort((a,b) => a.price - b.price);
  if (sortBy === 'price-high') displayStores.sort((a,b) => b.price - a.price);
  if (sortBy === 'popular') displayStores.sort((a,b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0));

  const filterContent = (
    <div className="space-y-8">
      {/* Business Engine Filter */}
      <div>
        <h3 className="text-sm font-bold text-black uppercase tracking-wider mb-3">Business Engine</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className={`w-5 h-5 md:w-4 md:h-4 rounded-full border flex items-center justify-center transition-colors ${activeEngine === 'all' ? 'border-black bg-black' : 'border-gray-300 group-hover:border-black'}`}>
              {activeEngine === 'all' && <div className="w-2 h-2 md:w-1.5 md:h-1.5 bg-white rounded-full" />}
            </div>
            <span className="text-base md:text-sm text-gray-700 group-hover:text-black">All Engines</span>
          </label>
          {engines.map(engine => (
            <label key={engine} onClick={() => setActiveEngine(engine)} className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-5 h-5 md:w-4 md:h-4 rounded-full border flex items-center justify-center transition-colors ${activeEngine === engine ? 'border-black bg-black' : 'border-gray-300 group-hover:border-black'}`}>
                {activeEngine === engine && <div className="w-2 h-2 md:w-1.5 md:h-1.5 bg-white rounded-full" />}
              </div>
              <span className="text-base md:text-sm text-gray-700 group-hover:text-black capitalize">{engine}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Tier Filter */}
      <div>
        <h3 className="text-sm font-bold text-black uppercase tracking-wider mb-3">Tier</h3>
        <div className="space-y-2">
          {tiers.map(tier => (
            <label key={tier} onClick={(e) => { e.preventDefault(); toggleTier(tier); }} className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-5 h-5 md:w-4 md:h-4 border rounded flex items-center justify-center transition-colors ${activeTiers.includes(tier) ? 'border-black bg-black text-white' : 'border-gray-300 bg-white group-hover:border-black'}`}>
                {activeTiers.includes(tier) && <Check size={14} strokeWidth={3} />}
              </div>
              <span className="text-base md:text-sm text-gray-700 group-hover:text-black capitalize">{tier}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Features Filter */}
      <div>
        <h3 className="text-sm font-bold text-black uppercase tracking-wider mb-3">Features</h3>
        <div className="space-y-2">
          {featureList.map(feat => (
            <label key={feat} onClick={(e) => { e.preventDefault(); toggleFeature(feat); }} className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-5 h-5 md:w-4 md:h-4 border rounded flex items-center justify-center transition-colors ${activeFeatures.includes(feat) ? 'border-black bg-black text-white' : 'border-gray-300 bg-white group-hover:border-black'}`}>
                {activeFeatures.includes(feat) && <Check size={14} strokeWidth={3} />}
              </div>
              <span className="text-base md:text-sm text-gray-700 group-hover:text-black">{feat}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full bg-white relative">
      
      {/* Modals & Overlays */}
      {/* Modals & Overlays (Moved to StorePreviewPage) */}

      {/* Mobile Filter Drawer */}
      <AnimatePresence>
        {isFilterDrawerOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterDrawerOpen(false)}
              className="fixed inset-0 bg-black/40 z-50 lg:hidden"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 max-h-[90dvh] bg-white rounded-t-3xl z-50 lg:hidden flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.1)]"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-xl font-extrabold text-black">Filters</h2>
                <button onClick={() => setIsFilterDrawerOpen(false)} className="p-2 bg-gray-100 rounded-full text-black">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar pb-24">
                {filterContent}
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 pb-safe">
                <button 
                  onClick={() => setIsFilterDrawerOpen(false)}
                  className="w-full bg-black text-white font-bold py-4 rounded-xl text-lg"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Sort Drawer */}
      <AnimatePresence>
        {isSortDrawerOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSortDrawerOpen(false)}
              className="fixed inset-0 bg-black/40 z-50 lg:hidden"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 lg:hidden flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.1)] pb-safe"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-xl font-extrabold text-black">Sort by</h2>
                <button onClick={() => setIsSortDrawerOpen(false)} className="p-2 bg-gray-100 rounded-full text-black">
                  <X size={20} />
                </button>
              </div>
              <div className="p-2">
                {[
                  { id: 'relevance', label: 'Relevance' },
                  { id: 'popular', label: 'Popularity' },
                  { id: 'price-low', label: 'Price: Low to High' },
                  { id: 'price-high', label: 'Price: High to Low' }
                ].map(sortOption => (
                  <button 
                    key={sortOption.id}
                    onClick={() => { setSortBy(sortOption.id); setIsSortDrawerOpen(false); }}
                    className="w-full text-left px-6 py-4 flex items-center justify-between"
                  >
                    <span className={`text-lg ${sortBy === sortOption.id ? 'font-bold text-black' : 'font-medium text-gray-600'}`}>
                      {sortOption.label}
                    </span>
                    {sortBy === sortOption.id && <Check size={20} className="text-black" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar Filters */}
      <div className="hidden lg:flex w-[280px] flex-shrink-0 border-r border-[var(--border-color)] flex-col h-full bg-white relative z-10 sticky top-0">
        <div className="p-6 border-b border-[var(--border-color)]">
          <h2 className="font-extrabold text-2xl text-black mb-1">Store Marketplace</h2>
          <p className="text-sm text-gray-500">Find the storefront that fits your business.</p>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
          {filterContent}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#FAFAFA]">
        
        {/* Top Bar (Responsive) */}
        <div className="h-auto md:h-[88px] flex-shrink-0 flex flex-col md:flex-row items-center justify-between p-4 md:px-8 md:py-0 border-b border-[var(--border-color)] bg-white relative z-10 gap-4">
          
          <div className="w-full md:max-w-md relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search stores..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-[var(--border-color)] rounded-xl pl-10 pr-4 py-3 text-base md:text-sm font-medium focus:outline-none focus:border-black transition-colors"
            />
          </div>

          <div className="flex items-center justify-between w-full md:w-auto gap-4">
             <div className="text-sm md:text-base text-gray-500 font-medium whitespace-nowrap">
               {displayStores.length} stores
             </div>
             
             {/* Desktop Sort */}
             <div className="relative hidden md:block">
               <select 
                 value={sortBy}
                 onChange={(e) => setSortBy(e.target.value)}
                 className="appearance-none bg-white border border-[var(--border-color)] rounded-xl pl-4 pr-10 py-2.5 text-sm font-bold text-black focus:outline-none focus:border-black cursor-pointer shadow-sm"
               >
                 <option value="relevance">Sort: Relevance</option>
                 <option value="popular">Sort: Popularity</option>
                 <option value="price-low">Sort: Price (Low to High)</option>
                 <option value="price-high">Sort: Price (High to Low)</option>
               </select>
               <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
             </div>

             {/* Mobile Filter & Sort Buttons */}
             <div className="flex md:hidden items-center gap-2">
               <button 
                 onClick={() => setIsFilterDrawerOpen(true)}
                 className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm"
               >
                 <Filter size={16} /> Filters
               </button>
               <button 
                 onClick={() => setIsSortDrawerOpen(true)}
                 className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm"
               >
                 <SlidersHorizontal size={16} /> Sort
               </button>
             </div>
          </div>
        </div>

        {/* Store Grid (Responsive) */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          {displayStores.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-x-6 gap-y-10 md:gap-x-8 md:gap-y-12 pb-24 md:pb-0">
              {displayStores.map(store => (
                <div key={store.id} className="h-full w-full">
                   <StoreCard store={store} onClick={(s) => window.open(`/preview/${s.engine}/${s.id}`, '_blank')} />
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center pb-24 md:pb-0">
              <div className="text-6xl mb-4">🏜️</div>
              <h3 className="text-xl font-bold text-black mb-2">No experiences found</h3>
              <p className="text-gray-500">Try adjusting your filters to find what you're looking for.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoreMarketplace;
