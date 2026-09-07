const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function makeAdmin() {
  const email = 'larisammy0@gmail.com';
  const emailCon = 'larisammy0@gmail.con';
  
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.findUnique({ where: { email: emailCon } });
  }
  
  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'ADMIN' }
    });
    console.log('Successfully updated user ' + user.email + ' to ADMIN');
  } else {
    console.log('User not found with email: ' + email);
  }
  await prisma.$disconnect();
}
makeAdmin().catch(console.error);
