import React from 'react';
import { Outlet } from 'react-router-dom';
import AppShell from './AppShell';

export const AdminShell = ({ children, className = '' }) => {
  return (
    <AppShell className={`adminshell ${className}`}>
      {children || <Outlet />}
    </AppShell>
  );
};
export default AdminShell;
