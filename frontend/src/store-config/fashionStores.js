// UI TEMPLATE CONFIG — Not business/seller data
// 15 FASHION EXPERIENCES — Rich Configs
export const fashionStores = [
  {
    id: 'fash-1', engine: 'fashion', name: 'Editorial House', price: 20, tier: 'studio',
    description: 'Fashion as art. Editorial-grade storytelling meets e-commerce.',
    pages: ['home', 'collections', 'products', 'lookbook', 'about', 'reviews', 'contact'],
    features: ['visual-search', 'ai-stylist', 'wishlist', 'size-guide', 'lookbook'],
    preview: { hero: 'https://picsum.photos/seed/fash-1/2000/1200' },
    rating: 97, motion: { level: 4 },
    design: { typography: 'serif', primary: '#111111', backgroundColor: '#ffffff', textColor: '#111111' }
  },
  {
    id: 'fash-2', engine: 'fashion', name: 'Luxury Maison', price: 25, tier: 'signature',
    description: 'Haute couture meets digital excellence. The pinnacle of fashion commerce.',
    pages: ['home', 'collections', 'products', 'lookbook', 'about', 'membership', 'reviews', 'contact'],
    features: ['visual-search', 'ai-stylist', 'wishlist', 'size-guide', 'membership', 'private-shopping', 'style-consultation'],
    preview: { hero: 'https://picsum.photos/seed/fash-2/2000/1200' },
    rating: 99, motion: { level: 5 },
    design: { typography: 'serif', primary: '#C9A96E', backgroundColor: '#0a0a0a', textColor: '#f0e6d0' }
  },
  {
    id: 'fash-3', engine: 'fashion', name: 'Streetwear', price: 12, tier: 'plus',
    description: 'Culture-first fashion. Drop culture, limited runs, community-driven.',
    pages: ['home', 'collections', 'products', 'about', 'reviews', 'contact'],
    features: ['wishlist', 'size-guide', 'drops'],
    preview: { hero: 'https://picsum.photos/seed/fash-3/2000/1200' },
    rating: 93, motion: { level: 3 },
    design: { typography: 'sans', primary: '#000000', backgroundColor: '#ffffff', textColor: '#111111' }
  },
  {
    id: 'fash-4', engine: 'fashion', name: 'Minimal Boutique', price: 10, tier: 'plus',
    description: 'Less is everything. Timeless essentials, curated with intention.',
    pages: ['home', 'collections', 'products', 'about', 'contact'],
    features: ['wishlist', 'size-guide'],
    preview: { hero: 'https://picsum.photos/seed/fash-4/2000/1200' },
    rating: 91, motion: { level: 2 },
    design: { typography: 'sans', primary: '#111111', backgroundColor: '#fafafa', textColor: '#111111' }
  },
  {
    id: 'fash-5', engine: 'fashion', name: 'Urban Brand', price: 9, tier: 'plus',
    description: 'City-born, globally worn. Urban lifestyle fashion for the modern individual.',
    pages: ['home', 'collections', 'products', 'about', 'contact'],
    features: ['wishlist', 'size-guide', 'quick-view'],
    preview: { hero: 'https://picsum.photos/seed/fash-5/2000/1200' },
    rating: 90, motion: { level: 2 },
    design: { typography: 'sans', primary: '#212121', backgroundColor: '#ffffff', textColor: '#212121' }
  },
  {
    id: 'fash-6', engine: 'fashion', name: 'Designer Store', price: 18, tier: 'studio',
    description: 'Independent designer. Every piece tells a story, every stitch is intentional.',
    pages: ['home', 'collections', 'products', 'lookbook', 'about', 'reviews', 'contact'],
    features: ['visual-search', 'ai-stylist', 'wishlist', 'size-guide', 'custom-orders'],
    preview: { hero: 'https://picsum.photos/seed/fash-6/2000/1200' },
    rating: 96, motion: { level: 4 },
    design: { typography: 'serif', primary: '#6D4C41', backgroundColor: '#fff9f5', textColor: '#3e2723' }
  },
  {
    id: 'fash-7', engine: 'fashion', name: 'Sneaker Lab', price: 14, tier: 'pro',
    description: 'Exclusive sneaker culture. Cop, trade, authenticate. Your heat, delivered.',
    pages: ['home', 'collections', 'products', 'about', 'reviews', 'contact'],
    features: ['size-guide', 'wishlist', 'authentication', 'raffle-drops'],
    preview: { hero: 'https://picsum.photos/seed/fash-7/2000/1200' },
    rating: 94, motion: { level: 3 },
    design: { typography: 'sans', primary: '#FF5722', backgroundColor: '#ffffff', textColor: '#111111' }
  },
  {
    id: 'fash-8', engine: 'fashion', name: 'Accessories Studio', price: 11, tier: 'plus',
    description: 'The finishing touch. Jewellery, bags, and accessories that complete you.',
    pages: ['home', 'collections', 'products', 'about', 'contact'],
    features: ['wishlist', 'size-guide'],
    preview: { hero: 'https://picsum.photos/seed/fash-8/2000/1200' },
    rating: 92, motion: { level: 2 },
    design: { typography: 'serif', primary: '#B8860B', backgroundColor: '#fffff8', textColor: '#2c1810' }
  },
  {
    id: 'fash-9', engine: 'fashion', name: 'Sustainable Fashion', price: 13, tier: 'pro',
    description: 'Look good, do good. Circular fashion for a conscious generation.',
    pages: ['home', 'collections', 'products', 'lookbook', 'about', 'reviews', 'contact'],
    features: ['wishlist', 'size-guide', 'sustainability-score', 'ai-stylist'],
    preview: { hero: 'https://picsum.photos/seed/fash-9/2000/1200' },
    rating: 95, motion: { level: 3 },
    design: { typography: 'sans', primary: '#2E7D32', backgroundColor: '#f9fff9', textColor: '#1b5e20' }
  },
  {
    id: 'fash-10', engine: 'fashion', name: 'Kids Fashion', price: 8, tier: 'essential',
    description: 'Bright, playful, durable. Kids fashion that keeps up with them.',
    pages: ['home', 'collections', 'products', 'about', 'contact'],
    features: ['size-guide', 'wishlist'],
    preview: { hero: 'https://picsum.photos/seed/fash-10/2000/1200' },
    rating: 89, motion: { level: 1 },
    design: { typography: 'sans', primary: '#E91E63', backgroundColor: '#ffffff', textColor: '#111111' }
  },
  {
    id: 'fash-11', engine: 'fashion', name: 'Vintage & Thrift', price: 7, tier: 'essential',
    description: 'Pre-loved, full of stories. Sustainable vintage finds, authenticated.',
    pages: ['home', 'collections', 'products', 'about', 'contact'],
    features: ['wishlist', 'size-guide'],
    preview: { hero: 'https://picsum.photos/seed/fash-11/2000/1200' },
    rating: 88, motion: { level: 1 },
    design: { typography: 'serif', primary: '#795548', backgroundColor: '#fdf8f0', textColor: '#3e2723' }
  },
  {
    id: 'fash-12', engine: 'fashion', name: 'Activewear', price: 10, tier: 'plus',
    description: 'Performance meets style. Technical activewear engineered to move with you.',
    pages: ['home', 'collections', 'products', 'about', 'reviews', 'contact'],
    features: ['size-guide', 'wishlist', 'fit-guide'],
    preview: { hero: 'https://picsum.photos/seed/fash-12/2000/1200' },
    rating: 92, motion: { level: 2 },
    design: { typography: 'sans', primary: '#0D47A1', backgroundColor: '#ffffff', textColor: '#111111' }
  },
  {
    id: 'fash-13', engine: 'fashion', name: 'Luxury Lingerie', price: 16, tier: 'pro',
    description: 'Delicate craftsmanship, premium fabrics. Intimate luxury redefined.',
    pages: ['home', 'collections', 'products', 'lookbook', 'about', 'contact'],
    features: ['size-guide', 'wishlist', 'ai-stylist', 'fit-consultation'],
    preview: { hero: 'https://picsum.photos/seed/fash-13/2000/1200' },
    rating: 95, motion: { level: 4 },
    design: { typography: 'serif', primary: '#AD1457', backgroundColor: '#fdf0f5', textColor: '#880e4f' }
  },
  {
    id: 'fash-14', engine: 'fashion', name: 'Gender-Neutral', price: 11, tier: 'plus',
    description: 'Fashion without labels. Inclusive, expressive, beautifully unrestricted.',
    pages: ['home', 'collections', 'products', 'about', 'reviews', 'contact'],
    features: ['size-guide', 'wishlist', 'ai-stylist'],
    preview: { hero: 'https://picsum.photos/seed/fash-14/2000/1200' },
    rating: 93, motion: { level: 2 },
    design: { typography: 'sans', primary: '#6200EA', backgroundColor: '#ffffff', textColor: '#111111' }
  },
  {
    id: 'fash-15', engine: 'fashion', name: 'Couture Atelier', price: 25, tier: 'signature',
    description: 'Bespoke creation. Where imagination becomes wearable art.',
    pages: ['home', 'collections', 'lookbook', 'bespoke', 'about', 'membership', 'reviews', 'contact'],
    features: ['visual-search', 'ai-stylist', 'wishlist', 'size-guide', 'bespoke', 'private-appointments', 'style-archive'],
    preview: { hero: 'https://picsum.photos/seed/fash-15/2000/1200' },
    rating: 99, motion: { level: 5 },
    design: { typography: 'serif', primary: '#1a1a1a', backgroundColor: '#f5f0eb', textColor: '#1a1a1a' }
  },

  {id:'fash-16',engine:'fashion',name:'Fashion Store 16',price:16,tier:'pro',description:'Unique and dynamic fashion experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Analytics','Booking'],preview:{hero:'https://picsum.photos/seed/fashion-16/2000/1200'},rating:89,motion:{level:1},design:{typography:'sans',primary:'#679e2b',backgroundColor:'#0a0a0a',textColor:'#ffffff'}},
  {id:'fash-17',engine:'fashion',name:'Fashion Store 17',price:22,tier:'studio',description:'Unique and dynamic fashion experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','AI','Analytics'],preview:{hero:'https://picsum.photos/seed/fashion-17/2000/1200'},rating:89,motion:{level:1},design:{typography:'sans',primary:'#fada39',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'fash-18',engine:'fashion',name:'Fashion Store 18',price:17,tier:'pro',description:'Unique and dynamic fashion experience crafted for conversion.',pages:['home','about','contact','services'],features:['Booking','Analytics','AI'],preview:{hero:'https://picsum.photos/seed/fashion-18/2000/1200'},rating:89,motion:{level:3},design:{typography:'sans',primary:'#69e87c',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'fash-19',engine:'fashion',name:'Fashion Store 19',price:18,tier:'pro',description:'Unique and dynamic fashion experience crafted for conversion.',pages:['home','about','contact','services'],features:['Automation','Loyalty','Booking'],preview:{hero:'https://picsum.photos/seed/fashion-19/2000/1200'},rating:86,motion:{level:4},design:{typography:'serif',primary:'#d4ca31',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'fash-20',engine:'fashion',name:'Fashion Store 20',price:12,tier:'plus',description:'Unique and dynamic fashion experience crafted for conversion.',pages:['home','about','contact','services'],features:['Automation','Booking','AI'],preview:{hero:'https://picsum.photos/seed/fashion-20/2000/1200'},rating:84,motion:{level:2},design:{typography:'sans',primary:'#70c461',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'fash-21',engine:'fashion',name:'Fashion Store 21',price:7,tier:'essential',description:'Unique and dynamic fashion experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','AI','Automation'],preview:{hero:'https://picsum.photos/seed/fashion-21/2000/1200'},rating:80,motion:{level:3},design:{typography:'serif',primary:'#50d30c',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'fash-22',engine:'fashion',name:'Fashion Store 22',price:6,tier:'essential',description:'Unique and dynamic fashion experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','Analytics','Automation'],preview:{hero:'https://picsum.photos/seed/fashion-22/2000/1200'},rating:92,motion:{level:1},design:{typography:'sans',primary:'#a22c19',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'fash-23',engine:'fashion',name:'Fashion Store 23',price:5,tier:'essential',description:'Unique and dynamic fashion experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','Booking','Analytics'],preview:{hero:'https://picsum.photos/seed/fashion-23/2000/1200'},rating:84,motion:{level:4},design:{typography:'serif',primary:'#16089d',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'fash-24',engine:'fashion',name:'Fashion Store 24',price:24,tier:'signature',description:'Unique and dynamic fashion experience crafted for conversion.',pages:['home','about','contact','services'],features:['Booking','Automation','Analytics'],preview:{hero:'https://picsum.photos/seed/fashion-24/2000/1200'},rating:80,motion:{level:2},design:{typography:'serif',primary:'#f7cbc0',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'fash-25',engine:'fashion',name:'Fashion Store 25',price:20,tier:'studio',description:'Unique and dynamic fashion experience crafted for conversion.',pages:['home','about','contact','services'],features:['Booking','Automation','AI'],preview:{hero:'https://picsum.photos/seed/fashion-25/2000/1200'},rating:94,motion:{level:1},design:{typography:'sans',primary:'#350687',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'fash-26',engine:'fashion',name:'Fashion Store 26',price:25,tier:'signature',description:'Unique and dynamic fashion experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','Booking','Automation'],preview:{hero:'https://picsum.photos/seed/fashion-26/2000/1200'},rating:81,motion:{level:1},design:{typography:'serif',primary:'#6dc23c',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'fash-27',engine:'fashion',name:'Fashion Store 27',price:6,tier:'essential',description:'Unique and dynamic fashion experience crafted for conversion.',pages:['home','about','contact','services'],features:['Automation','Loyalty','Booking'],preview:{hero:'https://picsum.photos/seed/fashion-27/2000/1200'},rating:92,motion:{level:3},design:{typography:'serif',primary:'#6e368d',backgroundColor:'#0a0a0a',textColor:'#ffffff'}},
  {id:'fash-28',engine:'fashion',name:'Fashion Store 28',price:27,tier:'signature',description:'Unique and dynamic fashion experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','AI','Analytics'],preview:{hero:'https://picsum.photos/seed/fashion-28/2000/1200'},rating:90,motion:{level:1},design:{typography:'sans',primary:'#d32b0f',backgroundColor:'#0a0a0a',textColor:'#ffffff'}},
  {id:'fash-29',engine:'fashion',name:'Fashion Store 29',price:12,tier:'plus',description:'Unique and dynamic fashion experience crafted for conversion.',pages:['home','about','contact','services'],features:['Analytics','Automation','Loyalty'],preview:{hero:'https://picsum.photos/seed/fashion-29/2000/1200'},rating:85,motion:{level:3},design:{typography:'serif',primary:'#650857',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'fash-30',engine:'fashion',name:'Fashion Store 30',price:20,tier:'studio',description:'Unique and dynamic fashion experience crafted for conversion.',pages:['home','about','contact','services'],features:['Analytics','AI','Loyalty'],preview:{hero:'https://picsum.photos/seed/fashion-30/2000/1200'},rating:92,motion:{level:1},design:{typography:'serif',primary:'#421b0b',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'fash-31',engine:'fashion',name:'Fashion Store 31',price:8,tier:'essential',description:'Unique and dynamic fashion experience crafted for conversion.',pages:['home','about','contact','services'],features:['Analytics','Loyalty','AI'],preview:{hero:'https://picsum.photos/seed/fashion-31/2000/1200'},rating:83,motion:{level:4},design:{typography:'sans',primary:'#4adb76',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'fash-32',engine:'fashion',name:'Fashion Store 32',price:6,tier:'essential',description:'Unique and dynamic fashion experience crafted for conversion.',pages:['home','about','contact','services'],features:['Automation','Loyalty','Booking'],preview:{hero:'https://picsum.photos/seed/fashion-32/2000/1200'},rating:94,motion:{level:4},design:{typography:'serif',primary:'#dbbb82',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'fash-33',engine:'fashion',name:'Fashion Store 33',price:20,tier:'studio',description:'Unique and dynamic fashion experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Loyalty','Analytics'],preview:{hero:'https://picsum.photos/seed/fashion-33/2000/1200'},rating:82,motion:{level:3},design:{typography:'sans',primary:'#99c4c9',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'fash-34',engine:'fashion',name:'Fashion Store 34',price:8,tier:'essential',description:'Unique and dynamic fashion experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','AI','Automation'],preview:{hero:'https://picsum.photos/seed/fashion-34/2000/1200'},rating:89,motion:{level:3},design:{typography:'serif',primary:'#77d3b4',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'fash-35',engine:'fashion',name:'Fashion Store 35',price:23,tier:'studio',description:'Unique and dynamic fashion experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','Booking','AI'],preview:{hero:'https://picsum.photos/seed/fashion-35/2000/1200'},rating:86,motion:{level:2},design:{typography:'sans',primary:'#86748f',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'fash-36',engine:'fashion',name:'Fashion Store 36',price:9,tier:'essential',description:'Unique and dynamic fashion experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Analytics','Booking'],preview:{hero:'https://picsum.photos/seed/fashion-36/2000/1200'},rating:83,motion:{level:5},design:{typography:'serif',primary:'#7dc191',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'fash-37',engine:'fashion',name:'Fashion Store 37',price:23,tier:'studio',description:'Unique and dynamic fashion experience crafted for conversion.',pages:['home','about','contact','services'],features:['Booking','Loyalty','Analytics'],preview:{hero:'https://picsum.photos/seed/fashion-37/2000/1200'},rating:89,motion:{level:1},design:{typography:'sans',primary:'#149d07',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'fash-38',engine:'fashion',name:'Fashion Store 38',price:16,tier:'pro',description:'Unique and dynamic fashion experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','Booking','Analytics'],preview:{hero:'https://picsum.photos/seed/fashion-38/2000/1200'},rating:90,motion:{level:2},design:{typography:'sans',primary:'#654750',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'fash-39',engine:'fashion',name:'Fashion Store 39',price:8,tier:'essential',description:'Unique and dynamic fashion experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','Analytics','Booking'],preview:{hero:'https://picsum.photos/seed/fashion-39/2000/1200'},rating:87,motion:{level:3},design:{typography:'sans',primary:'#a71807',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'fash-40',engine:'fashion',name:'Fashion Store 40',price:16,tier:'pro',description:'Unique and dynamic fashion experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Analytics','Booking'],preview:{hero:'https://picsum.photos/seed/fashion-40/2000/1200'},rating:91,motion:{level:3},design:{typography:'sans',primary:'#ebd00d',backgroundColor:'#0a0a0a',textColor:'#ffffff'}},
  {id:'fash-41',engine:'fashion',name:'Fashion Store 41',price:16,tier:'pro',description:'Unique and dynamic fashion experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','Automation','Booking'],preview:{hero:'https://picsum.photos/seed/fashion-41/2000/1200'},rating:81,motion:{level:3},design:{typography:'serif',primary:'#a70d4e',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'fash-42',engine:'fashion',name:'Fashion Store 42',price:7,tier:'essential',description:'Unique and dynamic fashion experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','AI','Analytics'],preview:{hero:'https://picsum.photos/seed/fashion-42/2000/1200'},rating:93,motion:{level:3},design:{typography:'sans',primary:'#0e2e05',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'fash-43',engine:'fashion',name:'Fashion Store 43',price:21,tier:'studio',description:'Unique and dynamic fashion experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','AI','Automation'],preview:{hero:'https://picsum.photos/seed/fashion-43/2000/1200'},rating:92,motion:{level:4},design:{typography:'sans',primary:'#034b58',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'fash-44',engine:'fashion',name:'Fashion Store 44',price:26,tier:'signature',description:'Unique and dynamic fashion experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','Analytics','Automation'],preview:{hero:'https://picsum.photos/seed/fashion-44/2000/1200'},rating:82,motion:{level:3},design:{typography:'serif',primary:'#e0f097',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'fash-45',engine:'fashion',name:'Fashion Store 45',price:11,tier:'plus',description:'Unique and dynamic fashion experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','Analytics','Booking'],preview:{hero:'https://picsum.photos/seed/fashion-45/2000/1200'},rating:89,motion:{level:3},design:{typography:'sans',primary:'#1197dc',backgroundColor:'#0a0a0a',textColor:'#ffffff'}},
  {id:'fash-46',engine:'fashion',name:'Fashion Store 46',price:20,tier:'studio',description:'Unique and dynamic fashion experience crafted for conversion.',pages:['home','about','contact','services'],features:['Automation','Booking','Loyalty'],preview:{hero:'https://picsum.photos/seed/fashion-46/2000/1200'},rating:82,motion:{level:5},design:{typography:'serif',primary:'#283b93',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'fash-47',engine:'fashion',name:'Fashion Store 47',price:29,tier:'signature',description:'Unique and dynamic fashion experience crafted for conversion.',pages:['home','about','contact','services'],features:['Booking','Loyalty','Analytics'],preview:{hero:'https://picsum.photos/seed/fashion-47/2000/1200'},rating:87,motion:{level:4},design:{typography:'sans',primary:'#ce709e',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'fash-48',engine:'fashion',name:'Fashion Store 48',price:17,tier:'pro',description:'Unique and dynamic fashion experience crafted for conversion.',pages:['home','about','contact','services'],features:['Analytics','Loyalty','Automation'],preview:{hero:'https://picsum.photos/seed/fashion-48/2000/1200'},rating:85,motion:{level:1},design:{typography:'sans',primary:'#178a17',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'fash-49',engine:'fashion',name:'Fashion Store 49',price:13,tier:'plus',description:'Unique and dynamic fashion experience crafted for conversion.',pages:['home','about','contact','services'],features:['Booking','Analytics','Loyalty'],preview:{hero:'https://picsum.photos/seed/fashion-49/2000/1200'},rating:81,motion:{level:2},design:{typography:'sans',primary:'#f66b8f',backgroundColor:'#0a0a0a',textColor:'#ffffff'}},
  {id:'fash-50',engine:'fashion',name:'Fashion Store 50',price:18,tier:'pro',description:'Unique and dynamic fashion experience crafted for conversion.',pages:['home','about','contact','services'],features:['Automation','AI','Loyalty'],preview:{hero:'https://picsum.photos/seed/fashion-50/2000/1200'},rating:93,motion:{level:3},design:{typography:'serif',primary:'#a9fec9',backgroundColor:'#ffffff',textColor:'#ffffff'}}
];
