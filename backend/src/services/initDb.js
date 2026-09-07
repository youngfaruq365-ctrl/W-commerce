    const adminHash = await bcrypt.hash(adminPassword, salt);

    const admin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {
            passwordHash: adminHash, // Force update password
            role: 'ADMIN',
            isVerified: true
        },
        create: {
            email: adminEmail,
            fullName: 'GlobalX Admin',
        create: {
            email: adminEmail,
            fullName: 'GlobalX Admin',
            passwordHash: adminHash,
            role: 'ADMIN',
            isVerified: true
        }
    });

    console.log(`✅ Admin user created: ${admin.email}`);

    // 2. Create a Seller
    const sellerEmail = 'seller@techhub.com';
    const sellerPassword = process.env.SEED_SELLER_PASSWORD || 'changeme_seller_' + Date.now();
    const sellerHash = await bcrypt.hash(sellerPassword, salt);

    const seller = await prisma.user.upsert({
        where: { email: sellerEmail },
        update: {
            isVerified: true,
            hasPaidAccess: true,
            subscriptionTier: 'MONTHLY'
        },
        create: {
            email: sellerEmail,
            fullName: 'TechHub Official',
            passwordHash: sellerHash,
            role: 'SELLER',
            isVerified: true,
            hasPaidAccess: true,
            subscriptionTier: 'MONTHLY',
            store: {
        const productData = [
            {
                title: 'CyberMouse Elite',
                description: 'High-performance wireless gaming mouse with 20k DPI.',
                price: 45.00,
                stock: 150,
                images: JSON.stringify(['marketplace_hero_product_1769792272597.webp']),
                category: 'Electronics',
                subCategory: 'Gaming',
                originHub: 'Dubai'
            },
            {
                title: 'Pro Stream Deck',
                description: 'Ultimate control surface for streamers.',
                price: 89.00,
                stock: 50,
                images: JSON.stringify(['marketplace_hero_product_1769792272597.webp']),
                category: 'Electronics',
                subCategory: 'Accessories',
                originHub: 'Dubai'
            }
        ];

        for (const p of productData) {
            // Check if product exists to avoid duplicates (optional but good for seeding)
            const existing = await prisma.product.findFirst({
                where: { title: p.title, storeId: store.id }
            });

            if (!existing) {
                // prepare images (parse string array from my manual definition)
                let imgArray = [];
                try {
                    imgArray = JSON.parse(p.images);
                } catch (e) {
                    imgArray = [p.images]; // fallback if not json
                }

                const imageCreates = imgArray.map((url, idx) => ({
                    url: url,
                    isPrimary: idx === 0
                }));

                // remove images from p spread, handle separately
                const { images, ...productFields } = p;

                await prisma.product.create({
                    data: {
                        ...productFields,
                        storeId: store.id,
                        images: {
                            create: imageCreates
                        }
                    }
                });
            }
        }
        console.log(`✅ Seeded products for ${store.storeName}`);
    }

    console.log('🏁 Database Seeding Completed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
