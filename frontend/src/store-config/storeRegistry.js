// UI TEMPLATE CONFIG — Not business/seller data
import { restaurantStores } from './restaurantStores';
import { fashionStores } from './fashionStores';
import { creatorStores } from './creatorStores';
import { propertyStores } from './propertyStores';
import { healthcareStores } from './healthcareStores';
import { automotiveStores } from './automotiveStores';
import { portfolioStores } from './portfolioStores';
import { htmlStores } from './htmlStores';

// Merge all engine configurations into a single registry
export const storeRegistry = [
  ...restaurantStores,
  ...fashionStores,
  ...creatorStores,
  ...propertyStores,
  ...healthcareStores,
  ...automotiveStores,
  ...portfolioStores,
  ...htmlStores
];

// Helper functions for the Marketplace UI
export const getStoresByEngine = (engine) => {
  if (engine === 'all') return storeRegistry;
  return storeRegistry.filter(store => store.engine === engine);
};

export const getStoreById = (id) => {
  return storeRegistry.find(store => store.id === id);
};
