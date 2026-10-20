import React from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useSellerData } from '../context/SellerDataContext';

export const MenuGrid = ({ store, motionVariants }) => {
  const { products } = useSellerData();
  return (
    <div className="py-20 px-6 max-w-7xl mx-auto">
      <motion.h2 variants={motionVariants.cardEntrance} className="text-4xl font-black mb-12 text-center" style={{ color: 'var(--store-text)' }}>
        POPULAR MENU
      </motion.h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {products.map((product) => (
          <motion.div 
            key={product.id} 
            variants={motionVariants.cardEntrance}
            whileHover={motionVariants.hover}
            className="bg-white rounded-[var(--store-radius)] overflow-hidden shadow-sm hover:shadow-xl transition-shadow"
          >
            <div className="h-48 bg-gray-200 relative">
               <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
            </div>
            <div className="p-6">
              <h3 className="font-bold text-xl mb-2 text-gray-900">{product.title}</h3>
              <p className="text-gray-500 mb-4">{product.description}</p>
              <div className="flex justify-between items-center">
                <span className="font-black text-xl" style={{ color: 'var(--store-primary)' }}>₦{product.price.toFixed(2)}</span>
                <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-md" style={{ backgroundColor: 'var(--store-primary)' }}>+</button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
