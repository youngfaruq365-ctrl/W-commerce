import React from 'react';

const NotFound404 = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4">
      <div className="max-w-2xl w-full bg-[var(--bg-secondary)] rounded-xl shadow-lg border border-[var(--border-color)] p-8 text-center">
        <h1 className="text-3xl font-bold text-[var(--text-main)] mb-4">NotFound404</h1>
        <p className="text-[var(--text-muted)]">This page has been scaffolded and is pending implementation.</p>
      </div>
    </div>
  );
};

export default NotFound404;
