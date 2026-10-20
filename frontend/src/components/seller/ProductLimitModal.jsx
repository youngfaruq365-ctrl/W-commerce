import React from 'react';
import { Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ProductLimitModal = ({ isOpen, onClose, onUpgrade }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="modal-panel premium-glass rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative"
        >
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-3">
            You've reached your product limit
          </h2>
          
          <p className="text-gray-600 text-center text-sm sm:text-base mb-6 leading-relaxed">
            Free plan allows up to 20 products. Upgrade to Pro to add unlimited products and unlock powerful features.
          </p>

          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-6 py-3">
              <Lock className="text-green-600" size={24} />
              <span className="text-xl font-bold text-gray-900 tracking-tight">20 / 20</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button 
              onClick={onUpgrade}
              className="w-full bg-[#15803d] hover:bg-[#166534] text-white font-bold py-3.5 px-4 rounded-xl transition-colors shadow-sm"
            >
              Upgrade to Pro
            </button>
            <button 
              onClick={onClose}
              className="w-full text-gray-500 hover:text-gray-700 font-medium py-2 px-4 transition-colors text-sm"
            >
              Maybe later
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ProductLimitModal;
