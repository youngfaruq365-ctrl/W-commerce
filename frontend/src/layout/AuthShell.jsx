import React from 'react';
import { Outlet } from 'react-router-dom';
import AppShell from './AppShell';

export const AuthShell = ({ className = '' }) => {
  return (
    <AppShell className={`authshell ${className}`}>
      <Outlet />
    </AppShell>
  );
};
export default AuthShell;
