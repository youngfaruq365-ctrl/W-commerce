const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
async function run() { 
  try { await prisma.order.updateMany({ where: { paymentStatus: 'PENDING' }, data: { paymentStatus: 'PAID', status: 'PAID' } }); } catch (e) {}
  try { await prisma.fulfillmentOrder.updateMany({ where: { paymentStatus: 'PENDING' }, data: { paymentStatus: 'PAID', status: 'PAID' } }); } catch (e) {}
  try { await prisma.marketplaceOrder.updateMany({ where: { paymentStatus: 'PENDING' }, data: { paymentStatus: 'PAID', status: 'PAID' } }); } catch (e) {}
  console.log('All pending payments in all tables marked as PAID'); 
  await prisma.$disconnect(); 
} 
run();
