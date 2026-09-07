// UI TEMPLATE CONFIG — Not business/seller data
// 15 HEALTHCARE EXPERIENCES — Rich Configs
export const healthcareStores = [
  {
    id: 'health-1', engine: 'healthcare', name: 'Modern Pharmacy', price: 9, tier: 'plus',
    description: 'Prescription management, OTC delivery, and wellness products. Health made simple.',
    pages: ['home', 'products', 'services', 'about', 'contact'],
    features: ['appointments', 'delivery', 'prescription-upload'],
    preview: { hero: 'https://picsum.photos/seed/health-1/2000/1200' },
    rating: 91, motion: { level: 2 },
    design: { typography: 'sans', primary: '#0277BD', backgroundColor: '#ffffff', textColor: '#111111' }
  },
  {
    id: 'health-2', engine: 'healthcare', name: 'General Practice', price: 12, tier: 'plus',
    description: 'Your local GP, now digital. Book appointments, access records, consult online.',
    pages: ['home', 'services', 'doctors', 'appointments', 'about', 'contact'],
    features: ['appointments', 'consultation-request', 'patient-portal'],
    preview: { hero: 'https://picsum.photos/seed/health-2/2000/1200' },
    rating: 93, motion: { level: 2 },
    design: { typography: 'sans', primary: '#1565C0', backgroundColor: '#f0f8ff', textColor: '#0a1a2e' }
  },
  {
    id: 'health-3', engine: 'healthcare', name: 'Dental Clinic', price: 11, tier: 'plus',
    description: 'Brighter smiles, seamless booking. Cosmetic and general dentistry online.',
    pages: ['home', 'services', 'doctors', 'appointments', 'about', 'reviews', 'contact'],
    features: ['appointments', 'smile-preview', 'treatment-plans'],
    preview: { hero: 'https://picsum.photos/seed/health-3/2000/1200' },
    rating: 92, motion: { level: 2 },
    design: { typography: 'sans', primary: '#00838F', backgroundColor: '#f0fdfd', textColor: '#00363a' }
  },
  {
    id: 'health-4', engine: 'healthcare', name: 'Wellness Centre', price: 13, tier: 'pro',
    description: 'Holistic health and wellbeing. Yoga, nutrition, therapy, and mindfulness.',
    pages: ['home', 'services', 'appointments', 'about', 'reviews', 'contact'],
    features: ['appointments', 'class-booking', 'wellness-programs', 'consultation-request'],
    preview: { hero: 'https://picsum.photos/seed/health-4/2000/1200' },
    rating: 94, motion: { level: 3 },
    design: { typography: 'serif', primary: '#4CAF50', backgroundColor: '#f9fff9', textColor: '#1a3a1a' }
  },
  {
    id: 'health-5', engine: 'healthcare', name: 'Medical Practice', price: 15, tier: 'pro',
    description: 'Multi-specialty practice. Seamless care coordination and patient experience.',
    pages: ['home', 'services', 'doctors', 'appointments', 'departments', 'about', 'contact'],
    features: ['appointments', 'consultation-request', 'patient-portal', 'departments'],
    preview: { hero: 'https://picsum.photos/seed/health-5/2000/1200' },
    rating: 94, motion: { level: 3 },
    design: { typography: 'sans', primary: '#1976D2', backgroundColor: '#ffffff', textColor: '#111111' }
  },
  {
    id: 'health-6', engine: 'healthcare', name: 'Diagnostic Centre', price: 14, tier: 'pro',
    description: 'Fast, accurate diagnostics. Book tests, receive results, track your health.',
    pages: ['home', 'services', 'appointments', 'about', 'contact'],
    features: ['appointments', 'test-booking', 'results-portal', 'home-collection'],
    preview: { hero: 'https://picsum.photos/seed/health-6/2000/1200' },
    rating: 93, motion: { level: 3 },
    design: { typography: 'sans', primary: '#0288D1', backgroundColor: '#ffffff', textColor: '#111111' }
  },
  {
    id: 'health-7', engine: 'healthcare', name: 'Telehealth Platform', price: 18, tier: 'studio',
    description: 'See a doctor in minutes. AI-assisted triage, instant consultation, prescription delivery.',
    pages: ['home', 'services', 'doctors', 'appointments', 'about', 'reviews', 'contact'],
    features: ['appointments', 'video-consultation', 'ai-symptom-checker', 'prescription-delivery', 'patient-portal'],
    preview: { hero: 'https://picsum.photos/seed/health-7/2000/1200' },
    rating: 97, motion: { level: 4 },
    design: { typography: 'sans', primary: '#7C4DFF', backgroundColor: '#f5f0ff', textColor: '#2d0a66' }
  },
  {
    id: 'health-8', engine: 'healthcare', name: 'Physio & Rehab', price: 10, tier: 'plus',
    description: 'Evidence-based physiotherapy. Recover faster, move better, live fully.',
    pages: ['home', 'services', 'appointments', 'about', 'reviews', 'contact'],
    features: ['appointments', 'exercise-programs', 'progress-tracking'],
    preview: { hero: 'https://picsum.photos/seed/health-8/2000/1200' },
    rating: 91, motion: { level: 2 },
    design: { typography: 'sans', primary: '#00897B', backgroundColor: '#f0fafa', textColor: '#00363a' }
  },
  {
    id: 'health-9', engine: 'healthcare', name: 'Mental Health Hub', price: 17, tier: 'studio',
    description: 'Confidential. Compassionate. Connected. Mental wellness support at every level.',
    pages: ['home', 'services', 'doctors', 'appointments', 'about', 'reviews', 'contact'],
    features: ['appointments', 'consultation-request', 'therapy-matching', 'mood-tracker', 'crisis-support'],
    preview: { hero: 'https://picsum.photos/seed/health-9/2000/1200' },
    rating: 96, motion: { level: 3 },
    design: { typography: 'sans', primary: '#5C6BC0', backgroundColor: '#fafafe', textColor: '#1a1a3e' }
  },
  {
    id: 'health-10', engine: 'healthcare', name: 'Fertility Clinic', price: 20, tier: 'studio',
    description: 'Your family journey starts here. IVF, IUI, and fertility support with compassion.',
    pages: ['home', 'services', 'doctors', 'appointments', 'about', 'reviews', 'contact'],
    features: ['appointments', 'consultation-request', 'treatment-tracking', 'support-community'],
    preview: { hero: 'https://picsum.photos/seed/health-10/2000/1200' },
    rating: 97, motion: { level: 4 },
    design: { typography: 'serif', primary: '#E91E63', backgroundColor: '#fff5f8', textColor: '#4a0020' }
  },
  {
    id: 'health-11', engine: 'healthcare', name: 'Nutrition & Diet', price: 11, tier: 'plus',
    description: 'Personalised nutrition plans powered by science. Eat better, feel better.',
    pages: ['home', 'services', 'appointments', 'about', 'reviews', 'contact'],
    features: ['appointments', 'meal-planning', 'consultation-request'],
    preview: { hero: 'https://picsum.photos/seed/health-11/2000/1200' },
    rating: 90, motion: { level: 2 },
    design: { typography: 'sans', primary: '#33691E', backgroundColor: '#f8fff0', textColor: '#1b3d00' }
  },
  {
    id: 'health-12', engine: 'healthcare', name: 'Pediatric Clinic', price: 12, tier: 'plus',
    description: 'Expert child healthcare in a warm, friendly environment parents trust.',
    pages: ['home', 'services', 'doctors', 'appointments', 'about', 'contact'],
    features: ['appointments', 'growth-tracker', 'vaccination-schedule'],
    preview: { hero: 'https://picsum.photos/seed/health-12/2000/1200' },
    rating: 93, motion: { level: 2 },
    design: { typography: 'sans', primary: '#039BE5', backgroundColor: '#f0faff', textColor: '#003a5a' }
  },
  {
    id: 'health-13', engine: 'healthcare', name: 'Aesthetic Clinic', price: 16, tier: 'pro',
    description: 'Medical aesthetics and cosmetic procedures. Look your best, feel your best.',
    pages: ['home', 'services', 'doctors', 'appointments', 'about', 'reviews', 'contact'],
    features: ['appointments', 'before-after-gallery', 'consultation-request', 'treatment-simulator'],
    preview: { hero: 'https://picsum.photos/seed/health-13/2000/1200' },
    rating: 95, motion: { level: 4 },
    design: { typography: 'serif', primary: '#C2185B', backgroundColor: '#fff5f8', textColor: '#4a0020' }
  },
  {
    id: 'health-14', engine: 'healthcare', name: 'Sports Medicine', price: 14, tier: 'pro',
    description: 'Peak performance health. Injury treatment, performance optimisation, recovery.',
    pages: ['home', 'services', 'doctors', 'appointments', 'about', 'reviews', 'contact'],
    features: ['appointments', 'performance-testing', 'injury-assessment', 'consultation-request'],
    preview: { hero: 'https://picsum.photos/seed/health-14/2000/1200' },
    rating: 93, motion: { level: 3 },
    design: { typography: 'sans', primary: '#E65100', backgroundColor: '#ffffff', textColor: '#111111' }
  },
  {
    id: 'health-15', engine: 'healthcare', name: 'Premium Health OS', price: 25, tier: 'signature',
    description: 'Your entire health journey, managed. AI-powered, concierge-level, always on.',
    pages: ['home', 'services', 'doctors', 'appointments', 'departments', 'about', 'reviews', 'contact'],
    features: ['appointments', 'consultation-request', 'video-consultation', 'ai-health-assistant', 'patient-portal', 'health-records', 'prescription-management', 'home-visits'],
    preview: { hero: 'https://picsum.photos/seed/health-15/2000/1200' },
    rating: 99, motion: { level: 5 },
    design: { typography: 'sans', primary: '#1565C0', backgroundColor: '#f0f6ff', textColor: '#0a1a3e' }
  },

  {id:'heal-16',engine:'healthcare',name:'Healthcare Store 16',price:8,tier:'essential',description:'Unique and dynamic healthcare experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','Booking','Analytics'],preview:{hero:'https://picsum.photos/seed/healthcare-16/2000/1200'},rating:84,motion:{level:3},design:{typography:'serif',primary:'#b5ee73',backgroundColor:'#0a0a0a',textColor:'#ffffff'}},
  {id:'heal-17',engine:'healthcare',name:'Healthcare Store 17',price:23,tier:'studio',description:'Unique and dynamic healthcare experience crafted for conversion.',pages:['home','about','contact','services'],features:['Automation','AI','Loyalty'],preview:{hero:'https://picsum.photos/seed/healthcare-17/2000/1200'},rating:88,motion:{level:4},design:{typography:'serif',primary:'#b36357',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'heal-18',engine:'healthcare',name:'Healthcare Store 18',price:15,tier:'pro',description:'Unique and dynamic healthcare experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Analytics','Loyalty'],preview:{hero:'https://picsum.photos/seed/healthcare-18/2000/1200'},rating:93,motion:{level:5},design:{typography:'serif',primary:'#b32647',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'heal-19',engine:'healthcare',name:'Healthcare Store 19',price:8,tier:'essential',description:'Unique and dynamic healthcare experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Loyalty','Analytics'],preview:{hero:'https://picsum.photos/seed/healthcare-19/2000/1200'},rating:85,motion:{level:3},design:{typography:'serif',primary:'#ab11cf',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'heal-20',engine:'healthcare',name:'Healthcare Store 20',price:10,tier:'plus',description:'Unique and dynamic healthcare experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Loyalty','Automation'],preview:{hero:'https://picsum.photos/seed/healthcare-20/2000/1200'},rating:80,motion:{level:4},design:{typography:'sans',primary:'#3aab3d',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'heal-21',engine:'healthcare',name:'Healthcare Store 21',price:14,tier:'pro',description:'Unique and dynamic healthcare experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','AI','Analytics'],preview:{hero:'https://picsum.photos/seed/healthcare-21/2000/1200'},rating:87,motion:{level:3},design:{typography:'serif',primary:'#2bc5cc',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'heal-22',engine:'healthcare',name:'Healthcare Store 22',price:15,tier:'pro',description:'Unique and dynamic healthcare experience crafted for conversion.',pages:['home','about','contact','services'],features:['Automation','Booking','Loyalty'],preview:{hero:'https://picsum.photos/seed/healthcare-22/2000/1200'},rating:84,motion:{level:5},design:{typography:'sans',primary:'#82990a',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'heal-23',engine:'healthcare',name:'Healthcare Store 23',price:22,tier:'studio',description:'Unique and dynamic healthcare experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Analytics','Booking'],preview:{hero:'https://picsum.photos/seed/healthcare-23/2000/1200'},rating:84,motion:{level:1},design:{typography:'sans',primary:'#98af56',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'heal-24',engine:'healthcare',name:'Healthcare Store 24',price:18,tier:'pro',description:'Unique and dynamic healthcare experience crafted for conversion.',pages:['home','about','contact','services'],features:['Booking','Automation','Analytics'],preview:{hero:'https://picsum.photos/seed/healthcare-24/2000/1200'},rating:80,motion:{level:5},design:{typography:'serif',primary:'#2d8693',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'heal-25',engine:'healthcare',name:'Healthcare Store 25',price:19,tier:'studio',description:'Unique and dynamic healthcare experience crafted for conversion.',pages:['home','about','contact','services'],features:['Automation','AI','Loyalty'],preview:{hero:'https://picsum.photos/seed/healthcare-25/2000/1200'},rating:89,motion:{level:4},design:{typography:'serif',primary:'#cc8a5f',backgroundColor:'#0a0a0a',textColor:'#ffffff'}},
  {id:'heal-26',engine:'healthcare',name:'Healthcare Store 26',price:16,tier:'pro',description:'Unique and dynamic healthcare experience crafted for conversion.',pages:['home','about','contact','services'],features:['Booking','Loyalty','AI'],preview:{hero:'https://picsum.photos/seed/healthcare-26/2000/1200'},rating:83,motion:{level:5},design:{typography:'serif',primary:'#1a56d7',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'heal-27',engine:'healthcare',name:'Healthcare Store 27',price:25,tier:'signature',description:'Unique and dynamic healthcare experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Analytics','Booking'],preview:{hero:'https://picsum.photos/seed/healthcare-27/2000/1200'},rating:80,motion:{level:2},design:{typography:'serif',primary:'#f899ea',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'heal-28',engine:'healthcare',name:'Healthcare Store 28',price:26,tier:'signature',description:'Unique and dynamic healthcare experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Analytics','Automation'],preview:{hero:'https://picsum.photos/seed/healthcare-28/2000/1200'},rating:80,motion:{level:2},design:{typography:'sans',primary:'#b957ad',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'heal-29',engine:'healthcare',name:'Healthcare Store 29',price:17,tier:'pro',description:'Unique and dynamic healthcare experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Loyalty','Booking'],preview:{hero:'https://picsum.photos/seed/healthcare-29/2000/1200'},rating:91,motion:{level:3},design:{typography:'sans',primary:'#8ae803',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'heal-30',engine:'healthcare',name:'Healthcare Store 30',price:27,tier:'signature',description:'Unique and dynamic healthcare experience crafted for conversion.',pages:['home','about','contact','services'],features:['Booking','Analytics','Automation'],preview:{hero:'https://picsum.photos/seed/healthcare-30/2000/1200'},rating:90,motion:{level:4},design:{typography:'serif',primary:'#4f05e3',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'heal-31',engine:'healthcare',name:'Healthcare Store 31',price:13,tier:'plus',description:'Unique and dynamic healthcare experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Analytics','Booking'],preview:{hero:'https://picsum.photos/seed/healthcare-31/2000/1200'},rating:83,motion:{level:1},design:{typography:'sans',primary:'#745261',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'heal-32',engine:'healthcare',name:'Healthcare Store 32',price:15,tier:'pro',description:'Unique and dynamic healthcare experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','AI','Automation'],preview:{hero:'https://picsum.photos/seed/healthcare-32/2000/1200'},rating:87,motion:{level:2},design:{typography:'sans',primary:'#65fa68',backgroundColor:'#0a0a0a',textColor:'#ffffff'}},
  {id:'heal-33',engine:'healthcare',name:'Healthcare Store 33',price:15,tier:'pro',description:'Unique and dynamic healthcare experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','AI','Analytics'],preview:{hero:'https://picsum.photos/seed/healthcare-33/2000/1200'},rating:84,motion:{level:3},design:{typography:'sans',primary:'#d39197',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'heal-34',engine:'healthcare',name:'Healthcare Store 34',price:14,tier:'pro',description:'Unique and dynamic healthcare experience crafted for conversion.',pages:['home','about','contact','services'],features:['Automation','Analytics','Loyalty'],preview:{hero:'https://picsum.photos/seed/healthcare-34/2000/1200'},rating:93,motion:{level:4},design:{typography:'serif',primary:'#024393',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'heal-35',engine:'healthcare',name:'Healthcare Store 35',price:8,tier:'essential',description:'Unique and dynamic healthcare experience crafted for conversion.',pages:['home','about','contact','services'],features:['Automation','AI','Analytics'],preview:{hero:'https://picsum.photos/seed/healthcare-35/2000/1200'},rating:81,motion:{level:3},design:{typography:'serif',primary:'#c8293d',backgroundColor:'#0a0a0a',textColor:'#ffffff'}},
  {id:'heal-36',engine:'healthcare',name:'Healthcare Store 36',price:22,tier:'studio',description:'Unique and dynamic healthcare experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','Booking','Automation'],preview:{hero:'https://picsum.photos/seed/healthcare-36/2000/1200'},rating:86,motion:{level:2},design:{typography:'sans',primary:'#034a9f',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'heal-37',engine:'healthcare',name:'Healthcare Store 37',price:10,tier:'plus',description:'Unique and dynamic healthcare experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Analytics','Booking'],preview:{hero:'https://picsum.photos/seed/healthcare-37/2000/1200'},rating:88,motion:{level:2},design:{typography:'serif',primary:'#8a3a0e',backgroundColor:'#0a0a0a',textColor:'#ffffff'}},
  {id:'heal-38',engine:'healthcare',name:'Healthcare Store 38',price:9,tier:'essential',description:'Unique and dynamic healthcare experience crafted for conversion.',pages:['home','about','contact','services'],features:['Analytics','Loyalty','AI'],preview:{hero:'https://picsum.photos/seed/healthcare-38/2000/1200'},rating:92,motion:{level:1},design:{typography:'serif',primary:'#1205aa',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'heal-39',engine:'healthcare',name:'Healthcare Store 39',price:8,tier:'essential',description:'Unique and dynamic healthcare experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Loyalty','Analytics'],preview:{hero:'https://picsum.photos/seed/healthcare-39/2000/1200'},rating:93,motion:{level:4},design:{typography:'serif',primary:'#bdbecf',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'heal-40',engine:'healthcare',name:'Healthcare Store 40',price:15,tier:'pro',description:'Unique and dynamic healthcare experience crafted for conversion.',pages:['home','about','contact','services'],features:['Booking','Loyalty','Automation'],preview:{hero:'https://picsum.photos/seed/healthcare-40/2000/1200'},rating:89,motion:{level:5},design:{typography:'sans',primary:'#39502c',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'heal-41',engine:'healthcare',name:'Healthcare Store 41',price:26,tier:'signature',description:'Unique and dynamic healthcare experience crafted for conversion.',pages:['home','about','contact','services'],features:['Booking','Analytics','Automation'],preview:{hero:'https://picsum.photos/seed/healthcare-41/2000/1200'},rating:83,motion:{level:2},design:{typography:'sans',primary:'#4fb721',backgroundColor:'#0a0a0a',textColor:'#111111'}},
  {id:'heal-42',engine:'healthcare',name:'Healthcare Store 42',price:16,tier:'pro',description:'Unique and dynamic healthcare experience crafted for conversion.',pages:['home','about','contact','services'],features:['Analytics','Loyalty','AI'],preview:{hero:'https://picsum.photos/seed/healthcare-42/2000/1200'},rating:83,motion:{level:4},design:{typography:'sans',primary:'#0b93c8',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'heal-43',engine:'healthcare',name:'Healthcare Store 43',price:10,tier:'plus',description:'Unique and dynamic healthcare experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Analytics','Booking'],preview:{hero:'https://picsum.photos/seed/healthcare-43/2000/1200'},rating:89,motion:{level:1},design:{typography:'sans',primary:'#eaf973',backgroundColor:'#0a0a0a',textColor:'#ffffff'}},
  {id:'heal-44',engine:'healthcare',name:'Healthcare Store 44',price:21,tier:'studio',description:'Unique and dynamic healthcare experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','Automation','Booking'],preview:{hero:'https://picsum.photos/seed/healthcare-44/2000/1200'},rating:83,motion:{level:4},design:{typography:'serif',primary:'#810417',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'heal-45',engine:'healthcare',name:'Healthcare Store 45',price:9,tier:'plus',description:'Unique and dynamic healthcare experience crafted for conversion.',pages:['home','about','contact','services'],features:['Automation','Booking','AI'],preview:{hero:'https://picsum.photos/seed/healthcare-45/2000/1200'},rating:86,motion:{level:2},design:{typography:'sans',primary:'#c52ac2',backgroundColor:'#ffffff',textColor:'#111111'}},
  {id:'heal-46',engine:'healthcare',name:'Healthcare Store 46',price:25,tier:'signature',description:'Unique and dynamic healthcare experience crafted for conversion.',pages:['home','about','contact','services'],features:['Automation','Loyalty','Booking'],preview:{hero:'https://picsum.photos/seed/healthcare-46/2000/1200'},rating:92,motion:{level:4},design:{typography:'serif',primary:'#a7efbd',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'heal-47',engine:'healthcare',name:'Healthcare Store 47',price:8,tier:'essential',description:'Unique and dynamic healthcare experience crafted for conversion.',pages:['home','about','contact','services'],features:['Booking','AI','Automation'],preview:{hero:'https://picsum.photos/seed/healthcare-47/2000/1200'},rating:80,motion:{level:1},design:{typography:'serif',primary:'#6bf01a',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'heal-48',engine:'healthcare',name:'Healthcare Store 48',price:21,tier:'studio',description:'Unique and dynamic healthcare experience crafted for conversion.',pages:['home','about','contact','services'],features:['Booking','Automation','Analytics'],preview:{hero:'https://picsum.photos/seed/healthcare-48/2000/1200'},rating:88,motion:{level:4},design:{typography:'sans',primary:'#48aa3d',backgroundColor:'#ffffff',textColor:'#ffffff'}},
  {id:'heal-49',engine:'healthcare',name:'Healthcare Store 49',price:20,tier:'studio',description:'Unique and dynamic healthcare experience crafted for conversion.',pages:['home','about','contact','services'],features:['Loyalty','AI','Analytics'],preview:{hero:'https://picsum.photos/seed/healthcare-49/2000/1200'},rating:80,motion:{level:3},design:{typography:'serif',primary:'#a1d6e7',backgroundColor:'#0a0a0a',textColor:'#ffffff'}},
  {id:'heal-50',engine:'healthcare',name:'Healthcare Store 50',price:9,tier:'plus',description:'Unique and dynamic healthcare experience crafted for conversion.',pages:['home','about','contact','services'],features:['AI','Analytics','Automation'],preview:{hero:'https://picsum.photos/seed/healthcare-50/2000/1200'},rating:94,motion:{level:3},design:{typography:'sans',primary:'#a004d7',backgroundColor:'#ffffff',textColor:'#ffffff'}}
];
