import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const deals = await prisma.flashDeal.findMany({
    include: { product: true }
  });
  console.log(JSON.stringify(deals, null, 2));
}
main().finally(() => prisma.$disconnect());
