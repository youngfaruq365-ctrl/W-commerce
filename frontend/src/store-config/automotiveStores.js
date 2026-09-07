// UI TEMPLATE CONFIG — Not business/seller data
// 15 AUTOMOTIVE EXPERIENCES — Rich Configs
export const automotiveStores = [
  {
    id: 'auto-1', engine: 'automotive', name: 'Main Dealership', price: 14, tier: 'pro',
    description: 'New and used vehicles. Finance options, trade-ins, and full aftersales.',
    pages: ['home', 'vehicles', 'about', 'contact', 'reviews'],
    features: ['vehicle-comparison', 'test-drive', 'finance-calculator'],
    preview: { hero: 'https://picsum.photos/seed/auto-1/2000/1200' },
    rating: 92, motion: { level: 3 },
    design: { typography: 'sans', primary: '#1565C0', backgroundColor: '#ffffff', textColor: '#111111' }
  },
  {
    id: 'auto-2', engine: 'automotive', name: 'Luxury Cars', price: 25, tier: 'signature',
    description: 'The finest automobiles. Bespoke selection, white-glove delivery, global reach.',
    pages: ['home', 'vehicles', 'about', 'contact', 'reviews'],
    features: ['vehicle-comparison', 'test-drive', 'finance-calculator', 'bespoke-order', 'concierge'],
    preview: { hero: 'https://picsum.photos/seed/auto-2/2000/1200' },
    rating: 99, motion: { level: 5 },
    design: { typography: 'serif', primary: '#B8860B', backgroundColor: '#050505', textColor: '#f0e6d0' }
  },
  {
    id: 'auto-3', engine: 'automotive', name: 'Used Car Market', price: 8, tier: 'essential',
    description: 'Verified pre-owned vehicles. Every car checked, every buyer protected.',
    pages: ['home', 'vehicles', 'about', 'contact'],
    features: ['vehicle-comparison', 'finance-calculator'],
    preview: { hero: 'https://picsum.photos/seed/auto-3/2000/1200' },
    rating: 86, motion: { level: 1 },
    design: { typography: 'sans', primary: '#37474F', backgroundColor: '#ffffff', textColor: '#111111' }
  },
  {
    id: 'auto-4', engine: 'automotive', name: 'Auto Parts Store', price: 9, tier: 'plus',
    description: 'OEM and aftermarket parts. Fast delivery, expert fitment guides.',
    pages: ['home', 'products', 'about', 'contact'],
    features: ['vehicle-compatibility', 'delivery'],
    preview: { hero: 'https://picsum.photos/seed/auto-4/2000/1200' },
    rating: 89, motion: { level: 2 },
    design: { typography: 'sans', primary: '#E53935', backgroundColor: '#ffffff', textColor: '#111111' }
  },
  {
    id: 'auto-5', engine: 'automotive', name: 'Motorcycle World', price: 12, tier: 'plus',
    description: 'Bikes, gear, and accessories. For riders who live the road.',
    pages: ['home', 'vehicles', 'products', 'about', 'reviews', 'contact'],
    features: ['vehicle-comparison', 'test-drive', 'gear-shop'],
    preview: { hero: 'https://picsum.photos/seed/auto-5/2000/1200' },
    rating: 92, motion: { level: 2 },
    design: { typography: 'sans', primary: '#212121', backgroundColor: '#111111', textColor: '#ffffff' }
  },
  {
    id: 'auto-6', engine: 'automotive', name: 'EV Showroom', price: 20, tier: 'studio',
    description: 'Electric future, today. Configure, compare, and order your EV.',
    pages: ['home', 'vehicles', 'about', 'contact', 'reviews'],
    features: ['vehicle-comparison', 'test-drive', 'range-calculator', 'charging-map', 'finance-calculator'],
    preview: { hero: 'https://picsum.photos/seed/auto-6/2000/1200' },
    rating: 97, motion: { level: 4 },
    design: { typography: 'sans', primary: '#00BCD4', backgroundColor: '#050a0f', textColor: '#e0f8ff' }
  },
  {
    id: 'auto-7', engine: 'automotive', name: 'Auto Service', price: 10, tier: 'plus',
    description: 'Book, track, and pay for your service. Complete workshop management.',
    pages: ['home', 'services', 'about', 'reviews', 'contact'],
    features: ['service-booking', 'live-tracking', 'service-history'],
    preview: { hero: 'https://picsum.photos/seed/auto-7/2000/1200' },
    rating: 91, motion: { level: 2 },
    design: { typography: 'sans', primary: '#F57C00', backgroundColor: '#ffffff', textColor: '#111111' }
  },
  {
    id: 'auto-8', engine: 'automotive', name: 'Car Rental', price: 11, tier: 'plus',
    description: 'Premium car hire. Instant booking, flexible rentals, no surprises.',
    pages: ['home', 'vehicles', 'about', 'reviews', 'contact'],
    features: ['availability-calendar', 'instant-booking', 'insurance-options'],
    preview: { hero: 'https://picsum.photos/seed/auto-8/2000/1200' },
    rating: 90, motion: { level: 2 },
    design: { typography: 'sans', primary: '#1E88E5', backgroundColor: '#ffffff', textColor: '#111111' }
  },
  {
    id: 'auto-9', engine: 'automotive', name: 'Supercar Experience', price: 22, tier: 'signature',
    description: 'Drive the dream. Track days, supercar hire, and exclusive events.',
    pages: ['home', 'vehicles', 'about', 'reviews', 'contact'],
    features: ['test-drive', 'event-booking', 'vip-access', 'concierge'],
    preview: { hero: 'https://picsum.photos/seed/auto-9/2000/1200' },
    rating: 98, motion: { level: 5 },
    design: { typography: 'sans', primary: '#D32F2F', backgroundColor: '#050505', textColor: '#ffffff' }
  },
  {
    id: 'auto-10', engine: 'automotive', name: 'Fleet Management', price: 16, tier: 'pro',
    description: 'Commercial fleet procurement and management. Scale your business fleet.',
    pages: ['home', 'vehicles', 'about', 'contact', 'reviews'],
    features: ['vehicle-comparison', 'fleet-pricing', 'finance-calculator'],
    preview: { hero: 'https://picsum.photos/seed/auto-10/2000/1200' },
    rating: 92, motion: { level: 3 },
    design: { typography: 'sans', primary: '#37474F', backgroundColor: '#f8f8f8', textColor: '#111111' }
  },
  {
    id: 'auto-11', engine: 'automotive', name: 'Classic Car Club', price: 15, tier: 'pro',
    description: 'Rare and classic automobiles. For collectors, enthusiasts, and connoisseurs.',
    pages: ['home', 'vehicles', 'about', 'reviews', 'contact'],
    features: ['vehicle-comparison', 'auction', 'provenance-report'],
    preview: { hero: 'https://picsum.photos/seed/auto-11/2000/1200' },
    rating: 94, motion: { level: 3 },
    design: { typography: 'serif', primary: '#4E342E', backgroundColor: '#faf5ee', textColor: '#2d1600' }
  },
  {
    id: 'auto-12', engine: 'automotive', name: 'Auto Accessories', price: 7, tier: 'essential',
    description: 'Upgrade your ride. Accessories, styling, and interior products.',
    pages: ['home', 'products', 'about', 'contact'],
    features: ['delivery'],
    preview: { hero: 'https://picsum.photos/seed/auto-12/2000/1200' },
    rating: 85, motion: { level: 1 },
    design: { typography: 'sans', primary: '#212121', backgroundColor: '#ffffff', textColor: '#111111' }
  },
  {
    id: 'auto-13', engine: 'automotive', name: 'Truck & 4x4', price: 13, tier: 'pro',
    description: 'Built for the tough stuff. Trucks, 4WDs, and off-road builds.',
    pages: ['home', 'vehicles', 'about', 'reviews', 'contact'],
    features: ['vehicle-comparison', 'test-drive', 'build-configurator'],
    preview: { hero: 'https://picsum.photos/seed/auto-13/2000/1200' },
    rating: 91, motion: { level: 3 },
    design: { typography: 'sans', primary: '#BF360C', backgroundColor: '#0a0500', textColor: '#ffffff' }
  },
  {
    id: 'auto-14', engine: 'automotive', name: 'Auto Finance Hub', price: 14, tier: 'pro',
    description: 'Vehicle finance made simple. Compare rates, apply online, drive away.',
    pages: ['home', 'about', 'contact', 'reviews'],
    features: ['finance-calculator', 'instant-approval', 'credit-check'],
    preview: { hero: 'https://picsum.photos/seed/auto-14/2000/1200' },
    rating: 90, motion: { level: 3 },
    design: { typography: 'sans', primary: '#1B5E20', backgroundColor: '#ffffff', textColor: '#111111' }
  },
  {
    id: 'auto-15', engine: 'automotive', name: 'Premium Auto OS', price: 25, tier: 'signature',
    description: 'The ultimate automotive platform. Buy, sell, service, finance, and insure.',
    pages: ['home', 'vehicles', 'about', 'contact', 'reviews'],
    features: ['vehicle-comparison', 'test-drive', 'finance-calculator', 'service-booking', 'insurance', 'concierge', 'bespoke-order', 'ev-charging'],
    preview: { hero: 'https://picsum.photos/seed/auto-15/2000/1200' },
    rating: 99, motion: { level: 5 },
    design: { typography: 'sans', primary: '#0D47A1', backgroundColor: '#030810', textColor: '#e0e8ff' }
  },
  {id:'auto-16',engine:'automotive',name:'Automotive Store 16',price:27,tier:'signature',description:'Unique and dynamic automotive experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Analytics','Automation'],preview:{hero:'https://picsum.photos/seed/automotive-16/2000/1200'},rating:83,motion:{level:3},design:{typography:'sans',primary:'#7cdc3e',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'auto-17',engine:'automotive',name:'Automotive Store 17',price:27,tier:'signature',description:'Unique and dynamic automotive experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Analytics','Booking'],preview:{hero:'https://picsum.photos/seed/automotive-17/2000/1200'},rating:88,motion:{level:5},design:{typography:'serif',primary:'#f1c7d7',backgroundColor:'#0a0a0a',textColor:'#ffffff'}},
  {id:'auto-18',engine:'automotive',name:'Automotive Store 18',price:9,tier:'plus',description:'Unique and dynamic automotive experience crafted for conversion.',pages:['home','about','contact','services'],features:['Booking','Loyalty','AI'],preview:{hero:'https://picsum.photos/seed/automotive-18/2000/1200'},rating:93,motion:{level:4},design:{typography:'sans',primary:'#5b99a2',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'auto-19',engine:'automotive',name:'Automotive Store 19',price:20,tier:'studio',description:'Unique and dynamic automotive experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','AI','Booking'],preview:{hero:'https://picsum.photos/seed/automotive-19/2000/1200'},rating:93,motion:{level:5},design:{typography:'serif',primary:'#26d181',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'auto-20',engine:'automotive',name:'Automotive Store 20',price:12,tier:'plus',description:'Unique and dynamic automotive experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Analytics','Booking'],preview:{hero:'https://picsum.photos/seed/automotive-20/2000/1200'},rating:82,motion:{level:3},design:{typography:'sans',primary:'#ddf9fd',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'auto-21',engine:'automotive',name:'Automotive Store 21',price:15,tier:'pro',description:'Unique and dynamic automotive experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','Booking','Automation'],preview:{hero:'https://picsum.photos/seed/automotive-21/2000/1200'},rating:85,motion:{level:5},design:{typography:'serif',primary:'#769161',backgroundColor:'#0a0a0a',textColor:'#ffffff'}},
  {id:'auto-22',engine:'automotive',name:'Automotive Store 22',price:9,tier:'plus',description:'Unique and dynamic automotive experience crafted for conversion.',pages:['home','about','contact','services'],features:['Booking','Loyalty','Analytics'],preview:{hero:'https://picsum.photos/seed/automotive-22/2000/1200'},rating:88,motion:{level:5},design:{typography:'sans',primary:'#564975',backgroundColor:'#0a0a0a',textColor:'#ffffff'}},
  {id:'auto-23',engine:'automotive',name:'Automotive Store 23',price:10,tier:'plus',description:'Unique and dynamic automotive experience crafted for conversion.',pages:['home','about','contact','services'],features:['Analytics','AI','Booking'],preview:{hero:'https://picsum.photos/seed/automotive-23/2000/1200'},rating:89,motion:{level:5},design:{typography:'sans',primary:'#b31465',backgroundColor:'#0a0a0a',textColor:'#ffffff'}},
  {id:'auto-24',engine:'automotive',name:'Automotive Store 24',price:8,tier:'essential',description:'Unique and dynamic automotive experience crafted for conversion.',pages:['home','about','contact','services'],features:['Automation','Loyalty','Booking'],preview:{hero:'https://picsum.photos/seed/automotive-24/2000/1200'},rating:80,motion:{level:5},design:{typography:'sans',primary:'#20e23a',backgroundColor:'#0a0a0a',textColor:'#ffffff'}},
  {id:'auto-25',engine:'automotive',name:'Automotive Store 25',price:19,tier:'studio',description:'Unique and dynamic automotive experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Automation','Analytics'],preview:{hero:'https://picsum.photos/seed/automotive-25/2000/1200'},rating:91,motion:{level:5},design:{typography:'serif',primary:'#1806d1',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'auto-26',engine:'automotive',name:'Automotive Store 26',price:11,tier:'plus',description:'Unique and dynamic automotive experience crafted for conversion.',pages:['home','about','contact','services'],features:['Booking','Analytics','Automation'],preview:{hero:'https://picsum.photos/seed/automotive-26/2000/1200'},rating:88,motion:{level:5},design:{typography:'sans',primary:'#6afebd',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'auto-27',engine:'automotive',name:'Automotive Store 27',price:28,tier:'signature',description:'Unique and dynamic automotive experience crafted for conversion.',pages:['home','about','contact','services'],features:['Analytics','Booking','Loyalty'],preview:{hero:'https://picsum.photos/seed/automotive-27/2000/1200'},rating:87,motion:{level:4},design:{typography:'serif',primary:'#a3d15d',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'auto-28',engine:'automotive',name:'Automotive Store 28',price:16,tier:'pro',description:'Unique and dynamic automotive experience crafted for conversion.',pages:['home','about','contact','services'],features:['Automation','Loyalty','Booking'],preview:{hero:'https://picsum.photos/seed/automotive-28/2000/1200'},rating:83,motion:{level:2},design:{typography:'sans',primary:'#841d10',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'auto-29',engine:'automotive',name:'Automotive Store 29',price:6,tier:'essential',description:'Unique and dynamic automotive experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','Analytics','AI'],preview:{hero:'https://picsum.photos/seed/automotive-29/2000/1200'},rating:82,motion:{level:5},design:{typography:'serif',primary:'#15d733',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'auto-30',engine:'automotive',name:'Automotive Store 30',price:20,tier:'studio',description:'Unique and dynamic automotive experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','AI','Analytics'],preview:{hero:'https://picsum.photos/seed/automotive-30/2000/1200'},rating:84,motion:{level:3},design:{typography:'sans',primary:'#be9cd8',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'auto-31',engine:'automotive',name:'Automotive Store 31',price:7,tier:'essential',description:'Unique and dynamic automotive experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','AI','Booking'],preview:{hero:'https://picsum.photos/seed/automotive-31/2000/1200'},rating:93,motion:{level:4},design:{typography:'serif',primary:'#ba2f42',backgroundColor:'#0a0a0a',textColor:'#ffffff'}},
  {id:'auto-32',engine:'automotive',name:'Automotive Store 32',price:16,tier:'pro',description:'Unique and dynamic automotive experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Analytics','Loyalty'],preview:{hero:'https://picsum.photos/seed/automotive-32/2000/1200'},rating:91,motion:{level:4},design:{typography:'serif',primary:'#3dd86a',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'auto-33',engine:'automotive',name:'Automotive Store 33',price:29,tier:'signature',description:'Unique and dynamic automotive experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Automation','Analytics'],preview:{hero:'https://picsum.photos/seed/automotive-33/2000/1200'},rating:85,motion:{level:1},design:{typography:'sans',primary:'#56b771',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'auto-34',engine:'automotive',name:'Automotive Store 34',price:17,tier:'pro',description:'Unique and dynamic automotive experience crafted for conversion.',pages:['home','about','contact','services'],features:['Booking','Loyalty','AI'],preview:{hero:'https://picsum.photos/seed/automotive-34/2000/1200'},rating:90,motion:{level:3},design:{typography:'sans',primary:'#f9d4df',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'auto-35',engine:'automotive',name:'Automotive Store 35',price:6,tier:'essential',description:'Unique and dynamic automotive experience crafted for conversion.',pages:['home','about','contact','services'],features:['Booking','AI','Loyalty'],preview:{hero:'https://picsum.photos/seed/automotive-35/2000/1200'},rating:85,motion:{level:5},design:{typography:'serif',primary:'#8c732c',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'auto-36',engine:'automotive',name:'Automotive Store 36',price:23,tier:'studio',description:'Unique and dynamic automotive experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','Automation','AI'],preview:{hero:'https://picsum.photos/seed/automotive-36/2000/1200'},rating:83,motion:{level:5},design:{typography:'serif',primary:'#be9839',backgroundColor:'#0a0a0a',textColor:'#ffffff'}},
  {id:'auto-37',engine:'automotive',name:'Automotive Store 37',price:23,tier:'studio',description:'Unique and dynamic automotive experience crafted for conversion.',pages:['home','about','contact','services'],features:['Booking','AI','Loyalty'],preview:{hero:'https://picsum.photos/seed/automotive-37/2000/1200'},rating:90,motion:{level:4},design:{typography:'sans',primary:'#2b42fb',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'auto-38',engine:'automotive',name:'Automotive Store 38',price:17,tier:'pro',description:'Unique and dynamic automotive experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','AI','Automation'],preview:{hero:'https://picsum.photos/seed/automotive-38/2000/1200'},rating:88,motion:{level:3},design:{typography:'serif',primary:'#9bde6c',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'auto-39',engine:'automotive',name:'Automotive Store 39',price:24,tier:'signature',description:'Unique and dynamic automotive experience crafted for conversion.',pages:['home','about','contact','services'],features:['Booking','Analytics','Automation'],preview:{hero:'https://picsum.photos/seed/automotive-39/2000/1200'},rating:92,motion:{level:3},design:{typography:'sans',primary:'#06cb30',backgroundColor:'#0a0a0a',textColor:'#ffffff'}},
  {id:'auto-40',engine:'automotive',name:'Automotive Store 40',price:18,tier:'pro',description:'Unique and dynamic automotive experience crafted for conversion.',pages:['home','about','contact','services'],features:['Automation','Loyalty','Booking'],preview:{hero:'https://picsum.photos/seed/automotive-40/2000/1200'},rating:90,motion:{level:4},design:{typography:'serif',primary:'#22c437',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'auto-41',engine:'automotive',name:'Automotive Store 41',price:10,tier:'plus',description:'Unique and dynamic automotive experience crafted for conversion.',pages:['home','about','contact','services'],features:['Automation','Analytics','Loyalty'],preview:{hero:'https://picsum.photos/seed/automotive-41/2000/1200'},rating:86,motion:{level:5},design:{typography:'sans',primary:'#288300',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'auto-42',engine:'automotive',name:'Automotive Store 42',price:25,tier:'signature',description:'Unique and dynamic automotive experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','Booking','Automation'],preview:{hero:'https://picsum.photos/seed/automotive-42/2000/1200'},rating:87,motion:{level:1},design:{typography:'serif',primary:'#1071f6',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'auto-43',engine:'automotive',name:'Automotive Store 43',price:15,tier:'pro',description:'Unique and dynamic automotive experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','Automation','AI'],preview:{hero:'https://picsum.photos/seed/automotive-43/2000/1200'},rating:90,motion:{level:1},design:{typography:'serif',primary:'#d0a082',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'auto-44',engine:'automotive',name:'Automotive Store 44',price:22,tier:'studio',description:'Unique and dynamic automotive experience crafted for conversion.',pages:['home','about','contact','services'],features:['Analytics','AI','Automation'],preview:{hero:'https://picsum.photos/seed/automotive-44/2000/1200'},rating:92,motion:{level:2},design:{typography:'sans',primary:'#dc10c7',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'auto-45',engine:'automotive',name:'Automotive Store 45',price:22,tier:'studio',description:'Unique and dynamic automotive experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','Booking','Automation'],preview:{hero:'https://picsum.photos/seed/automotive-45/2000/1200'},rating:83,motion:{level:2},design:{typography:'serif',primary:'#6fc855',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'auto-46',engine:'automotive',name:'Automotive Store 46',price:23,tier:'studio',description:'Unique and dynamic automotive experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Booking','Automation'],preview:{hero:'https://picsum.photos/seed/automotive-46/2000/1200'},rating:87,motion:{level:2},design:{typography:'serif',primary:'#249d62',backgroundColor:'#0a0a0a',textColor:'#ffffff'}},
  {id:'auto-47',engine:'automotive',name:'Automotive Store 47',price:9,tier:'plus',description:'Unique and dynamic automotive experience crafted for conversion.',pages:['home','about','contact','services'],features:['Analytics','Automation','AI'],preview:{hero:'https://picsum.photos/seed/automotive-47/2000/1200'},rating:80,motion:{level:2},design:{typography:'serif',primary:'#fb3938',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'auto-48',engine:'automotive',name:'Automotive Store 48',price:23,tier:'studio',description:'Unique and dynamic automotive experience crafted for conversion.',pages:['home','about','contact','services'],features:['Automation','AI','Loyalty'],preview:{hero:'https://picsum.photos/seed/automotive-48/2000/1200'},rating:83,motion:{level:5},design:{typography:'serif',primary:'#53260a',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'auto-49',engine:'automotive',name:'Automotive Store 49',price:28,tier:'signature',description:'Unique and dynamic automotive experience crafted for conversion.',pages:['home','about','contact','services'],features:['Booking','Analytics','Automation'],preview:{hero:'https://picsum.photos/seed/automotive-49/2000/1200'},rating:85,motion:{level:3},design:{typography:'serif',primary:'#187688',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'auto-50',engine:'automotive',name:'Automotive Store 50',price:18,tier:'pro',description:'Unique and dynamic automotive experience crafted for conversion.',pages:['home','about','contact','services'],features:['Automation','Analytics','AI'],preview:{hero:'https://picsum.photos/seed/automotive-50/2000/1200'},rating:88,motion:{level:3},design:{typography:'serif',primary:'#72d071',backgroundColor:'#ffffff',textColor:'#111111'}}
];
