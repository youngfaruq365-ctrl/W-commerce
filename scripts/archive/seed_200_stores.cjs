const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const TIERS = [
  { name: 'Essential', basePrice: 7, features: { megaMenu: false, quickView: false, aiConcierge: false, newsletterPopup: false }, animation: 'none', transition: 'none', confetti: false },
  { name: 'Plus', basePrice: 9, features: { megaMenu: true, quickView: true, aiConcierge: false, newsletterPopup: false }, animation: 'framer', transition: 'slide', confetti: false },
  { name: 'Signature', basePrice: 25, features: { megaMenu: true, quickView: true, aiConcierge: true, newsletterPopup: true }, animation: 'framer', transition: 'fade-scale', confetti: true },
];

const INDUSTRIES = ['Restaurant', 'Fashion', 'Tech', 'Beauty', 'Home'];
const ADJECTIVES = ['Modern', 'Fine', 'Fast', 'Premium', 'Cozy', 'Urban', 'Classic', 'Digital', 'Smart', 'Luxury'];
const NOUNS = ['Bistro', 'Dining', 'Food', 'Bakery', 'Boutique', 'Emporium', 'Goods', 'Tech', 'Styles', 'Market'];

async function main() {
  console.log('Generating 200 unique stores...');
  const passwordHash = await bcrypt.hash('password123', 10);

  let successCount = 0;

  for (let i = 0; i < 200; i++) {
    const tier = TIERS[Math.floor(Math.random() * TIERS.length)];
    const industry = INDUSTRIES[Math.floor(Math.random() * INDUSTRIES.length)];
    const storeName = `${ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]} ${NOUNS[Math.floor(Math.random() * NOUNS.length)]} ${i}`;
    
    // Create unique user for this store
    const userEmail = `storeowner${i}_${Date.now()}@example.com`;
    
    const user = await prisma.user.create({
      data: {
        email: userEmail,
        passwordHash,
        fullName: `Owner ${i}`,
        role: 'SELLER',
        isVerified: true
      }
    });

    const price = tier.basePrice + Math.floor(Math.random() * 5); // Add some variation

    const dna = {
      version: 1,
      industry: industry.toLowerCase(),
      niche: industry.toLowerCase(),
      personality: 'minimal',
      features: tier.features,
      visual: {
        colorSystem: { primary: '#000000', background: '#ffffff', surface: '#fafafa', text: '#111111', accent: '#333333' },
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
      confetti: tier.confetti
    };

    try {
      await prisma.store.create({
        data: {
          sellerId: user.id,
          storeName: storeName,
          description: `A beautiful ${industry} store offering the best products.`,
          country: 'US',
          isPremium: true,
          portfolioLayout: 'modern',
          portfolioSlug: `store-${i}-${crypto.randomBytes(4).toString('hex')}`,
          portfolioConfig: JSON.stringify(portfolioConfig),
          storeDna: JSON.stringify(dna),
          storeDnaDraft: JSON.stringify(dna),
          isVerified: true,
          approvalStatus: 'APPROVED',
          performanceScore: Math.floor(Math.random() * 20) + 80 // 80-99
        }
      });
      successCount++;
    } catch (e) {
      console.error(`Failed to create store ${i}:`, e.message);
    }
  }

  console.log(`Successfully generated ${successCount} stores!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
