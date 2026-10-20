import React from 'react';
import { Outlet, useParams } from 'react-router-dom';
import AppShell from './AppShell';
import PopupEngine from '../components/storefront/PopupEngine';

export const StoreShell = ({ className = '' }) => {
  const { slug } = useParams();

  return (
    <AppShell className={`storeshell ${className}`}>
      <Outlet />
      <PopupEngine storeId={slug} />
    </AppShell>
  );
};
export default StoreShell;
