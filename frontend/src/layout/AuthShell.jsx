import React from 'react';
import { Outlet } from 'react-router-dom';
import AppShell from './AppShell';

export const AuthShell = ({ children, className = '' }) => {
  return (
    <AppShell className={`authshell ${className}`}>
      {children || <Outlet />}
    </AppShell>
  );
};
export default AuthShell;
