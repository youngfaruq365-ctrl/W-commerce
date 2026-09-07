import manifest from './AssetManifest.json';

// Use Vite's glob import to bundle all potential assets.
const icons = import.meta.glob('./themes/**/icons/*.svg', { eager: true, query: '?url', import: 'default' });
const illustrations = import.meta.glob('./themes/**/illustrations/*.png', { eager: true, query: '?url', import: 'default' });
const lottie = import.meta.glob('./themes/**/lottie/*.json', { eager: true });
const threeD = import.meta.glob('./themes/**/threeD/*.glb', { eager: true, query: '?url', import: 'default' });

export const getAssetPath = (type, name, theme = 'basic') => {
  const keys = name.split('.');
  let entry = manifest;
  for (const k of keys) {
    if (!entry) break;
    entry = entry[k];
  }

  if (!entry || !entry[type]) {
    // console.warn(`Asset ${name} of type ${type} not found in manifest.`);
    return null;
  }

  const filename = entry[type];
  
  // Normalize types
  const folderMap = {
    'icon': 'icons',
    'illustration': 'illustrations',
    'animation': 'lottie',
    'threeD': 'threeD'
  };
  
  const folder = folderMap[type] || type;
  const path = `./themes/${theme.toLowerCase()}/${folder}/${filename}`;
  const fallbackPath = `./themes/basic/${folder}/${filename}`;

  try {
    if (folder === 'icons') {
      return icons[path] || icons[fallbackPath];
    }
    if (folder === 'illustrations') {
      return illustrations[path] || illustrations[fallbackPath];
    }
    if (folder === 'lottie') {
      // lottie-react expects the JSON object directly
      const data = lottie[path] || lottie[fallbackPath];
      return data?.default || data;
    }
    if (folder === 'threeD') {
      return threeD[path] || threeD[fallbackPath];
    }
  } catch (e) {
    console.warn(`Error resolving asset: ${path}`, e);
  }

  return null;
};

export default {
  getIcon: (name, theme) => getAssetPath('icon', name, theme),
  getIllustration: (name, theme) => getAssetPath('illustration', name, theme),
  getAnimation: (name, theme) => getAssetPath('animation', name, theme),
  getThreeD: (name, theme) => getAssetPath('threeD', name, theme),
};
