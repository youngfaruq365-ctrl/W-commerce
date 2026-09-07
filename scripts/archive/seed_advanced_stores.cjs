const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const TIERS = [
  { 
    name: 'Essential', basePrice: 7, 
    features: { megaMenu: false, quickView: false, liveSearch: false, tiktokFeed: false, wishlist: false }, 
    animation: 'none', transition: 'none', confetti: false 
  },
  { 
    name: 'Plus', basePrice: 11, 
    features: { megaMenu: true, quickView: true, dealsTab: true, collectionsNav: true, cartSidebar: true, liveSearch: true, tiktokFeed: false, wishlist: true }, 
    animation: 'framer', transition: 'slide', confetti: false 
  },
  { 
    name: 'Pro', basePrice: 15, 
    features: { megaMenu: true, quickView: true, dealsTab: true, collectionsNav: true, cartSidebar: true, liveSearch: true, tiktokFeed: true, wishlist: true, productFiltering: true }, 
    animation: 'spring', transition: 'staggered-reveal', confetti: true 
  },
  { 
    name: 'Studio', basePrice: 19, 
    features: { megaMenu: true, quickView: true, dealsTab: true, collectionsNav: true, cartSidebar: true, liveSearch: true, tiktokFeed: true, wishlist: true, productFiltering: true, realStats: true, glassmorphism: true }, 
    animation: 'framer', transition: 'fade-scale', confetti: true 
  },
  { 
    name: 'Signature', basePrice: 25, 
    features: { megaMenu: true, quickView: true, dealsTab: true, collectionsNav: true, cartSidebar: true, liveSearch: true, tiktokFeed: true, wishlist: true, productFiltering: true, realStats: true, glassmorphism: true, premiumMotion: true, aiConcierge: true }, 
    animation: 'framer-advanced', transition: 'fluid', confetti: true 
  },
];

const INDUSTRIES = ['Fashion', 'Automotive', 'Creator', 'Property', 'Healthcare', 'Restaurant'];
const ADJECTIVES = ['Urban', 'Luxe', 'Creative', 'Homeline', 'Medicare', 'Smoky', 'Auto', 'Bake', 'Quick', 'Street'];
const NOUNS = ['Vibes', 'Drive', 'Hub', 'Realty', 'Plus', 'Bites', 'Kart', 'House', 'Meal', 'Style'];

async function main() {
  console.log('Generating 50 advanced unique stores...');
  const passwordHash = await bcrypt.hash('password123', 10);

  let successCount = 0;

  for (let i = 0; i < 50; i++) {
    const tier = TIERS[Math.floor(Math.random() * TIERS.length)];
    const industry = INDUSTRIES[Math.floor(Math.random() * INDUSTRIES.length)];
    const storeName = `${ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]} ${NOUNS[Math.floor(Math.random() * NOUNS.length)]} ${Math.floor(Math.random() * 1000)}`;
    
    // Create unique user for this store
    const userEmail = `storeowner_adv_${i}_${Date.now()}@example.com`;
    
    const user = await prisma.user.create({
      data: {
        email: userEmail,
        passwordHash,
        fullName: `Advanced Owner ${i}`,
        role: 'SELLER',
        isVerified: true
      }
    });

    const price = tier.basePrice + (Math.random() > 0.5 ? 0 : -1); // Some small variation

    const dna = {
      version: 2,
      industry: industry.toLowerCase(),
      niche: industry.toLowerCase(),
      personality: 'modern-bold',
      features: tier.features,
      visual: {
        colorSystem: { primary: '#000000', background: '#ffffff', surface: '#fafafa', text: '#111111', accent: '#22c55e' }, // 22c55e is the green from the screenshot
        typography: 'Inter',
        shapeLanguage: 'rounded'
      },
      tier: tier.name.toLowerCase()
    };
    
    const portfolioConfig = {
      priceRate: price,
      tier: tier.name,
      animation: tier.animation,
      transition: tier.transition,
      confetti: tier.confetti,
      layout: tier.features.tiktokFeed ? 'tiktok-feed' : 'standard-grid'
    };

    try {
      await prisma.store.create({
        data: {
          sellerId: user.id,
          storeName: storeName,
          description: `A stunning ${industry} store featuring advanced animations and a TikTok-style feed.`,
          country: 'US',
          isPremium: true,
          portfolioLayout: portfolioConfig.layout,
          portfolioSlug: `store-adv-${i}-${crypto.randomBytes(4).toString('hex')}`,
          portfolioConfig: JSON.stringify(portfolioConfig),
          storeDna: JSON.stringify(dna),
          storeDnaDraft: JSON.stringify(dna),
          isVerified: true,
          approvalStatus: 'APPROVED',
          performanceScore: Math.floor(Math.random() * 10) + 90 // High performance 90-99
        }
      });
      successCount++;
    } catch (e) {
      console.error(`Failed to create advanced store ${i}:`, e.message);
    }
  }

  console.log(`Successfully generated ${successCount} advanced stores!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
