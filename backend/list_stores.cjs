require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const stores = await prisma.store.findMany({
        select: {
            id: true,
            storeName: true,
            portfolioSlug: true
        }
    });
    console.log(JSON.stringify(stores, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
