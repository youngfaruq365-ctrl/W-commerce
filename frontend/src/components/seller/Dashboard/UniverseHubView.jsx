import React, { useState } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import StoreMarketplace from '../../../components/store-marketplace/StoreMarketplace';
import TemplateMarketplace from '../Templates/TemplateMarketplace';
import { 
  Store, Palette, Component, Bot, Zap, BarChart2, 
  Megaphone, LayoutTemplate, Link, Users, Globe, Trophy, 
  ChevronRight, Sparkles, CheckCircle, Search, Download
} from 'lucide-react';

const MARKETPLACES = [
  { id: 'engines', name: 'Business Engines', icon: Store, description: 'Complete operating systems for your industry', count: 15 },
  { id: 'stores', name: 'Store Experiences', icon: Palette, description: 'Premium UI designs and storefront experiences', count: 150 },
  { id: 'components', name: 'Component Store', icon: Component, description: 'Plug-and-play widgets for your store', count: 128 },
  { id: 'ai', name: 'AI Employees', icon: Bot, description: 'Hire AI for support, marketing, and sales', count: 24 },
  { id: 'automation', name: 'Automations', icon: Zap, description: 'Drag & drop workflows to scale operations', count: 85 },
  { id: 'analytics', name: 'Analytics Models', icon: BarChart2, description: 'Custom data models and reporting dashboards', count: 18 },
  { id: 'marketing', name: 'Marketing Hub', icon: Megaphone, description: 'Campaign generators and ad tools', count: 36 },
  { id: 'templates', name: 'Templates', icon: LayoutTemplate, description: 'Pre-designed pages and sales funnels', count: 210 },
  { id: 'integrations', name: 'Integrations', icon: Link, description: 'Connect payment, delivery, and CRMs', count: 94 },
  { id: 'experts', name: 'Expert Network', icon: Users, description: 'Hire top designers and developers', count: 500 },
  { id: 'community', name: 'Community', icon: Globe, description: 'Shared resources and networking', count: '1M+' },
  { id: 'achievements', name: 'Achievements', icon: Trophy, description: 'Seller levels, badges, and growth programs', count: 10 }
];

const ENGINES = [
  { 
    id: 'fashion', name: 'Fashion Engine', price: '$59/mo', tag: 'Most Popular',
    color: 'from-pink-500 to-rose-500', 
    features: ['AI Stylist', 'Lookbook Builder', 'Size Guide', 'Auto Restock', 'Instagram Sync']
  },
  { 
    id: 'restaurant', name: 'Restaurant Engine', price: '$69/mo', tag: 'Trending',
    color: 'from-orange-500 to-amber-500', 
    features: ['Kitchen Display', 'Table Booking', 'QR Menu', 'Delivery Routing', 'Recipe Costing']
  },
  { 
    id: 'creator', name: 'Creator Engine', price: '$49/mo', tag: 'New',
    color: 'from-purple-500 to-indigo-500', 
    features: ['Link in Bio', 'Video Store', 'Memberships', 'Tips & Donations', 'Digital Products']
  },
  { 
    id: 'health', name: 'Healthcare Engine', price: '$89/mo', 
    color: 'from-blue-500 to-cyan-500', 
    features: ['Prescription Upload', 'Consultation Booking', 'Medical Records', 'Refill Reminders', 'HIPAA Ready']
  },
  { 
    id: 'realestate', name: 'Property Engine', price: '$149/mo',
    color: 'from-emerald-500 to-teal-500', 
    features: ['Virtual Tours', 'Agent Profiles', 'Mortgage Calc', 'Booking System', 'Map Integration']
  },
  { 
    id: 'automotive', name: 'Automotive Engine', price: '$99/mo',
    color: 'from-red-500 to-orange-500', 
    features: ['Service Scheduling', 'Parts Lookup', 'Financing Calc', 'Vehicle Models', 'CRM Sync']
  }
];

