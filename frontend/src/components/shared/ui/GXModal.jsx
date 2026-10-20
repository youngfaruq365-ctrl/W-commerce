import React, { useEffect, useState } from 'react';
import GXIcon from '../assets/GXIcon';

const GXModal = ({ isOpen, onClose, title, children, maxWidth = "max-w-md", className = "" }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShow(true);
    } else {
      const timer = setTimeout(() => setShow(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen && !show) return null;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity" 
        onClick={onClose}
      ></div>
      
      {/* Modal Content */}
      <div 
        className={`relative modal-panel w-full ${maxWidth} bg-white/70 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh] transform transition-all duration-300 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'} ${className}`}
      >
        <div className="flex justify-between items-center p-6 border-b border-gray-200/50 dark:border-white/10 bg-white/40 dark:bg-black/20">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">{title}</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all duration-200"
          >
            <GXIcon name="shared.close" size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto hide-scrollbar text-gray-800 dark:text-gray-200">
          {children}
        </div>
      </div>
    </div>
  );
};

export default GXModal;
