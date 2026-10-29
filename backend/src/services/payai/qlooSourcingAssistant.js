'use strict';

const prisma = require('../../utils/prismaClient');
const logger = require('../../utils/logger');
const qlooAgentTool = require('./qlooAgentTool');

/**
 * Qloo Sourcing Assistant
 * Powers the proactive "Qloo AI" pop-up that appears when a shopper is struggling to find
 * an ingredient, a building/electrical material, or any hard-to-find item.
 *
 * Pipeline: understand the item (aliases + regional names) -> propose verified substitutes
 * -> ask Qloo for taste/lifestyle affinities -> match everything against the REAL catalogue.
 * Qloo supplies taste intelligence only; products, prices and stock always come from our DB.
 */

// Curated sourcing knowledge. `aliases` are matched against the shopper's query.
const SOURCING_KNOWLEDGE = [
  // ── Ingredients ──────────────────────────────────────────────────────────
  {
    id: 'ugu', domain: 'ingredient', label: 'Ugu (fluted pumpkin leaves)',
    aliases: ['ugu', 'fluted pumpkin', 'pumpkin leaf', 'pumpkin leaves'],
    substitutes: [
      { term: 'spinach', note: 'Closest in texture and cooking time; use the same quantity.' },
      { term: 'kale', note: 'Sturdier leaf, add 3-4 minutes of cooking time.' },
      { term: 'efo', note: 'Another West African leafy vegetable that works in the same soups.' }
    ]
  },
  {
    id: 'egusi', domain: 'ingredient', label: 'Egusi (melon seeds)',
    aliases: ['egusi', 'melon seed', 'melon seeds'],
    substitutes: [
      { term: 'pumpkin seeds', note: 'Ground pumpkin seeds give a similar nutty thickness.' },
      { term: 'ground almond', note: 'Milder, but thickens the soup the same way.' }
    ]
  },
  {
    id: 'ogbono', domain: 'ingredient', label: 'Ogbono (wild mango seed)',
    aliases: ['ogbono', 'ogbonno', 'wild mango'],
    substitutes: [
      { term: 'okra', note: 'Gives the same "draw" texture in soups.' },
      { term: 'chia seeds', note: 'Ground chia thickens with a similar slippery body.' }
    ]
  },
  {
    id: 'iru', domain: 'ingredient', label: 'Iru / Locust beans (dawadawa)',
    aliases: ['iru', 'locust bean', 'dawadawa', 'ogiri'],
    substitutes: [
      { term: 'miso', note: 'Fermented umami depth, use about half the amount.' },
      { term: 'stock cube', note: 'Quick savory boost when fermented beans are unavailable.' }
    ]
  },
  {
    id: 'crayfish', domain: 'ingredient', label: 'Ground crayfish',
    aliases: ['crayfish', 'cray fish', 'dried shrimp'],
    substitutes: [
      { term: 'dried shrimp', note: 'Blend it to a powder for the same seafood umami.' },
      { term: 'fish sauce', note: 'A few drops replace the briny depth.' }
    ]
  },
  {
    id: 'suya_spice', domain: 'ingredient', label: 'Suya / Yaji spice',
    aliases: ['yaji', 'suya spice', 'suya pepper', 'suya'],
    substitutes: [
      { term: 'groundnut powder', note: 'The nutty base of yaji.' },
      { term: 'cayenne pepper', note: 'Heat component; blend with ginger and paprika.' },
      { term: 'paprika', note: 'Smoky color and sweetness.' }
    ]
  },
  {
    id: 'scotch_bonnet', domain: 'ingredient', label: 'Scotch bonnet pepper',
    aliases: ['scotch bonnet', 'ata rodo', 'habanero'],
    substitutes: [
      { term: 'habanero', note: 'Same species family, near identical heat and fruitiness.' },
      { term: 'cayenne pepper', note: 'Dry heat, lacks the fruity note.' }
    ]
  },
  {
    id: 'buttermilk', domain: 'ingredient', label: 'Buttermilk',
    aliases: ['buttermilk'],
    substitutes: [
      { term: 'yoghurt', note: 'Thin with a little milk, 1:1.' },
      { term: 'lemon juice', note: 'Add a tablespoon to a cup of milk and rest 5 minutes.' }
    ]
  },
  {
    id: 'baking_powder', domain: 'ingredient', label: 'Baking powder',
    aliases: ['baking powder'],
    substitutes: [
      { term: 'baking soda', note: 'Use a third of the amount and add an acid such as lemon.' },
      { term: 'self raising flour', note: 'Swap in for plain flour and skip the powder.' }
    ]
  },

  // ── Electrical & lighting ────────────────────────────────────────────────
  {
    id: 'led_strip', domain: 'material', label: 'LED strip / cove lighting',
    aliases: ['led strip', 'cove light', 'cove lighting', 'strip light', 'rope light'],
    substitutes: [
      { term: 'led tape', note: 'Same product, often listed under this name.' },
      { term: 'linear light', note: 'Rigid channel version for cleaner lines.' },
      { term: 'led driver', note: 'You will also need a matching constant-voltage driver.' }
    ]
  },
  {
    id: 'dimmer', domain: 'material', label: 'Dimmer switch',
    aliases: ['dimmer', 'dimming switch', 'dim switch'],
    substitutes: [
      { term: 'smart switch', note: 'App-controlled dimming with scenes.' },
      { term: 'led dimmer', note: 'Pick an LED-rated dimmer to avoid flicker.' }
    ]
  },
  {
    id: 'cable', domain: 'material', label: 'Electrical cable / wire',
    aliases: ['cable', 'wire', 'copper wire', '2.5mm', '1.5mm', '4mm', '6mm', 'wiring'],
    substitutes: [
      { term: 'copper cable', note: 'Prefer copper conductors for household circuits.' },
      { term: 'flexible cable', note: 'Easier to pull through conduit.' },
      { term: 'conduit', note: 'Protective tubing, usually needed with the cable.' }
    ]
  },
  {
    id: 'breaker', domain: 'material', label: 'Circuit breaker / fuse',
    aliases: ['breaker', 'circuit breaker', 'mcb', 'fuse', 'distribution board', 'db box'],
    substitutes: [
      { term: 'mcb', note: 'Miniature circuit breaker, the modern fuse replacement.' },
      { term: 'distribution board', note: 'Houses the breakers for the whole circuit.' }
    ]
  },
  {
    id: 'bulb', domain: 'material', label: 'Light bulbs',
    aliases: ['bulb', 'lamp', 'downlight', 'spotlight', 'pendant'],
    substitutes: [
      { term: 'led bulb', note: 'Longer life and much lower power draw.' },
      { term: 'warm white', note: 'Look for 2700K for a cosy mood.' }
    ]
  },

  // ── Building & hardware ──────────────────────────────────────────────────
  {
    id: 'cement', domain: 'material', label: 'Cement & masonry',
    aliases: ['cement', 'mortar', 'concrete', 'plaster'],
    substitutes: [
      { term: 'ready mix', note: 'Pre-blended mortar saves mixing time.' },
      { term: 'tile adhesive', note: 'Better than cement for tiling jobs.' }
    ]
  },
  {
    id: 'paint', domain: 'material', label: 'Paint & finishes',
    aliases: ['paint', 'emulsion', 'primer', 'varnish'],
    substitutes: [
      { term: 'emulsion', note: 'Standard interior wall paint.' },
      { term: 'primer', note: 'Apply first for even colour on new surfaces.' }
    ]
  },
  {
    id: 'pipe', domain: 'material', label: 'Plumbing pipes & fittings',
    aliases: ['pipe', 'pvc', 'plumbing', 'tap', 'faucet', 'fitting'],
    substitutes: [
      { term: 'pvc pipe', note: 'Cheap and widely compatible.' },
      { term: 'pipe fittings', note: 'Elbows, couplers and tees for the same run.' }
    ]
  }
];

