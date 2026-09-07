import React from 'react';

// For lightweight SVGs
export const WIllustration = ({ name, className = '', ...props }) => {
  // We can expand this to load actual SVGs dynamically based on the name
  return (
    <div className={`flex items-center justify-center ${className}`} {...props}>
      <img src={`/assets/illustrations/${name}.svg`} alt={name} className="max-w-full max-h-full object-contain" />
    </div>
  );
};

export default WIllustration;
