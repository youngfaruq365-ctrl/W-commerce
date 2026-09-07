require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const plans = await prisma.sellerPlan.findMany({
        select: {
            id: true,
            name: true,
            displayName: true,
            monthlyPriceGong: true,
            isActive: true
        }
    });
    console.log(JSON.stringify(plans, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
