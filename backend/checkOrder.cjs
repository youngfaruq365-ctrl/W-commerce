require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const order = await prisma.fulfillmentOrder.findUnique({
        where: { id: 'c03ed1a8-c13e-4654-afee-319cf6f54330' }
    });
    console.log('FulfillmentOrder:', order);
}
main().finally(() => prisma.$disconnect());
