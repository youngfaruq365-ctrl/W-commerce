const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const products = await prisma.product.findMany({
        select: { id: true, title: true, viewCount: true }
    });
    console.log("Products:");
    console.log(products);

    const inquiries = await prisma.message.count({
        where: { sender: { role: 'BUYER' } }
    });
    console.log("Total BUYER Messages (Inquiries):", inquiries);
}
run().catch(console.error).finally(() => prisma.$disconnect());
