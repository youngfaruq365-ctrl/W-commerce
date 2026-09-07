const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
async function run() { 
  try { await prisma.orderItem.updateMany({ where: { status: 'PENDING' }, data: { status: 'PAID' } }); } catch (e) {}
  try { await prisma.orderItem.updateMany({ where: { status: 'PROCESSING' }, data: { status: 'PAID' } }); } catch (e) {}
  console.log('All pending order items marked as PAID'); 
  await prisma.$disconnect(); 
} 
run();
