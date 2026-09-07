const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedTemplates() {
  const templates = [
    {
      name: 'Black Friday Super Sale',
      slug: 'black-friday-super-sale',
      description: 'A high-converting promotional popup template perfect for holiday sales.',
      category: 'promotions',
      type: 'popup',
      price: 500,
      currency: 'NGN',
      configuration: JSON.stringify({
        title: 'Black Friday Super Sale',
        bgColor: '#000000',
        textColor: '#ffffff'
      }),
      version: '1.0',
      status: 'PUBLISHED',
      isFeatured: true,
      isFree: false
    },
    {
      name: 'Achievement Unlocked Alert',
      slug: 'achievement-unlocked-alert',
      description: 'Celebrate buyer milestones with this beautifully animated popup.',
      category: 'seller-achievement',
      type: 'alert',
      price: 0,
      currency: 'NGN',
      configuration: JSON.stringify({
        title: 'Achievement Unlocked!',
        bgColor: '#facc15',
        textColor: '#000000'
      }),
      version: '1.0',
      status: 'PUBLISHED',
      isFeatured: false,
      isFree: true
    },
    {
      name: 'High Converting Sales Funnel',
      slug: 'high-converting-sales-funnel',
      description: 'A complete multi-step funnel for high-ticket items.',
      category: 'sales-funnel',
      type: 'funnel',
      price: 1500,
      currency: 'NGN',
      configuration: JSON.stringify({
        steps: 3,
        primaryColor: '#3b82f6'
      }),
      version: '1.0',
      status: 'PUBLISHED',
      isFeatured: true,
      isFree: false
    },
    {
      name: 'Optimized Cart Experience',
      slug: 'optimized-cart-experience',
      description: 'Reduce cart abandonment with this sleek, frictionless checkout template.',
      category: 'cart',
      type: 'checkout',
      price: 800,
      currency: 'NGN',
      configuration: JSON.stringify({
        showTrustBadges: true,
        buttonColor: '#22c55e'
      }),
      version: '1.0',
      status: 'PUBLISHED',
      isFeatured: false,
      isFree: false
    }
  ];

  for (const t of templates) {
    await prisma.template.upsert({
      where: { slug: t.slug },
      update: t,
      create: t
    });
  }
  console.log('Templates seeded successfully.');
}

seedTemplates()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
