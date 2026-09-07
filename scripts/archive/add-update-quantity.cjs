const fs = require('fs');
let code = fs.readFileSync('src/backend/controllers/cartController.js', 'utf8');

const updateQuantityCode = `
exports.updateQuantity = async (req, res) => {
    try {
        const { productId, quantity, variants } = req.body;
        const userId = req.user.id;
        const variantString = variants ? (typeof variants === 'string' ? variants : JSON.stringify(variants)) : null;

        const cart = await prisma.cart.findUnique({
            where: { userId }
        });

        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        const existingItem = await prisma.cartItem.findFirst({
            where: {
                cartId: cart.id,
                productId: String(productId),
                variants: variantString
            }
        });

        if (!existingItem) {
            return res.status(404).json({ success: false, message: 'Item not found in cart' });
        }

        await prisma.cartItem.update({
            where: { id: existingItem.id },
            data: { quantity: quantity }
        });

        return res.json({ success: true });
    } catch (error) {
        logger.error('Error updating cart quantity: ' + error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
`;

code += '\n' + updateQuantityCode;
fs.writeFileSync('src/backend/controllers/cartController.js', code);
