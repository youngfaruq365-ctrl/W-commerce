const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.store.count();
  console.log('Total stores in DB:', count);

  const pending = await prisma.store.count({ where: { approvalStatus: 'PENDING' } });
  console.log('Pending stores:', pending);

  const approved = await prisma.store.count({ where: { approvalStatus: 'APPROVED' } });
  console.log('Approved stores:', approved);
}

main().catch(console.error).finally(() => prisma.$disconnect());
