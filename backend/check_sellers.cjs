const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const sellerAnalyticsService = require('./src/services/sellerAnalyticsService');
const { getSellerOrders } = require('./src/controllers/analyticsController');

async function run() {
    const sellers = await prisma.user.findMany({ where: { role: 'SELLER' }, include: { store: true } });
    for (const seller of sellers) {
        if (!seller.store) continue;
        
        try {
            const perf = await sellerAnalyticsService.getSellerPerformance(seller.id);
            const totalProducts = await prisma.product.count({ where: { storeId: seller.store.id } });
            
            if (perf.totalOrders === 4 && totalProducts === 0) {
                 console.log("FOUND USER WITH 4 ORDERS BUT 0 PRODUCTS:", seller.email);
            }
        } catch (e) {
            console.log('Seller:', seller.email, 'Error:', e.message);
        }
    }
    console.log("Done checking.");
}
run().catch(console.error).finally(()=>prisma.$disconnect());
