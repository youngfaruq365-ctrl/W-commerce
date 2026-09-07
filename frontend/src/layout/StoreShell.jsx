import React from 'react';
import { Outlet } from 'react-router-dom';
import AppShell from './AppShell';
import PopupEngine from '../components/storefront/PopupEngine';
import { useParams } from 'react-router-dom';

export const StoreShell = ({ children, className = '' }) => {
  const { storeId } = useParams();

  return (
    <AppShell className={`storeshell ${className}`}>
      {children || <Outlet />}
      <PopupEngine storeId={storeId} />
    </AppShell>
  );
};
export default StoreShell;
