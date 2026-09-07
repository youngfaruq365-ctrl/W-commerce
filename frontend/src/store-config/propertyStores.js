// UI TEMPLATE CONFIG — Not business/seller data
// 15 PROPERTY EXPERIENCES — Rich Configs
export const propertyStores = [
  {
    id: 'prop-1', engine: 'property', name: 'Luxury Realty', price: 22, tier: 'signature',
    description: 'Elite properties for discerning buyers. Private access to the world\'s finest homes.',
    pages: ['home', 'properties', 'about', 'agents', 'reviews', 'contact'],
    features: ['virtual-tour', 'mortgage-calculator', 'agent-connect', 'private-viewing'],
    preview: { hero: 'https://picsum.photos/seed/prop-1/2000/1200' },
    rating: 98, motion: { level: 5 },
    design: { typography: 'serif', primary: '#C9A96E', backgroundColor: '#0a0a0a', textColor: '#f0e6d0' }
  },
  {
    id: 'prop-2', engine: 'property', name: 'Modern Realtor', price: 14, tier: 'pro',
    description: 'Smart property search with AI-powered matching and 3D tours.',
    pages: ['home', 'properties', 'about', 'contact', 'reviews'],
    features: ['virtual-tour', 'mortgage-calculator', 'map-search', 'agent-connect'],
    preview: { hero: 'https://picsum.photos/seed/prop-2/2000/1200' },
    rating: 95, motion: { level: 3 },
    design: { typography: 'sans', primary: '#1565C0', backgroundColor: '#ffffff', textColor: '#111111' }
  },
  {
    id: 'prop-3', engine: 'property', name: 'Property Marketplace', price: 18, tier: 'studio',
    description: 'List, search, and transact. The complete property ecosystem.',
    pages: ['home', 'properties', 'about', 'agents', 'reviews', 'contact'],
    features: ['virtual-tour', 'mortgage-calculator', 'map-search', 'agent-connect', 'valuation'],
    preview: { hero: 'https://picsum.photos/seed/prop-3/2000/1200' },
    rating: 96, motion: { level: 4 },
    design: { typography: 'sans', primary: '#0f766e', backgroundColor: '#ffffff', textColor: '#111111' }
  },
  {
    id: 'prop-4', engine: 'property', name: 'Apartment Finder', price: 10, tier: 'plus',
    description: 'The city, simplified. Find and rent your perfect apartment with ease.',
    pages: ['home', 'properties', 'about', 'contact'],
    features: ['virtual-tour', 'map-search'],
    preview: { hero: 'https://picsum.photos/seed/prop-4/2000/1200' },
    rating: 90, motion: { level: 2 },
    design: { typography: 'sans', primary: '#2196F3', backgroundColor: '#ffffff', textColor: '#111111' }
  },
  {
    id: 'prop-5', engine: 'property', name: 'Commercial Property', price: 16, tier: 'pro',
    description: 'Office, retail, and industrial spaces. Find the right commercial address.',
    pages: ['home', 'properties', 'about', 'agents', 'contact'],
    features: ['virtual-tour', 'mortgage-calculator', 'map-search'],
    preview: { hero: 'https://picsum.photos/seed/prop-5/2000/1200' },
    rating: 92, motion: { level: 3 },
    design: { typography: 'sans', primary: '#37474F', backgroundColor: '#ffffff', textColor: '#111111' }
  },
  {
    id: 'prop-6', engine: 'property', name: 'Vacation Rentals', price: 12, tier: 'plus',
    description: 'Holiday homes with personality. Book your perfect getaway.',
    pages: ['home', 'properties', 'about', 'reviews', 'contact'],
    features: ['virtual-tour', 'booking-calendar', 'map-search'],
    preview: { hero: 'https://picsum.photos/seed/prop-6/2000/1200' },
    rating: 93, motion: { level: 2 },
    design: { typography: 'sans', primary: '#00897B', backgroundColor: '#ffffff', textColor: '#111111' }
  },
  {
    id: 'prop-7', engine: 'property', name: 'New Developments', price: 20, tier: 'studio',
    description: 'Off-plan and new builds. Be first. Secure your future home today.',
    pages: ['home', 'properties', 'about', 'agents', 'reviews', 'contact'],
    features: ['virtual-tour', 'mortgage-calculator', '3d-floorplan', 'development-updates'],
    preview: { hero: 'https://picsum.photos/seed/prop-7/2000/1200' },
    rating: 95, motion: { level: 4 },
    design: { typography: 'sans', primary: '#1a237e', backgroundColor: '#ffffff', textColor: '#111111' }
  },
  {
    id: 'prop-8', engine: 'property', name: 'Student Housing', price: 7, tier: 'essential',
    description: 'Rooms and studios near campus. Simple, affordable, and fully furnished.',
    pages: ['home', 'properties', 'about', 'contact'],
    features: ['map-search'],
    preview: { hero: 'https://picsum.photos/seed/prop-8/2000/1200' },
    rating: 85, motion: { level: 1 },
    design: { typography: 'sans', primary: '#7B1FA2', backgroundColor: '#ffffff', textColor: '#111111' }
  },
  {
    id: 'prop-9', engine: 'property', name: 'Rural & Country', price: 11, tier: 'plus',
    description: 'Farms, cottages, and country estates. Space to breathe, room to grow.',
    pages: ['home', 'properties', 'about', 'agents', 'contact'],
    features: ['virtual-tour', 'map-search', 'agent-connect'],
    preview: { hero: 'https://picsum.photos/seed/prop-9/2000/1200' },
    rating: 90, motion: { level: 2 },
    design: { typography: 'serif', primary: '#558B2F', backgroundColor: '#f8fdf0', textColor: '#2d4a1e' }
  },
  {
    id: 'prop-10', engine: 'property', name: 'Property Auctions', price: 13, tier: 'pro',
    description: 'Bid, win, move in. Live and online property auctions.',
    pages: ['home', 'properties', 'about', 'contact', 'reviews'],
    features: ['live-bidding', 'mortgage-calculator', 'legal-pack'],
    preview: { hero: 'https://picsum.photos/seed/prop-10/2000/1200' },
    rating: 91, motion: { level: 3 },
    design: { typography: 'sans', primary: '#BF360C', backgroundColor: '#ffffff', textColor: '#111111' }
  },
  {
    id: 'prop-11', engine: 'property', name: 'Co-Living Spaces', price: 9, tier: 'plus',
    description: 'Modern co-living for the connected generation. Flexible terms, instant community.',
    pages: ['home', 'properties', 'about', 'reviews', 'contact'],
    features: ['virtual-tour', 'booking-calendar', 'community-features'],
    preview: { hero: 'https://picsum.photos/seed/prop-11/2000/1200' },
    rating: 91, motion: { level: 2 },
    design: { typography: 'sans', primary: '#4527A0', backgroundColor: '#ffffff', textColor: '#111111' }
  },
  {
    id: 'prop-12', engine: 'property', name: 'Property Management', price: 15, tier: 'pro',
    description: 'End-to-end property management for landlords and investors.',
    pages: ['home', 'properties', 'about', 'agents', 'reviews', 'contact'],
    features: ['tenant-portal', 'maintenance-tracking', 'rent-collection', 'reporting'],
    preview: { hero: 'https://picsum.photos/seed/prop-12/2000/1200' },
    rating: 93, motion: { level: 3 },
    design: { typography: 'sans', primary: '#1B5E20', backgroundColor: '#ffffff', textColor: '#111111' }
  },
  {
    id: 'prop-13', engine: 'property', name: 'Beachfront Villas', price: 24, tier: 'signature',
    description: 'Exceptional oceanfront properties. Where luxury meets the horizon.',
    pages: ['home', 'properties', 'about', 'agents', 'reviews', 'contact'],
    features: ['virtual-tour', 'private-viewing', 'concierge', 'mortgage-calculator'],
    preview: { hero: 'https://picsum.photos/seed/prop-13/2000/1200' },
    rating: 99, motion: { level: 5 },
    design: { typography: 'serif', primary: '#006064', backgroundColor: '#f0fbff', textColor: '#002d32' }
  },
  {
    id: 'prop-14', engine: 'property', name: 'Overseas Property', price: 17, tier: 'studio',
    description: 'International property investment. Buy abroad with confidence.',
    pages: ['home', 'properties', 'about', 'agents', 'reviews', 'contact'],
    features: ['virtual-tour', 'mortgage-calculator', 'legal-support', 'currency-tools'],
    preview: { hero: 'https://picsum.photos/seed/prop-14/2000/1200' },
    rating: 94, motion: { level: 4 },
    design: { typography: 'sans', primary: '#1565C0', backgroundColor: '#ffffff', textColor: '#111111' }
  },
  {
    id: 'prop-15', engine: 'property', name: 'First Home Buyer', price: 8, tier: 'essential',
    description: 'Your first step on the property ladder, guided every step of the way.',
    pages: ['home', 'properties', 'about', 'contact'],
    features: ['mortgage-calculator', 'guide'],
    preview: { hero: 'https://picsum.photos/seed/prop-15/2000/1200' },
    rating: 87, motion: { level: 1 },
    design: { typography: 'sans', primary: '#00695C', backgroundColor: '#ffffff', textColor: '#111111' }
  },

  {id:'prop-16',engine:'property',name:'Property Store 16',price:27,tier:'signature',description:'Unique and dynamic property experience crafted for conversion.',pages:['home','about','contact','services'],features:['Automation','Booking','Analytics'],preview:{hero:'https://picsum.photos/seed/property-16/2000/1200'},rating:92,motion:{level:4},design:{typography:'sans',primary:'#c58064',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'prop-17',engine:'property',name:'Property Store 17',price:13,tier:'plus',description:'Unique and dynamic property experience crafted for conversion.',pages:['home','about','contact','services'],features:['Automation','Loyalty','AI'],preview:{hero:'https://picsum.photos/seed/property-17/2000/1200'},rating:94,motion:{level:4},design:{typography:'serif',primary:'#ede928',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'prop-18',engine:'property',name:'Property Store 18',price:7,tier:'essential',description:'Unique and dynamic property experience crafted for conversion.',pages:['home','about','contact','services'],features:['Booking','Analytics','AI'],preview:{hero:'https://picsum.photos/seed/property-18/2000/1200'},rating:87,motion:{level:1},design:{typography:'serif',primary:'#51ef0d',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'prop-19',engine:'property',name:'Property Store 19',price:13,tier:'plus',description:'Unique and dynamic property experience crafted for conversion.',pages:['home','about','contact','services'],features:['Automation','AI','Loyalty'],preview:{hero:'https://picsum.photos/seed/property-19/2000/1200'},rating:83,motion:{level:3},design:{typography:'serif',primary:'#6c4620',backgroundColor:'#0a0a0a',textColor:'#ffffff'}},
  {id:'prop-20',engine:'property',name:'Property Store 20',price:27,tier:'signature',description:'Unique and dynamic property experience crafted for conversion.',pages:['home','about','contact','services'],features:['Automation','Loyalty','Analytics'],preview:{hero:'https://picsum.photos/seed/property-20/2000/1200'},rating:89,motion:{level:3},design:{typography:'serif',primary:'#0374e2',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'prop-21',engine:'property',name:'Property Store 21',price:9,tier:'plus',description:'Unique and dynamic property experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','Automation','Booking'],preview:{hero:'https://picsum.photos/seed/property-21/2000/1200'},rating:87,motion:{level:4},design:{typography:'sans',primary:'#53e144',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'prop-22',engine:'property',name:'Property Store 22',price:14,tier:'pro',description:'Unique and dynamic property experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Loyalty','Automation'],preview:{hero:'https://picsum.photos/seed/property-22/2000/1200'},rating:91,motion:{level:3},design:{typography:'serif',primary:'#75c455',backgroundColor:'#0a0a0a',textColor:'#ffffff'}},
  {id:'prop-23',engine:'property',name:'Property Store 23',price:22,tier:'studio',description:'Unique and dynamic property experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','Automation','AI'],preview:{hero:'https://picsum.photos/seed/property-23/2000/1200'},rating:92,motion:{level:3},design:{typography:'serif',primary:'#f68362',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'prop-24',engine:'property',name:'Property Store 24',price:9,tier:'essential',description:'Unique and dynamic property experience crafted for conversion.',pages:['home','about','contact','services'],features:['Automation','AI','Loyalty'],preview:{hero:'https://picsum.photos/seed/property-24/2000/1200'},rating:94,motion:{level:4},design:{typography:'serif',primary:'#4e8c84',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'prop-25',engine:'property',name:'Property Store 25',price:11,tier:'plus',description:'Unique and dynamic property experience crafted for conversion.',pages:['home','about','contact','services'],features:['Analytics','AI','Booking'],preview:{hero:'https://picsum.photos/seed/property-25/2000/1200'},rating:86,motion:{level:2},design:{typography:'serif',primary:'#0222dc',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'prop-26',engine:'property',name:'Property Store 26',price:8,tier:'essential',description:'Unique and dynamic property experience crafted for conversion.',pages:['home','about','contact','services'],features:['Booking','Automation','AI'],preview:{hero:'https://picsum.photos/seed/property-26/2000/1200'},rating:84,motion:{level:2},design:{typography:'sans',primary:'#fc677b',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'prop-27',engine:'property',name:'Property Store 27',price:25,tier:'signature',description:'Unique and dynamic property experience crafted for conversion.',pages:['home','about','contact','services'],features:['Booking','Analytics','Automation'],preview:{hero:'https://picsum.photos/seed/property-27/2000/1200'},rating:82,motion:{level:5},design:{typography:'sans',primary:'#2888b4',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'prop-28',engine:'property',name:'Property Store 28',price:7,tier:'essential',description:'Unique and dynamic property experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Loyalty','Analytics'],preview:{hero:'https://picsum.photos/seed/property-28/2000/1200'},rating:85,motion:{level:5},design:{typography:'serif',primary:'#24bc99',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'prop-29',engine:'property',name:'Property Store 29',price:17,tier:'pro',description:'Unique and dynamic property experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Analytics','Automation'],preview:{hero:'https://picsum.photos/seed/property-29/2000/1200'},rating:81,motion:{level:4},design:{typography:'sans',primary:'#db0bf4',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'prop-30',engine:'property',name:'Property Store 30',price:23,tier:'studio',description:'Unique and dynamic property experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Automation','Analytics'],preview:{hero:'https://picsum.photos/seed/property-30/2000/1200'},rating:86,motion:{level:3},design:{typography:'serif',primary:'#ae3591',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'prop-31',engine:'property',name:'Property Store 31',price:13,tier:'plus',description:'Unique and dynamic property experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Booking','Loyalty'],preview:{hero:'https://picsum.photos/seed/property-31/2000/1200'},rating:84,motion:{level:5},design:{typography:'sans',primary:'#4d0ba4',backgroundColor:'#0a0a0a',textColor:'#ffffff'}},
  {id:'prop-32',engine:'property',name:'Property Store 32',price:25,tier:'signature',description:'Unique and dynamic property experience crafted for conversion.',pages:['home','about','contact','services'],features:['Booking','Analytics','AI'],preview:{hero:'https://picsum.photos/seed/property-32/2000/1200'},rating:94,motion:{level:4},design:{typography:'sans',primary:'#4d062f',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'prop-33',engine:'property',name:'Property Store 33',price:27,tier:'signature',description:'Unique and dynamic property experience crafted for conversion.',pages:['home','about','contact','services'],features:['Automation','Loyalty','Booking'],preview:{hero:'https://picsum.photos/seed/property-33/2000/1200'},rating:85,motion:{level:4},design:{typography:'serif',primary:'#9d0cd6',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'prop-34',engine:'property',name:'Property Store 34',price:10,tier:'plus',description:'Unique and dynamic property experience crafted for conversion.',pages:['home','about','contact','services'],features:['Automation','Loyalty','Booking'],preview:{hero:'https://picsum.photos/seed/property-34/2000/1200'},rating:82,motion:{level:3},design:{typography:'serif',primary:'#57206c',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'prop-35',engine:'property',name:'Property Store 35',price:21,tier:'studio',description:'Unique and dynamic property experience crafted for conversion.',pages:['home','about','contact','services'],features:['Booking','Loyalty','Analytics'],preview:{hero:'https://picsum.photos/seed/property-35/2000/1200'},rating:92,motion:{level:5},design:{typography:'serif',primary:'#e29d1b',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'prop-36',engine:'property',name:'Property Store 36',price:7,tier:'essential',description:'Unique and dynamic property experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','Automation','Booking'],preview:{hero:'https://picsum.photos/seed/property-36/2000/1200'},rating:85,motion:{level:1},design:{typography:'serif',primary:'#fd5498',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'prop-37',engine:'property',name:'Property Store 37',price:11,tier:'plus',description:'Unique and dynamic property experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Analytics','Booking'],preview:{hero:'https://picsum.photos/seed/property-37/2000/1200'},rating:85,motion:{level:1},design:{typography:'serif',primary:'#9480f4',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'prop-38',engine:'property',name:'Property Store 38',price:23,tier:'studio',description:'Unique and dynamic property experience crafted for conversion.',pages:['home','about','contact','services'],features:['Analytics','Loyalty','Booking'],preview:{hero:'https://picsum.photos/seed/property-38/2000/1200'},rating:82,motion:{level:1},design:{typography:'serif',primary:'#ffe11c',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'prop-39',engine:'property',name:'Property Store 39',price:27,tier:'signature',description:'Unique and dynamic property experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Analytics','Loyalty'],preview:{hero:'https://picsum.photos/seed/property-39/2000/1200'},rating:85,motion:{level:2},design:{typography:'sans',primary:'#83def5',backgroundColor:'#0a0a0a',textColor:'#ffffff'}},
  {id:'prop-40',engine:'property',name:'Property Store 40',price:11,tier:'plus',description:'Unique and dynamic property experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','Booking','AI'],preview:{hero:'https://picsum.photos/seed/property-40/2000/1200'},rating:80,motion:{level:4},design:{typography:'serif',primary:'#5f6b25',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'prop-41',engine:'property',name:'Property Store 41',price:9,tier:'essential',description:'Unique and dynamic property experience crafted for conversion.',pages:['home','about','contact','services'],features:['Booking','Analytics','Loyalty'],preview:{hero:'https://picsum.photos/seed/property-41/2000/1200'},rating:94,motion:{level:5},design:{typography:'serif',primary:'#c47644',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'prop-42',engine:'property',name:'Property Store 42',price:20,tier:'studio',description:'Unique and dynamic property experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','Booking','Analytics'],preview:{hero:'https://picsum.photos/seed/property-42/2000/1200'},rating:82,motion:{level:3},design:{typography:'serif',primary:'#b58c10',backgroundColor:'#0a0a0a',textColor:'#ffffff'}},
  {id:'prop-43',engine:'property',name:'Property Store 43',price:23,tier:'studio',description:'Unique and dynamic property experience crafted for conversion.',pages:['home','about','contact','services'],features:['Booking','Loyalty','AI'],preview:{hero:'https://picsum.photos/seed/property-43/2000/1200'},rating:81,motion:{level:2},design:{typography:'serif',primary:'#c3bc2e',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'prop-44',engine:'property',name:'Property Store 44',price:11,tier:'plus',description:'Unique and dynamic property experience crafted for conversion.',pages:['home','about','contact','services'],features:['Booking','Analytics','AI'],preview:{hero:'https://picsum.photos/seed/property-44/2000/1200'},rating:82,motion:{level:1},design:{typography:'sans',primary:'#2d0569',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'prop-45',engine:'property',name:'Property Store 45',price:29,tier:'signature',description:'Unique and dynamic property experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','Automation','Analytics'],preview:{hero:'https://picsum.photos/seed/property-45/2000/1200'},rating:82,motion:{level:3},design:{typography:'serif',primary:'#0935ec',backgroundColor:'#0a0a0a',textColor:'#ffffff'}},
  {id:'prop-46',engine:'property',name:'Property Store 46',price:28,tier:'signature',description:'Unique and dynamic property experience crafted for conversion.',pages:['home','about','contact','services'],features:['Automation','AI','Analytics'],preview:{hero:'https://picsum.photos/seed/property-46/2000/1200'},rating:88,motion:{level:5},design:{typography:'serif',primary:'#a80d25',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'prop-47',engine:'property',name:'Property Store 47',price:17,tier:'pro',description:'Unique and dynamic property experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Loyalty','Automation'],preview:{hero:'https://picsum.photos/seed/property-47/2000/1200'},rating:88,motion:{level:3},design:{typography:'serif',primary:'#9f37ad',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'prop-48',engine:'property',name:'Property Store 48',price:13,tier:'plus',description:'Unique and dynamic property experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Analytics','Automation'],preview:{hero:'https://picsum.photos/seed/property-48/2000/1200'},rating:92,motion:{level:1},design:{typography:'serif',primary:'#4b75f8',backgroundColor:'#0a0a0a',textColor:'#ffffff'}},
  {id:'prop-49',engine:'property',name:'Property Store 49',price:29,tier:'signature',description:'Unique and dynamic property experience crafted for conversion.',pages:['home','about','contact','services'],features:['Automation','AI','Analytics'],preview:{hero:'https://picsum.photos/seed/property-49/2000/1200'},rating:89,motion:{level:1},design:{typography:'sans',primary:'#685614',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'prop-50',engine:'property',name:'Property Store 50',price:8,tier:'essential',description:'Unique and dynamic property experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','Booking','Automation'],preview:{hero:'https://picsum.photos/seed/property-50/2000/1200'},rating:84,motion:{level:4},design:{typography:'serif',primary:'#dc6f4e',backgroundColor:'#0a0a0a',textColor:'#ffffff'}}
];
