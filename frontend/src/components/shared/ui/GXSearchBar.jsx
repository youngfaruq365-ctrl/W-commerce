import React from 'react';
import GXIcon from '../assets/GXIcon';

const GXSearchBar = ({ placeholder = "Search...", value, onChange, className = '' }) => {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <GXIcon name="shared.search" size={18} className="text-gray-500" />
      </div>
      <input
        type="text"
        className="block w-full pl-10 pr-3 py-2 border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] rounded-lg leading-5 bg-[#111] text-gray-800 placeholder-gray-500 focus:outline-none focus:border-[var(--accent-gray)] focus:ring-1 focus:ring-[var(--accent-gray)] sm:text-sm transition-colors"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};

export default GXSearchBar;
