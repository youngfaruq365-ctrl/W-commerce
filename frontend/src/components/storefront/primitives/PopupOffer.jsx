import React from 'react';

const PopupOffer = ({ discount, discountType, code, description, theme }) => {
  return (
    <div className="flex flex-col items-center my-6">
      <div 
        className="text-6xl font-black mb-2 tracking-tighter"
        style={{ 
          color: theme?.accent || '#D8B45A',
          textShadow: theme?.textShadow ? '0 4px 20px rgba(0,0,0,0.3)' : 'none'
        }}
      >
        {discountType === 'percentage' ? `${discount}% OFF` : `$${discount} OFF`}
      </div>
      
      {description && (
        <p className="text-lg opacity-80 max-w-[80%] mx-auto text-center mb-4">
          {description}
        </p>
      )}

      {code && (
        <div 
          className="px-6 py-3 rounded border-2 border-dashed font-mono text-xl font-bold uppercase tracking-widest mt-2 bg-black/10 dark:bg-white/10"
          style={{ borderColor: theme?.accent || '#D8B45A', color: theme?.text || 'inherit' }}
        >
          {code}
        </div>
      )}
    </div>
  );
};

export default PopupOffer;
