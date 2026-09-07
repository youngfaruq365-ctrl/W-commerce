const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createAdmin() {
  const email = 'larisammy0@gmail.con';
  const password = 'password123';
  
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: 'ADMIN',
      passwordHash: hashedPassword
    },
    create: {
      fullName: 'Lari Sammy',
      email: email,
      passwordHash: hashedPassword,
      role: 'ADMIN'
    }
  });
  
  console.log(`Successfully created/updated admin ${user.email} with password: ${password}`);
  await prisma.$disconnect();
}
createAdmin().catch(console.error);
