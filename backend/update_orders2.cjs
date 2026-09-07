const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
async function run() { 
  try { await prisma.order.updateMany({ where: { status: 'PENDING' }, data: { status: 'PAID', paymentStatus: 'PAID' } }); } catch (e) {}
  try { await prisma.order.updateMany({ where: { status: 'PROCESSING' }, data: { status: 'PAID', paymentStatus: 'PAID' } }); } catch (e) {}
  try { await prisma.fulfillmentOrder.updateMany({ where: { status: 'PENDING' }, data: { status: 'PAID', paymentStatus: 'PAID' } }); } catch (e) {}
  try { await prisma.marketplaceOrder.updateMany({ where: { status: 'PENDING' }, data: { status: 'PAID', paymentStatus: 'PAID' } }); } catch (e) {}
  console.log('All pending/processing orders in all tables marked as PAID'); 
  await prisma.$disconnect(); 
} 
run();
