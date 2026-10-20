import React from 'react';
import { Outlet } from 'react-router-dom';
import AppShell from './AppShell';

export const SellerShell = ({ className = '' }) => {
  return (
    <AppShell className={`sellershell ${className}`}>
      <Outlet />
    </AppShell>
  );
};
export default SellerShell;
