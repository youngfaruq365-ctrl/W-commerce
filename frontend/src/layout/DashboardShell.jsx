import React from 'react';
import { Outlet } from 'react-router-dom';
import AppShell from './AppShell';

export const DashboardShell = ({ children, className = '' }) => {
  return (
    <AppShell className={`dashboardshell ${className}`}>
      {children || <Outlet />}
    </AppShell>
  );
};
export default DashboardShell;
