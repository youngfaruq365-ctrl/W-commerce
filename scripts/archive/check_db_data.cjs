const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.count();
  const stores = await prisma.store.count();
  const products = await prisma.product.count();

  console.log(`Users: ${users}, Stores: ${stores}, Products: ${products}`);

  const user = await prisma.user.findUnique({ where: { email: 'fakunlefaruq@gmail.com' } });
  if (user) {
    const store = await prisma.store.findUnique({ where: { sellerId: user.id } });
    console.log(`User ${user.email} (Role: ${user.role}) Store:`, store ? store.storeName : 'None');
    
    if (store) {
      const storeProducts = await prisma.product.findMany({ where: { storeId: store.id } });
      console.log(`User's Store Products: ${storeProducts.length}`);
      if (storeProducts.length > 0) {
         console.log(storeProducts[0].title);
      }
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
