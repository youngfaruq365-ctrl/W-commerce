import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed with faker data...');

  // 1. Create Sellers and Stores
  const sellers = [];
  for (let i = 0; i < 5; i++) {
    const seller = await prisma.user.create({
      data: {
        email: faker.internet.email(),
        passwordHash: 'dummyhash',
        fullName: faker.person.fullName(),
        role: 'SELLER',
        isVerified: true,
      },
    });
    sellers.push(seller);

    await prisma.store.create({
      data: {
        sellerId: seller.id,
        storeName: faker.company.name(),
        country: faker.location.countryCode(),
        isVerified: true,
        approvalStatus: 'APPROVED',
        performanceScore: faker.number.int({ min: 50, max: 100 }),
      },
    });
  }

  // 2. Create Buyers
  const buyers = [];
  for (let i = 0; i < 10; i++) {
    const buyer = await prisma.user.create({
      data: {
        email: faker.internet.email(),
        passwordHash: 'dummyhash',
        fullName: faker.person.fullName(),
        role: 'BUYER',
        isVerified: true,
      },
    });
    buyers.push(buyer);
  }

  // 3. Create Products
  const products = [];
  const stores = await prisma.store.findMany();
  for (const store of stores) {
    for (let i = 0; i < 5; i++) {
      const product = await prisma.product.create({
        data: {
          storeId: store.id,
          title: faker.commerce.productName(),
          description: faker.commerce.productDescription(),
          price: faker.commerce.price({ min: 10, max: 1000 }),
          stock: faker.number.int({ min: 0, max: 100 }),
          category: faker.commerce.department(),
          images: {
            create: [
              {
                url: faker.image.urlLoremFlickr({ category: 'product' }),
                isPrimary: true,
              }
            ]
          }
        },
      });
      products.push(product);
    }
  }

  // 4. Create Reviews
  for (let i = 0; i < 20; i++) {
    const product = faker.helpers.arrayElement(products);
    const buyer = faker.helpers.arrayElement(buyers);
    const store = await prisma.store.findUnique({ where: { id: product.storeId } });

    await prisma.review.create({
      data: {
        productId: product.id,
        userId: buyer.id,
        sellerId: store.sellerId,
        rating: faker.number.int({ min: 1, max: 5 }),
        comment: faker.lorem.sentences(2),
        images: '[]',
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
