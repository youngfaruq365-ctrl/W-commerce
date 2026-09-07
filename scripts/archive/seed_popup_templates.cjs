const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const popups = [
  {
    name: 'Luxury Star Seller Award',
    slug: 'popup-001',
    description: 'Golden 3D trophy, dark theme, smooth motion for elite sellers.',
    category: 'seller-achievement',
    type: 'popup',
    price: 2500,
    version: '1.0',
    thumbnail: 'https://images.unsplash.com/photo-1542038383-ce83907c1664?auto=format&fit=crop&q=80&w=400',
    configuration: JSON.stringify({
      layout: { type: 'card', position: 'center', width: 'max-w-md', shape: 'rounded-2xl', textAlign: 'center' },
      theme: { background: '#111', text: '#fff', accent: '#D8B45A', shadow: true },
      content: { header: 'Achievement Unlocked', icon: 'Award', title: 'Top 1% Seller', subtitle: 'You are shopping with one of our best.', badge: 'ELITE' },
      effects: { threeD: true, confetti: false },
      motion: { preset: 'spring-celebration', duration: 0.8 },
      behavior: { trigger: 'onOpen', delay: 1 },
      branding: { showLogo: true, showSellerName: true, showVerifiedBadge: true },
      cta: { label: 'View Profile', action: 'SELLER_PROFILE' }
    })
  },
  {
    name: 'Cyber Flash Sale',
    slug: 'popup-002',
    description: 'Neon colors, countdown timer, glitch animation.',
    category: 'promotions',
    type: 'popup',
    price: 1500,
    version: '1.0',
    thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=400',
    configuration: JSON.stringify({
      layout: { type: 'card', position: 'center', width: 'max-w-lg', shape: 'ticket', textAlign: 'center' },
      theme: { background: '#0a0a0a', text: '#00ffcc', accent: '#ff0055', shadow: true },
      content: { icon: 'Zap', title: 'CYBER DROP', subtitle: 'Hurry, time is running out!', showCountdown: true },
      offer: { discount: 50, discountType: 'percentage', code: 'CYBER50' },
      effects: { threeD: false, confetti: false },
      motion: { preset: 'glitch', duration: 0.3 },
      behavior: { trigger: 'onOpen', delay: 0.5 },
      cta: { label: 'Shop Sale', action: 'COLLECTION' }
    })
  },
  {
    name: 'VIP Welcome Party',
    slug: 'popup-003',
    description: 'Champagne accents, confetti trigger, floating card.',
    category: 'sales-funnel',
    type: 'popup',
    price: 1200,
    version: '1.0',
    thumbnail: 'https://images.unsplash.com/photo-1571295982054-93e506692f49?auto=format&fit=crop&q=80&w=400',
    configuration: JSON.stringify({
      layout: { type: 'card', position: 'center', width: 'max-w-md', shape: 'pill', textAlign: 'center' },
      theme: { background: '#fcfaf5', text: '#333', accent: '#c49a45', shadow: true },
      content: { icon: 'Star', title: 'Welcome to VIP', subtitle: 'Here is a gift for joining our club.' },
      offer: { discount: 10, discountType: 'amount', description: 'Off your first order' },
      effects: { threeD: false, confetti: true },
      motion: { preset: 'slide-up', duration: 0.7 },
      behavior: { trigger: 'onOpen', delay: 2 },
      cta: { label: 'Claim Reward', action: 'CHECKOUT' }
    })
  },
  {
    name: 'Cart Abandonment Split',
    slug: 'popup-004',
    description: 'Split screen layout with product image and spring entrance.',
    category: 'cart',
    type: 'popup',
    price: 2000,
    version: '1.0',
    thumbnail: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=400',
    configuration: JSON.stringify({
      layout: { type: 'split', position: 'center', width: 'max-w-2xl', shape: 'rounded-2xl', imageShape: 'split-left', textAlign: 'left' },
      theme: { background: '#fff', text: '#000', accent: '#000', shadow: true },
      media: { heroImage: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=400' },
      content: { title: 'Left something behind?', subtitle: 'Your cart is waiting for you.' },
      effects: { threeD: false, confetti: false },
      motion: { preset: 'slide-side', duration: 0.6 },
      behavior: { trigger: 'onExitIntent', delay: 0 },
      cta: { label: 'Return to Cart', action: 'CHECKOUT' }
    })
  },
  {
    name: 'Editorial New Arrival',
    slug: 'popup-005',
    description: 'Magazine style, oversized serif typography, slide-up reveal.',
    category: 'promotions',
    type: 'popup',
    price: 3000,
    version: '1.0',
    thumbnail: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=400',
    configuration: JSON.stringify({
      layout: { type: 'card', position: 'bottom', width: 'w-full', shape: 'rounded-none', textAlign: 'center' },
      theme: { background: '#f4f4f4', text: '#1a1a1a', accent: '#1a1a1a', shadow: false },
      content: { header: 'New Collection', title: 'AUTUMN / WINTER', subtitle: 'The new standard in luxury.' },
      products: { show: true, title: 'Featured Pieces' },
      effects: { threeD: false, confetti: false },
      motion: { preset: 'slide-up', duration: 1 },
      behavior: { trigger: 'onOpen', delay: 1.5 },
      cta: { label: 'Discover Now', action: 'COLLECTION' }
    })
  },
  {
    name: 'Brutalist Restock',
    slug: 'popup-006',
    description: 'Hard shadows, acid colors, bouncing motion.',
    category: 'promotions',
    type: 'popup',
    price: 1000,
    version: '1.0',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=400',
    configuration: JSON.stringify({
      layout: { type: 'card', position: 'side', width: 'max-w-sm', shape: 'rounded-none', textAlign: 'left' },
      theme: { background: '#ccff00', text: '#000', accent: '#000', shadow: true },
      content: { icon: 'Zap', title: 'RESTOCKED', subtitle: 'Fast selling item is back in stock!' },
      effects: { threeD: false, confetti: false },
      motion: { preset: 'spring-celebration', duration: 0.5 },
      behavior: { trigger: 'onOpen', delay: 3 },
      cta: { label: 'Buy Now', action: 'CHECKOUT' }
    })
  },
  {
    name: 'Weekend Clearance Ticket',
    slug: 'popup-007',
    description: 'Diagonal ticket shape, large percentage discount.',
    category: 'promotions',
    type: 'popup',
    price: 1200,
    version: '1.0',
    thumbnail: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=400',
    configuration: JSON.stringify({
      layout: { type: 'card', position: 'center', width: 'max-w-md', shape: 'ticket', textAlign: 'center' },
      theme: { background: '#e63946', text: '#fff', accent: '#fff', shadow: true },
      content: { icon: 'Tag', title: 'WEEKEND CLEARANCE', badge: 'LAST CHANCE' },
      offer: { discount: 70, discountType: 'percentage', code: 'CLEAR70' },
      effects: { threeD: false, confetti: false },
      motion: { preset: 'fade', duration: 0.4 },
      behavior: { trigger: 'onOpen', delay: 1 },
      cta: { label: 'Shop Now', action: 'COLLECTION' }
    })
  },
  {
    name: 'Minimal Free Shipping',
    slug: 'popup-008',
    description: 'Floating pill shape, smooth fade, delivery icon.',
    category: 'sales-funnel',
    type: 'popup',
    price: 1500,
    version: '1.0',
    thumbnail: 'https://images.unsplash.com/photo-1586528116311-ad8ed7c663be?auto=format&fit=crop&q=80&w=400',
    configuration: JSON.stringify({
      layout: { type: 'card', position: 'bottom', width: 'max-w-sm', shape: 'pill', textAlign: 'center' },
      theme: { background: '#111', text: '#fff', accent: '#fff', shadow: true },
      content: { icon: 'ShoppingBag', title: 'Free Shipping', subtitle: 'On all orders over $50' },
      effects: { threeD: false, confetti: false },
      motion: { preset: 'slide-up', duration: 0.8 },
      behavior: { trigger: 'onOpen', delay: 2 },
      cta: { label: 'Shop Now', action: 'COLLECTION' }
    })
  },
  {
    name: 'Birthday Celebration',
    slug: 'popup-009',
    description: 'Celebration layout, 3D gift box, confetti.',
    category: 'sales-funnel',
    type: 'popup',
    price: 1800,
    version: '1.0',
    thumbnail: 'https://images.unsplash.com/photo-1530103862676-de8892ebe829?auto=format&fit=crop&q=80&w=400',
    configuration: JSON.stringify({
      layout: { type: 'card', position: 'center', width: 'max-w-md', shape: 'rounded-2xl', textAlign: 'center' },
      theme: { background: '#fff0f5', text: '#ff1493', accent: '#ff69b4', shadow: true },
      content: { icon: 'Gift', title: 'Happy Birthday!', subtitle: 'Enjoy a special gift on us.' },
      offer: { discount: 20, discountType: 'percentage', code: 'BDAY20' },
      effects: { threeD: true, confetti: true },
      motion: { preset: 'spring-celebration', duration: 0.7 },
      behavior: { trigger: 'onOpen', delay: 1 },
      cta: { label: 'Claim Gift', action: 'COLLECTION' }
    })
  },
  {
    name: 'Soft Review Request',
    slug: 'popup-010',
    description: 'Circular popup, soft glass panel, subtle glow.',
    category: 'sales-funnel',
    type: 'popup',
    price: 2200,
    version: '1.0',
    thumbnail: 'https://images.unsplash.com/photo-1512418490979-92798cec1380?auto=format&fit=crop&q=80&w=400',
    configuration: JSON.stringify({
      layout: { type: 'card', position: 'center', width: 'max-w-sm', shape: 'circle', textAlign: 'center' },
      theme: { background: 'rgba(255,255,255,0.9)', text: '#333', accent: '#4a90e2', shadow: true },
      content: { icon: 'Heart', title: 'Love your item?', subtitle: 'Leave a review and get 10% off.' },
      effects: { threeD: false, confetti: false },
      motion: { preset: 'fade', duration: 1 },
      behavior: { trigger: 'onPurchase', delay: 5 },
      cta: { label: 'Leave Review', action: 'SELLER_PROFILE' }
    })
  },
  {
    name: 'Dynamic Bundle Offer',
    slug: 'popup-011',
    description: 'Product collage, connecting lines, slow scale.',
    category: 'cart',
    type: 'popup',
    price: 2800,
    version: '1.0',
    thumbnail: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&q=80&w=400',
    configuration: JSON.stringify({
      layout: { type: 'card', position: 'center', width: 'max-w-lg', shape: 'rounded-2xl', textAlign: 'center' },
      theme: { background: '#2c3e50', text: '#ecf0f1', accent: '#e74c3c', shadow: true },
      content: { header: 'Frequently Bought Together', title: 'Bundle & Save' },
      products: { show: true, title: 'Complete the look' },
      offer: { discount: 15, discountType: 'percentage', description: 'When you buy all 3 items' },
      effects: { threeD: false, confetti: false },
      motion: { preset: 'slide-up', duration: 0.6 },
      behavior: { trigger: 'onOpen', delay: 1.5 },
      cta: { label: 'Add Bundle to Cart', action: 'CHECKOUT' }
    })
  },
  {
    name: 'Festive Snow Campaign',
    slug: 'popup-012',
    description: 'Full-image background, festive colors, particle engine.',
    category: 'promotions',
    type: 'popup',
    price: 2100,
    version: '1.0',
    thumbnail: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?auto=format&fit=crop&q=80&w=400',
    configuration: JSON.stringify({
      layout: { type: 'card', position: 'center', width: 'max-w-md', shape: 'rounded-2xl', textAlign: 'center' },
      theme: { background: '#0f2027', text: '#fff', accent: '#ff4b2b', shadow: true },
      media: { backgroundImage: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?auto=format&fit=crop&q=80&w=600' },
      content: { title: 'Holiday Sale', subtitle: 'Unwrap the magic of savings.' },
      offer: { discount: 30, discountType: 'percentage', code: 'HOLIDAY30' },
      effects: { threeD: false, confetti: true }, // Using confetti as snow fallback
      motion: { preset: 'fade', duration: 1.2 },
      behavior: { trigger: 'onOpen', delay: 0 },
      cta: { label: 'Shop Gifts', action: 'COLLECTION' }
    })
  },
  {
    name: 'Organic Follow Request',
    slug: 'popup-013',
    description: 'Earth tones, organic shape, magnetic CTA.',
    category: 'seller-achievement',
    type: 'popup',
    price: 1100,
    version: '1.0',
    thumbnail: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&q=80&w=400',
    configuration: JSON.stringify({
      layout: { type: 'card', position: 'bottom', width: 'max-w-sm', shape: 'rounded-[3rem]', textAlign: 'center' },
      theme: { background: '#dce0d9', text: '#3e4a3d', accent: '#5c7a58', shadow: false },
      content: { icon: 'Heart', title: 'Join our community', subtitle: 'Follow us for exclusive updates and eco-friendly tips.' },
      branding: { showLogo: true, showSellerName: true, showVerifiedBadge: false },
      effects: { threeD: false, confetti: false },
      motion: { preset: 'slide-up', duration: 0.8 },
      behavior: { trigger: 'onScroll', delay: 0 },
      cta: { label: 'Follow Store', action: 'SELLER_PROFILE' }
    })
  },
  {
    name: '3D Product Showcase',
    slug: 'popup-014',
    description: '3D rotating product presentation, dark UI.',
    category: 'promotions',
    type: 'popup',
    price: 2900,
    version: '1.0',
    thumbnail: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=400',
    configuration: JSON.stringify({
      layout: { type: 'card', position: 'center', width: 'max-w-md', shape: 'rounded-2xl', textAlign: 'center' },
      theme: { background: '#1a1a2e', text: '#e94560', accent: '#e94560', shadow: true },
      content: { header: 'Featured Product', title: 'The Next Generation', badge: 'PRE-ORDER' },
      effects: { threeD: true, confetti: false },
      motion: { preset: 'spring-celebration', duration: 0.9 },
      behavior: { trigger: 'onOpen', delay: 2 },
      cta: { label: 'Pre-order Now', action: 'CHECKOUT' }
    })
  },
  {
    name: 'Asymmetric Referral Reward',
    slug: 'popup-015',
    description: 'Asymmetric card, overlapping badges, slide entrance.',
    category: 'sales-funnel',
    type: 'popup',
    price: 1400,
    version: '1.0',
    thumbnail: 'https://images.unsplash.com/photo-1511376868136-742c0de8c9a8?auto=format&fit=crop&q=80&w=400',
    configuration: JSON.stringify({
      layout: { type: 'card', position: 'side', width: 'max-w-sm', shape: 'rounded-tl-[4rem] rounded-br-[4rem]', textAlign: 'left' },
      theme: { background: '#6c5ce7', text: '#fff', accent: '#fdcb6e', shadow: true },
      content: { icon: 'Gift', title: 'Give $20, Get $20', subtitle: 'Refer a friend and you both win.' },
      effects: { threeD: false, confetti: true },
      motion: { preset: 'slide-side', duration: 0.5 },
      behavior: { trigger: 'onOpen', delay: 4 },
      cta: { label: 'Share Link', action: 'SELLER_PROFILE' }
    })
  },
  {
    name: 'Urgent Limited Drop',
    slug: 'popup-016',
    description: 'Floating bottom sheet, countdown, urgent red tones.',
    category: 'promotions',
    type: 'popup',
    price: 2600,
    version: '1.0',
    thumbnail: 'https://images.unsplash.com/photo-1552346154-21d32810baa3?auto=format&fit=crop&q=80&w=400',
    configuration: JSON.stringify({
      layout: { type: 'card', position: 'bottom', width: 'w-full max-w-2xl', shape: 'rounded-t-3xl', textAlign: 'center' },
      theme: { background: '#d63031', text: '#fff', accent: '#fff', shadow: true },
      content: { title: 'LIMITED SNEAKER DROP', subtitle: 'Only 50 pairs available worldwide.', showCountdown: true },
      effects: { threeD: false, confetti: false },
      motion: { preset: 'slide-up', duration: 0.4 },
      behavior: { trigger: 'onOpen', delay: 0 },
      cta: { label: 'Join Queue', action: 'COLLECTION' }
    })
  },
  {
    name: 'Loyalty Achievement Unlock',
    slug: 'popup-017',
    description: 'Achievement dashboard layout, medal icon, celebration physics.',
    category: 'seller-achievement',
    type: 'popup',
    price: 1700,
    version: '1.0',
    thumbnail: 'https://images.unsplash.com/photo-1614036634955-ae5e90f9cb9c?auto=format&fit=crop&q=80&w=400',
    configuration: JSON.stringify({
      layout: { type: 'card', position: 'center', width: 'max-w-md', shape: 'rounded-2xl', textAlign: 'center' },
      theme: { background: '#2d3436', text: '#ffeaa7', accent: '#ffeaa7', shadow: true },
      content: { icon: 'ShieldCheck', title: 'Gold Tier Reached!', subtitle: 'You are now a Gold Member.', badge: 'LEVEL UP' },
      effects: { threeD: false, confetti: true },
      motion: { preset: 'spring-celebration', duration: 0.6 },
      behavior: { trigger: 'onOpen', delay: 1 },
      cta: { label: 'View Perks', action: 'SELLER_PROFILE' }
    })
  },
  {
    name: 'Cross-sell Bento Grid',
    slug: 'popup-018',
    description: 'Bento layout, 4 product recommendations, smooth hover states.',
    category: 'cart',
    type: 'popup',
    price: 2400,
    version: '1.0',
    thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=400',
    configuration: JSON.stringify({
      layout: { type: 'card', position: 'center', width: 'max-w-lg', shape: 'rounded-3xl', textAlign: 'center' },
      theme: { background: '#f8f9fa', text: '#212529', accent: '#007bff', shadow: true },
      content: { header: 'Wait!', title: 'Have you seen these?', subtitle: 'Customers also bought:' },
      products: { show: true, title: '' },
      effects: { threeD: false, confetti: false },
      motion: { preset: 'fade', duration: 0.5 },
      behavior: { trigger: 'onExitIntent', delay: 0 },
      cta: { label: 'Continue Shopping', action: 'COLLECTION' }
    })
  },
  {
    name: 'Minimal Store Announcement',
    slug: 'popup-019',
    description: 'Side panel notification, minimal text, crisp typography.',
    category: 'promotions',
    type: 'popup',
    price: 1300,
    version: '1.0',
    thumbnail: 'https://images.unsplash.com/photo-1497215848935-8666497f6c38?auto=format&fit=crop&q=80&w=400',
    configuration: JSON.stringify({
      layout: { type: 'card', position: 'side', width: 'max-w-xs', shape: 'rounded-lg', textAlign: 'left' },
      theme: { background: '#fff', text: '#333', accent: '#000', shadow: true },
      content: { header: 'Announcement', title: 'We moved!', subtitle: 'Our flagship store has a new location in Soho.' },
      effects: { threeD: false, confetti: false },
      motion: { preset: 'slide-side', duration: 0.5 },
      behavior: { trigger: 'onOpen', delay: 2 },
      cta: { label: 'Read More', action: 'SELLER_PROFILE' }
    })
  },
  {
    name: 'Luxury Membership VIP Card',
    slug: 'popup-020',
    description: 'Luxury VIP card layout, metallic text effects, image parallax.',
    category: 'sales-funnel',
    type: 'popup',
    price: 3000,
    version: '1.0',
    thumbnail: 'https://images.unsplash.com/photo-1556740758-90de374c12ad?auto=format&fit=crop&q=80&w=400',
    configuration: JSON.stringify({
      layout: { type: 'card', position: 'center', width: 'max-w-md', shape: 'rounded-xl', textAlign: 'center' },
      theme: { background: 'linear-gradient(135deg, #2c3e50 0%, #000000 100%)', text: '#e0c3fc', accent: '#8e2de2', shadow: true },
      content: { icon: 'Award', title: 'W-COMMERCE BLACK', subtitle: 'Exclusive access to our most premium features.' },
      effects: { threeD: true, confetti: false },
      motion: { preset: 'spring-celebration', duration: 1 },
      behavior: { trigger: 'onOpen', delay: 1.5 },
      cta: { label: 'Apply Now', action: 'SELLER_PROFILE' }
    })
  }
];

async function main() {
  console.log('Clearing old popup templates...');
  await prisma.template.deleteMany({
    where: { type: 'popup' }
  });

  console.log('Seeding 20 premium popup templates...');
  
  let count = 0;
  for (const t of popups) {
    await prisma.template.create({
      data: t
    });
    count++;
    console.log(`Created template: ${t.name} (${t.price} NGN)`);
  }
  
  console.log(`Successfully seeded ${count} popup templates!`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
