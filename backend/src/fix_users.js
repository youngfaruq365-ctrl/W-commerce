const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 

async function fix() { 
  const emailsToFix = ['fakunlefaruq@gmail.com', 'youngfaruq365@gmail.com', 'fakunlefaruq77@gmail.com'];
  
  for (const email of emailsToFix) {
    const u = await prisma.user.findFirst({ where: { email } }); 
    if (u) { 
      await prisma.user.update({ where: { id: u.id }, data: { role: 'SELLER' } }); 
      const existingStore = await prisma.store.findUnique({ where: { sellerId: u.id } }); 
      if (!existingStore) { 
        await prisma.store.create({ 
          data: { 
            sellerId: u.id, 
            storeName: u.fullName + '\\\'s Shop', 
            description: 'Global marketplace merchant.', 
            country: 'USA', 
            isVerified: false 
          } 
        }); 
        console.log(`Store created and role set to SELLER for ${email}`); 
      } else { 
        console.log(`Role set to SELLER, store already exists for ${email}`); 
      } 
    } 
  }
} 
fix().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
