import React from 'react';

/**
 * SkeletonBlock — a single animated placeholder rectangle.
 */
export function SkeletonBlock({ className = '', style = {} }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-[var(--border-color)] ${className}`}
      style={style}
    />
  );
}

/**
 * SkeletonCard — a placeholder card matching a standard neu-card product/store tile.
 */
export function SkeletonCard({ className = '' }) {
  return (
    <div className={`neu-card p-4 flex flex-col gap-3 ${className}`}>
      <SkeletonBlock className="h-40 w-full" />
      <SkeletonBlock className="h-4 w-3/4" />
      <SkeletonBlock className="h-4 w-1/2" />
      <SkeletonBlock className="h-8 w-full mt-2" />
    </div>
  );
}

/**
 * SkeletonList — renders N skeleton cards in a grid.
 */
export function SkeletonList({ count = 4, className = '' }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/**
 * SkeletonRow — skeleton in a horizontal row (for store banners, carousels).
 */
export function SkeletonRow({ count = 3, cardWidth = 'w-[300px]', height = 'h-64', className = '' }) {
  return (
    <div className={`flex gap-6 overflow-hidden ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`neu-card shrink-0 ${cardWidth} ${height} animate-pulse bg-[var(--border-color)] rounded-2xl`} />
      ))}
    </div>
  );
}

/**
 * Spinner — inline loading spinner.
 */
export function Spinner({ size = 24, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`animate-spin ${className}`}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

/**
 * PageLoader — full-page centered loading state.
 */
export function PageLoader({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <Spinner size={40} className="text-blue-500" />
      <p className="text-sm font-bold text-[var(--text-muted)] animate-pulse">{message}</p>
    </div>
  );
}

export default { SkeletonBlock, SkeletonCard, SkeletonList, SkeletonRow, Spinner, PageLoader };
