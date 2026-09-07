import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // 1. Create a dummy seller
  const seller = await prisma.user.upsert({
    where: { email: 'seller@example.com' },
    update: {},
    create: {
      email: 'seller@example.com',
      passwordHash: 'dummyhash',
      fullName: 'Demo Seller',
      role: 'SELLER',
      isVerified: true,
    },
  });

  // 2. Create a store for the seller
  const store = await prisma.store.upsert({
    where: { sellerId: seller.id },
    update: {},
    create: {
      sellerId: seller.id,
      storeName: 'GlobalX Premium Tech',
      country: 'US',
      isVerified: true,
      approvalStatus: 'APPROVED',
      isPremium: true,
      performanceScore: 99,
    },
  });

  // 3. Create dummy products
  const productsToCreate = [
    {
      title: 'Neon Pulse Mechanical Keyboard',
      price: 129.99,
      stock: 50,
      category: 'Electronics',
      subCategory: 'Keyboards',
      image: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=800&q=80',
      isFlashSale: true,
    },
    {
      title: 'Aura Wireless Noise-Cancelling Headphones',
      price: 249.99,
      stock: 120,
      category: 'Electronics',
      subCategory: 'Audio',
      image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=800&q=80',
      urgencyLevel: 'HIGH',
    },
    {
      title: 'Lumina Smart Home Hub',
      price: 89.99,
      stock: 200,
      category: 'Electronics',
      subCategory: 'Smart Home',
      image: 'https://images.unsplash.com/photo-1558089687-f282ffcbc126?w=800&q=80',
    },
    {
      title: 'Quantum 4K Ultra Monitor',
      price: 499.00,
      stock: 15,
      category: 'Electronics',
      subCategory: 'Monitors',
      image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&q=80',
      isFlashSale: true,
    },
    {
      title: 'Velocity Next-Gen Drone',
      price: 899.99,
      stock: 5,
      category: 'Electronics',
      subCategory: 'Drones',
      image: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80',
      urgencyLevel: 'CRITICAL',
    },
    {
      title: 'Minimalist Titanium Watch',
      price: 199.50,
      stock: 45,
      category: 'Fashion',
      subCategory: 'Watches',
      image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&q=80',
    }
  ];

  for (const p of productsToCreate) {
    const { image, ...productData } = p;
    await prisma.product.create({
      data: {
        storeId: store.id,
        ...productData,
        images: {
          create: [
            {
              url: image,
              isPrimary: true,
            }
          ]
        }
      }
    });
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
