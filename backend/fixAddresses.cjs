require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Fix legacy orders
    const orders = await prisma.order.findMany({
        where: { shippingAddress: { startsWith: '"' } }
    });
    
    for (const order of orders) {
        try {
            const parsedOnce = JSON.parse(order.shippingAddress);
            await prisma.order.update({
                where: { id: order.id },
                data: { shippingAddress: parsedOnce }
            });
            console.log(`Fixed double stringify on legacy Order ${order.id}`);
        } catch(e) {
            console.error(`Failed to parse legacy Order ${order.id}`);
        }
    }
    
    // Fix marketplace orders
    const mkOrders = await prisma.marketplaceOrder.findMany({
        where: { shippingSnapshot: { startsWith: '"' } }
    });
    
    for (const order of mkOrders) {
        try {
            const parsedOnce = JSON.parse(order.shippingSnapshot);
            await prisma.marketplaceOrder.update({
                where: { id: order.id },
                data: { shippingSnapshot: parsedOnce }
            });
            console.log(`Fixed double stringify on MarketplaceOrder ${order.id}`);
        } catch(e) {
            console.error(`Failed to parse MarketplaceOrder ${order.id}`);
        }
    }
}

main().finally(() => prisma.$disconnect());