// Phrases that signal a shopper is stuck, even before any zero-result search happens.
const HELP_PHRASES = [
  /where (can|do) i (find|get|buy)/i,
  /(can'?t|cannot|unable to|struggling to|hard to) find/i,
  /substitute for|replacement for|alternative (to|for)|instead of/i,
  /what (can|do) i use (for|instead)/i,
  /looking for|need help|help me find|i need/i
];

const STOP_WORDS = new Set([
  'where', 'can', 'do', 'i', 'find', 'get', 'buy', 'a', 'an', 'the', 'for', 'to', 'of', 'in', 'on', 'and', 'or',
  'some', 'any', 'my', 'me', 'is', 'are', 'what', 'use', 'instead', 'substitute', 'replacement', 'alternative',
  'looking', 'need', 'help', 'with', 'how', 'cant', 'cannot', 'unable', 'it', 'that', 'this', 'please'
]);

function tokenize(text = '') {
  return String(text).toLowerCase().replace(/[^a-z0-9.\s]/g, ' ').split(/\s+/).filter(Boolean);
}

function keywordsOf(text = '') {
  return tokenize(text).filter(t => t.length > 2 && !STOP_WORDS.has(t));
}

function detectHelpIntent(query = '') {
  return HELP_PHRASES.some(rx => rx.test(String(query)));
}

function matchKnowledge(query = '') {
  const q = ` ${String(query).toLowerCase()} `;
  const hits = [];
  for (const entry of SOURCING_KNOWLEDGE) {
    const hit = entry.aliases.find(a => q.includes(a.toLowerCase()));
    if (hit) hits.push(entry);
  }
  return hits;
}

function inferDomain(query, matches) {
  if (matches.length) return matches[0].domain;
  const tokens = keywordsOf(query);
  const materialHints = ['cable', 'wire', 'switch', 'led', 'light', 'cement', 'paint', 'pipe', 'tool', 'screw', 'socket', 'bulb'];
  if (tokens.some(t => materialHints.includes(t))) return 'material';
  return 'ingredient';
}

function resolveImage(product) {
  const first = product?.images?.[0];
  const url = typeof first === 'string' ? first : first?.url;
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `/uploads/${String(url).replace(/^\/?uploads\//, '')}`;
}

function shapeProduct(p) {
  return {
    id: p.id,
    title: p.title,
    price: Number(p.price || 0),
    category: p.category || null,
    imageUrl: resolveImage(p),
    storeName: p.store?.storeName || null
  };
}

async function findProducts(terms = [], { limit = 4, excludeIds = new Set() } = {}) {
  const cleanTerms = [...new Set(terms.map(t => String(t || '').trim()).filter(t => t.length > 2))].slice(0, 6);
  if (!cleanTerms.length) return [];
  try {
    const rows = await prisma.product.findMany({
      where: {
        isArchived: false,
        OR: cleanTerms.flatMap(term => ([
          { title: { contains: term } },
          { category: { contains: term } },
          { tags: { contains: term } }
        ]))
      },
      select: {
        id: true, title: true, price: true, category: true,
        images: { select: { url: true }, take: 1 },
        store: { select: { storeName: true } }
      },
      take: limit * 3
    });
    return rows.filter(r => !excludeIds.has(r.id)).slice(0, limit).map(shapeProduct);
  } catch (err) {
    logger.warn(`[QlooSourcing] Catalogue lookup failed: ${err.message}`);
    return [];
  }
}

function buildHeadline({ reason, label, domain }) {
  const noun = domain === 'material' ? 'materials' : 'ingredients';
  if (reason === 'zero_results') return `Can't find ${label}? Let me help.`;
  if (reason === 'repeat_search') return `Still hunting for ${label}? Let me help.`;
  if (reason === 'help_phrase') return `Need help sourcing ${noun}?`;
  return `Let me help you find ${label}.`;
}

/**
 * Main entry point used by the controller.
 */
async function assist({ query = '', reason = 'manual', resultCount = null, recentQueries = [] } = {}) {
  const cleanQuery = String(query || '').trim().slice(0, 160);
  if (cleanQuery.length < 2) {
    return { success: false, message: 'A search term is required.' };
  }

  const matches = matchKnowledge(cleanQuery);
  const domain = inferDomain(cleanQuery, matches);
  const primary = matches[0] || null;
  const label = primary?.label || cleanQuery;

  // 1. Direct catalogue matches for what they originally typed.
  const queryKeywords = keywordsOf(cleanQuery);
  const directProducts = await findProducts([cleanQuery, ...queryKeywords], { limit: 4 });
  const usedIds = new Set(directProducts.map(p => p.id));

  // 2. Substitutes: curated first, then keyword-derived fallbacks.
  const substituteSeeds = matches.flatMap(m => m.substitutes);
  const substitutes = [];
  for (const sub of substituteSeeds.slice(0, 5)) {
    const products = await findProducts([sub.term], { limit: 3, excludeIds: usedIds });
    products.forEach(p => usedIds.add(p.id));
    substitutes.push({ term: sub.term, note: sub.note, products });
  }

  // 3. Qloo taste/lifestyle layer (falls back to cultural vectors offline).
  let qloo = { source: 'fallback', summary: null, tags: [] };
  try {
    const taste = await qlooAgentTool.resolveTasteAffinities({
      query: cleanQuery,
      category: domain === 'material' ? 'lifestyle' : 'dining',
      userTastes: Array.isArray(recentQueries) ? recentQueries.slice(-4) : []
    });
    qloo = {
      source: taste?.source || (qlooAgentTool.isLiveConfigured ? 'live' : 'fallback'),
      summary: taste?.tasteSummary || null,
      tags: (taste?.keywords || []).slice(0, 4)
    };
  } catch (err) {
    logger.warn(`[QlooSourcing] Qloo layer skipped: ${err.message}`);
  }

  // 4. Related catalogue picks driven by Qloo keywords when nothing else matched.
  let relatedProducts = [];
  if (!directProducts.length && !substitutes.some(s => s.products.length)) {
    relatedProducts = await findProducts(qloo.tags, { limit: 4, excludeIds: usedIds });
  }

  const foundAnything = directProducts.length > 0
    || substitutes.some(s => s.products.length > 0)
    || relatedProducts.length > 0;

  const message = primary
    ? `${label} can be hard to track down. Here is what I found in the marketplace, plus trusted alternatives.`
    : `I couldn't find an exact match for "${cleanQuery}", so I checked related items and asked Qloo what shoppers with similar taste buy.`;

  return {
    success: true,
    needsHelp: true,
    reason,
    resultCount,
    domain,
    headline: buildHeadline({ reason, label, domain }),
    message,
    matchedItem: primary ? { id: primary.id, label: primary.label } : null,
    directProducts,
    substitutes,
    relatedProducts,
    qloo,
    foundAnything,
    followUps: [
      `Ask PayAI to source "${cleanQuery}" for me`,
      domain === 'material' ? 'Show me a full materials list for this job' : 'Plan a meal using these alternatives'
    ]
  };
}

module.exports = {
  assist,
  detectHelpIntent,
  matchKnowledge,
  keywordsOf,
  SOURCING_KNOWLEDGE
};
