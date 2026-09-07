import React from 'react';

export function ProductCardSkeleton() {
  return (
    <div className="product-card skeleton">
      {/* Aspect Ratio 1/1 box */}
      <div className="skeleton-box" style={{ width: '100%', aspectRatio: '1/1', marginBottom: '1rem' }}></div>
      {/* Title */}
      <div className="skeleton-box" style={{ width: '80%', height: '1.2rem', marginBottom: '0.5rem' }}></div>
      <div className="skeleton-box" style={{ width: '60%', height: '1.2rem', marginBottom: '0.5rem' }}></div>
      {/* Price */}
      <div className="skeleton-box" style={{ width: '40%', height: '1.5rem', marginBottom: '0.5rem', marginTop: '0.5rem' }}></div>
      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
        <div className="skeleton-box" style={{ width: '40%', height: '1rem' }}></div>
        <div className="skeleton-box" style={{ width: '32px', height: '32px', borderRadius: '4px' }}></div>
      </div>
    </div>
  );
}

export function StoreCardSkeleton() {
  return (
    <div className="store-card skeleton" style={{ borderRadius: '12px', overflow: 'hidden', minHeight: '180px' }}>
      <div className="skeleton-box" style={{ width: '100%', height: '100%' }}></div>
    </div>
  );
}
