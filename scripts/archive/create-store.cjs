const { PrismaClient } = require('@prisma/client');
const path = require('path');

const dbPath = 'file:' + path.resolve(__dirname, 'prisma_old/prisma/dev.db').replace(/\\/g, '/');
process.env.DATABASE_URL = dbPath;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbPath
    }
  }
});

async function main() {
  const email = 'fakunlefaruq@gmail.com';
  const user = await prisma.user.findUnique({ 
    where: { email },
    include: { store: true }
  });
  
  if (!user) {
    console.error(`User with email ${email} not found!`);
    return;
  }
  
  let store = user.store;
  if (!store) {
    store = await prisma.store.create({
      data: {
        sellerId: user.id,
        storeName: "Ultra2Pro Portfolio",
        country: "US",
        portfolioSlug: "fakunle-ultra",
        isVerified: true
      }
    });
    console.log("Store created:", store);
  } else {
    store = await prisma.store.update({
      where: { id: store.id },
      data: { portfolioSlug: "fakunle-ultra" }
    });
    console.log("Store already existed, updated slug:", store);
  }
  
  // also set the user tier to ultra2pro
  await prisma.user.update({
    where: { email },
    data: { subscriptionTier: 'ULTRA2PRO' }
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
