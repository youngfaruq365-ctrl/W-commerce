require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const fo = await prisma.fulfillmentOrder.findUnique({
        where: { id: 'c03ed1a8-c13e-4654-afee-319cf6f54330' },
        include: { marketplaceOrder: true }
    });
    console.log('Type of shippingSnapshot:', typeof fo.marketplaceOrder.shippingSnapshot);
    console.log('Starts with quote?', fo.marketplaceOrder.shippingSnapshot.startsWith('"'));
    console.log('Starts with brace?', fo.marketplaceOrder.shippingSnapshot.startsWith('{'));
}

main().finally(() => prisma.$disconnect());
