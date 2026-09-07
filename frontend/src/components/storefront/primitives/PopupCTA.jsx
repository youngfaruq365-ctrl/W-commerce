import React from 'react';

const PopupCTA = ({ label, action, theme, onClick }) => {
  if (!label) return null;
  
  return (
    <div className="p-6 pt-0 text-center w-full">
      <button 
        onClick={onClick}
        className="w-full py-3 px-6 rounded-xl font-bold uppercase tracking-wider transition-transform hover:scale-[1.02] active:scale-95 shadow-lg"
        style={{ 
          backgroundColor: theme?.accent || '#D8B45A', 
          color: theme?.background || '#35104A' 
        }}
      >
        {label}
      </button>
    </div>
  );
};

export default PopupCTA;
