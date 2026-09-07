import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Palette, Type, Sparkles } from 'lucide-react';

const FONTS = ['sans', 'serif', 'mono', 'system-ui'];
const COLORS = ['#000000', '#ffffff', '#FF5722', '#2E7D32', '#1976D2', '#C9A96E', '#6D4C41', '#E91E63'];

export const ThemeCustomizer = ({ store, customCss, setCustomCss }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Only show for studio/signature (price >= 16)
  if (!store || store.price < 16) return null;

  const updateVar = (key, value) => {
    setCustomCss(prev => ({ ...prev, [key]: value }));
  };

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-6 right-6 z-[100] w-12 h-12 bg-black text-white rounded-full flex items-center justify-center shadow-2xl border border-white/20"
      >
        <Settings size={20} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed top-0 right-0 bottom-0 w-80 bg-white/90 backdrop-blur-3xl z-[150] shadow-2xl border-l border-gray-200 flex flex-col text-black"
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-2 font-black text-lg">
                <Sparkles size={18} className="text-purple-600" />
                Design Studio
              </div>
              <button onClick={() => setIsOpen(false)} className="opacity-50 hover:opacity-100">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-8 flex-1 overflow-y-auto">
              {/* Colors */}
              <div>
                <div className="flex items-center gap-2 text-sm font-bold mb-4 opacity-70 uppercase tracking-widest">
                  <Palette size={14} /> Primary Color
                </div>
                <div className="flex flex-wrap gap-3">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => updateVar('--s-primary', c)}
                      className="w-10 h-10 rounded-full border-2 border-transparent transition-transform hover:scale-110"
                      style={{ backgroundColor: c, borderColor: customCss['--s-primary'] === c ? '#000' : 'transparent', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                    />
                  ))}
                  <input 
                    type="color" 
                    value={customCss['--s-primary'] || '#000000'}
                    onChange={e => updateVar('--s-primary', e.target.value)}
                    className="w-10 h-10 rounded-full overflow-hidden cursor-pointer p-0 border-0"
                  />
                </div>
              </div>

              {/* Typography */}
              <div>
                <div className="flex items-center gap-2 text-sm font-bold mb-4 opacity-70 uppercase tracking-widest">
                  <Type size={14} /> Typography
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {FONTS.map(font => (
                    <button
                      key={font}
                      onClick={() => {
                        updateVar('--s-font-heading', font);
                        updateVar('--s-font-body', font);
                      }}
                      className={`py-3 px-4 rounded-xl text-sm capitalize transition-all border ${
                        customCss['--s-font-heading'] === font 
                          ? 'border-black bg-black text-white font-bold' 
                          : 'border-gray-200 hover:border-gray-400 bg-white'
                      }`}
                      style={{ fontFamily: font }}
                    >
                      {font}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
