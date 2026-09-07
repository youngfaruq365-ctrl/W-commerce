import React from 'react';

export const ResponsiveLayout = ({ children }) => {
  return (
    <div className="w-full min-h-screen bg-[var(--bg-primary)] overflow-x-hidden relative">
      {children}
    </div>
  );
};
