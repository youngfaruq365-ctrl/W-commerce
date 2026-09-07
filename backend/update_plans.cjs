const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updatePlans() {
  await prisma.sellerPlan.updateMany({
    where: { name: 'Pro' },
    data: { monthlyPriceGong: 1500 }
  });
  await prisma.sellerPlan.updateMany({
    where: { name: 'Ultra' },
    data: { monthlyPriceGong: 3000 }
  });
  console.log('Plans updated successfully!');
  await prisma.$disconnect();
}
updatePlans().catch(console.error);
