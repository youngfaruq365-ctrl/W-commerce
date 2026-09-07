require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const templates = await prisma.template.findMany({
        select: {
            id: true,
            name: true,
            type: true,
            price: true,
            isFree: true,
            status: true
        }
    });
    console.log(JSON.stringify(templates, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
