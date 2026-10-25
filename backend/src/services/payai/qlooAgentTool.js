'use strict';

const axios = require('axios');
const logger = require('../../utils/logger');

/**
 * In-Memory TTL Cache for ultra-fast, sub-second agent responses
 */
class MemoryCache {
  constructor(defaultTtlMs = 1000 * 60 * 30, maxEntries = 3000) {
    this.cache = new Map();
    this.defaultTtlMs = defaultTtlMs;
    this.maxEntries = maxEntries;
    this.stats = { hits: 0, misses: 0, sets: 0, evictions: 0 };
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) {
      this.stats.misses++;
      return null;
    }
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    this.stats.hits++;
    return item.value;
  }

  set(key, value, ttlMs = this.defaultTtlMs) {
    if (this.cache.size >= this.maxEntries) {
      // Evict oldest entry (FIFO)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.stats.evictions++;
      }
    }
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      timestamp: Date.now()
    });
    this.stats.sets++;
    return value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  clear() {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, sets: 0, evictions: 0 };
  }

  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      maxEntries: this.maxEntries
    };
  }
}

/**
 * Rich Deterministic Cultural Fallback Knowledge Graph
 * Built specifically for African/Nigerian culture, spicy street eats, streetwear, minimalist tech, and comfort dining.
 */
