const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clean() {
  await prisma.template.deleteMany({
    where: {
      id: {
        in: ['b42eeb73-84eb-4713-8edc-1337e9391f4f', 'a6e2f83a-2050-4771-b530-b39889c68beb', 'cdfc7651-dad8-4c5f-bac4-cd9d3e448478']
      }
    }
  });
  console.log('Old placeholders deleted');
}

clean().finally(() => prisma.$disconnect());
