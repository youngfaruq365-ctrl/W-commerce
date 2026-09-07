const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const store = await prisma.store.findFirst({
    where: { portfolioSlug: 'fakunle-faruq-s-store' }
  });
  console.log("Found by slug:", store);

  const allStores = await prisma.store.findMany();
  console.log('All store slugs:', allStores.map(s => s.portfolioSlug));
}

main().finally(() => prisma.$disconnect());
