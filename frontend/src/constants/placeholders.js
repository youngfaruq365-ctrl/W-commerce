/**
 * Centralized placeholder images for the app.
 * Uses inline SVG data URIs so they work offline and never depend on external services.
 */

// A generic 'No Image' SVG placeholder
export const PLACEHOLDER_IMAGE = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='800' viewBox='0 0 800 800'%3E%3Crect width='800' height='800' fill='%23111827'/%3E%3Cpath d='M300,250 L500,250 C527.6,250 550,272.4 550,300 L550,500 C550,527.6 527.6,550 500,550 L300,550 C272.4,550 250,527.6 250,500 L250,300 C250,272.4 272.4,250 300,250 Z M300,280 C289,280 280,289 280,300 L280,500 C280,511 289,520 300,520 L500,520 C511,520 520,511 520,500 L520,300 C520,289 511,280 500,280 Z M400,320 C444.2,320 480,355.8 480,400 C480,444.2 444.2,480 400,480 C355.8,480 320,444.2 320,400 C320,355.8 355.8,320 400,320 Z M400,350 C372.4,350 350,372.4 350,400 C350,427.6 372.4,450 400,450 C427.6,450 450,427.6 450,400 C450,372.4 427.6,350 400,350 Z' fill='%23374151'/%3E%3Ctext x='400' y='600' text-anchor='middle' font-family='sans-serif' font-size='24' fill='%234b5563' font-weight='bold'%3ENo Image Available%3C/text%3E%3C/svg%3E`;

export const PLACEHOLDER_AVATAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect fill="%231a1a2e" width="100" height="100"/><circle cx="50" cy="38" r="16" fill="%23444"/><ellipse cx="50" cy="80" rx="28" ry="20" fill="%23444"/></svg>`;

export const PLACEHOLDER_AVATAR = `data:image/svg+xml,${PLACEHOLDER_AVATAR_SVG}`;

// Realistic Map Placeholder (Dark Theme)
const MAP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400">
  <rect fill="%230d0d12" width="800" height="400"/>
  <!-- Water/Parks -->
  <path d="M0,50 Q150,80 200,20 T350,-20 L0,-20 Z" fill="%23161622" opacity="0.8"/>
  <path d="M500,420 Q550,320 700,350 T820,250 L820,420 Z" fill="%23161622" opacity="0.8"/>
  <circle cx="650" cy="100" r="80" fill="%231a2e1a" opacity="0.3"/>
  <!-- Roads -->
  <path d="M-50,150 L350,200 L900,100 M-50,300 L350,250 L900,350 M250,-50 L350,200 L450,450 M600,-50 L550,250 L650,450" stroke="%2322222a" stroke-width="14" fill="none"/>
  <path d="M-50,150 L350,200 L900,100 M-50,300 L350,250 L900,350 M250,-50 L350,200 L450,450 M600,-50 L550,250 L650,450" stroke="%232a2a35" stroke-width="6" fill="none"/>
  <!-- Route Line -->
  <path d="M250,50 L350,200 L550,250" stroke="%2300ffff" stroke-width="4" fill="none" stroke-dasharray="10,10" stroke-linecap="round"/>
  <!-- Route Start/End -->
  <circle cx="250" cy="50" r="6" fill="%2300ffff"/>
  <circle cx="550" cy="250" r="16" fill="%2300ffff" opacity="0.2"/>
  <circle cx="550" cy="250" r="8" fill="%2300ffff"/>
</svg>`;

export const PLACEHOLDER_MAP = `data:image/svg+xml,${MAP_SVG}`;

// A beautiful store banner placeholder from Unsplash
export const PLACEHOLDER_BANNER = "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80";
