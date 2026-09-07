import React from 'react';
import GXIllustration from '../assets/GXIllustration';

const GXEmptyState = ({ title, description, actionText, onAction, illustrationName = "empty-search", className = '' }) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] rounded-xl border-dashed bg-white/50 animate-[fadeIn_0.5s_ease-in-out] ${className}`}>
      <GXIllustration name={illustrationName} className="w-32 h-32 mb-6 opacity-80 grayscale" />
      <h3 className="text-lg font-bold text-black mb-2">{title}</h3>
      {description && <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto mb-6">{description}</p>}
      {actionText && onAction && (
        <button 
          onClick={onAction}
          className="bg-[var(--bg-tertiary)] hover:bg-[var(--accent-gray)] text-black hover:text-black transition-colors px-6 py-2.5 rounded-lg font-bold text-sm"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

export default GXEmptyState;
