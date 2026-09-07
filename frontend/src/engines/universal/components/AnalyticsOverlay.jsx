import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, MousePointerClick, Activity } from 'lucide-react';

export const AnalyticsOverlay = ({ store }) => {
  const [isActive, setIsActive] = useState(false);

  // Available for pro, studio, signature (price >= 13)
  if (!store || store.price < 13) return null;

  return (
    <>
      <button
        onClick={() => setIsActive(!isActive)}
        className={`fixed bottom-6 left-6 z-[100] px-4 py-3 rounded-full flex items-center gap-2 font-bold text-sm shadow-xl transition-all border ${
          isActive 
            ? 'bg-blue-600 text-white border-blue-500' 
            : 'bg-white text-black border-gray-200 hover:bg-gray-50'
        }`}
      >
        <Activity size={16} />
        {isActive ? 'Exit X-Ray' : 'X-Ray Analytics'}
      </button>

      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-[90] overflow-hidden"
          >
            {/* Fake Heatmap Gradients */}
            <div className="absolute top-[20%] left-[50%] w-[600px] h-[600px] bg-red-500/20 rounded-full blur-[100px] -translate-x-1/2" />
            <div className="absolute top-[60%] left-[20%] w-[400px] h-[400px] bg-orange-500/20 rounded-full blur-[80px]" />
            <div className="absolute top-[10%] right-[10%] w-[300px] h-[300px] bg-yellow-500/20 rounded-full blur-[60px]" />

            {/* Mock Floating Metrics */}
            <div className="absolute top-1/4 left-1/4 bg-black/80 backdrop-blur-md text-white p-3 rounded-xl border border-white/10 shadow-2xl flex items-center gap-3">
              <div className="bg-green-500/20 p-2 rounded-lg text-green-400"><MousePointerClick size={16} /></div>
              <div>
                <div className="text-xs opacity-60 font-medium">Click Rate</div>
                <div className="font-black text-lg">14.2%</div>
              </div>
            </div>

            <div className="absolute top-1/3 right-1/4 bg-black/80 backdrop-blur-md text-white p-3 rounded-xl border border-white/10 shadow-2xl flex items-center gap-3">
              <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400"><BarChart3 size={16} /></div>
              <div>
                <div className="text-xs opacity-60 font-medium">Conversion</div>
                <div className="font-black text-lg">4.8%</div>
              </div>
            </div>

            <div className="absolute bottom-1/3 left-1/3 bg-black/80 backdrop-blur-md text-white p-3 rounded-xl border border-white/10 shadow-2xl flex items-center gap-3">
              <div className="bg-purple-500/20 p-2 rounded-lg text-purple-400"><Activity size={16} /></div>
              <div>
                <div className="text-xs opacity-60 font-medium">Engagement</div>
                <div className="font-black text-lg">High</div>
              </div>
            </div>
            
            {/* Overlay grid lines */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgwem0yMCAyMHYyMGgyMFYyMHoiIGZpbGw9IiNmZmZmZmYwNSIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+')] opacity-20 mix-blend-overlay" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
