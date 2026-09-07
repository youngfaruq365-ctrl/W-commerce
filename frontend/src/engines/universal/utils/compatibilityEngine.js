// Updated to use new nav/hero/grid names matching primitives
export const ExperienceCompatibilityEngine = {
  restaurant: {
    allowedHeroes: ['HeroFullscreen', 'HeroSplit', 'HeroImmersive', 'HeroStory', 'HeroAsymmetric'],
    allowedGrids: ['GridStandard', 'GridBento', 'GridFeatured'],
    allowedNavs: ['NavFloating', 'NavMinimal', 'PillNav', 'NavCentered'],
    allowedTransitions: ['FadeTransition', 'SlideTransition', 'CinematicTransition'],
    disallowed: ['NavSidebar']
  },
  fashion: {
    allowedHeroes: ['HeroEditorial', 'HeroFullscreen', 'HeroSplit', 'HeroImmersive', 'HeroCentered'],
    allowedGrids: ['GridMasonry', 'GridEditorial', 'GridStandard', 'GridHorizontal'],
    allowedNavs: ['NavMinimal', 'NavSidebar', 'NavGlass', 'EditorialNav', 'NavCentered'],
    allowedTransitions: ['EditorialTransition', 'CinematicTransition', 'FadeTransition', 'MorphTransition'],
    disallowed: []
  },
  creator: {
    allowedHeroes: ['HeroMinimal', 'HeroSplit', 'HeroCentered', 'HeroBento', 'HeroStory'],
    allowedGrids: ['GridMasonry', 'GridStandard', 'GridBento', 'GridHorizontal'],
    allowedNavs: ['NavMinimal', 'PillNav', 'NavGlass', 'OverlayNav'],
    allowedTransitions: ['MorphTransition', 'SlideTransition', 'ScaleTransition', 'FadeTransition'],
    disallowed: []
  },
  property: {
    allowedHeroes: ['HeroParallax', 'HeroFullscreen', 'HeroSplit', 'HeroAsymmetric', 'HeroImmersive'],
    allowedGrids: ['GridStandard', 'GridFeatured', 'GridBento'],
    allowedNavs: ['NavGlass', 'NavMinimal', 'NavCentered', 'NavFloating'],
    allowedTransitions: ['HorizontalTransition', 'FadeTransition', 'ScaleTransition'],
    disallowed: []
  },
  healthcare: {
    allowedHeroes: ['HeroSplit', 'HeroMinimal', 'HeroCentered', 'HeroStory'],
    allowedGrids: ['GridStandard', 'GridFeatured'],
    allowedNavs: ['NavCentered', 'NavMinimal', 'NavFloating'],
    allowedTransitions: ['FadeTransition', 'SlideTransition'],
    disallowed: ['HeroParallax', 'HeroImmersive', 'OverlayNav']
  },
  automotive: {
    allowedHeroes: ['HeroImmersive', 'HeroParallax', 'HeroFullscreen', 'HeroAsymmetric', 'HeroSplit'],
    allowedGrids: ['GridHorizontal', 'GridFeatured', 'GridStandard'],
    allowedNavs: ['NavMinimal', 'NavFloating', 'NavGlass', 'EditorialNav'],
    allowedTransitions: ['HorizontalTransition', 'SlideTransition', 'CinematicTransition', 'ImmersiveTransition'],
    disallowed: ['NavSidebar']
  }
};

export const resolveCompatibility = (engine, category) => {
  const rules = ExperienceCompatibilityEngine[engine] || ExperienceCompatibilityEngine.restaurant;
  if (category === 'hero')       return rules.allowedHeroes;
  if (category === 'grid')       return rules.allowedGrids;
  if (category === 'nav')        return rules.allowedNavs;
  if (category === 'transition') return rules.allowedTransitions;
  return [];
};
