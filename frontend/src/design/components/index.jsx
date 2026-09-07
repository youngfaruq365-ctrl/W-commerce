import React from 'react';

export const WButton = ({ children, variant = 'primary', size = 'md', fullWidth, icon, iconRight, onClick, disabled, className = '', loading }) => {
  const baseStyle = "inline-flex items-center justify-center gap-2 font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-black text-white dark:bg-white dark:text-black hover:opacity-90 shadow-lg",
    ghost: "bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-main)] hover:bg-[var(--border-color)]",
    danger: "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20"
  };

  const sizes = {
    xs: "px-3 py-1.5 text-xs",
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base"
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled || loading} 
      className={`${baseStyle} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {loading && <span className="animate-spin mr-1">↻</span>}
      {icon && !loading && <span>{icon}</span>}
      {children}
      {iconRight && <span>{iconRight}</span>}
    </button>
  );
};

export const WBadge = ({ children, variant = 'gray', className = '' }) => {
  const variants = {
    gray: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700",
    success: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
    warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
    danger: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${variants[variant] || variants.gray} ${className}`}>
      {children}
    </span>
  );
};

export const WAvatar = ({ src, alt, size = 'md', className = '' }) => {
  const sizes = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-24 h-24"
  };
  
  return (
    <div className={`relative rounded-full overflow-hidden border border-[var(--border-color)] bg-[var(--bg-tertiary)] flex-shrink-0 ${sizes[size] || sizes.md} ${className}`}>
      {src ? (
        <img src={src} alt={alt || 'Avatar'} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] font-bold text-lg">
          {alt ? alt.charAt(0).toUpperCase() : '?'}
        </div>
      )}
    </div>
  );
};

export const WInput = ({ label, error, className = '', ...props }) => {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label className="text-sm font-bold">{label}</label>}
      <input 
        className={`w-full bg-[var(--bg-tertiary)] border ${error ? 'border-red-500' : 'border-[var(--border-color)]'} rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--border-hover)] transition-colors`}
        {...props}
      />
      {error && <span className="text-xs text-red-500 font-bold">{error}</span>}
    </div>
  );
};

export const WCard = ({ children, className = '' }) => {
  return (
    <div className={`bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 ${className}`}>
      {children}
    </div>
  );
};

export const WSkeleton = ({ className = '' }) => {
  return (
    <div className={`animate-pulse bg-[var(--bg-tertiary)] rounded-xl ${className}`}></div>
  );
};

export const WStarRating = ({ rating = 0, max = 5, className = '' }) => {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {[...Array(max)].map((_, i) => (
        <span key={i} className={`text-sm ${i < rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}>
          ★
        </span>
      ))}
    </div>
  );
};
