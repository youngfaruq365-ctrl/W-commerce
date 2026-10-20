import React from 'react';
import { Outlet } from 'react-router-dom';
import AppShell from './AppShell';

export const CustomerShell = ({ className = '' }) => {
  return (
    <AppShell className={`customershell ${className}`}>
      <Outlet />
    </AppShell>
  );
};
export default CustomerShell;
