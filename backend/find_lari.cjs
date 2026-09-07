const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findLari() {
  const users = await prisma.user.findMany({
    where: { email: { contains: 'lari' } }
  });
  console.log(users.map(u => u.email));
  await prisma.$disconnect();
}
findLari().catch(console.error);
