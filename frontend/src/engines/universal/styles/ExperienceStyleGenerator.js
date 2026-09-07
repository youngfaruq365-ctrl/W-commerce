import { resolveCompatibility } from '../utils/compatibilityEngine';
import { EngineStyleMap, StyleProfiles, getStyleProfile } from './StyleRegistry';

// Deterministic hash from string (FNV-1a 32-bit)
const hashStr = (str) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h;
};

const seededPick = (seed, arr) => {
  if (!arr || arr.length === 0) return null;
  return arr[Math.abs(seed) % arr.length];
};

// Price → tier mapping
export const priceToTier = (price) => {
  if (price <= 8)  return 'essential';
  if (price <= 12) return 'plus';
  if (price <= 16) return 'pro';
  if (price <= 21) return 'studio';
  return 'signature';
};

// Tier → commerce depth
export const tierToDepth = (tier) => ({
  essential: { productPreview: 'essential', cartStyle: 'MinimalPanel',  checkoutStyle: 'simple',    celebrationStyle: 'subtle' },
  plus:      { productPreview: 'plus',      cartStyle: 'SideDrawer',    checkoutStyle: 'step',      celebrationStyle: 'confetti' },
  pro:       { productPreview: 'pro',       cartStyle: 'SideDrawer',    checkoutStyle: 'animated',  celebrationStyle: 'confetti-card' },
  studio:    { productPreview: 'studio',    cartStyle: 'FloatingPanel', checkoutStyle: 'split',     celebrationStyle: 'branded' },
  signature: { productPreview: 'signature', cartStyle: 'FloatingPanel', checkoutStyle: 'immersive', celebrationStyle: 'cinematic' },
}[tier] || { productPreview: 'essential', cartStyle: 'SideDrawer', checkoutStyle: 'simple', celebrationStyle: 'subtle' });

