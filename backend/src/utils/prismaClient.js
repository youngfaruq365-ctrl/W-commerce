const { PrismaClient } = require('@prisma/client');

const globalForPrisma = globalThis;

// Prevent exhausting database connections in development
const prisma = globalForPrisma.prisma || new PrismaClient({
    log: ['query', 'error', 'warn'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

const handleExit = async () => {
    await prisma.$disconnect();
    process.exit(0);
};

process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);

module.exports = prisma;
