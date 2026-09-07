import React from 'react';

const PopupBadge = ({ text, theme }) => {
  return (
    <div className="absolute top-4 right-4 z-10">
      <span 
        className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg transform rotate-3"
        style={{ backgroundColor: theme?.accent || '#D8B45A', color: theme?.background || '#35104A' }}
      >
        {text}
      </span>
    </div>
  );
};

export default PopupBadge;
