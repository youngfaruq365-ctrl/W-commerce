require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const notifs = await prisma.notification.findMany({ 
    where: { type: 'ACTION_REQUIRED' }, 
    orderBy: { createdAt: 'desc' }, 
    take: 5 
  }); 
  console.log(notifs); 
}
main().finally(() => prisma.$disconnect());
