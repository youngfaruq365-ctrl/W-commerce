const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        console.log('Starting raw database cleanup...');

        // 1. Identify what to keep
        const lastProduct = await prisma.product.findFirst({
            orderBy: { createdAt: 'desc' }
        });

        const usersToKeep = await prisma.user.findMany({
            where: {
                OR: [
                    { role: 'ADMIN' },
                    { email: { contains: 'fakunle' } },
                    { email: { contains: 'young' } }
                ]
            }
        });

        const keptUserIds = usersToKeep.map(u => u.id).map(id => `'${id}'`).join(',');
        const keptProductId = lastProduct ? `'${lastProduct.id}'` : `''`;

        // We use raw queries to bypass FK issues or just delete them directly
        // Because Prisma uses sqlite, we can execute PRAGMA foreign_keys = OFF;
        await prisma.$executeRawUnsafe(`PRAGMA foreign_keys = OFF;`);

        // Get all tables
        const tables = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_prisma_migrations';`;
        
        for (const { name: table } of tables) {
            if (table === 'User') {
                if (keptUserIds) await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE id NOT IN (${keptUserIds});`);
            } else if (table === 'Store') {
                if (keptUserIds) await prisma.$executeRawUnsafe(`DELETE FROM "Store" WHERE sellerId NOT IN (${keptUserIds});`);
            } else if (table === 'Product') {
                if (keptProductId) await prisma.$executeRawUnsafe(`DELETE FROM "Product" WHERE id != ${keptProductId};`);
            } else if (table === 'Address') {
                 if (keptUserIds) await prisma.$executeRawUnsafe(`DELETE FROM "Address" WHERE userId NOT IN (${keptUserIds});`);
            } else {
                 await prisma.$executeRawUnsafe(`DELETE FROM "${table}";`);
            }
            console.log(`Cleared table: ${table}`);
        }

        await prisma.$executeRawUnsafe(`PRAGMA foreign_keys = ON;`);
        console.log('Raw cleanup completed successfully!');
    } catch (e) {
        console.error('Error during cleanup:', e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
