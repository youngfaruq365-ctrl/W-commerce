const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const defaultDNA = {
    type: 'popup',
    layout: 'star-seller',
    theme: {
        background: '#35104A',
        accent: '#D8B45A',
        text: '#FFFFFF'
    },
    content: {
        title: 'Star Seller',
        subtitle: 'Top Ranking',
        badge: 'Elite 5% Seller',
        productsTitle: 'More items from other Star sellers',
    },
    animation: {
        entrance: 'spotlight',
        exit: 'fade',
        duration: 600,
        confetti: true
    },
    behavior: {
        pages: ['home'],
        delay: 5,
        frequency: 'once_per_session'
    }
};

async function main() {
    console.log('Seeding Templates...');
    
    const template = await prisma.template.upsert({
        where: { slug: 'star-seller-popup' },
        update: {},
        create: {
            name: 'Star Seller Popup',
            slug: 'star-seller-popup',
            description: 'Showcase your top ranking and drive sales with a premium spotlight popup.',
            category: 'seller-achievement',
            type: 'popup',
            price: 2500,
            currency: 'NGN',
            configuration: JSON.stringify(defaultDNA),
            version: '1.0',
            status: 'PUBLISHED',
            isFeatured: true,
            isFree: false
        }
    });

    console.log('Template seeded:', template.name);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
