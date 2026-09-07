const crypto = require('crypto');
const { validateDna } = require('./storeDnaSchema');

// A simple deterministic random generator based on a seed string
const seedRandom = (seedStr) => {
  const safeSeed = String(seedStr || crypto.randomUUID());
  const hash = crypto.createHash('sha256').update(safeSeed).digest('hex');
  let index = 0;
  return () => {
    if (index >= hash.length - 8) index = 0;
    const substr = hash.slice(index, index + 8);
    index += 8;
    return parseInt(substr, 16) / 0xffffffff;
  };
};

const pickSeeded = (arr, randomFn) => arr[Math.floor(randomFn() * arr.length)];

// Compatibility Matrices (curated design library)
const INDUSTRIES = {
  fashion: {
    personalities: ['luxury', 'streetwear', 'minimal', 'editorial'],
    layouts: {
      homepage: ['HeroFullscreen', 'HeroEditorial', 'HeroAsymmetric', 'HeroSplit'],
      grid: ['GridMasonry', 'GridEditorial', 'GridFeatured', 'GridStandard'],
      nav: ['NavFloating', 'NavMinimal', 'EditorialNav', 'NavGlass']
    }
  },
  electronics: {
    personalities: ['futuristic', 'clean', 'cyber', 'minimal'],
    layouts: {
      homepage: ['HeroVideo', 'HeroParallax', 'HeroMinimal', 'HeroProduct'],
      grid: ['GridBento', 'GridStandard', 'GridHorizontal'],
      nav: ['NavMega', 'NavCentered', 'PillNav']
    }
  },
  beauty: {
    personalities: ['organic', 'clinical', 'glamour', 'minimal'],
    layouts: {
      homepage: ['HeroSplit', 'HeroStory', 'HeroImmersive', 'HeroMinimal'],
      grid: ['GridMasonry', 'GridAsymmetric', 'GridStandard'],
      nav: ['NavFloating', 'NavCentered', 'NavMinimal']
    }
  }
};

const VISUAL_SYSTEMS = {
  luxury: { colors: ['dark-gold', 'monochrome', 'obsidian'], typography: ['serif-elegant', 'sans-geometric'], motion: 'cinematic' },
  streetwear: { colors: ['neon-clash', 'brutalist-dark', 'high-contrast'], typography: ['sans-bold', 'display-heavy'], motion: 'energetic' },
  minimal: { colors: ['soft-pastels', 'true-white', 'warm-grey'], typography: ['sans-clean', 'sans-minimal'], motion: 'subtle' },
  editorial: { colors: ['warm-paper', 'sepia-tone', 'monochrome'], typography: ['serif-classic', 'sans-classic'], motion: 'smooth' },
  futuristic: { colors: ['cyber-blue', 'dark-glass', 'neon-purple'], typography: ['mono-tech', 'sans-tech'], motion: 'snappy' },
  clean: { colors: ['apple-white', 'blue-tint', 'grey-scale'], typography: ['sans-clean', 'sans-geometric'], motion: 'subtle' },
  cyber: { colors: ['matrix-green', 'neon-clash', 'deep-space'], typography: ['mono-tech', 'display-glitch'], motion: 'energetic' },
  organic: { colors: ['earth-tones', 'sage-green', 'clay'], typography: ['serif-soft', 'sans-rounded'], motion: 'smooth' },
  clinical: { colors: ['medical-blue', 'pure-white', 'sterile-grey'], typography: ['sans-clean', 'sans-minimal'], motion: 'subtle' },
  glamour: { colors: ['rose-gold', 'champagne', 'rich-black'], typography: ['serif-elegant', 'display-script'], motion: 'cinematic' }
};

const generateStoreDna = ({ industry, niche, personality, features = {}, seed }) => {
  const randomFn = seedRandom(seed || crypto.randomUUID());
  
  const ind = INDUSTRIES[industry] || INDUSTRIES.fashion;
  const layoutDict = ind.layouts;

  const validPersonalities = ind.personalities;
  const finalPersonality = validPersonalities.includes(personality) ? personality : pickSeeded(validPersonalities, randomFn);
  
  const vis = VISUAL_SYSTEMS[finalPersonality] || VISUAL_SYSTEMS.minimal;

  const dna = {
    version: 1,
    generatorVersion: '1.0.0',
    industry,
    niche: niche || industry,
    personality: finalPersonality,
    visual: {
      colorSystem: pickSeeded(vis.colors, randomFn),
      typography: pickSeeded(vis.typography, randomFn),
      shapeLanguage: pickSeeded(['rounded', 'sharp', 'pill'], randomFn)
    },
    layout: {
      homepage: pickSeeded(layoutDict.homepage, randomFn),
      header: pickSeeded(layoutDict.nav, randomFn),
      productGrid: pickSeeded(layoutDict.grid, randomFn),
      productCard: pickSeeded(['standard', 'minimal', 'hover-zoom'], randomFn)
    },
    features,
    motion: {
      profile: vis.motion
    },
    commerce: {
      cart: pickSeeded(['SideDrawer', 'FloatingPanel', 'MinimalPanel'], randomFn),
      checkout: pickSeeded(['simple', 'step', 'animated', 'split', 'immersive'], randomFn)
    }
  };

  return validateDna(dna);
};

module.exports = {
  generateStoreDna,
  INDUSTRIES
};
