const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    include: { store: { include: { user: true } }, images: true }
  });
  console.log(`Total products: ${products.length}`);
  products.forEach(p => {
    console.log(`- ${p.title} by ${p.store?.user?.email} with ${p.images?.length} images`);
  });
}

main().finally(() => prisma.$disconnect());
