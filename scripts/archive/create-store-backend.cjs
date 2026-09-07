const prisma = require('./backend/src/utils/prismaClient.js');

async function setup() {
    try {
        const userEmail = 'fakunlefaruq@gmail.com';
        
        let user = await prisma.user.findUnique({
            where: { email: userEmail }
        });

        if (!user) {
            console.log(`User ${userEmail} not found in this DB! Creating user...`);
            user = await prisma.user.create({
                data: {
                    email: userEmail,
                    passwordHash: 'dummy',
                    fullName: 'Fakunle Faruq',
                    subscriptionTier: 'ULTRA2PRO',
                }
            });
        } else {
            console.log(`Found user ${userEmail}, updating tier...`);
            user = await prisma.user.update({
                where: { email: userEmail },
                data: { subscriptionTier: 'ULTRA2PRO' }
            });
        }

        const storeSlug = 'fakunle-ultra';
        
        let store = await prisma.store.findFirst({
            where: { portfolioSlug: storeSlug }
        });

        if (!store) {
            console.log(`Store with portfolioSlug ${storeSlug} not found, creating...`);
            store = await prisma.store.create({
                data: {
                    storeName: 'Fakunle Faruq Shop',
                    description: 'Ultra2Pro Portfolio',
                    country: 'NG',
                    sellerTier: 'PRO',
                    portfolioSlug: storeSlug,
                    user: {
                        connect: { id: user.id }
                    }
                }
            });
        } else {
            console.log(`Store with portfolioSlug ${storeSlug} exists, updating userId...`);
            store = await prisma.store.update({
                where: { id: store.id },
                data: {
                    user: {
                        connect: { id: user.id }
                    }
                }
            });
        }
        
        console.log("Successfully set up user and store in current backend DB.");
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

setup();
