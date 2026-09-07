import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Store, Monitor, Settings, CheckCircle, Zap } from 'lucide-react';
import TemplateRenderer from '../../storefront/TemplateRenderer';

const TemplateCustomizer = ({ sellerTemplate, onClose }) => {
  const [dna, setDna] = useState(() => {
    try {
      const config = sellerTemplate.customizedConfiguration;
      if (!config) return {};
      return typeof config === 'string' ? JSON.parse(config) : config;
    } catch(e) { return {}; }
  });
  
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState(null);
  const [myStores, setMyStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(sellerTemplate.storeId || '');
  const [showStoreSelector, setShowStoreSelector] = useState(false);

  useEffect(() => {
    // Fetch user's stores to apply the template to
    const fetchStores = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await axios.get('/api/v1/stores/portfolio', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = res.data;
        if (data.success) {
          setMyStores(data.portfolio || []);
          if (data.portfolio.length === 1 && !selectedStore) {
            setSelectedStore(data.portfolio[0].id);
          }
        }
        // Ignore error
    };
    fetchStores();
  }, []);

  const handleUpdateDna = (section, field, value) => {
    setDna(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`/api/v1/seller/templates/${sellerTemplate.id}/customize`, 
        { configuration: dna },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      const data = res.data;
      if (data.success) {
        setMessage('Configuration saved!');
        setTimeout(() => setMessage(null), 3000);
      }
      setMessage('Error saving configuration');
      setSaving(false);
    }
  };

  const handleApply = async () => {
    if (!selectedStore) {
      setShowStoreSelector(true);
      return;
    }
    
    setApplying(true);
    try {
      // Save first
      await handleSave();
      
      const token = localStorage.getItem('token');
      const res = await axios.post(`/api/v1/seller/templates/${sellerTemplate.id}/apply`, 
        { storeId: selectedStore },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      const data = res.data;
      if (data.success) {
        setMessage('Successfully applied to store!');
        setShowStoreSelector(false);
      }
      setMessage('Error applying to store');
      setApplying(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="absolute inset-0 bg-[var(--bg-tertiary)] z-40 flex flex-col rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="h-16 bg-white border-b border-[var(--border-color)] px-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="font-bold text-black">{sellerTemplate.template.name}</h2>
            <div className="text-xs text-[var(--text-muted)]">Template Customizer</div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {message && <span className="text-sm font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">{message}</span>}
          <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-white border border-[var(--border-color)] hover:bg-gray-50 text-black font-bold py-2 px-4 rounded-xl transition-colors flex items-center gap-2"
          >
            <Save size={16} /> {saving ? 'Saving...' : 'Save Draft'}
          </button>
          
          <button 
            onClick={() => setShowStoreSelector(true)}
            disabled={applying}
            className="bg-black hover:bg-gray-900 text-white font-bold py-2 px-4 rounded-xl transition-colors flex items-center gap-2"
          >
            <Store size={16} /> {applying ? 'Applying...' : 'Apply to Store'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Editor Sidebar */}
        <div className="w-80 bg-white border-r border-[var(--border-color)] flex flex-col h-full overflow-y-auto hide-scrollbar">
          
          {/* Content Section */}
          <div className="p-5 border-b border-[var(--border-color)]">
            <h3 className="font-bold text-sm text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Settings size={14} /> Content
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Popup Title</label>
                <input 
                  type="text" 
                  value={dna.content?.title || ''}
                  onChange={(e) => handleUpdateDna('content', 'title', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Subtitle / Main Text</label>
                <input 
                  type="text" 
                  value={dna.content?.subtitle || ''}
                  onChange={(e) => handleUpdateDna('content', 'subtitle', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Badge Text</label>
                <input 
                  type="text" 
                  value={dna.content?.badge || ''}
                  onChange={(e) => handleUpdateDna('content', 'badge', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-black"
                />
              </div>
            </div>
          </div>

          {/* Appearance Section */}
          <div className="p-5 border-b border-[var(--border-color)]">
            <h3 className="font-bold text-sm text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Monitor size={14} /> Appearance
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Background Color</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={dna.theme?.background || '#35104A'}
                    onChange={(e) => handleUpdateDna('theme', 'background', e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border-none"
                  />
                  <input 
                    type="text" 
                    value={dna.theme?.background || '#35104A'}
                    onChange={(e) => handleUpdateDna('theme', 'background', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Accent Color</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={dna.theme?.accent || '#D8B45A'}
                    onChange={(e) => handleUpdateDna('theme', 'accent', e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border-none"
                  />
                  <input 
                    type="text" 
                    value={dna.theme?.accent || '#D8B45A'}
                    onChange={(e) => handleUpdateDna('theme', 'accent', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Text Color</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={dna.theme?.text || '#ffffff'}
                    onChange={(e) => handleUpdateDna('theme', 'text', e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border-none"
                  />
                  <input 
                    type="text" 
                    value={dna.theme?.text || '#ffffff'}
                    onChange={(e) => handleUpdateDna('theme', 'text', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Behavior Section */}
          <div className="p-5 border-b border-[var(--border-color)]">
            <h3 className="font-bold text-sm text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Zap size={14} /> Behavior
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Show on Pages</label>
                <select 
                  value={(dna.behavior?.pages || ['home'])[0]}
                  onChange={(e) => handleUpdateDna('behavior', 'pages', [e.target.value])}
                  className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-black"
                >
                  <option value="home">Homepage Only</option>
                  <option value="all">All Pages</option>
                  <option value="product">Product Pages</option>
                  <option value="checkout">Checkout</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Trigger Delay (seconds)</label>
                <input 
                  type="number" 
                  min="0"
                  value={dna.behavior?.delay || 0}
                  onChange={(e) => handleUpdateDna('behavior', 'delay', Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-black"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview Pane */}
        <div className="flex-1 bg-gray-100 flex items-center justify-center p-8 relative">
          {/* We force the key to change so the popup re-triggers its entrance animation on DNA change if needed. 
              But for smoother editing, we might not want to remount. For now we just pass it down. */}
          <div className="relative w-[375px] h-[812px] bg-white rounded-[2.5rem] border-[14px] border-gray-300 shadow-2xl overflow-hidden flex flex-col">
            <div className="h-48 bg-gray-200 w-full mb-8"></div>
            <div className="px-4 space-y-4">
              <div className="h-10 w-full bg-gray-100 rounded-lg"></div>
              <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
            </div>
            
            <TemplateRenderer templateDNA={dna} isPreview={true} />
          </div>
        </div>
      </div>

      {/* Store Selector Modal */}
      {showStoreSelector && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl"
          >
            <h3 className="text-xl font-bold mb-2">Apply Template</h3>
            <p className="text-gray-500 text-sm mb-6">Select which store you want to apply this experience to.</p>
            
            <div className="space-y-3 mb-6">
              {myStores.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-4">No stores found. Create a store first.</div>
              ) : (
                myStores.map(store => (
                  <button
                    key={store.id}
                    onClick={() => setSelectedStore(store.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                      selectedStore === store.id ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <span className="font-bold">{store.name || store.slug || 'Untitled Store'}</span>
                    {selectedStore === store.id && <CheckCircle size={20} className="text-black" />}
                  </button>
                ))
              )}
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowStoreSelector(false)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleApply}
                disabled={!selectedStore || applying}
                className="flex-1 px-4 py-2 bg-black text-white hover:bg-gray-900 rounded-xl font-bold transition-colors disabled:opacity-50"
              >
                {applying ? 'Applying...' : 'Confirm & Apply'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </motion.div>
  );
};

export default TemplateCustomizer;
