export const baseLayouts = [
  { id: 'premium-coverflow', title: 'Premium Coverflow', desc: 'Center product large, neighbors partly visible', archetype: 'coverflow', params: { rotate: 15, depth: 300 } },
  { id: 'luxury-bento', title: 'Luxury Bento', desc: 'Grid mixing an oversized hero with smaller cards', archetype: 'bento', params: { layoutMode: 'hero-top' } },
  { id: 'editorial-masonry', title: 'Editorial Masonry', desc: 'Variable height cards with waterfall effect', archetype: 'masonry', params: { columns: 3 } },
  { id: 'infinity-carousel', title: 'Infinity Carousel', desc: 'Continuous scrolling loop', archetype: 'carousel', params: { speed: 4000 } },
  { id: 'center-stage', title: 'Center Stage', desc: 'One massive product takes center stage', archetype: 'hero', params: { showBgBlur: true } },
  { id: 'floating-circles-fashion', title: 'Fashion Circles', desc: 'Floating circular products for fashion', archetype: 'scattered', params: { shape: 'circle', theme: 'light', style: 'fashion' } },
  { id: 'floating-circles-food', title: 'Food Circles', desc: 'Floating circular products for food and beauty', archetype: 'scattered', params: { shape: 'circle', theme: 'light', style: 'food' } },
  { id: 'floating-squares-tech', title: 'Tech Squares', desc: 'Floating square products for electronics and home', archetype: 'scattered', params: { shape: 'square', theme: 'dark', style: 'tech' } }
];

const generatedLayouts = [];
const archetypes = ['grid', 'masonry', 'carousel', 'bento', 'hero', 'coverflow'];
const vibes = ['Neon', 'Midnight', 'Minimal', 'Classic', 'Editorial', 'Bold', 'Soft', 'Cinematic', 'Industrial', 'Vibrant', 'Dark', 'Luxe', 'Modern', 'Retro', 'Pop'];
const formats = ['Grid', 'Gallery', 'Showcase', 'List', 'Lineup', 'Collection', 'Spread', 'Wall', 'Stage', 'Carousel'];

for(let i = 0; i < 95; i++) {
  const arch = archetypes[i % archetypes.length];
  const vibe = vibes[i % vibes.length];
  const format = formats[i % formats.length];
  
  const params = {};
  if (arch === 'grid') { params.columns = (i % 3) + 2; params.gap = (i % 4) * 8 + 8; params.roundness = (i % 3) * 8; }
  if (arch === 'masonry') { params.columns = (i % 2) + 2; params.gap = (i % 4) * 8 + 8; }
  if (arch === 'carousel') { params.speed = 3000 + (i * 100); params.gap = 16 + (i%3)*8; }
  if (arch === 'bento') { params.layoutMode = i % 2 === 0 ? 'hero-top' : 'hero-left'; }
  if (arch === 'hero') { params.textPosition = i % 2 === 0 ? 'side' : 'bottom'; params.showBgBlur = i % 2 === 0; }
  if (arch === 'coverflow') { params.rotate = 10 + (i % 20); params.depth = 200 + (i % 5)*50; }

  generatedLayouts.push({
    id: `layout-${i+6}`,
    title: `${vibe} ${format} ${i+1}`,
    desc: `A beautifully crafted ${arch} layout featuring ${vibe.toLowerCase()} aesthetics.`,
    archetype: arch,
    params
  });
}

export const layoutLibrary = [...baseLayouts, ...generatedLayouts];
