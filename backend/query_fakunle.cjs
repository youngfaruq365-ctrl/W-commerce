require('dotenv').config();
process.env.DATABASE_URL = 'file:./prisma/dev.db';
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { fullName: { contains: 'fakunle' } },
        include: {
          store: {
            include: {
              products: {
                include: { images: true }
              }
            }
          }
        }
  });
  console.log(JSON.stringify(users, null, 2));
}

main().finally(() => prisma.$disconnect());
