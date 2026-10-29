const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedFoodGroceries() {
  console.log('[Seed] Seeding Mama\'s Garden Fresh and food/grocery items...');

  // 1. Ensure Mama\'s Garden Fresh seller and store exist
  let mamaUser = await prisma.user.findFirst({
    where: { email: 'mama.garden@wcommerce.com' }
  });

  if (!mamaUser) {
    mamaUser = await prisma.user.create({
      data: {
        email: 'mama.garden@wcommerce.com',
        fullName: 'Mama Adaeze (Garden Fresh)',
        passwordHash: 'seeded_seller_pw_hash',
        role: 'SELLER',
        isVerified: true,
        country: 'NG'
      }
    });
    console.log('[Seed] Created seller user Mama Adaeze:', mamaUser.id);
  }

  let mamaStore = await prisma.store.findFirst({
    where: { sellerId: mamaUser.id }
  });

  if (!mamaStore) {
    mamaStore = await prisma.store.create({
      data: {
        sellerId: mamaUser.id,
        storeName: "Mama's Garden Fresh",
        category: 'Groceries & Fresh Produce',
        description: 'Verified farm-to-table organic produce, fresh soup greens, and native culinary staples.',
        country: 'NG',
        isVerified: true,
        approvalStatus: 'APPROVED',
        performanceScore: 98,
        trustScore: 95
      }
    });
    console.log('[Seed] Created store Mama\'s Garden Fresh:', mamaStore.id);
  }

  // 2. Products to ensure
  const foodProducts = [
    {
      title: 'Fresh Farm-Picked Ugu (Large Bundle)',
      price: '1200',
      description: 'Fresh, farm-picked organic Ugu (Fluted Pumpkin Leaves) sourced directly from verified local farms. Crisp, nutritious, and ready for immediate delivery.',
      category: 'Groceries',
      stock: 100,
      imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80'
    },
    {
      title: 'Pounded Yam (Iyan)',
      price: '1300',
      description: 'Smooth, piping hot traditional pounded yam prepared to perfection. The ultimate comfort pairing for Nigerian native soups.',
      category: 'Meals & Combos',
      stock: 100,
      imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'
    },
    {
      title: 'Fresh Scotch Bonnet Peppers (Ata Rodo)',
      price: '1500',
      description: 'Vibrant, spicy fresh Scotch Bonnet peppers (Ata Rodo) for rich, aromatic African cuisine.',
      category: 'Groceries',
      stock: 100,
      imageUrl: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=800&q=80'
    },
    {
      title: 'Smoked Catfish',
      price: '1800',
      description: 'Oven-dried traditional smoked catfish delivering deep umami, savory aroma for native soups and stews.',
      category: 'Groceries',
      stock: 100,
      imageUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80'
    },
    {
      title: 'The Energy Boost Combo (Fresh Ugu + Pounded Yam)',
      price: '2500',
      description: 'Classic, filling comfort meal combo: Fresh Farm-Picked Ugu soup paired with smooth Pounded Yam.',
      category: 'Combos',
      stock: 50,
      imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'
    },
    {
      title: 'The Native Soup Starter Pack (Ugu + Peppers + Catfish)',
      price: '4500',
      description: 'Complete starter pack containing Fresh Ugu, Fresh Scotch Bonnet Peppers, and Smoked Catfish.',
      category: 'Combos',
      stock: 50,
      imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80'
    }
  ];

  for (const fp of foodProducts) {
    let existing = await prisma.product.findFirst({
      where: {
        title: fp.title,
        storeId: mamaStore.id
      }
    });

    if (!existing) {
      existing = await prisma.product.create({
        data: {
          storeId: mamaStore.id,
          title: fp.title,
          description: fp.description,
          price: fp.price,
          category: fp.category,
          stock: fp.stock,
          isArchived: false,
          isNegotiable: true,
          bottomPrice: String(Math.round(Number(fp.price) * 0.9)),
          images: {
            create: [
              {
                url: fp.imageUrl,
                isPrimary: true,
                position: 0
              }
            ]
          }
        }
      });
      console.log(`[Seed] Created product: ${fp.title} (₦${fp.price})`);
    } else {
      console.log(`[Seed] Product already exists: ${fp.title}`);
    }
  }

  // Also clean up any accidental 16.2M Vibe board in the user cart
  const badCartItems = await prisma.cartItem.findMany({
    where: {
      product: {
        title: { contains: 'Vibe (75' }
      }
    }
  });

  if (badCartItems.length > 0) {
    console.log(`[Seed] Cleaning up ${badCartItems.length} accidental Vibe Smart Board items from carts...`);
    for (const bci of badCartItems) {
      await prisma.cartItem.delete({ where: { id: bci.id } });
    }
    console.log('[Seed] Removed accidental Vibe Smart Board cart items.');
  }

  console.log('[Seed] Completed successfully.');
}

seedFoodGroceries()
  .catch(err => {
    console.error('[Seed Error]:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
