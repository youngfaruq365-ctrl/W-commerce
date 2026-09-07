import { resolveCompatibility } from './compatibilityEngine';

// Simple deterministic hash function for seeded generation
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

// Deterministic selection from an array based on a seed
const selectFromSeed = (seed, options) => {
  const index = seed % options.length;
  return options[index];
};

export const createExperienceProfile = (store) => {
  // Generate deterministic seed
  const seed = hashString(`${store.engine}-${store.id}-${store.price}`);

  // Resolve compatible options for this engine
  const heroes = resolveCompatibility(store.engine, 'hero', ['HeroFullscreen', 'HeroSplit']);
  const grids = resolveCompatibility(store.engine, 'grid', ['GridStandard', 'GridBento']);
  const navs = resolveCompatibility(store.engine, 'nav', ['NavMinimal', 'NavFloating']);
  const transitions = resolveCompatibility(store.engine, 'transition', ['fade', 'slide']);

  // Generate deterministic profile mapping
  const profile = {
    hero: selectFromSeed(seed + 1, heroes),
    grid: selectFromSeed(seed + 2, grids),
    nav: selectFromSeed(seed + 3, navs),
    transition: selectFromSeed(seed + 4, transitions),
    motionLevel: store.motion?.level || 1,
    // Store configuration can override the deterministic random generation
    ...store.layout, 
    ...store.design
  };

  return profile;
};

// Utility to find duplicate profiles across a set of stores
export const detectDuplicateProfiles = (stores) => {
  const profiles = {};
  const duplicates = [];

  stores.forEach(store => {
    const profile = createExperienceProfile(store);
    const profileKey = `${profile.hero}-${profile.grid}-${profile.nav}-${profile.transition}`;
    
    if (profiles[profileKey]) {
      duplicates.push({ storeId: store.id, duplicatesWith: profiles[profileKey] });
    } else {
      profiles[profileKey] = store.id;
    }
  });

  return duplicates;
};