const CULTURAL_KNOWLEDGE_BASE = {
  nigerian_african: {
    matchKeywords: [
      'nigerian', 'african', 'nigeria', 'suya', 'jollof', 'egusi', 'afrobeats',
      'lagos', 'fufu', 'pepper soup', 'burna', 'wizkid', 'asake', 'amapiano',
      'zobo', 'ankara', 'kuli-kuli', 'yaji', 'plantain', 'small chops'
    ],
    entities: [
      { id: 'ent_qloo_af_suya_01', name: 'Suya (Smoky Woodfire Skewered Beef)', category: 'dining', subtype: 'street_food', score: 0.98 },
      { id: 'ent_qloo_af_jollof_02', name: 'Party Jollof Rice with Fried Plantain', category: 'dining', subtype: 'west_african', score: 0.97 },
      { id: 'ent_qloo_af_afrobeats_03', name: 'Afrobeats & Modern Lagos Sound (Asake, Burna Boy, Wizkid)', category: 'music', subtype: 'afro_rhythm', score: 0.96 },
      { id: 'ent_qloo_af_ankara_04', name: 'Ankara Contemporary Haute-Streetwear', category: 'fashion', subtype: 'african_textile', score: 0.94 },
      { id: 'ent_qloo_af_peppersoup_05', name: 'Aromatic Catfish & Goat Meat Pepper Soup', category: 'dining', subtype: 'comfort_spicy', score: 0.92 }
    ],
    affinities: [
      { attribute: 'Smoky Woodfire Yaji Spicing', score: 0.97, domain: 'dining' },
      { attribute: 'High-Energy Afro-Pop & Poly-Rhythms', score: 0.95, domain: 'music' },
      { attribute: 'Vibrant Lagos Night Market Energy', score: 0.93, domain: 'lifestyle' },
      { attribute: 'Heritage Wax Print & Modern Street Cut', score: 0.91, domain: 'fashion' },
      { attribute: 'Communal Feasting & Celebration', score: 0.94, domain: 'dining' }
    ],
    keywords: [
      'smoky suya spice', 'party jollof', 'afrobeats', 'lagos nightlife',
      'ankara patterns', 'scotch bonnet heat', 'bold communal dining', 'yaji pepper'
    ],
    tasteSummary: 'Dynamic Afro-contemporary taste profile characterized by smoky grilled meats, fragrant habanero/yaji spices, vibrant Afropop energy, and expressive heritage-infused streetwear.',
    crossDomain: {
      fashion: [
        { name: 'Ashluxe', affinityScore: 0.96, reason: 'Premier Lagos luxury streetwear house blending bold typography with contemporary youth culture' },
        { name: 'Daily Paper', affinityScore: 0.94, reason: 'Globally celebrated African-heritage streetwear connecting ancestral prints with modern tailoring' },
        { name: 'Orange Culture', affinityScore: 0.89, reason: 'Avant-garde Nigerian brand using artisanal fabrics and fluid silhouettes' },
        { name: 'Post-Imperial', affinityScore: 0.87, reason: 'Artisanal menswear dyed in Osogbo using traditional Adire hand-dyeing techniques' }
      ],
      dining: [
        { name: 'Suya Master Skewers & Yaji Rub', affinityScore: 0.98, reason: 'Authentic slow-smoked beef tenderloin coated with roasted peanut spice' },
        { name: 'Smoky Firewood Jollof Platter', affinityScore: 0.96, reason: 'Iconic tomato-pepper reduction cooked down over wood embers' },
        { name: 'Zobo Artisanal Hibiscus Brew', affinityScore: 0.91, reason: 'Cold-pressed hibiscus infused with fresh cloves, ginger, and sweet orange' },
        { name: 'Spicy Catfish Pepper Soup Broth', affinityScore: 0.90, reason: 'Deep herbal broth scented with calabash nutmeg and uda pods' }
      ],
      consumer_products: [
        { name: 'Oraimo Audio / Boom Acoustics', affinityScore: 0.91, reason: 'Deep bass profile customized for Afrobeats and high-tempo street sounds' },
        { name: 'Cast Brass & Cowrie Ornaments', affinityScore: 0.88, reason: 'Modernist tactile jewelry inspired by ancient Benin and Yoruba craftsmanship' },
        { name: 'Smoked Chili & Shea Beard / Body Oils', affinityScore: 0.85, reason: 'Earthy, aromatic botanicals sourced from Northern Nigerian savannahs' }
      ],
      lifestyle: [
        { name: 'Lagos Night Market Social Hubs', affinityScore: 0.95, reason: 'Open-air gatherings combining live DJs, grilled street foods, and creative pop-ups' },
        { name: 'Afro-Futurist Art & Vinyl Collectibles', affinityScore: 0.90, reason: 'Curated aesthetic celebrating modern African graphic design and sonic history' }
      ]
    },
    aesthetics: [
      { name: 'Afro-Contemporary Street Luxury', affinityScore: 0.97 },
      { name: 'Warm Ember & Ochre Palette', affinityScore: 0.93 },
      { name: 'Vibrant Polyrhythmic Flow', affinityScore: 0.91 }
    ]
  },

  spicy_street_foods: {
    matchKeywords: [
      'spicy', 'street food', 'chili', 'hot pepper', 'tacos', 'birria', 'sichuan',
      'wings', 'hot sauce', 'jalapeno', 'habanero', 'skewers', 'bbq', 'crispy chili'
    ],
    entities: [
      { id: 'ent_qloo_sp_skewers_11', name: 'Charcoal Street Skewers with Chili Glaze', category: 'dining', subtype: 'street_grill', score: 0.96 },
      { id: 'ent_qloo_sp_chilicrisp_12', name: 'Crunchy Sichuan Garlic Chili Crisp', category: 'dining', subtype: 'condiment', score: 0.94 },
      { id: 'ent_qloo_sp_birria_13', name: 'Crispy Slow-Braised Birria Tacos & Consommé', category: 'dining', subtype: 'mexican_street', score: 0.93 },
      { id: 'ent_qloo_sp_hotwings_14', name: 'Nashville Ghost Pepper Hot Chicken', category: 'dining', subtype: 'comfort_spicy', score: 0.90 }
    ],
    affinities: [
      { attribute: 'Intense Scoville Heat & Umami Depth', score: 0.96, domain: 'dining' },
      { attribute: 'Caramelized Woodsmoke Char', score: 0.94, domain: 'dining' },
      { attribute: 'Late-Night Food Pop-Up Scene', score: 0.91, domain: 'lifestyle' },
      { attribute: 'Tactile, Hands-On Street Dining', score: 0.89, domain: 'dining' }
    ],
    keywords: [
      'chili crisp crunch', 'woodfire char', 'ghost pepper heat', 'habanero zing',
      'late night pop-up', 'street grill skewers', 'umami bomb'
    ],
    tasteSummary: 'High Scoville passion leaning into bold chili crisp, caramelized charcoal smoke, savory umami depth, and spontaneous late-night street food culture.',
    crossDomain: {
      fashion: [
        { name: 'Corteiz Rules The World', affinityScore: 0.92, reason: 'Raw, unapologetic London guerrilla streetwear with an electric underground following' },
        { name: 'Carhartt WIP', affinityScore: 0.90, reason: 'Durable, heavy-duty utility gear suited for busy night street markets and cooks' },
        { name: 'Neighborhood Tokyo', affinityScore: 0.88, reason: 'Motorcycle and workwear roots with distressed graphic edge' }
      ],
      dining: [
        { name: 'Fly By Jing Artisanal Sichuan Crisps', affinityScore: 0.96, reason: 'Tribute 17-ingredient chili crisp with Gongjiao tribute peppers' },
        { name: 'Smoky Suya Pepper Wings', affinityScore: 0.94, reason: 'Crispy fried wings tossed in roasted ground peanut pepper dust' },
        { name: 'Charred Jalapeño & Lime Glazed Brisket', affinityScore: 0.89, reason: 'Mesquite-smoked beef with sharp citrus-heat finish' }
      ],
      consumer_products: [
        { name: 'Truff Hot Sauces & Black Truffle Oils', affinityScore: 0.91, reason: 'Gourmet spicy pantry luxury combining habanero heat with earthy decadence' },
        { name: 'Lodge Cast Iron Grill Pans', affinityScore: 0.88, reason: 'High-heat searing essentials for indoor street-style charred crusts' }
      ],
      lifestyle: [
        { name: 'Midnight Street Food Pop-ups', affinityScore: 0.94, reason: 'Energetic, smoke-filled culinary stalls with curated music playlists' },
        { name: 'Spicy Challenge Tastings & Supper Clubs', affinityScore: 0.87, reason: 'Experiential dining centered on Scoville exploration' }
      ]
    },
    aesthetics: [
      { name: 'Raw Urban Utilitarianism', affinityScore: 0.94 },
      { name: 'Crimson Ember & Charred Black', affinityScore: 0.92 },
      { name: 'Fast-Paced Night Market Aesthetics', affinityScore: 0.89 }
    ]
  },

  streetwear_urban: {
    matchKeywords: [
      'streetwear', 'sneakers', 'hoodie', 'urban', 'hype', 'supreme', 'stussy',
      'fear of god', 'apparel', 'drip', 'oversized', 'kicks', 'cargo', 'vintage tee'
    ],
    entities: [
      { id: 'ent_qloo_sw_hoodie_21', name: 'Heavyweight Boxy Drop-Shoulder Hoodie', category: 'fashion', subtype: 'apparel', score: 0.97 },
      { id: 'ent_qloo_sw_sneakers_22', name: 'Retro Tech Chunk Runners & Dunks', category: 'fashion', subtype: 'footwear', score: 0.95 },
      { id: 'ent_qloo_sw_cargo_23', name: 'Multi-Pocket Technical Ripstop Cargos', category: 'fashion', subtype: 'utility', score: 0.92 },
      { id: 'ent_qloo_sw_cap_24', name: 'Vintage Washed Curved Brim Cap', category: 'fashion', subtype: 'headwear', score: 0.89 }
    ],
    affinities: [
      { attribute: 'Heavyweight Organic Cotton (450+ GSM)', score: 0.96, domain: 'fashion' },
      { attribute: 'Relaxed Oversized Drape', score: 0.95, domain: 'fashion' },
      { attribute: 'High-Low Street Luxury Curation', score: 0.92, domain: 'lifestyle' },
      { attribute: 'Limited Edition Drop Sensibility', score: 0.90, domain: 'consumer_products' }
    ],
    keywords: [
      'oversized boxy fit', 'heavyweight cotton', 'retro runners', 'high-low luxury',
      'washed vintage drape', 'technical utility cargo', 'minimalist typography'
    ],
    tasteSummary: 'Curated modern streetwear taste celebrating architectural oversized silhouettes, heavy cotton textures, retro sneaker silhouettes, and clean urban edge.',
    crossDomain: {
      fashion: [
        { name: 'Fear of God Essentials', affinityScore: 0.95, reason: 'Refined neutral loungewear with immaculate drape and tonal branding' },
        { name: 'Ashluxe Paris-Lagos', affinityScore: 0.93, reason: 'High-octane African luxury streetwear with bold graphic silhouettes' },
        { name: 'Stüssy', affinityScore: 0.92, reason: 'Original Southern California streetwear pioneer with authentic counterculture DNA' },
        { name: 'Rhude', affinityScore: 0.89, reason: 'Vintage Americana mixed with nostalgic luxury detailing' }
      ],
      dining: [
        { name: 'Artisanal Third-Wave Espresso Bars', affinityScore: 0.93, reason: 'Minimalist industrial coffee shops doubling as creative community spaces' },
        { name: 'Gourmet Smash Burgers & Natural Wine', affinityScore: 0.91, reason: 'Casual yet intensely focused foodie spots popular in streetwear districts' },
        { name: 'Matcha Tonic & Cold Brew Bars', affinityScore: 0.88, reason: 'Clean aesthetic cafe drinks favoring visual clarity and craft' }
      ],
      consumer_products: [
        { name: 'Teenage Engineering OP-1 & Field Speakers', affinityScore: 0.94, reason: 'Design-forward portable synths and speakers revered by creative stylists' },
        { name: 'Salomon XT-6 & Gor-Tex Gear', affinityScore: 0.91, reason: 'Outdoor technical performance shoes seamlessly adapted to metropolitan streets' }
      ],
      lifestyle: [
        { name: 'Creative Studio & Skate Gallery Spaces', affinityScore: 0.92, reason: 'Industrial loft setups with contemporary art books and vinyl turntables' },
        { name: 'Limited Sneaker Pop-Up Launch Events', affinityScore: 0.89, reason: 'Community gatherings around product debuts and creator talks' }
      ]
    },
    aesthetics: [
      { name: 'Monochrome Urban Brutalism', affinityScore: 0.96 },
      { name: 'Tonal Washed Earth Tones (Bone, Clay, Slate)', affinityScore: 0.93 },
      { name: 'Clean Graphic Typography', affinityScore: 0.91 }
    ]
  },

  minimalist_tech: {
    matchKeywords: [
      'minimalist', 'tech', 'apple', 'clean', 'gadgets', 'workspace', 'ergonomic',
      'modern', 'nordic', 'japanese', 'dieter rams', 'desk setup', 'mechanical keyboard'
    ],
    entities: [
      { id: 'ent_qloo_mt_desk_31', name: 'Solid Walnut & Matte Black Ergonomic Desk', category: 'lifestyle', subtype: 'workspace', score: 0.97 },
      { id: 'ent_qloo_mt_audio_32', name: 'Anodized Aluminum Wireless Audio Monitor', category: 'tech', subtype: 'audio', score: 0.96 },
      { id: 'ent_qloo_mt_keyboard_33', name: 'Low-Profile Aluminum Mechanical Keyboard', category: 'tech', subtype: 'peripherals', score: 0.94 },
      { id: 'ent_qloo_mt_lamp_34', name: 'Precision LED Counterbalance Task Light', category: 'lifestyle', subtype: 'lighting', score: 0.91 }
    ],
    affinities: [
      { attribute: 'Matte Anodized Aluminum & Natural Hardwood', score: 0.97, domain: 'consumer_products' },
      { attribute: 'Clutter-Free Visual Zen', score: 0.95, domain: 'lifestyle' },
      { attribute: 'Tactile Mechanical Haptics', score: 0.92, domain: 'tech' },
      { attribute: 'Timeless Dieter Rams Functionalism', score: 0.94, domain: 'design' }
    ],
    keywords: [
      'matte black', 'anodized aluminum', 'functional minimalism', 'dieter rams aesthetic',
      'clean desk setup', 'tactile mechanical feedback', 'cable-free layout'
    ],
    tasteSummary: 'Disciplined modernist aesthetic focused on tactile precision, anodized materials, clean cable-free ergonomics, and high-craft functionality.',
    crossDomain: {
      fashion: [
        { name: 'COS Atelier', affinityScore: 0.94, reason: 'Architectural cuts, structured wools, and neutral palettes' },
        { name: 'Issey Miyake Homme Plissé', affinityScore: 0.92, reason: 'Geometric garment pleating celebrating form, motion, and industrial textile engineering' },
        { name: 'Uniqlo U by Christophe Lemaire', affinityScore: 0.89, reason: 'Democratized perfection in everyday functional minimalism' }
      ],
      dining: [
        { name: 'Ceremonial Matcha & Single-Origin Pourover', affinityScore: 0.95, reason: 'Disciplined ritual brewing honoring clean water and terroir' },
        { name: 'Tokyo-Style Counter Omakase', affinityScore: 0.93, reason: 'Hyper-focused culinary precision where every single ingredient has purpose' },
        { name: 'Scandinavian Sourdough Bakeries', affinityScore: 0.90, reason: 'Simple grains, long fermentation, and unadorned perfection' }
      ],
      consumer_products: [
        { name: 'Teenage Engineering Synthesizers', affinityScore: 0.96, reason: 'Playful yet surgically minimal Swedish electronic instruments' },
        { name: 'Keychron Q-Series Mechanical Boards', affinityScore: 0.93, reason: 'Solid CNC aluminum cases with custom lubed switches' },
        { name: 'Aesop Aromatic Room Sprays & Soaps', affinityScore: 0.91, reason: 'Understated amber apothecary bottles with botanical cedar formulations' }
      ],
      lifestyle: [
        { name: 'Mindful Desk Organization & Productivity', affinityScore: 0.96, reason: 'Intentional environments designed for deep work flow states' },
        { name: 'Ambient Soundscapes & Modular Synthesis', affinityScore: 0.90, reason: 'Restorative audio backgrounds for quiet focus' }
      ]
    },
    aesthetics: [
      { name: 'Japandi Modernist Zen', affinityScore: 0.97 },
      { name: 'Satin Slate & Monolithic Aluminum', affinityScore: 0.94 },
      { name: 'Geometric Reductionism', affinityScore: 0.92 }
    ]
  },

  comfort_dining: {
    matchKeywords: [
      'comfort', 'soul food', 'cozy', 'pasta', 'stew', 'bakery', 'roast',
      'homestyle', 'brunch', 'pie', 'grandma', 'hearty', 'braised', 'yam porridge'
    ],
    entities: [
      { id: 'ent_qloo_cd_braised_41', name: 'Slow-Braised Short Ribs in Rich Red Wine Glaze', category: 'dining', subtype: 'comfort_classic', score: 0.97 },
      { id: 'ent_qloo_cd_yam_42', name: 'Slow-Cooked Yam Porridge (Asaro) with Smoked Fish', category: 'dining', subtype: 'west_african_comfort', score: 0.95 },
      { id: 'ent_qloo_cd_sourdough_43', name: 'Warm Crusty Sourdough Boule with Cultured Butter', category: 'dining', subtype: 'bakery', score: 0.94 },
      { id: 'ent_qloo_cd_pasta_44', name: 'Handmade Pappardelle with 8-Hour Wild Boar Ragù', category: 'dining', subtype: 'italian_comfort', score: 0.92 }
    ],
    affinities: [
      { attribute: 'Rich Collagen & Slow-Simmered Broth', score: 0.96, domain: 'dining' },
      { attribute: 'Nostalgic Hearth & Oven Aromas', score: 0.95, domain: 'lifestyle' },
      { attribute: 'Warm Earth Tones & Cozy Tactility', score: 0.92, domain: 'lifestyle' },
      { attribute: 'Unhurried Multi-Hour Table Feasts', score: 0.93, domain: 'dining' }
    ],
    keywords: [
      'slow simmered', 'hearth warmth', 'melt-in-mouth tender', 'cultured butter',
      'nostalgic comfort', 'crusty bread', 'rich marrow broth'
    ],
    tasteSummary: 'Deep comfort affinity rooted in multi-hour braises, comforting savory starches, warm oven aromas, and welcoming fireside hospitality.',
    crossDomain: {
      fashion: [
        { name: 'Aimé Leon Dore', affinityScore: 0.94, reason: 'Nostalgic Queens-meets-Mediterranean warmth, plush cable knits, and cafe culture' },
        { name: 'Margaret Howell / Toast', affinityScore: 0.90, reason: 'Tactile natural wools, brushed cotton corduroys, and timeless domestic ease' },
        { name: 'L.L.Bean Heritage Knits', affinityScore: 0.86, reason: 'Durable, cozy cold-weather layers built for lakeside fires' }
      ],
      dining: [
        { name: 'Heritage Cast Iron Braises', affinityScore: 0.96, reason: 'Caramelized mirepoix and root vegetables softened over gentle heat' },
        { name: 'Asaro Yam Porridge with Prawns', affinityScore: 0.94, reason: 'Velvety palm-oil infused Nigerian mashed yam with dried seafood depth' },
        { name: 'Wood-Fired Truffle Mac & Cheese', affinityScore: 0.91, reason: 'Aged sharp cheddar and gruyere with blistered golden crust' }
      ],
      consumer_products: [
        { name: 'Le Creuset Enameled Cast Iron Dutch Oven', affinityScore: 0.96, reason: 'Iconic kitchen vessel for generational stews and sourdough breads' },
        { name: 'Diptyque Feu de Bois Candle', affinityScore: 0.92, reason: 'Smoky birch and hearthwood fragrance evoking crackling fireplaces' },
        { name: 'Linen Table Runners & Stoneware Plates', affinityScore: 0.89, reason: 'Organic tactile tableware elevating casual Sunday lunches' }
      ],
      lifestyle: [
        { name: 'Sunday Afternoon Hearth Feasts', affinityScore: 0.95, reason: 'Long, leisurely meals with friends surrounded by candlelight' },
        { name: 'Cozy Reading Nooks & Wool Blankets', affinityScore: 0.91, reason: 'Restorative home spaces centered around warmth and comfort' }
      ]
    },
    aesthetics: [
      { name: 'Rustic Hearth Warmth', affinityScore: 0.96 },
      { name: 'Earthy Terracotta & Honeyed Tones', affinityScore: 0.93 },
      { name: 'Generational Craft Nostalgia', affinityScore: 0.90 }
    ]
  }
};

