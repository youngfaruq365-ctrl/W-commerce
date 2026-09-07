import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getStoresByEngine } from '../store-config/storeRegistry';
import StorePreviewOS from '../components/store-marketplace/StorePreview';
import StorePurchaseModal from '../components/store-marketplace/StorePurchaseModal';

export const StorePreviewPage = () => {
  const { engine, storeId } = useParams();
  const [store, setStore] = useState(null);
  const [purchaseStore, setPurchaseStore] = useState(null);

  useEffect(() => {
    // We treat engine 'all' as undefined for getStoresByEngine if that's how it works
    const stores = getStoresByEngine('all');
    const found = stores.find(s => s.id === storeId);
    if (found) {
      setStore(found);
    }
  }, [engine, storeId]);

  if (!store) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 text-gray-500 font-mono">
        Store not found or loading...
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden">
      <StorePreviewOS 
        store={store} 
        onBack={() => window.close()} 
        onPurchase={() => setPurchaseStore(store)} 
      />
      <StorePurchaseModal 
        isOpen={!!purchaseStore} 
        store={purchaseStore} 
        onClose={() => setPurchaseStore(null)} 
      />
    </div>
  );
};
