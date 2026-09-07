import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { ROUTES } from '../constants/routes';

const GuestGuard = () => {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    const userRole = user?.role?.toUpperCase();
    // If they are logged in, redirect them away from auth pages
    if (!userRole || userRole === 'PENDING') {
      return <Navigate to={ROUTES.ROLE_SELECTION} replace />;
    } else if (userRole === 'SELLER') {
      return <Navigate to={ROUTES.SELLER_DASHBOARD} replace />;
    } else if (userRole === 'ADMIN') {
      return <Navigate to={ROUTES.ADMIN_DASHBOARD} replace />;
    } else if (userRole === 'COURIER') {
      return <Navigate to={ROUTES.COURIER_DASHBOARD} replace />;
    }
    return <Navigate to={ROUTES.BUYER_DASHBOARD} replace />;
  }

  return <Outlet />;
};

export default GuestGuard;
