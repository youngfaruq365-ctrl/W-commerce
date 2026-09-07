export const getThemeTokens = (design) => {
  // We'll map the config's design layout, typography, etc to CSS variables or class maps
  const baseTokens = {
    fontFamily: design.typography === 'serif' ? 'Playfair Display, serif' : 'Inter, sans-serif',
    primaryColor: design.primary || '#000000',
    backgroundColor: design.layout === 'dark' ? '#111111' : '#FFFFFF',
    textColor: design.layout === 'dark' ? '#FFFFFF' : '#111111',
    borderRadius: design.radius || '8px',
  };

  if (design.layout === 'fast-food') {
    return { ...baseTokens, primaryColor: '#E53935', borderRadius: '16px', fontFamily: 'Impact, sans-serif' };
  }
  
  if (design.layout === 'cloud-fast') {
    return { ...baseTokens, primaryColor: '#FF9800', borderRadius: '12px' };
  }

  if (design.layout === 'fine-dining') {
    return { ...baseTokens, primaryColor: '#D4AF37', backgroundColor: '#0A0A0A', textColor: '#F5F5F5', fontFamily: 'Playfair Display, serif', borderRadius: '0px' };
  }

  return baseTokens;
};
