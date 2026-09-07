import React from 'react';

const GXSkeleton = ({ variant = 'card', className = '' }) => {
  const baseClass = "animate-pulse bg-[var(--bg-tertiary)] rounded-lg";
  
  if (variant === 'card') {
    return (
      <div className={`p-4 border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] rounded-xl space-y-3 ${className}`}>
        <div className={`${baseClass} h-32 w-full`}></div>
        <div className={`${baseClass} h-4 w-3/4 mt-4`}></div>
        <div className={`${baseClass} h-3 w-1/2`}></div>
        <div className="flex justify-between mt-4">
          <div className={`${baseClass} h-6 w-1/4`}></div>
          <div className={`${baseClass} h-6 w-1/4`}></div>
        </div>
      </div>
    );
  }

  if (variant === 'dashboard-stat') {
    return (
      <div className={`p-6 border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] rounded-xl bg-white ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div className={`${baseClass} h-4 w-1/3`}></div>
          <div className={`${baseClass} h-8 w-8 rounded-full`}></div>
        </div>
        <div className={`${baseClass} h-8 w-1/2 mb-2`}></div>
        <div className={`${baseClass} h-3 w-1/4`}></div>
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={`border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] rounded-xl overflow-hidden bg-white ${className}`}>
        <div className={`${baseClass} h-10 w-full rounded-none`}></div>
        <div className="p-4 space-y-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex justify-between">
              <div className={`${baseClass} h-4 w-1/4`}></div>
              <div className={`${baseClass} h-4 w-1/4`}></div>
              <div className={`${baseClass} h-4 w-1/6`}></div>
              <div className={`${baseClass} h-4 w-1/6`}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  if (variant === 'avatar') {
    return <div className={`${baseClass} h-12 w-12 rounded-full ${className}`}></div>;
  }

  // Default block
  return <div className={`${baseClass} w-full h-full ${className}`}></div>;
};

export default GXSkeleton;
