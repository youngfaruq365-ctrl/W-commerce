import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ExperienceRenderer } from '../../../engines/universal/ExperienceRenderer';
import StorePreview from '../../store-marketplace/StorePreview';

const StoreGeneratorWizard = ({ storeConfig, setStoreConfig, showNotification }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [dnaOptions, setDnaOptions] = useState(null);
  const [selectedDnaIndex, setSelectedDnaIndex] = useState(0);

  // Form State
  const [industry, setIndustry] = useState('fashion');
  const [niche, setNiche] = useState('luxury');
  const [personality, setPersonality] = useState('minimal');
  
  const [selectedFeatures, setSelectedFeatures] = useState({
    megaMenu: false,
    quickView: false,
    aiConcierge: false,
    newsletterPopup: false,
  });

  const industries = [
    { id: 'fashion', label: 'Fashion & Apparel' },
    { id: 'electronics', label: 'Electronics & Tech' },
    { id: 'beauty', label: 'Beauty & Cosmetics' },
    { id: 'home', label: 'Home & Furniture' },
  ];

  const niches = {
    fashion: ['luxury', 'streetwear', 'vintage', 'activewear'],
    electronics: ['gadgets', 'computers', 'audio', 'smart-home'],
    beauty: ['skincare', 'makeup', 'organic', 'fragrance'],
    home: ['modern', 'rustic', 'minimalist', 'decor']
  };

  const personalities = [
    { id: 'minimal', label: 'Minimalist & Clean' },
    { id: 'bold', label: 'Bold & Energetic' },
    { id: 'elegant', label: 'Elegant & Premium' },
    { id: 'playful', label: 'Playful & Fun' }
  ];

  const handleFeatureToggle = (feature) => {
    setSelectedFeatures(prev => ({
      ...prev,
      [feature]: !prev[feature]
    }));
  };

  const handleGenerate = async (isSurprise = false) => {
    try {
      setLoading(true);
      
      let payload = {
        industry,
        niche,
        personality,
        features: selectedFeatures
      };

      if (isSurprise) {
        const surpriseRes = await axios.post('/api/v1/stores/profile/dna/surprise', {}, { withCredentials: true });
        if (surpriseRes.data.success) {
          payload = surpriseRes.data.data;
          
          // Update local state to match surprise
          setIndustry(payload.industry);
          setNiche(payload.niche);
          setPersonality(payload.personality);
          setSelectedFeatures(payload.features);
        }
      }

      const res = await axios.post('/api/v1/stores/profile/dna/generate', payload, { withCredentials: true });
      
      if (res.data.success) {
        setDnaOptions(res.data.options);
        setSelectedDnaIndex(0);
        setStep(2);
        showNotification('Store DNA options generated successfully!', 'success');
      }
      showNotification('Failed to generate store', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    try {
      setLoading(true);
      const selectedDna = dnaOptions[selectedDnaIndex];
      const res = await axios.post('/api/v1/stores/profile/dna/publish', { dna: selectedDna }, { withCredentials: true });
      
      if (res.data.success) {
        showNotification('Store published live!', 'success');
        setStoreConfig(prev => ({
          ...prev,
          storeDna: JSON.stringify(selectedDna),
          ...(res.data.store || {})
        }));
        setStep(3);
      }
      showNotification('Failed to publish store', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (step === 3) {
    return (
      <div className="bg-white border border-[var(--border-color)] p-8 rounded-xl min-h-[600px] flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-3xl font-black text-black mb-4">Store Published!</h2>
        <p className="text-gray-500 mb-8 max-w-md">Your new store identity is now live. Customers will see the updated design immediately.</p>
        <div className="flex gap-4">
          <button 
            onClick={() => window.open(`/store/${storeConfig?.portfolioSlug || storeConfig?.id}`, '_blank')}
            className="px-6 py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition-colors"
          >
            Visit Live Store
          </button>
          <button 
            onClick={() => setStep(1)}
            className="px-6 py-3 bg-gray-100 text-black font-bold rounded-lg hover:bg-gray-200 transition-colors"
          >
            Generate Another
          </button>
        </div>
      </div>
    );
  }

  if (step === 2 && dnaOptions && dnaOptions.length > 0) {
    const selectedDna = dnaOptions[selectedDnaIndex];
    return (
      <div className="bg-white border border-[var(--border-color)] p-8 rounded-xl min-h-[600px] flex flex-col relative overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-black">Select Your Store Design</h1>
            <p className="text-[var(--text-muted)] mt-1">Review the generated design options before publishing.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => handleGenerate(false)}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-bold text-black hover:bg-gray-50 transition-colors"
            >
              Regenerate Options
            </button>
            <button 
              onClick={() => setStep(1)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-bold text-black hover:bg-gray-50 transition-colors"
            >
              Back to Settings
            </button>
            <button 
              onClick={handlePublish}
              disabled={loading}
              className="px-4 py-2 bg-black text-white rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors flex items-center gap-2"
            >
              {loading ? 'Publishing...' : 'Publish Selected Design'}
            </button>
          </div>
        </div>
        
        <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
          {dnaOptions.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedDnaIndex(idx)}
              className={`flex-shrink-0 px-6 py-4 rounded-xl border-2 text-left transition-all ${
                selectedDnaIndex === idx 
                  ? 'border-black bg-gray-50 shadow-md' 
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="font-bold text-black mb-1">Option {idx + 1}</div>
              <div className="text-sm text-gray-500 capitalize">{opt.personality.replace('-', ' ')} • {opt.visual.themeMode ? `${opt.visual.themeMode} • ` : ''}{opt.visual.colorSystem}</div>
            </button>
          ))}
        </div>

        <div className="flex-1 border-4 border-gray-100 rounded-xl overflow-hidden relative bg-gray-50 max-h-[800px] h-[800px]">
          <ExperienceRenderer store={{ ...storeConfig, storeDnaDraft: JSON.stringify(selectedDna) }} previewMode={true} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[var(--border-color)] p-8 rounded-xl min-h-[600px] flex flex-col relative overflow-hidden">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-black mb-2">Store Generator</h1>
          <p className="text-[var(--text-muted)]">Create a unique, tailored storefront identity powered by your Store DNA.</p>
        </div>
        <button 
          onClick={() => handleGenerate(true)}
          disabled={loading}
          className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 shadow-lg"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          Surprise Me
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Basic Configuration */}
        <div className="lg:col-span-2 space-y-8">
          {/* Industry & Niche */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg border-b pb-2">1. Industry & Niche</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Industry</label>
                <select 
                  value={industry}
                  onChange={(e) => {
                    setIndustry(e.target.value);
                    setNiche(niches[e.target.value][0]);
                  }}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-black"
                >
                  {industries.map(ind => (
                    <option key={ind.id} value={ind.id}>{ind.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Specific Niche</label>
                <select 
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-black capitalize"
                >
                  {niches[industry]?.map(n => (
                    <option key={n} value={n}>{n.replace('-', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Brand Personality */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg border-b pb-2">2. Brand Personality</h3>
            <div className="grid grid-cols-2 gap-3">
              {personalities.map(p => (
                <div 
                  key={p.id}
                  onClick={() => setPersonality(p.id)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    personality === p.id 
                      ? 'border-black bg-gray-50' 
                      : 'border-gray-100 hover:border-gray-300'
                  }`}
                >
                  <div className="font-bold text-black">{p.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Features Sidebar */}
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 h-fit">
          <h3 className="font-bold text-lg mb-4">3. Select Features</h3>
          
          <div className="space-y-3">
            {[
              { id: 'megaMenu', label: 'Mega Menu', desc: 'Advanced categorised navigation' },
              { id: 'quickView', label: 'Quick View', desc: 'Product preview modal' },
              { id: 'aiConcierge', label: 'AI Concierge', desc: 'Smart shopping assistant' },
              { id: 'newsletterPopup', label: 'Newsletter Popup', desc: 'Capture email subscribers' }
            ].map(feature => (
              <label key={feature.id} className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-gray-300 transition-colors">
                <div className="mt-0.5">
                  <input 
                    type="checkbox" 
                    checked={selectedFeatures[feature.id]}
                    onChange={() => handleFeatureToggle(feature.id)}
                    className="w-4 h-4 accent-black"
                  />
                </div>
                <div>
                  <div className="font-bold text-sm">{feature.label}</div>
                  <div className="text-xs text-gray-500">{feature.desc}</div>
                </div>
              </label>
            ))}
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={() => handleGenerate(false)}
              disabled={loading}
              className="w-full py-4 bg-black text-white font-black rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                'Generate Store DNA'
              )}
            </button>
            <p className="text-xs text-center text-gray-500 mt-3">This creates a draft. Your live store won't change until you publish.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreGeneratorWizard;
