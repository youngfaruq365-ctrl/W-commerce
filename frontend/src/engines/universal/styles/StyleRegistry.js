// GLOBALX Style Registry — 20 Named Style Profiles
// Each profile defines typography, spacing, visual language, motion level

export const StyleProfiles = {
  Editorial: {
    id: 'Editorial',
    font: { heading: "'Playfair Display', serif", body: "'Inter', sans-serif", mono: "'JetBrains Mono', monospace" },
    headingWeight: '700', letterSpacing: '-0.02em', lineHeight: '1.1',
    radius: '0px', shadow: 'none', border: '1px solid #e5e5e5',
    card: 'flat-border', button: 'outlined-square', hero: 'HeroEditorial',
    nav: 'EditorialNav', footer: 'minimal', checkout: 'split',
    spacing: 'loose', motionLevel: 4, transition: 'EditorialTransition',
    palette: { primary: '#111', bg: '#fff', surface: '#f5f5f5', accent: '#000' }
  },
  Luxury: {
    id: 'Luxury',
    font: { heading: "'Cormorant Garamond', serif", body: "'Montserrat', sans-serif", mono: "'Courier New', monospace" },
    headingWeight: '300', letterSpacing: '0.05em', lineHeight: '1.2',
    radius: '2px', shadow: '0 4px 40px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.08)',
    card: 'luxury-shadow', button: 'gold-outlined', hero: 'HeroFullscreen',
    nav: 'NavGlass', footer: 'editorial', checkout: 'immersive',
    spacing: 'very-loose', motionLevel: 5, transition: 'CinematicTransition',
    palette: { primary: '#C9A96E', bg: '#0a0a0a', surface: '#111', accent: '#C9A96E' }
  },
  Minimal: {
    id: 'Minimal',
    font: { heading: "'Inter', sans-serif", body: "'Inter', sans-serif", mono: "'Fira Code', monospace" },
    headingWeight: '500', letterSpacing: '-0.01em', lineHeight: '1.4',
    radius: '4px', shadow: 'none', border: '1px solid #f0f0f0',
    card: 'clean', button: 'minimal-solid', hero: 'HeroMinimal',
    nav: 'NavMinimal', footer: 'clean', checkout: 'simple',
    spacing: 'normal', motionLevel: 1, transition: 'FadeTransition',
    palette: { primary: '#111', bg: '#fff', surface: '#fafafa', accent: '#111' }
  },
  Brutalist: {
    id: 'Brutalist',
    font: { heading: "'Space Grotesk', sans-serif", body: "'Space Grotesk', sans-serif", mono: "'Courier New', monospace" },
    headingWeight: '900', letterSpacing: '0.02em', lineHeight: '0.95',
    radius: '0px', shadow: '4px 4px 0px #000', border: '2px solid #000',
    card: 'brutalist-border', button: 'brutalist', hero: 'HeroAsymmetric',
    nav: 'OverlayNav', footer: 'brutalist', checkout: 'step',
    spacing: 'tight', motionLevel: 3, transition: 'SlideTransition',
    palette: { primary: '#FF0', bg: '#fff', surface: '#000', accent: '#FF0' }
  },
  Glass: {
    id: 'Glass',
    font: { heading: "'Outfit', sans-serif", body: "'Outfit', sans-serif", mono: "'JetBrains Mono', monospace" },
    headingWeight: '600', letterSpacing: '-0.01em', lineHeight: '1.3',
    radius: '16px', shadow: '0 8px 32px rgba(31,38,135,0.15)', border: '1px solid rgba(255,255,255,0.18)',
    card: 'glass-card', button: 'glass-button', hero: 'HeroImmersive',
    nav: 'GlassNav', footer: 'glass', checkout: 'animated',
    spacing: 'normal', motionLevel: 4, transition: 'ScaleTransition',
    palette: { primary: '#6366f1', bg: '#0f0f1a', surface: 'rgba(255,255,255,0.05)', accent: '#818cf8' }
  },
  Bento: {
    id: 'Bento',
    font: { heading: "'Outfit', sans-serif", body: "'Outfit', sans-serif", mono: "'JetBrains Mono', monospace" },
    headingWeight: '800', letterSpacing: '-0.02em', lineHeight: '1.1',
    radius: '20px', shadow: 'none', border: 'none',
    card: 'bento-tile', button: 'pill-solid', hero: 'HeroBento',
    nav: 'PillNav', footer: 'bento', checkout: 'animated',
    spacing: 'tight', motionLevel: 3, transition: 'ScaleTransition',
    palette: { primary: '#000', bg: '#f5f5f5', surface: '#fff', accent: '#000' }
  },
  Magazine: {
    id: 'Magazine',
    font: { heading: "'Libre Baskerville', serif", body: "'Source Sans 3', sans-serif", mono: "'Courier New', monospace" },
    headingWeight: '700', letterSpacing: '0', lineHeight: '1.2',
    radius: '0px', shadow: 'none', border: '1px solid #ddd',
    card: 'magazine-card', button: 'fill', hero: 'HeroStory',
    nav: 'NavMega', footer: 'magazine', checkout: 'split',
    spacing: 'normal', motionLevel: 2, transition: 'SlideTransition',
    palette: { primary: '#DC2626', bg: '#fff', surface: '#f9f9f9', accent: '#1a1a1a' }
  },
  Cinematic: {
    id: 'Cinematic',
    font: { heading: "'Bebas Neue', cursive", body: "'Lato', sans-serif", mono: "'Courier New', monospace" },
    headingWeight: '400', letterSpacing: '0.1em', lineHeight: '1.0',
    radius: '0px', shadow: '0 20px 60px rgba(0,0,0,0.5)', border: 'none',
    card: 'cinematic-card', button: 'cinematic', hero: 'HeroVideo',
    nav: 'OverlayNav', footer: 'cinematic', checkout: 'immersive',
    spacing: 'loose', motionLevel: 5, transition: 'CinematicTransition',
    palette: { primary: '#fff', bg: '#000', surface: '#111', accent: '#fff' }
  },
  Soft: {
    id: 'Soft',
    font: { heading: "'DM Sans', sans-serif", body: "'DM Sans', sans-serif", mono: "'Fira Code', monospace" },
    headingWeight: '600', letterSpacing: '-0.01em', lineHeight: '1.5',
    radius: '24px', shadow: '0 2px 20px rgba(0,0,0,0.06)', border: 'none',
    card: 'soft-card', button: 'rounded-solid', hero: 'HeroSplit',
    nav: 'NavFloating', footer: 'soft', checkout: 'step',
    spacing: 'loose', motionLevel: 2, transition: 'FadeTransition',
    palette: { primary: '#6366f1', bg: '#fafafa', surface: '#fff', accent: '#818cf8' }
  },
  Bold: {
    id: 'Bold',
    font: { heading: "'Black Han Sans', sans-serif", body: "'Noto Sans', sans-serif", mono: "'JetBrains Mono', monospace" },
    headingWeight: '900', letterSpacing: '-0.03em', lineHeight: '1.0',
    radius: '8px', shadow: '0 8px 24px rgba(0,0,0,0.15)', border: 'none',
    card: 'bold-card', button: 'bold-solid', hero: 'HeroFullscreen',
    nav: 'NavMinimal', footer: 'bold', checkout: 'animated',
    spacing: 'tight', motionLevel: 3, transition: 'HorizontalTransition',
    palette: { primary: '#ef4444', bg: '#fff', surface: '#f5f5f5', accent: '#dc2626' }
  },
  Organic: {
    id: 'Organic',
    font: { heading: "'Lora', serif", body: "'Source Sans 3', sans-serif", mono: "'Courier New', monospace" },
    headingWeight: '700', letterSpacing: '0', lineHeight: '1.4',
    radius: '12px', shadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #e8e0d8',
    card: 'organic-card', button: 'organic', hero: 'HeroParallax',
    nav: 'NavCentered', footer: 'warm', checkout: 'split',
    spacing: 'loose', motionLevel: 2, transition: 'FadeTransition',
    palette: { primary: '#7c6b52', bg: '#faf7f2', surface: '#f2ece3', accent: '#5c4a35' }
  },
  Futuristic: {
    id: 'Futuristic',
    font: { heading: "'Rajdhani', sans-serif", body: "'Exo 2', sans-serif", mono: "'JetBrains Mono', monospace" },
    headingWeight: '700', letterSpacing: '0.05em', lineHeight: '1.2',
    radius: '4px', shadow: '0 0 30px rgba(99,102,241,0.3)', border: '1px solid rgba(99,102,241,0.3)',
    card: 'neon-border-card', button: 'neon-solid', hero: 'HeroImmersive',
    nav: 'NavGlass', footer: 'futuristic', checkout: 'immersive',
    spacing: 'tight', motionLevel: 5, transition: 'ImmersiveTransition',
    palette: { primary: '#00f0ff', bg: '#050510', surface: '#0a0a1f', accent: '#6366f1' }
  },
  Industrial: {
    id: 'Industrial',
    font: { heading: "'Barlow Condensed', sans-serif", body: "'Barlow', sans-serif", mono: "'JetBrains Mono', monospace" },
    headingWeight: '800', letterSpacing: '0.05em', lineHeight: '1.1',
    radius: '2px', shadow: 'none', border: '1px solid #333',
    card: 'industrial-card', button: 'industrial', hero: 'HeroAsymmetric',
    nav: 'NavMinimal', footer: 'industrial', checkout: 'step',
    spacing: 'tight', motionLevel: 3, transition: 'HorizontalTransition',
    palette: { primary: '#f59e0b', bg: '#111', surface: '#1a1a1a', accent: '#f59e0b' }
  },
  Street: {
    id: 'Street',
    font: { heading: "'Bebas Neue', cursive", body: "'Inter', sans-serif", mono: "'Courier New', monospace" },
    headingWeight: '400', letterSpacing: '0.08em', lineHeight: '1.0',
    radius: '4px', shadow: '4px 4px 0 #000', border: '2px solid #000',
    card: 'street-card', button: 'street-fill', hero: 'HeroProduct',
    nav: 'PillNav', footer: 'street', checkout: 'animated',
    spacing: 'tight', motionLevel: 3, transition: 'SlideTransition',
    palette: { primary: '#000', bg: '#fff', surface: '#f0f0f0', accent: '#ff0000' }
  },
  PremiumCommerce: {
    id: 'PremiumCommerce',
    font: { heading: "'Neue Montreal', 'Inter', sans-serif", body: "'Inter', sans-serif", mono: "'JetBrains Mono', monospace" },
    headingWeight: '700', letterSpacing: '-0.02em', lineHeight: '1.2',
    radius: '12px', shadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0',
    card: 'commerce-card', button: 'premium-solid', hero: 'HeroSplit',
    nav: 'NavFloating', footer: 'commerce', checkout: 'animated',
    spacing: 'normal', motionLevel: 3, transition: 'ScaleTransition',
    palette: { primary: '#18181b', bg: '#fff', surface: '#f9f9f9', accent: '#18181b' }
  },
  NeoMinimal: {
    id: 'NeoMinimal',
    font: { heading: "'DM Serif Display', serif", body: "'DM Sans', sans-serif", mono: "'Fira Code', monospace" },
    headingWeight: '400', letterSpacing: '-0.01em', lineHeight: '1.3',
    radius: '0', shadow: 'none', border: 'none',
    card: 'text-focused', button: 'text-link', hero: 'HeroCentered',
    nav: 'EditorialNav', footer: 'neo-minimal', checkout: 'simple',
    spacing: 'very-loose', motionLevel: 2, transition: 'FadeTransition',
    palette: { primary: '#000', bg: '#fff', surface: '#fff', accent: '#888' }
  },
  ArtGallery: {
    id: 'ArtGallery',
    font: { heading: "'Cormorant Garamond', serif", body: "'Jost', sans-serif", mono: "'Courier New', monospace" },
    headingWeight: '300', letterSpacing: '0.1em', lineHeight: '1.6',
    radius: '0', shadow: 'none', border: 'none',
    card: 'gallery-frame', button: 'gallery-button', hero: 'HeroParallax',
    nav: 'NavSidebar', footer: 'gallery', checkout: 'split',
    spacing: 'very-loose', motionLevel: 4, transition: 'MorphTransition',
    palette: { primary: '#1a1a1a', bg: '#fff', surface: '#fafafa', accent: '#888' }
  },
  Immersive: {
    id: 'Immersive',
    font: { heading: "'Syne', sans-serif", body: "'Syne', sans-serif", mono: "'JetBrains Mono', monospace" },
    headingWeight: '800', letterSpacing: '-0.03em', lineHeight: '0.95',
    radius: '0', shadow: '0 0 80px rgba(0,0,0,0.4)', border: 'none',
    card: 'immersive-card', button: 'immersive', hero: 'HeroImmersive',
    nav: 'OverlayNav', footer: 'immersive', checkout: 'immersive',
    spacing: 'tight', motionLevel: 5, transition: 'ImmersiveTransition',
    palette: { primary: '#fff', bg: '#050505', surface: '#0a0a0a', accent: '#fff' }
  },
  Swiss: {
    id: 'Swiss',
    font: { heading: "'Helvetica Neue', 'Arial', sans-serif", body: "'Helvetica Neue', 'Arial', sans-serif", mono: "'Courier New', monospace" },
    headingWeight: '700', letterSpacing: '-0.01em', lineHeight: '1.2',
    radius: '0', shadow: 'none', border: '1px solid #ddd',
    card: 'swiss-grid', button: 'swiss-solid', hero: 'HeroMinimal',
    nav: 'NavCentered', footer: 'swiss', checkout: 'step',
    spacing: 'grid-based', motionLevel: 1, transition: 'FadeTransition',
    palette: { primary: '#e63946', bg: '#fff', surface: '#f8f8f8', accent: '#e63946' }
  },
  Experimental: {
    id: 'Experimental',
    font: { heading: "'Unbounded', sans-serif", body: "'Space Grotesk', sans-serif", mono: "'JetBrains Mono', monospace" },
    headingWeight: '900', letterSpacing: '-0.04em', lineHeight: '0.9',
    radius: '999px', shadow: '0 0 60px rgba(255,0,128,0.3)', border: '1px solid rgba(255,0,128,0.3)',
    card: 'experimental', button: 'morphing', hero: 'HeroAsymmetric',
    nav: 'OverlayNav', footer: 'experimental', checkout: 'immersive',
    spacing: 'chaotic', motionLevel: 5, transition: 'MorphTransition',
    palette: { primary: '#ff0080', bg: '#000', surface: '#0a000a', accent: '#00ffff' }
  }
};

