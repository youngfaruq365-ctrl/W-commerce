import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { ROUTES } from '../constants/routes';

const RootRedirect = () => {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    const role = user?.role?.toUpperCase();
    if (!role || role === 'PENDING') return <Navigate to={ROUTES.ROLE_SELECTION} replace />;
  }

  // Everyone goes to the feed by default to browse products
  return <Navigate to={ROUTES.FEED} replace />;
};

export default RootRedirect;