/**
 * Normalizes input domain strings to standard Qloo domain categories
 */
function normalizeDomain(domain = '') {
  const d = String(domain || '').toLowerCase().trim();
  if (['food', 'dining', 'restaurant', 'eats', 'culinary', 'cuisine'].includes(d)) return 'dining';
  if (['fashion', 'clothing', 'apparel', 'style', 'streetwear', 'wear'].includes(d)) return 'fashion';
  if (['tech', 'technology', 'gadgets', 'electronics', 'hardware', 'consumer_products', 'products'].includes(d)) return 'consumer_products';
  if (['lifestyle', 'living', 'home', 'decor', 'experience'].includes(d)) return 'lifestyle';
  if (['music', 'sound', 'audio'].includes(d)) return 'music';
  return d || 'lifestyle';
}

/**
 * Qloo Cultural AI Agent Tool
 * Resilient connector supporting live Qloo API v2 with sub-second TTL caching
 * and rich deterministic cultural fallback vectors.
 */
class QlooAgentTool {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.QLOO_API_KEY || null;
    this.baseUrl = (options.baseUrl || process.env.QLOO_API_BASE_URL || 'https://api.qloo.com/v2').replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs || 2500; // Fast timeout for agent responsiveness
    this.cache = options.cache || new MemoryCache();
    this.isLiveConfigured = Boolean(this.apiKey && this.apiKey.trim().length > 5);

