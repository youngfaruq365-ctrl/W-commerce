const prisma = require('./backend/src/utils/prismaClient.js');

async function check() {
    const user = await prisma.user.findUnique({
        where: { email: 'fakunlefaruq@gmail.com' },
        include: { store: true }
    });
    console.log("User in backend's Prisma:", user ? user.email : "Not found");
    if (user && user.store) {
        console.log("Store slug:", user.store.slug);
    } else {
        console.log("No store found for this user in backend's DB");
    }
    await prisma.$disconnect();
}
check();
