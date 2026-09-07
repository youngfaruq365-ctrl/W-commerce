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
  const users = await prisma.user.findMany({ select: { email: true } });
  console.log("Users in prisma_old/prisma/dev.db:", users);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
