import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, Plus, Edit2, Trash2, Smartphone, Save, ChefHat, ExternalLink, Menu as MenuIcon } from 'lucide-react';

const QRMenuConfigView = () => {
  const [categories, setCategories] = useState([
    { id: 'cat-1', name: 'Starters', items: [
      { id: 'i-1', name: 'Truffle Fries', price: '$8.00', desc: 'Crispy fries with parmesan and truffle oil' },
      { id: 'i-2', name: 'Calamari', price: '$12.00', desc: 'Lightly fried with lemon aioli' }
    ]},
    { id: 'cat-2', name: 'Mains', items: [
      { id: 'i-3', name: 'Wagyu Burger', price: '$24.00', desc: '8oz wagyu beef, brioche bun, aged cheddar' },
      { id: 'i-4', name: 'Grilled Salmon', price: '$28.00', desc: 'Wild caught salmon with seasonal veg' }
    ]}
  ]);

  const [activeCategory, setActiveCategory] = useState(categories[0].id);
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = () => {
    setIsPublishing(true);
    setTimeout(() => setIsPublishing(false), 1500);
  };

  return (
    <div className="bg-white border border-[var(--border-color)] p-8 rounded-xl min-h-[800px] flex flex-col relative overflow-hidden">
      
      {/* Header */}
      <div className="flex justify-between items-start mb-8 border-b border-[var(--border-color)] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-black mb-2 flex items-center gap-3">
            <QrCode className="text-[var(--accent-gray-dark)]" size={32} />
            Digital Menu Builder
          </h1>
          <p className="text-[var(--text-muted)] text-sm">Design your QR menu, update prices in real-time, and publish to all tables instantly.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  className="bg-white border border-[var(--border-color)] text-black font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors shadow-sm">
            <ExternalLink size={16} /> Preview
          </button>
          <button 
            onClick={handlePublish}
            className="bg-black hover:bg-gray-900 text-white font-bold px-6 py-2 rounded-xl text-sm flex items-center gap-2 transition-colors relative overflow-hidden"
          >
            {isPublishing ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Publishing...
              </motion.div>
            ) : (
              <>
                <Save size={16} /> Publish Changes
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 flex-1">
        
        {/* Editor Section */}
        <div className="flex-1 flex flex-col">
          {/* Categories Nav */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 custom-scrollbar">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${
                  activeCategory === cat.id 
                    ? 'bg-black text-white shadow-md scale-105' 
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:bg-gray-100 hover:text-black'
                }`}
              >
                {cat.name}
              </button>
            ))}
            <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  className="px-4 py-2 rounded-lg font-bold text-sm text-[var(--text-muted)] hover:text-black hover:bg-gray-100 flex items-center gap-1 border border-dashed border-gray-300 ml-2">
              <Plus size={14} /> New Category
            </button>
          </div>

          {/* Menu Items List */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            <AnimatePresence mode="popLayout">
              {categories.find(c => c.id === activeCategory)?.items.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white border border-[var(--border-color)] rounded-xl p-4 flex gap-4 group hover:border-black/30 transition-colors shadow-sm"
                >
                  <div className="w-20 h-20 bg-[var(--bg-tertiary)] rounded-lg flex items-center justify-center flex-shrink-0">
                    <ChefHat className="text-gray-400" size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-black text-lg truncate">{item.name}</h3>
                      <span className="font-mono font-bold text-[var(--accent-gray-dark)] bg-gray-100 px-2 py-1 rounded text-sm">{item.price}</span>
                    </div>
                    <p className="text-sm text-[var(--text-muted)] line-clamp-2 leading-relaxed">{item.desc}</p>
                  </div>
                  <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  className="p-2 rounded-lg bg-gray-50 text-gray-600 hover:text-black hover:bg-gray-100"><Edit2 size={16} /></button>
                    <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"><Trash2 size={16} /></button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  className="w-full bg-[var(--bg-tertiary)] border-2 border-dashed border-[var(--border-color)] rounded-xl p-4 flex items-center justify-center gap-2 text-[var(--text-muted)] font-bold hover:bg-gray-50 hover:text-black hover:border-black/30 transition-all mt-4">
              <Plus size={20} /> Add New Item to {categories.find(c => c.id === activeCategory)?.name}
            </button>
          </div>
        </div>

        {/* Live Preview & QR Gen */}
        <div className="w-full lg:w-[350px] flex flex-col gap-6">
          <div className="bg-[var(--bg-tertiary)] rounded-3xl p-6 border border-[var(--border-color)] flex flex-col items-center flex-shrink-0 shadow-inner">
            <h3 className="font-bold text-black mb-4 flex items-center gap-2"><Smartphone size={18}/> Table QR Code</h3>
            <div className="bg-white p-4 rounded-xl shadow-lg mb-4 transform hover:scale-105 transition-transform cursor-pointer">
              {/* Dummy QR Code UI */}
              <div className="w-48 h-48 bg-[url('https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=w-commerce.com/menu')] bg-contain" />
            </div>
            <select className="w-full bg-white border border-[var(--border-color)] rounded-lg px-4 py-2 font-bold text-sm text-black outline-none mb-3 shadow-sm">
              <option>Table 1</option>
              <option>Table 2</option>
              <option>Table 3</option>
              <option>Bar Area</option>
            </select>
            <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  className="w-full bg-black text-white font-bold py-2 rounded-lg text-sm hover:bg-gray-900 transition-colors">
              Download Table Tent
            </button>
          </div>

          <div className="bg-white border border-[var(--border-color)] rounded-xl p-5 flex-1 overflow-hidden shadow-sm flex flex-col relative">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-200 via-gray-800 to-gray-200" />
             <h3 className="font-bold text-black mb-1 flex items-center gap-2 mt-2"><MenuIcon size={16}/> Customer Preview</h3>
             <p className="text-xs text-[var(--text-muted)] mb-4">Live simulation of the mobile menu.</p>
             <div className="flex-1 bg-gray-50 rounded-lg border border-gray-200 p-3 overflow-hidden flex flex-col">
                <div className="bg-black text-white p-3 rounded-t-lg font-bold text-center text-sm">Your Restaurant</div>
                <div className="flex-1 overflow-y-auto space-y-2 p-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2 mt-2"></div>
                  <div className="h-16 bg-white border border-gray-100 rounded-md shadow-sm"></div>
                  <div className="h-16 bg-white border border-gray-100 rounded-md shadow-sm"></div>
                </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default QRMenuConfigView;
