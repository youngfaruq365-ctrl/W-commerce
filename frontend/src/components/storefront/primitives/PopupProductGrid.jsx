import React from 'react';
import { Star } from 'lucide-react';

const PopupProductGrid = ({ title, products = [], theme }) => {
  // If no products provided, render some mock placeholders for the preview
  const displayProducts = products.length > 0 ? products : [
    { id: 1, name: 'Premium Item 1', price: '₦45.00' },
    { id: 2, name: 'Premium Item 2', price: '₦85.00' },
    { id: 3, name: 'Premium Item 3', price: '₦120.00' },
    { id: 4, name: 'Premium Item 4', price: '₦25.00' }
  ];

  return (
    <div className="bg-black/5 dark:bg-white/5 p-6" style={{ backgroundColor: theme?.surface || 'rgba(0,0,0,0.1)' }}>
      {title && (
        <h3 className="text-sm font-bold opacity-90 mb-4 text-center">
          {title}
        </h3>
      )}
      
      <div className="grid grid-cols-2 gap-3">
        {displayProducts.map(prod => (
          <div key={prod.id} className="bg-white/10 dark:bg-black/10 rounded-lg p-2 flex flex-col gap-2 transition-transform hover:scale-105 cursor-pointer">
            <div className="w-full h-24 bg-black/5 dark:bg-white/5 rounded object-cover flex items-center justify-center">
              {prod.image ? (
                <img src={prod.image} alt={prod.name} className="w-full h-full object-cover rounded" />
              ) : (
                <Star size={12} className="opacity-20" />
              )}
            </div>
            <div className="text-xs font-semibold truncate">{prod.name}</div>
            <div className="text-xs opacity-70">{prod.price}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PopupProductGrid;
