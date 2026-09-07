const fs = require('fs');

const codeToAppend = `
// Get Buyer Dashboard stats
exports.getBuyerDashboard = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, fullName: true, email: true, avatarUrl: true, isVerified: true, createdAt: true } });
        
        const walletService = require('../services/walletService');
        const walletSummary = await walletService.getSummary(userId);
        const walletBalance = walletSummary.balances && walletSummary.balances.GONG ? walletSummary.balances.GONG.available : 0;
        const points = walletSummary.balances && walletSummary.balances.XP ? walletSummary.balances.XP.available : 0;

        const orderCount = await prisma.order.count({ where: { buyerId: userId } });
        const wishlistCount = await prisma.wishlist.count({ where: { buyerId: userId } });

        const recentOrders = await prisma.order.findMany({
            where: { buyerId: userId },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: { items: { include: { product: { include: { images: true } } } } }
        });

        const recommendedProducts = await prisma.product.findMany({
            take: 4,
            where: { isPublished: true },
            orderBy: { createdAt: 'desc' },
            include: { store: true, images: { take: 1 } }
        });

        res.json({
            success: true,
            buyer: user,
            stats: {
                walletBalance,
                points,
                orderCount,
                wishlistCount
            },
            recentOrders,
            recommendedProducts
        });
    } catch (error) {
        logger.error("Get Buyer Dashboard Error: " + error.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
`;

const controllerPath = 'C:\\Users\\HomePC\\Downloads\\W-COMMERCE PROJECT\\src\\backend\\controllers\\userController.js';
fs.appendFileSync(controllerPath, codeToAppend, 'utf8');

const routePath = 'C:\\Users\\HomePC\\Downloads\\W-COMMERCE PROJECT\\src\\backend\\routes\\userRoutes.js';
let routeContent = fs.readFileSync(routePath, 'utf8');
const searchString = "router.get('/profile', protect, userController.getProfile);";
if (routeContent.includes(searchString)) {
    routeContent = routeContent.replace(searchString, "router.get('/dashboard', protect, userController.getBuyerDashboard);\n" + searchString);
    fs.writeFileSync(routePath, routeContent, 'utf8');
    console.log("Dashboard route and controller added.");
} else {
    console.log("Could not find string in userRoutes.js");
}