const UniverseHubView = ({ onInstallEngine }) => {
  const [activeMarket, setActiveMarket] = useState('engines');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="bg-white border border-[var(--border-color)] p-4 md:p-8 rounded-xl min-h-[800px] flex flex-col relative overflow-hidden">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 relative z-10">
        <div>
          <h1 className="text-3xl font-extrabold text-black mb-2 flex items-center gap-3">
            <Globe className="text-[var(--accent-gray-dark)]" size={32} />
            W-Commerce Universe
          </h1>
          <p className="text-[var(--text-muted)] text-sm">
            The Business Operating System Platform. Upgrade your store's DNA.
          </p>
        </div>
        
        <div className="relative w-full md:w-72">
          <input 
            type="text" 
            placeholder="Search engines, themes, AI..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-black pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-[var(--accent-gray)] focus:ring-1 focus:ring-[var(--accent-gray)] transition-all"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 h-full relative z-10">
        
        {/* Marketplaces Sidebar */}
        <div className="w-full lg:w-72 flex flex-col gap-2 overflow-y-auto pr-2 hide-scrollbar">
          <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 px-2">Marketplaces</div>
          {MARKETPLACES.map((market) => (
            <button
              key={market.id}
              onClick={() => setActiveMarket(market.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-left w-full group
                ${activeMarket === market.id 
                  ? 'bg-black text-white shadow-lg' 
                  : 'bg-[var(--bg-tertiary)] hover:bg-gray-100 text-gray-700 border border-transparent hover:border-gray-200'
                }`}
            >
              <div className={`p-2 rounded-lg ${activeMarket === market.id ? 'bg-white/20' : 'bg-white shadow-sm group-hover:shadow-md transition-shadow'}`}>
                <market.icon size={18} className={activeMarket === market.id ? 'text-white' : 'text-black'} />
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm">{market.name}</div>
                {activeMarket !== market.id && (
                  <div className="text-xs text-[var(--text-muted)] truncate">{market.description}</div>
                )}
              </div>
              {activeMarket === market.id && (
                <ChevronRight size={16} className="text-white/70" />
              )}
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-2xl p-0 md:p-6 overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait">
            {activeMarket === 'engines' && (
              <motion.div
                key="engines"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-black mb-1">Business Engines</h2>
                    <p className="text-[var(--text-muted)] text-sm">Completely replace your workspace with an industry-specific OS.</p>
                  </div>
                  <div className="bg-[var(--accent-gray)]/20 text-[var(--accent-gray-dark)] px-3 py-1 rounded-full text-xs font-bold border border-[var(--accent-gray)]/30">
                    15 Available
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {ENGINES.map((engine, idx) => (
                    <div key={engine.id} className="bg-white border border-[var(--border-color)] rounded-2xl p-6 relative overflow-hidden group hover:shadow-[0_10px_40px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                      
                      {/* Decorative Background */}
                      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${engine.color} opacity-10 blur-2xl rounded-full group-hover:opacity-20 transition-opacity duration-500`}></div>
                      
                      <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${engine.color} flex items-center justify-center shadow-lg text-white`}>
                            <Store size={24} />
                          </div>
                          <div>
                            <h3 className="font-extrabold text-black text-lg">{engine.name}</h3>
                            <div className="text-sm text-[var(--text-muted)]">{engine.price}</div>
                          </div>
                        </div>
                        {engine.tag && (
                          <div className={`text-xs font-bold px-2 py-1 rounded bg-black text-white`}>
                            {engine.tag}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 mb-6 relative z-10">
                        {engine.features.map((feature, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                            <CheckCircle size={14} className="text-gray-400" />
                            {feature}
                          </div>
                        ))}
                      </div>

                      <button 
                        onClick={() => onInstallEngine(engine.id)}
                        className="w-full bg-black hover:bg-gray-900 text-white font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 relative z-10"
                      >
                        <Download size={16} /> Install Engine
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeMarket === 'stores' && (
              <motion.div
                key="stores"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="h-full w-full bg-white rounded-2xl overflow-y-auto"
              >
                <StoreMarketplace />
              </motion.div>
            )}

            {activeMarket === 'templates' && (
              <motion.div
                key="templates"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="h-full w-full"
              >
                <TemplateMarketplace />
              </motion.div>
            )}

            {activeMarket !== 'engines' && activeMarket !== 'stores' && activeMarket !== 'templates' && (
              <motion.div
                key="other"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="flex flex-col items-center justify-center h-full min-h-[400px] text-center"
              >
                <div className="w-20 h-20 bg-white border border-[var(--border-color)] shadow-xl rounded-2xl flex items-center justify-center mb-6">
                  <Sparkles className="text-gray-600" size={32} />
                </div>
                <h3 className="text-2xl font-bold text-black mb-2">
                  {MARKETPLACES.find(m => m.id === activeMarket)?.name}
                </h3>
                <p className="text-[var(--text-muted)] max-w-md mx-auto mb-6">
                  {MARKETPLACES.find(m => m.id === activeMarket)?.description}. This marketplace is currently in early access. Check back soon for thousands of new listings.
                </p>
                <button onClick={async () => {
                  try {
                    await axios.post('http://localhost:5000/api/v1/hub/waitlist', { marketplace: activeMarket }, { withCredentials: true });
                    toast.success('Joined waitlist successfully!');
                  } catch (error) {
                    toast.error('Failed to join waitlist');
                  }
                }} className="bg-white border border-[var(--border-color)] hover:bg-gray-50 text-black font-bold px-6 py-2.5 rounded-xl shadow-sm transition-all">
                  Join Waitlist
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default UniverseHubView;
