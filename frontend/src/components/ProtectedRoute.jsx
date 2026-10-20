import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { ROUTES } from '../constants/routes';
import { useIsPresent } from 'framer-motion';

const ProtectedRoute = ({ roles = [] }) => {
  const { user, isAuthenticated, isCheckingAuth } = useAuthStore();
  const location = useLocation();
  const isPresent = useIsPresent();

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated && isPresent) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  const role = user?.role?.toUpperCase();
  const normalizedRoles = roles.map(r => r.toUpperCase());

  if (roles.length > 0 && (!role || !normalizedRoles.includes(role)) && isPresent) {
    // Redirect authenticated but unauthorized users to their respective dashboards or feed
    if (role === 'PENDING') return <Navigate to={ROUTES.ROLE_SELECTION} replace />;
    if (role === 'ADMIN') return <Navigate to={ROUTES.ADMIN_DASHBOARD} replace />;
    if (role === 'SELLER') return <Navigate to={ROUTES.SELLER_DASHBOARD} replace />;
    if (role === 'BUYER' || role === 'USER') return <Navigate to={ROUTES.BUYER_DASHBOARD} replace />;
    if (role === 'COURIER') return <Navigate to="/courier/dashboard" replace />;
    if (!role) return <Navigate to={ROUTES.ROLE_SELECTION} replace />;
    return <Navigate to={ROUTES.FEED} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
