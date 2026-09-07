const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const sellerAnalyticsService = require('./src/services/sellerAnalyticsService');
const { getSellerAnalytics } = require('./src/controllers/analyticsController');

async function run() {
    const seller = await prisma.user.findFirst({ where: { role: 'SELLER' } });
    console.log("Found seller:", seller.id);
    
    const req = { user: { id: seller.id } };
    const res = {
        status: (code) => { console.log('STATUS:', code); return res; },
        json: (data) => { console.log('JSON:', JSON.stringify(data, null, 2)); }
    };

    try {
        await getSellerAnalytics(req, res);
    } catch (e) {
        console.error("Error calling getSellerAnalytics:", e);
    }
}
run().catch(console.error).finally(() => prisma.$disconnect());
