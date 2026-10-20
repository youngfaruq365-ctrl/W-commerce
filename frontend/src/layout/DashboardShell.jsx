import React from 'react';
import { Outlet } from 'react-router-dom';
import AppShell from './AppShell';

export const DashboardShell = ({ className = '' }) => {
  return (
    <AppShell className={`dashboardshell ${className}`}>
      <Outlet />
    </AppShell>
  );
};
export default DashboardShell;
