import React from 'react';
import { Outlet } from 'react-router-dom';
import AppShell from './AppShell';

export const SellerShell = ({ children, className = '' }) => {
  return (
    <AppShell className={`sellershell ${className}`}>
      {children || <Outlet />}
    </AppShell>
  );
};
export default SellerShell;
