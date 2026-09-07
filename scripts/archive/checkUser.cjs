const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const u = await prisma.user.findUnique({ where: { email: 'fakunlefaruq77@gmail.com' } });
    console.log('User found:', u ? { id: u.id, role: u.role } : null);
    
    // if found, reset password to "password123" for testing
    if (u) {
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('password123', salt);
        await prisma.user.update({
            where: { id: u.id },
            data: { passwordHash: hash }
        });
        console.log('Password reset to: password123');
    }
}
check().finally(() => prisma.$disconnect());
