const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearDatabase() {
    try {
        console.log('Finding admin users...');
        const admins = await prisma.user.findMany({
            where: { role: 'ADMIN' }
        });
        
        const adminIds = admins.map(a => a.id);
        console.log(`Found ${adminIds.length} admin(s) to preserve:`, adminIds);

        console.log('Clearing database...');
        
        // Disable foreign key checks temporarily
        await prisma.$executeRawUnsafe(`PRAGMA foreign_keys = OFF`);

        const tables = await prisma.$queryRaw`SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'`;
        
        let deletedCount = 0;
        for (const table of tables) {
            const name = table.name;
            if (name === '_prisma_migrations') continue;
            
            if (name === 'User') {
                await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE role != 'ADMIN'`);
            } else {
                await prisma.$executeRawUnsafe(`DELETE FROM "${name}"`);
            }
            deletedCount++;
        }
        
        // Re-enable foreign key checks
        await prisma.$executeRawUnsafe(`PRAGMA foreign_keys = ON`);
        
        console.log(`Successfully cleared ${deletedCount} tables in the database, preserving only ADMIN users.`);
    } catch (e) {
        console.error('Error clearing database:', e);
    } finally {
        await prisma.$disconnect();
    }
}

clearDatabase();
