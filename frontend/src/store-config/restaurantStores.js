// UI TEMPLATE CONFIG — Not business/seller data
// 15 RESTAURANT EXPERIENCES — Rich Configs
export const restaurantStores = [
  {
    id: 'rest-1', engine: 'restaurant', name: 'Modern Bistro', price: 9, tier: 'plus',
    description: 'Contemporary European cuisine with a modern twist. Farm-to-table, locally sourced.',
    pages: ['home', 'menu', 'reservation', 'about', 'contact'],
    features: ['table-booking', 'delivery', 'offers'],
    preview: { hero: 'https://picsum.photos/seed/rest-1/2000/1200' },
    rating: 94, motion: { level: 2 },
    design: { typography: 'sans', primary: '#E53935', backgroundColor: '#ffffff', textColor: '#111111' }
  },
  {
    id: 'rest-2', engine: 'restaurant', name: 'Fine Dining', price: 25, tier: 'signature',
    description: 'An unparalleled gastronomic journey. Michelin-starred experience at your fingertips.',
    pages: ['home', 'menu', 'reservation', 'wine', 'about', 'contact', 'reviews'],
    features: ['table-booking', 'wine-pairing', 'private-dining', 'chef-table', 'vip-events'],
    preview: { hero: 'https://picsum.photos/seed/rest-2/2000/1200' },
    rating: 99, motion: { level: 5 },
    design: { typography: 'serif', primary: '#D4AF37', backgroundColor: '#0a0a0a', textColor: '#ffffff' }
  },
  {
    id: 'rest-3', engine: 'restaurant', name: 'Fast Food', price: 7, tier: 'essential',
    description: 'Fast, fresh, and affordable. Order in seconds, delivered in minutes.',
    pages: ['home', 'menu', 'contact'],
    features: ['delivery', 'quick-order'],
    preview: { hero: 'https://picsum.photos/seed/rest-3/2000/1200' },
    rating: 88, motion: { level: 1 },
    design: { typography: 'sans', primary: '#FFD700', backgroundColor: '#ffffff', textColor: '#111111' }
  },
  {
    id: 'rest-4', engine: 'restaurant', name: 'Cafe & Bakery', price: 8, tier: 'essential',
    description: 'Artisan coffee and freshly baked pastries. Your daily ritual, elevated.',
    pages: ['home', 'menu', 'about', 'contact'],
    features: ['delivery', 'offers'],
    preview: { hero: 'https://picsum.photos/seed/rest-4/2000/1200' },
    rating: 91, motion: { level: 1 },
    design: { typography: 'serif', primary: '#7E57C2', backgroundColor: '#faf7f2', textColor: '#3d2b1f' }
  },
  {
    id: 'rest-5', engine: 'restaurant', name: 'Artisan Bakery', price: 7, tier: 'essential',
    description: 'Handcrafted breads and pastries. Made with love, baked at dawn.',
    pages: ['home', 'menu', 'about', 'contact'],
    features: ['delivery', 'pre-order'],
    preview: { hero: 'https://picsum.photos/seed/rest-5/2000/1200' },
    rating: 89, motion: { level: 1 },
    design: { typography: 'serif', primary: '#8D6E63', backgroundColor: '#fffbf7', textColor: '#3e2723' }
  },
  {
    id: 'rest-6', engine: 'restaurant', name: 'Cloud Kitchen', price: 10, tier: 'plus',
    description: 'Multi-brand delivery kitchen. Order from 6 unique menus, all from one location.',
    pages: ['home', 'menu', 'about', 'contact', 'reviews'],
    features: ['delivery', 'order-tracking', 'quick-reorder', 'bundles'],
    preview: { hero: 'https://picsum.photos/seed/rest-6/2000/1200' },
    rating: 92, motion: { level: 2 },
    design: { typography: 'sans', primary: '#FF5722', backgroundColor: '#111111', textColor: '#ffffff' }
  },
  {
    id: 'rest-7', engine: 'restaurant', name: 'Street Food', price: 6, tier: 'essential',
    description: 'Authentic street flavors. Bold, vibrant, unapologetically delicious.',
    pages: ['home', 'menu', 'contact'],
    features: ['delivery'],
    preview: { hero: 'https://picsum.photos/seed/rest-7/2000/1200' },
    rating: 87, motion: { level: 1 },
    design: { typography: 'sans', primary: '#F44336', backgroundColor: '#ffffff', textColor: '#111111' }
  },
  {
    id: 'rest-8', engine: 'restaurant', name: 'Pizza House', price: 8, tier: 'essential',
    description: 'Wood-fired, hand-tossed, perfectly charred. Pizza perfection.',
    pages: ['home', 'menu', 'contact'],
    features: ['delivery', 'quick-order'],
    preview: { hero: 'https://picsum.photos/seed/rest-8/2000/1200' },
    rating: 90, motion: { level: 1 },
    design: { typography: 'sans', primary: '#E53935', backgroundColor: '#ffffff', textColor: '#111111' }
  },
  {
    id: 'rest-9', engine: 'restaurant', name: 'Sushi Bar', price: 12, tier: 'plus',
    description: 'Omakase to à la carte. Precision Japanese cuisine, beautifully composed.',
    pages: ['home', 'menu', 'reservation', 'about', 'reviews', 'contact'],
    features: ['table-booking', 'omakase-booking', 'delivery'],
    preview: { hero: 'https://picsum.photos/seed/rest-9/2000/1200' },
    rating: 96, motion: { level: 3 },
    design: { typography: 'sans', primary: '#B71C1C', backgroundColor: '#0d0d0d', textColor: '#ffffff' }
  },
  {
    id: 'rest-10', engine: 'restaurant', name: 'African Cuisine', price: 9, tier: 'plus',
    description: 'The continent on a plate. Rich spices, bold flavors, shared warmth.',
    pages: ['home', 'menu', 'about', 'reservation', 'contact'],
    features: ['delivery', 'table-booking', 'catering'],
    preview: { hero: 'https://picsum.photos/seed/rest-10/2000/1200' },
    rating: 93, motion: { level: 2 },
    design: { typography: 'serif', primary: '#FF8F00', backgroundColor: '#1a1000', textColor: '#ffffff' }
  },
  {
    id: 'rest-11', engine: 'restaurant', name: 'Luxury Restaurant', price: 25, tier: 'signature',
    description: 'Where every detail matters. A membership-level dining experience.',
    pages: ['home', 'menu', 'reservation', 'membership', 'events', 'wine', 'about', 'reviews', 'contact'],
    features: ['table-booking', 'membership', 'private-events', 'concierge', 'wine-pairing', 'vip-access'],
    preview: { hero: 'https://picsum.photos/seed/rest-11/2000/1200' },
    rating: 99, motion: { level: 5 },
    design: { typography: 'serif', primary: '#C9A96E', backgroundColor: '#050505', textColor: '#e8d5b0' }
  },
  {
    id: 'rest-12', engine: 'restaurant', name: 'Food Truck', price: 7, tier: 'essential',
    description: 'Find us on the streets. Real food, real fast, really good.',
    pages: ['home', 'menu', 'contact'],
    features: ['delivery', 'location-tracker'],
    preview: { hero: 'https://picsum.photos/seed/rest-12/2000/1200' },
    rating: 86, motion: { level: 1 },
    design: { typography: 'sans', primary: '#F57C00', backgroundColor: '#ffffff', textColor: '#111111' }
  },
  {
    id: 'rest-13', engine: 'restaurant', name: 'Bar & Grill', price: 10, tier: 'plus',
    description: 'Craft cocktails and slow-smoked meats. The perfect social venue.',
    pages: ['home', 'menu', 'reservation', 'events', 'about', 'contact'],
    features: ['delivery', 'table-booking', 'event-booking'],
    preview: { hero: 'https://picsum.photos/seed/rest-13/2000/1200' },
    rating: 91, motion: { level: 2 },
    design: { typography: 'sans', primary: '#37474F', backgroundColor: '#1a1a1a', textColor: '#ffffff' }
  },
  {
    id: 'rest-14', engine: 'restaurant', name: 'Catering Studio', price: 15, tier: 'pro',
    description: 'Professional catering for every occasion. Quotes, planning, and delivery.',
    pages: ['home', 'menu', 'reservation', 'packages', 'about', 'reviews', 'contact'],
    features: ['quote-builder', 'guest-calculator', 'packages', 'booking-workflow', 'catering'],
    preview: { hero: 'https://picsum.photos/seed/rest-14/2000/1200' },
    rating: 95, motion: { level: 3 },
    design: { typography: 'sans', primary: '#1E88E5', backgroundColor: '#ffffff', textColor: '#111111' }
  },
  {
    id: 'rest-15', engine: 'restaurant', name: 'Family Restaurant', price: 8, tier: 'essential',
    description: 'Generous portions, warm service, memories made at the table.',
    pages: ['home', 'menu', 'reservation', 'about', 'contact'],
    features: ['delivery', 'table-booking'],
    preview: { hero: 'https://picsum.photos/seed/rest-15/2000/1200' },
    rating: 89, motion: { level: 1 },
    design: { typography: 'sans', primary: '#43A047', backgroundColor: '#ffffff', textColor: '#111111' }
  },

  {id:'rest-16',engine:'restaurant',name:'Restaurant Store 16',price:10,tier:'plus',description:'Unique and dynamic restaurant experience crafted for conversion.',pages:['home','about','contact','services'],features:['Automation','Loyalty','Booking'],preview:{hero:'https://picsum.photos/seed/restaurant-16/2000/1200'},rating:94,motion:{level:1},design:{typography:'serif',primary:'#cf19e9',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'rest-17',engine:'restaurant',name:'Restaurant Store 17',price:9,tier:'essential',description:'Unique and dynamic restaurant experience crafted for conversion.',pages:['home','about','contact','services'],features:['Booking','Analytics','AI'],preview:{hero:'https://picsum.photos/seed/restaurant-17/2000/1200'},rating:82,motion:{level:4},design:{typography:'serif',primary:'#147bc3',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'rest-18',engine:'restaurant',name:'Restaurant Store 18',price:10,tier:'plus',description:'Unique and dynamic restaurant experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Loyalty','Booking'],preview:{hero:'https://picsum.photos/seed/restaurant-18/2000/1200'},rating:93,motion:{level:3},design:{typography:'serif',primary:'#37831d',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'rest-19',engine:'restaurant',name:'Restaurant Store 19',price:8,tier:'essential',description:'Unique and dynamic restaurant experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','Analytics','AI'],preview:{hero:'https://picsum.photos/seed/restaurant-19/2000/1200'},rating:90,motion:{level:4},design:{typography:'sans',primary:'#306c70',backgroundColor:'#0a0a0a',textColor:'#ffffff'}},
  {id:'rest-20',engine:'restaurant',name:'Restaurant Store 20',price:15,tier:'pro',description:'Unique and dynamic restaurant experience crafted for conversion.',pages:['home','about','contact','services'],features:['Automation','Loyalty','Booking'],preview:{hero:'https://picsum.photos/seed/restaurant-20/2000/1200'},rating:86,motion:{level:2},design:{typography:'serif',primary:'#ce745c',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'rest-21',engine:'restaurant',name:'Restaurant Store 21',price:16,tier:'pro',description:'Unique and dynamic restaurant experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Loyalty','Analytics'],preview:{hero:'https://picsum.photos/seed/restaurant-21/2000/1200'},rating:82,motion:{level:3},design:{typography:'serif',primary:'#98bcc9',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'rest-22',engine:'restaurant',name:'Restaurant Store 22',price:9,tier:'plus',description:'Unique and dynamic restaurant experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Analytics','Loyalty'],preview:{hero:'https://picsum.photos/seed/restaurant-22/2000/1200'},rating:86,motion:{level:2},design:{typography:'sans',primary:'#196399',backgroundColor:'#0a0a0a',textColor:'#ffffff'}},
  {id:'rest-23',engine:'restaurant',name:'Restaurant Store 23',price:12,tier:'plus',description:'Unique and dynamic restaurant experience crafted for conversion.',pages:['home','about','contact','services'],features:['Analytics','AI','Automation'],preview:{hero:'https://picsum.photos/seed/restaurant-23/2000/1200'},rating:80,motion:{level:3},design:{typography:'serif',primary:'#5ef4d1',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'rest-24',engine:'restaurant',name:'Restaurant Store 24',price:10,tier:'plus',description:'Unique and dynamic restaurant experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Booking','Analytics'],preview:{hero:'https://picsum.photos/seed/restaurant-24/2000/1200'},rating:85,motion:{level:3},design:{typography:'serif',primary:'#6e73a3',backgroundColor:'#0a0a0a',textColor:'#ffffff'}},
  {id:'rest-25',engine:'restaurant',name:'Restaurant Store 25',price:10,tier:'plus',description:'Unique and dynamic restaurant experience crafted for conversion.',pages:['home','about','contact','services'],features:['Automation','Loyalty','Analytics'],preview:{hero:'https://picsum.photos/seed/restaurant-25/2000/1200'},rating:81,motion:{level:5},design:{typography:'serif',primary:'#acd1fc',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'rest-26',engine:'restaurant',name:'Restaurant Store 26',price:28,tier:'signature',description:'Unique and dynamic restaurant experience crafted for conversion.',pages:['home','about','contact','services'],features:['Booking','Automation','Analytics'],preview:{hero:'https://picsum.photos/seed/restaurant-26/2000/1200'},rating:92,motion:{level:1},design:{typography:'sans',primary:'#06f0b3',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'rest-27',engine:'restaurant',name:'Restaurant Store 27',price:26,tier:'signature',description:'Unique and dynamic restaurant experience crafted for conversion.',pages:['home','about','contact','services'],features:['Analytics','Booking','Automation'],preview:{hero:'https://picsum.photos/seed/restaurant-27/2000/1200'},rating:84,motion:{level:1},design:{typography:'serif',primary:'#cf2cc4',backgroundColor:'#0a0a0a',textColor:'#ffffff'}},
  {id:'rest-28',engine:'restaurant',name:'Restaurant Store 28',price:17,tier:'pro',description:'Unique and dynamic restaurant experience crafted for conversion.',pages:['home','about','contact','services'],features:['Automation','Loyalty','Booking'],preview:{hero:'https://picsum.photos/seed/restaurant-28/2000/1200'},rating:84,motion:{level:5},design:{typography:'sans',primary:'#a5ba9c',backgroundColor:'#0a0a0a',textColor:'#ffffff'}},
  {id:'rest-29',engine:'restaurant',name:'Restaurant Store 29',price:14,tier:'pro',description:'Unique and dynamic restaurant experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Booking','Loyalty'],preview:{hero:'https://picsum.photos/seed/restaurant-29/2000/1200'},rating:89,motion:{level:5},design:{typography:'sans',primary:'#021e94',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'rest-30',engine:'restaurant',name:'Restaurant Store 30',price:6,tier:'essential',description:'Unique and dynamic restaurant experience crafted for conversion.',pages:['home','about','contact','services'],features:['Booking','Analytics','AI'],preview:{hero:'https://picsum.photos/seed/restaurant-30/2000/1200'},rating:89,motion:{level:1},design:{typography:'serif',primary:'#b13124',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'rest-31',engine:'restaurant',name:'Restaurant Store 31',price:19,tier:'studio',description:'Unique and dynamic restaurant experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','Booking','Analytics'],preview:{hero:'https://picsum.photos/seed/restaurant-31/2000/1200'},rating:86,motion:{level:4},design:{typography:'serif',primary:'#9d88a9',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'rest-32',engine:'restaurant',name:'Restaurant Store 32',price:15,tier:'pro',description:'Unique and dynamic restaurant experience crafted for conversion.',pages:['home','about','contact','services'],features:['Analytics','Loyalty','AI'],preview:{hero:'https://picsum.photos/seed/restaurant-32/2000/1200'},rating:87,motion:{level:4},design:{typography:'sans',primary:'#1674f6',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'rest-33',engine:'restaurant',name:'Restaurant Store 33',price:19,tier:'studio',description:'Unique and dynamic restaurant experience crafted for conversion.',pages:['home','about','contact','services'],features:['Automation','AI','Analytics'],preview:{hero:'https://picsum.photos/seed/restaurant-33/2000/1200'},rating:91,motion:{level:2},design:{typography:'serif',primary:'#678b48',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'rest-34',engine:'restaurant',name:'Restaurant Store 34',price:24,tier:'signature',description:'Unique and dynamic restaurant experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Analytics','Automation'],preview:{hero:'https://picsum.photos/seed/restaurant-34/2000/1200'},rating:81,motion:{level:5},design:{typography:'sans',primary:'#002444',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'rest-35',engine:'restaurant',name:'Restaurant Store 35',price:12,tier:'plus',description:'Unique and dynamic restaurant experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','Analytics','AI'],preview:{hero:'https://picsum.photos/seed/restaurant-35/2000/1200'},rating:88,motion:{level:2},design:{typography:'serif',primary:'#d7161b',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'rest-36',engine:'restaurant',name:'Restaurant Store 36',price:8,tier:'essential',description:'Unique and dynamic restaurant experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Booking','Automation'],preview:{hero:'https://picsum.photos/seed/restaurant-36/2000/1200'},rating:91,motion:{level:2},design:{typography:'serif',primary:'#d94f2d',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'rest-37',engine:'restaurant',name:'Restaurant Store 37',price:18,tier:'pro',description:'Unique and dynamic restaurant experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Analytics','Booking'],preview:{hero:'https://picsum.photos/seed/restaurant-37/2000/1200'},rating:91,motion:{level:2},design:{typography:'sans',primary:'#5c90a7',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'rest-38',engine:'restaurant',name:'Restaurant Store 38',price:6,tier:'essential',description:'Unique and dynamic restaurant experience crafted for conversion.',pages:['home','about','contact','services'],features:['Automation','Analytics','Booking'],preview:{hero:'https://picsum.photos/seed/restaurant-38/2000/1200'},rating:86,motion:{level:5},design:{typography:'sans',primary:'#94cd89',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'rest-39',engine:'restaurant',name:'Restaurant Store 39',price:14,tier:'pro',description:'Unique and dynamic restaurant experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Booking','Loyalty'],preview:{hero:'https://picsum.photos/seed/restaurant-39/2000/1200'},rating:88,motion:{level:4},design:{typography:'sans',primary:'#dbaa1a',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'rest-40',engine:'restaurant',name:'Restaurant Store 40',price:17,tier:'pro',description:'Unique and dynamic restaurant experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Analytics','Loyalty'],preview:{hero:'https://picsum.photos/seed/restaurant-40/2000/1200'},rating:84,motion:{level:2},design:{typography:'serif',primary:'#02af4a',backgroundColor:'#0a0a0a',textColor:'#ffffff'}},
  {id:'rest-41',engine:'restaurant',name:'Restaurant Store 41',price:21,tier:'studio',description:'Unique and dynamic restaurant experience crafted for conversion.',pages:['home','about','contact','services'],features:['Analytics','Loyalty','AI'],preview:{hero:'https://picsum.photos/seed/restaurant-41/2000/1200'},rating:91,motion:{level:5},design:{typography:'sans',primary:'#4d7af8',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'rest-42',engine:'restaurant',name:'Restaurant Store 42',price:9,tier:'essential',description:'Unique and dynamic restaurant experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Analytics','Booking'],preview:{hero:'https://picsum.photos/seed/restaurant-42/2000/1200'},rating:85,motion:{level:2},design:{typography:'sans',primary:'#4eb591',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'rest-43',engine:'restaurant',name:'Restaurant Store 43',price:9,tier:'plus',description:'Unique and dynamic restaurant experience crafted for conversion.',pages:['home','about','contact','services'],features:['Booking','Loyalty','Analytics'],preview:{hero:'https://picsum.photos/seed/restaurant-43/2000/1200'},rating:93,motion:{level:3},design:{typography:'serif',primary:'#1a7746',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'rest-44',engine:'restaurant',name:'Restaurant Store 44',price:13,tier:'plus',description:'Unique and dynamic restaurant experience crafted for conversion.',pages:['home','about','contact','services'],features:['Booking','AI','Automation'],preview:{hero:'https://picsum.photos/seed/restaurant-44/2000/1200'},rating:83,motion:{level:3},design:{typography:'serif',primary:'#110009',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'rest-45',engine:'restaurant',name:'Restaurant Store 45',price:18,tier:'pro',description:'Unique and dynamic restaurant experience crafted for conversion.',pages:['home','about','contact','services'],features:['Automation','Loyalty','Booking'],preview:{hero:'https://picsum.photos/seed/restaurant-45/2000/1200'},rating:88,motion:{level:2},design:{typography:'serif',primary:'#ba0940',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'rest-46',engine:'restaurant',name:'Restaurant Store 46',price:6,tier:'essential',description:'Unique and dynamic restaurant experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Booking','Analytics'],preview:{hero:'https://picsum.photos/seed/restaurant-46/2000/1200'},rating:93,motion:{level:5},design:{typography:'serif',primary:'#cd1098',backgroundColor:'#0a0a0a',textColor:'#ffffff'}},
  {id:'rest-47',engine:'restaurant',name:'Restaurant Store 47',price:24,tier:'signature',description:'Unique and dynamic restaurant experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Analytics','Booking'],preview:{hero:'https://picsum.photos/seed/restaurant-47/2000/1200'},rating:92,motion:{level:3},design:{typography:'sans',primary:'#0817bd',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'rest-48',engine:'restaurant',name:'Restaurant Store 48',price:28,tier:'signature',description:'Unique and dynamic restaurant experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Analytics','Booking'],preview:{hero:'https://picsum.photos/seed/restaurant-48/2000/1200'},rating:86,motion:{level:3},design:{typography:'serif',primary:'#b057ff',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'rest-49',engine:'restaurant',name:'Restaurant Store 49',price:5,tier:'essential',description:'Unique and dynamic restaurant experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Analytics','Booking'],preview:{hero:'https://picsum.photos/seed/restaurant-49/2000/1200'},rating:93,motion:{level:5},design:{typography:'sans',primary:'#81ca9c',backgroundColor:'#0a0a0a',textColor:'#ffffff'}},
  {id:'rest-50',engine:'restaurant',name:'Restaurant Store 50',price:20,tier:'studio',description:'Unique and dynamic restaurant experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','Analytics','AI'],preview:{hero:'https://picsum.photos/seed/restaurant-50/2000/1200'},rating:83,motion:{level:2},design:{typography:'serif',primary:'#aa3fb2',backgroundColor:'#ffffff',textColor:'#111111'}}
];
