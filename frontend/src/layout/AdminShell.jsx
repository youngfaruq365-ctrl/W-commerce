import React from 'react';
import { Outlet } from 'react-router-dom';
import AppShell from './AppShell';

export const AdminShell = ({ className = '' }) => {
  return (
    <AppShell className={`adminshell ${className}`}>
      <Outlet />
    </AppShell>
  );
};
export default AdminShell;
