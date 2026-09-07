import React from 'react';
import { Outlet } from 'react-router-dom';
import AppShell from './AppShell';

export const CustomerShell = ({ children, className = '' }) => {
  return (
    <AppShell className={`customershell ${className}`}>
      {children || <Outlet />}
    </AppShell>
  );
};
export default CustomerShell;
