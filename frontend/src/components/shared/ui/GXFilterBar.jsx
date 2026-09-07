import React from 'react';

const GXFilterBar = ({ children, className = '' }) => {
  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-4 premium-glass rounded-xl border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] mb-6 ${className}`}>
      {children}
    </div>
  );
};

export default GXFilterBar;