// Engine-to-style compatibility map
export const EngineStyleMap = {
  restaurant: {
    essential: ['Organic', 'PremiumCommerce'],
    plus:      ['Magazine', 'Bento'],
    pro:       ['Editorial', 'Bold'],
    studio:    ['Luxury', 'Cinematic'],
    signature: ['Luxury', 'Immersive']
  },
  fashion: {
    essential: ['Minimal', 'NeoMinimal'],
    plus:      ['PremiumCommerce', 'Soft'],
    pro:       ['Editorial', 'Bold'],
    studio:    ['Glass', 'ArtGallery'],
    signature: ['Luxury', 'Cinematic']
  },
  creator: {
    essential: ['Minimal', 'Swiss'],
    plus:      ['Bento', 'Glass'],
    pro:       ['Bold', 'Street'],
    studio:    ['Editorial', 'Futuristic'],
    signature: ['Experimental', 'Immersive']
  },
  property: {
    essential: ['Minimal', 'Swiss'],
    plus:      ['NeoMinimal', 'Soft'],
    pro:       ['Editorial', 'Magazine'],
    studio:    ['Luxury', 'ArtGallery'],
    signature: ['Luxury', 'Cinematic']
  },
  healthcare: {
    essential: ['Soft', 'Minimal'],
    plus:      ['Swiss', 'Soft'],
    pro:       ['NeoMinimal', 'PremiumCommerce'],
    studio:    ['Glass', 'Soft'],
    signature: ['Luxury', 'Swiss']
  },
  automotive: {
    essential: ['Bold', 'Minimal'],
    plus:      ['Industrial', 'Bold'],
    pro:       ['Industrial', 'Futuristic'],
    studio:    ['Cinematic', 'Industrial'],
    signature: ['Immersive', 'Futuristic']
  }
};

export const getStyleProfile = (styleId) => StyleProfiles[styleId] || StyleProfiles.Minimal;
