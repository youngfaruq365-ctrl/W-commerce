const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const TEMPLATES = [
  {
    name: 'Noir Atelier',
    industry: 'fashion',
    dna: {
      personality: 'noir-editorial',
      visual: {
        themeMode: 'dark',
        colorSystem: 'monochrome',
        typography: 'Playfair Display',
        shapeLanguage: 'sharp',
        colors: { primary: '#ffffff', background: '#050505', surface: '#111111', text: '#e5e5e5', accent: '#d4af37' } // Gold accent
      },
      layout: { homepage: 'HeroEditorial', productGrid: 'GridEditorial', header: 'NavSidebar' },
      animations: 'smooth'
    }
  },
  {
    name: 'RAW/01',
    industry: 'creator',
    dna: {
      personality: 'digital-brutalism',
      visual: {
        themeMode: 'light',
        colorSystem: 'brutalist',
        typography: 'Space Grotesk',
        shapeLanguage: 'sharp',
        colors: { primary: '#000000', background: '#ffffff', surface: '#f0f0f0', text: '#111111', accent: '#b4ff00' } // Acid green
      },
      layout: { homepage: 'HeroAsymmetric', productGrid: 'GridHorizontal', header: 'NavMega' },
      animations: 'bounce'
    }
  },
  {
    name: 'The Creative Archive',
    industry: 'photography',
    dna: {
      personality: 'cream-archive',
      visual: {
        themeMode: 'light',
        colorSystem: 'archive',
        typography: 'Inter',
        shapeLanguage: 'rounded',
        colors: { primary: '#3e2723', background: '#fffdd0', surface: '#f5f5dc', text: '#4e342e', accent: '#d32f2f' } // Cream, dark brown, faded red
      },
      layout: { homepage: 'HeroStory', productGrid: 'GridMasonry', header: 'NavCentered' },
      animations: 'smooth'
    }
  },
  {
    name: 'Future Grid',
    industry: 'technology',
    dna: {
      personality: 'future-grid',
      visual: {
        themeMode: 'dark',
        colorSystem: 'neon',
        typography: 'Inter',
        shapeLanguage: 'sharp',
        colors: { primary: '#00ffff', background: '#121212', surface: '#1e1e1e', text: '#f5f5f5', accent: '#00ffff' } // Graphite, white, cyan
      },
      layout: { homepage: 'HeroBento', productGrid: 'GridBento', header: 'NavGlass' },
      animations: 'spring'
    }
  },
  {
    name: 'Paper Studio',
    industry: 'design',
    dna: {
      personality: 'paper-studio',
      visual: {
        themeMode: 'light',
        colorSystem: 'paper',
        typography: 'Inter',
        shapeLanguage: 'sharp',
        colors: { primary: '#000000', background: '#fcfcfc', surface: '#ffffff', text: '#111111', accent: '#d32f2f' } // Paper white, ink black, red annotation
      },
      layout: { homepage: 'HeroSplit', productGrid: 'GridFeatured', header: 'PillNav' },
      animations: 'smooth'
    }
  },
  {
    name: 'FRAME/24',
    industry: 'film',
    dna: {
      personality: 'cinematic-filmmaker',
      visual: {
        themeMode: 'dark',
        colorSystem: 'monochrome-dark',
        typography: 'Inter',
        shapeLanguage: 'sharp',
        colors: { primary: '#ffffff', background: '#050a1f', surface: '#0d132b', text: '#e2e8f0', accent: '#94a3b8' } // Deep navy, charcoal, silver
      },
      layout: { homepage: 'HeroVideo', productGrid: 'GridHorizontal', header: 'NavMinimal' },
      animations: 'smooth'
    }
  },
  {
    name: 'Moss & Form',
    industry: 'architecture',
    dna: {
      personality: 'organic-creative',
      visual: {
        themeMode: 'light',
        colorSystem: 'organic',
        typography: 'Inter',
        shapeLanguage: 'pill',
        colors: { primary: '#2d4a22', background: '#faf9f6', surface: '#f0ece1', text: '#3e3a35', accent: '#8b5a2b' } // Warm white, forest green, clay, natural brown
      },
      layout: { homepage: 'HeroAsymmetric', productGrid: 'GridStandard', header: 'NavFloating' },
      animations: 'smooth'
    }
  },
  {
    name: 'Pulse Creator',
    industry: 'music',
    dna: {
      personality: 'neon-creator',
      visual: {
        themeMode: 'dark',
        colorSystem: 'vibrant',
        typography: 'Space Grotesk',
        shapeLanguage: 'rounded',
        colors: { primary: '#ff007f', background: '#0a001a', surface: '#1a0033', text: '#f8f8f8', accent: '#00e5ff' } // Deep purple, electric blue, neon pink
      },
      layout: { homepage: 'HeroImmersive', productGrid: 'GridAsymmetric', header: 'OverlayNav' },
      animations: 'spring'
    }
  },
  {
    name: 'MONOLITH',
    industry: 'architecture',
    dna: {
      personality: 'architecture-monolith',
      visual: {
        themeMode: 'light',
        colorSystem: 'monochrome',
        typography: 'Inter',
        shapeLanguage: 'sharp',
        colors: { primary: '#000000', background: '#f5f5f5', surface: '#ffffff', text: '#111111', accent: '#888888' } // Concrete gray, white, black
      },
      layout: { homepage: 'HeroFullscreen', productGrid: 'GridStandard', header: 'NavMinimal' },
      animations: 'none'
    }
  },
  {
    name: 'Studio Market',
    industry: 'creator',
    dna: {
      personality: 'creative-commerce',
      visual: {
        themeMode: 'light',
        colorSystem: 'elegant',
        typography: 'Playfair Display',
        shapeLanguage: 'rounded',
        colors: { primary: '#111111', background: '#fdfbf7', surface: '#ffffff', text: '#333333', accent: '#cda434' }
      },
      layout: { homepage: 'HeroProduct', productGrid: 'GridEditorial', header: 'EditorialNav' },
      animations: 'smooth'
    }
  }
];

