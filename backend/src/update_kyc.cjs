const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.user.updateMany({ where: { isVerified: true }, data: { kycTier: 3 } });
  console.log('Updated verified users to kycTier 3');
}

main().catch(console.error).finally(() => prisma.$disconnect());