export const generateStyleProfile = (store, useDraft = false) => {
  const tier = store.tier || store.sellerTier?.toLowerCase() || priceToTier(store.price || 0);
  const depth = tierToDepth(tier);

  // Check if store has DNA
  const rawDna = useDraft ? (store.storeDnaDraft || store.storeDna) : store.storeDna;
  let storeDna = null;
  
  if (rawDna) {
    try {
      storeDna = typeof rawDna === 'string' ? JSON.parse(rawDna) : rawDna;
    } catch (e) {
      console.warn("Failed to parse storeDna", e);
    }
  }

  if (storeDna && (storeDna.design || storeDna.visual)) {
    const isNewSchema = !!storeDna.visual;
    const design = isNewSchema ? {
      hero: storeDna.layout?.homepage || 'HeroFullscreen',
      grid: storeDna.layout?.productGrid || 'GridStandard',
      nav: storeDna.layout?.header || 'NavMinimal',
      transition: 'FadeTransition',
      animations: 'smooth',
      font: { heading: storeDna.visual?.typography || 'Inter', body: storeDna.visual?.typography || 'Inter' },
      radius: storeDna.visual?.shapeLanguage === 'rounded' ? '16px' : storeDna.visual?.shapeLanguage === 'pill' ? '9999px' : '0px',
      shadow: 'none',
      border: 'none',
      headingWeight: '800',
      letterSpacing: 'normal',
      lineHeight: 'relaxed',
      colors: storeDna.visual?.colors || {
        primary: '#000000',
        background: '#ffffff',
        surface: '#fafafa',
        text: '#111111',
        accent: '#333333'
      }
    } : storeDna.design;

    return {
      // Identity from DNA
      styleId: storeDna.personality || 'minimal',
      secondaryStyleId: storeDna.personality || 'minimal',
      tier,
      engine: storeDna.industry || 'fashion',
      
      // Layout from DNA
      hero: design.hero,
      grid: design.grid,
      nav: design.nav,
      transition: design.transition,
      motionLevel: design.animations === 'bounce' ? 'high' : 'medium',

      // Visual from DNA
      font: design.font || { heading: 'Inter', body: 'Inter' },
      radius: design.radius || 'md',
      shadow: design.shadow || 'none',
      border: design.border || 'none',
      headingWeight: design.headingWeight || '800',
      letterSpacing: design.letterSpacing || 'normal',
      lineHeight: design.lineHeight || 'relaxed',

      // Commerce depth
      ...depth,
      features: storeDna.features || {},

      // CSS custom properties for the storefront theme
      css: {
        '--s-font-heading':    design.font?.heading || 'Inter',
        '--s-font-body':       design.font?.body || 'Inter',
        '--s-radius':          design.radius || 'md',
        '--s-shadow':          design.shadow || 'none',
        '--s-border':          design.border || 'none',
        '--s-primary':         design.colors?.primary || '#000000',
        '--s-bg':              design.colors?.background || '#ffffff',
        '--s-surface':         design.colors?.surface || '#fafafa',
        '--s-text':            design.colors?.text || '#111111',
        '--s-accent':          design.colors?.accent || '#333333',
        '--s-heading-weight':  design.headingWeight || '800',
        '--s-letter-spacing':  design.letterSpacing || 'normal',
        '--s-line-height':     design.lineHeight || 'relaxed',
      }
    };
  }

  // OLD LOGIC FALLBACK for stores without DNA
  const seed    = hashStr(`${store.engine}-${store.id}-${store.price}`);
  const engine  = store.engine || 'restaurant';

  // Style selection from engine+tier map
  const engineMap        = EngineStyleMap[engine] || EngineStyleMap.restaurant;
  const compatibleStyles = engineMap[tier] || ['Minimal', 'PremiumCommerce'];
  const primaryStyleId   = seededPick(seed, compatibleStyles);
  const secondaryStyleId = seededPick(seed + 7, compatibleStyles.filter(s => s !== primaryStyleId).length > 0
    ? compatibleStyles.filter(s => s !== primaryStyleId) : compatibleStyles);
  const primaryStyle = getStyleProfile(primaryStyleId);

  // Layout from engine compatibility rules  
  const allowedHeroes = resolveCompatibility(engine, 'hero');
  const allowedGrids  = resolveCompatibility(engine, 'grid');
  const allowedNavs   = resolveCompatibility(engine, 'nav');
  const allowedTrans  = resolveCompatibility(engine, 'transition');

  const hero       = store.design?.hero       || seededPick(seed + 1, allowedHeroes) || primaryStyle.hero;
  const grid       = store.design?.grid       || seededPick(seed + 2, allowedGrids)  || primaryStyle.grid || 'GridStandard';
  const nav        = store.design?.nav        || seededPick(seed + 3, allowedNavs)   || primaryStyle.nav;
  const transition = store.design?.transition || seededPick(seed + 4, allowedTrans)  || primaryStyle.transition;

  return {
    // Identity
    styleId: primaryStyleId,
    secondaryStyleId,
    tier,
    engine,

    // Layout
    hero,
    grid,
    nav,
    transition,
    motionLevel: primaryStyle.motionLevel,

    // Visual
    font:          primaryStyle.font,
    radius:        store.design?.radius    || primaryStyle.radius,
    shadow:        primaryStyle.shadow,
    border:        primaryStyle.border,
    headingWeight: primaryStyle.headingWeight,
    letterSpacing: primaryStyle.letterSpacing,
    lineHeight:    primaryStyle.lineHeight,

    // Commerce depth
    ...depth,

    // CSS custom properties for the storefront theme
    css: {
      '--s-font-heading':    primaryStyle.font.heading,
      '--s-font-body':       primaryStyle.font.body,
      '--s-radius':          store.design?.radius    || primaryStyle.radius,
      '--s-shadow':          primaryStyle.shadow,
      '--s-border':          primaryStyle.border,
      '--s-primary':         store.design?.primary          || primaryStyle.palette.primary,
      '--s-bg':              store.design?.backgroundColor  || primaryStyle.palette.bg,
      '--s-surface':         primaryStyle.palette.surface,
      '--s-text':            store.design?.textColor        || (['#fff', '#ffffff', '#fafafa', '#f5f5f5', '#f9f9f9', '#faf7f2', '#f0f0f0', '#f8fafc'].includes(primaryStyle.palette.bg) ? '#111' : '#fff'),
      '--s-accent':          primaryStyle.palette.accent,
      '--s-heading-weight':  primaryStyle.headingWeight,
      '--s-letter-spacing':  primaryStyle.letterSpacing,
      '--s-line-height':     primaryStyle.lineHeight,
    }
  };
};