async function main() {
  console.log('Generating 10 Master Portfolio stores...');
  const passwordHash = await bcrypt.hash('password123', 10);

  let successCount = 0;

  for (let i = 0; i < TEMPLATES.length; i++) {
    const template = TEMPLATES[i];
    const storeName = template.name;
    
    // Create unique user for this store
    const userEmail = `storeowner_master_${i}_${Date.now()}@example.com`;
    
    const user = await prisma.user.create({
      data: {
        email: userEmail,
        passwordHash,
        fullName: `Master Owner ${i}`,
        role: 'SELLER',
        isVerified: true
      }
    });

    const dna = {
      version: 2,
      industry: template.industry,
      niche: template.industry,
      personality: template.dna.personality,
      features: { megaMenu: true, quickView: true, dealsTab: false, collectionsNav: true, cartSidebar: true, liveSearch: true, tiktokFeed: false, wishlist: true },
      visual: template.dna.visual,
      layout: template.dna.layout,
      animations: template.dna.animations,
      tier: 'signature'
    };
    
    const portfolioConfig = {
      priceRate: 49,
      tier: 'Master',
      animation: 'framer-advanced',
      transition: 'fluid',
      confetti: true,
      layout: 'standard-grid'
    };

    try {
      await prisma.store.create({
        data: {
          sellerId: user.id,
          storeName: storeName,
          description: `A stunning premium store showcasing the ${template.name} design system.`,
          country: 'US',
          isPremium: true,
          portfolioLayout: portfolioConfig.layout,
          portfolioSlug: `master-store-${i}-${crypto.randomBytes(4).toString('hex')}`,
          portfolioConfig: JSON.stringify(portfolioConfig),
          storeDna: JSON.stringify(dna),
          storeDnaDraft: JSON.stringify(dna),
          isVerified: true,
          approvalStatus: 'APPROVED',
          performanceScore: 99
        }
      });
      successCount++;
      console.log(`Created store: ${storeName}`);
    } catch (e) {
      console.error(`Failed to create master store ${i}:`, e.message);
    }
  }

  console.log(`Successfully generated ${successCount} master stores!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
