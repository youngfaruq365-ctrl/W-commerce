import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Rotate3D, Maximize2 } from 'lucide-react';

export const SpatialViewer = ({ product, isOpen, onClose }) => {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isOpen) return;
      const x = (e.clientX / window.innerWidth - 0.5) * 40; // max rotation
      const y = (e.clientY / window.innerHeight - 0.5) * 40;
      setRotation({ x: y, y: x });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 p-8 flex justify-between items-center z-10 text-white">
            <div className="flex items-center gap-4">
              <Rotate3D size={24} className="text-white/50" />
              <div>
                <div className="text-xs uppercase tracking-widest opacity-50 font-black">Spatial View</div>
                <div className="text-lg font-bold">{product?.name}</div>
              </div>
            </div>
            <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>

          {/* 3D Simulated Object */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 20 }}
            className="relative w-[500px] h-[500px] flex items-center justify-center perspective-[1000px]"
          >
            {/* The fake 3D element: We use drop-shadows and rotateX/Y to simulate a 3D object in space */}
            <motion.div
              style={{
                rotateX: rotation.x,
                rotateY: rotation.y,
                transformStyle: 'preserve-3d',
              }}
              className="relative w-full h-full flex items-center justify-center transition-transform duration-75 ease-out"
            >
              {/* Back reflection */}
              <div 
                className="absolute inset-10 bg-white/5 rounded-3xl blur-2xl" 
                style={{ transform: 'translateZ(-50px)' }} 
              />
              
              {/* Main image */}
              <img 
                src={product?.image} 
                alt={product?.name} 
                className="w-4/5 h-4/5 object-cover rounded-2xl shadow-2xl shadow-black/50" 
                style={{ transform: 'translateZ(20px)' }}
              />

              {/* Front glare */}
              <div 
                className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent mix-blend-overlay rounded-2xl" 
                style={{ transform: 'translateZ(30px)' }} 
              />
            </motion.div>
          </motion.div>

          {/* Footer Controls */}
          <div className="absolute bottom-12 text-white/50 flex gap-8 font-medium text-sm">
            <div className="flex items-center gap-2"><Maximize2 size={16} /> Drag to rotate</div>
            <div className="flex items-center gap-2">Scroll to zoom</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