    logger.info(`[QlooAgentTool] Initialized. Live API enabled: ${this.isLiveConfigured}`);
  }

  /**
   * Helper to perform HTTP calls to Qloo API with timeout & error handling
   */
  async _callQlooApi(endpoint, params = {}, method = 'GET') {
    if (!this.isLiveConfigured) {
      return null;
    }

    const url = `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    try {
      const response = await axios({
        url,
        method,
        params: method === 'GET' ? params : undefined,
        data: method === 'POST' ? params : undefined,
        headers: {
          'x-api-key': this.apiKey,
          'Accept': 'application/json'
        },
        timeout: this.timeoutMs
      });
      return response.data;
    } catch (err) {
      logger.warn(`[QlooAgentTool] Live API error on ${endpoint}: ${err.message}. Seamlessly falling back to cultural vector.`);
      return null;
    }
  }

  /**
   * Resolve best cultural cluster from input signals
   */
  _matchFallbackCluster({ query = '', category = '', seedEntities = [], userTastes = [] }) {
    const combinedTokens = [
      query,
      category,
      ...(Array.isArray(seedEntities) ? seedEntities.map(e => (typeof e === 'string' ? e : e?.name || '')) : []),
      ...(Array.isArray(userTastes) ? userTastes.map(t => (typeof t === 'string' ? t : t?.name || '')) : [])
    ].join(' ').toLowerCase();

    let bestClusterKey = 'nigerian_african';
    let highestScore = 0;

    for (const [clusterKey, clusterData] of Object.entries(CULTURAL_KNOWLEDGE_BASE)) {
      let score = 0;
      for (const kw of clusterData.matchKeywords) {
        if (combinedTokens.includes(kw)) {
          score += kw.length > 5 ? 2 : 1;
        }
      }
      if (score > highestScore) {
        highestScore = score;
        bestClusterKey = clusterKey;
      }
    }

    // Default to nigerian_african or streetwear if weak match
    return {
      clusterKey: bestClusterKey,
      matchedScore: highestScore,
      cluster: CULTURAL_KNOWLEDGE_BASE[bestClusterKey]
    };
  }

  /**
   * Resolve cultural queries, artists, cuisines, or aesthetics into taste affinities & vectors
   * @param {Object} params
   * @param {string} [params.query] - User query (e.g. "authentic Nigerian suya", "clean desk setup")
   * @param {string} [params.category] - Cultural domain ('dining', 'fashion', 'music', 'lifestyle')
   * @param {Array<string|Object>} [params.seedEntities] - Seed entity names or IDs
   * @param {Array<string|Object>} [params.userTastes] - User historical preferences
   * @returns {Promise<{ entities: Array, affinities: Array, keywords: Array, tasteSummary: string, confidence: number, source: string }>}
   */
  async resolveTasteAffinities({ query = '', category = '', seedEntities = [], userTastes = [] } = {}) {
    const cacheKey = `affinities:${(query || '').trim().toLowerCase()}:${(category || '').trim().toLowerCase()}:${JSON.stringify(seedEntities)}:${JSON.stringify(userTastes)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return { ...cached, fromCache: true };
    }

    const normCategory = normalizeDomain(category);
    let liveResult = null;

    // 1. Try Live Qloo API if configured
    if (this.isLiveConfigured && (query || seedEntities.length > 0)) {
      try {
        const liveSearch = await this._callQlooApi('/search', {
          query: query || (seedEntities[0]?.name || seedEntities[0] || ''),
          type: normCategory,
          limit: 5
        });

        if (liveSearch && (Array.isArray(liveSearch.results) || Array.isArray(liveSearch.entities))) {
          const rawList = liveSearch.results || liveSearch.entities || [];
          if (rawList.length > 0) {
            const entities = rawList.map((item, idx) => ({
              id: item.id || `ent_live_${idx}`,
              name: item.name || item.title || query,
              category: item.type || normCategory,
              score: item.score || 0.95 - (idx * 0.05),
              subtype: item.subtype || item.genre || 'general'
            }));

            // Extract affinities from live response or correlations
            const primaryId = entities[0]?.id;
            let liveInsights = null;
            if (primaryId) {
              liveInsights = await this._callQlooApi('/insights', { entity_id: primaryId });
            }

            const affinities = (liveInsights?.affinities || []).map(a => ({
              attribute: a.name || a.tag || 'Cultural Affinity',
              score: a.score || 0.88,
              domain: a.domain || normCategory
            }));

            liveResult = {
              entities,
              affinities: affinities.length > 0 ? affinities : [
                { attribute: `${entities[0].name} Aesthetic Resonance`, score: 0.93, domain: normCategory }
              ],
              keywords: entities.map(e => e.name.toLowerCase()),
              tasteSummary: `Live Qloo taste vector for "${query}": strong correlation in ${normCategory} with verified entity affinity.`,
              confidence: 0.95,
              source: 'qloo_live'
            };
          }
        }
      } catch (err) {
        logger.debug(`[QlooAgentTool] Fallback triggered during live affinity resolution: ${err.message}`);
      }
    }

    // 2. If live API didn't return or isn't enabled, use rich deterministic fallback
    if (!liveResult) {
      const { clusterKey, cluster } = this._matchFallbackCluster({ query, category, seedEntities, userTastes });

      // Customize entities with the user query if present
      const customizedEntities = [...cluster.entities];
      if (query && query.trim().length > 1) {
        customizedEntities.unshift({
          id: `ent_qloo_custom_${clusterKey}_${Date.now().toString(36)}`,
          name: query.trim(),
          category: normCategory || cluster.entities[0].category,
          subtype: 'user_interest',
          score: 0.99
        });
      }

      liveResult = {
        entities: customizedEntities.slice(0, 5),
        affinities: cluster.affinities,
        keywords: cluster.keywords,
        tasteSummary: cluster.tasteSummary,
        confidence: 0.92,
        source: 'qloo_fallback',
        cluster: clusterKey
      };
    }

    this.cache.set(cacheKey, liveResult);
    return liveResult;
  }

  /**
   * Cross-Domain Cultural Picks: correlated brands, aesthetics & product themes
   * Maps tastes from one domain (e.g. food/music) to another (e.g. fashion/products/lifestyle)
   * @param {Object} params
   * @param {Array<string|Object>} [params.seedEntities] - Seed cultural entities (e.g. ['Suya', 'Afrobeats'])
   * @param {string} [params.targetDomain] - Target domain ('fashion', 'dining', 'consumer_products', 'lifestyle')
   * @returns {Promise<{ targetDomain: string, seedEntities: Array, brands: Array, aesthetics: Array, culturalContext: string, confidence: number, source: string }>}
   */
  async getCrossDomainPicks({ seedEntities = [], targetDomain = 'fashion' } = {}) {
    const normTarget = normalizeDomain(targetDomain);
    const seedNames = (seedEntities || []).map(e => (typeof e === 'string' ? e : e?.name || '')).filter(Boolean);
    const cacheKey = `crossdomain:${seedNames.sort().join('|')}:${normTarget}`;

    const cached = this.cache.get(cacheKey);
    if (cached) {
      return { ...cached, fromCache: true };
    }

    let livePicks = null;

    // 1. Try Live Qloo API correlations if available
    if (this.isLiveConfigured && seedNames.length > 0) {
      try {
        const liveCorrelations = await this._callQlooApi('/correlations', {
          seed: seedNames[0],
          target_domain: normTarget,
          limit: 5
        });

        if (liveCorrelations && Array.isArray(liveCorrelations.correlations) && liveCorrelations.correlations.length > 0) {
          const brands = liveCorrelations.correlations.map(c => ({
            name: c.name || c.title,
            affinityScore: c.score || 0.90,
            reason: c.rationale || `Strong cross-domain affinity from ${seedNames[0]} to ${normTarget}`
          }));

          livePicks = {
            targetDomain: normTarget,
            seedEntities: seedNames,
            brands,
            aesthetics: (liveCorrelations.aesthetics || []).map(a => ({
              name: a.name || a.tag,
              affinityScore: a.score || 0.88
            })),
            culturalContext: `Live cross-domain affinity mapped from ${seedNames.join(', ')} into ${normTarget}.`,
            confidence: 0.94,
            source: 'qloo_live'
          };
        }
      } catch (err) {
        logger.debug(`[QlooAgentTool] Fallback triggered during cross-domain query: ${err.message}`);
      }
    }

    // 2. High-fidelity Deterministic Fallback Vector
    if (!livePicks) {
      const { clusterKey, cluster } = this._matchFallbackCluster({
        query: seedNames.join(' '),
        seedEntities: seedNames
      });

      const domainMap = cluster.crossDomain || {};
      const brandsForDomain = domainMap[normTarget] || domainMap.fashion || domainMap.lifestyle || [];
      const aestheticsList = cluster.aesthetics || [
        { name: 'Afro-Contemporary Street Culture', affinityScore: 0.95 },
        { name: 'Warm Charcoal & Earth Palette', affinityScore: 0.90 }
      ];

      livePicks = {
        targetDomain: normTarget,
        seedEntities: seedNames.length > 0 ? seedNames : [cluster.entities[0].name],
        brands: brandsForDomain,
        aesthetics: aestheticsList,
        culturalContext: `Curated ${normTarget} affinity for ${clusterKey.replace(/_/g, ' ')} culture: ${cluster.tasteSummary}`,
        confidence: 0.91,
        source: 'qloo_fallback',
        cluster: clusterKey
      };
    }

    this.cache.set(cacheKey, livePicks);
    return livePicks;
  }

  /**
   * Direct entity search
   */
  async searchEntities({ query = '', category = '', limit = 5 } = {}) {
    const res = await this.resolveTasteAffinities({ query, category });
    return (res.entities || []).slice(0, limit);
  }

  /**
   * Direct insights query
   */
  async getEntityInsights({ entityIds = [], category = '' } = {}) {
    const ids = Array.isArray(entityIds) ? entityIds : [entityIds];
    return this.resolveTasteAffinities({
      query: ids[0] || '',
      category,
      seedEntities: ids
    });
  }

  /**
   * Direct correlations query
   */
  async getCorrelations({ entityId = '', targetDomain = 'fashion', limit = 5 } = {}) {
    const res = await this.getCrossDomainPicks({
      seedEntities: [entityId],
      targetDomain
    });
    return {
      entityId,
      targetDomain: res.targetDomain,
      brands: (res.brands || []).slice(0, limit),
      aesthetics: (res.aesthetics || []).slice(0, limit),
      source: res.source
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache performance metrics
   */
  getCacheStats() {
    return this.cache.getStats();
  }
}

// Singleton default instance
const defaultInstance = new QlooAgentTool();

// Bind methods to singleton instance so destructuring works seamlessly
const boundResolveTasteAffinities = defaultInstance.resolveTasteAffinities.bind(defaultInstance);
const boundGetCrossDomainPicks = defaultInstance.getCrossDomainPicks.bind(defaultInstance);
const boundSearchEntities = defaultInstance.searchEntities.bind(defaultInstance);
const boundGetEntityInsights = defaultInstance.getEntityInsights.bind(defaultInstance);
const boundGetCorrelations = defaultInstance.getCorrelations.bind(defaultInstance);
const boundClearCache = defaultInstance.clearCache.bind(defaultInstance);
const boundGetCacheStats = defaultInstance.getCacheStats.bind(defaultInstance);

defaultInstance.resolveTasteAffinities = boundResolveTasteAffinities;
defaultInstance.getCrossDomainPicks = boundGetCrossDomainPicks;
defaultInstance.searchEntities = boundSearchEntities;
defaultInstance.getEntityInsights = boundGetEntityInsights;
defaultInstance.getCorrelations = boundGetCorrelations;
defaultInstance.clearCache = boundClearCache;
defaultInstance.getCacheStats = boundGetCacheStats;

defaultInstance.QlooAgentTool = QlooAgentTool;
defaultInstance.MemoryCache = MemoryCache;
defaultInstance.CULTURAL_KNOWLEDGE_BASE = CULTURAL_KNOWLEDGE_BASE;

// Export default instance with named attachments
module.exports = defaultInstance;

