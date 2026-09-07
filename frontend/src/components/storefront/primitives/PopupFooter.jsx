import React from 'react';

const PopupFooter = ({ text, linkText, onLinkClick, theme }) => {
  return (
    <div className="p-4 pt-0 text-center text-xs opacity-60">
      {text}
      {linkText && (
        <button 
          onClick={onLinkClick} 
          className="ml-1 underline hover:opacity-100 transition-opacity"
          style={{ color: theme?.accent || 'inherit' }}
        >
          {linkText}
        </button>
      )}
    </div>
  );
};

export default PopupFooter;
