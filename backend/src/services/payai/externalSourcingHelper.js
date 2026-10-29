'use strict';

/**
 * External Sourcing Helper
 * Provides verified marketplace links (Jumia, Konga, Amazon, AliExpress)
 * and anti-hallucination sourcing responses when an item is not found
 * in the local W-Commerce catalog.
 */

function buildExternalMarketplaceLinks(query, marketCode = 'NIGERIA') {
  const cleanQ = String(query || '').trim();
  if (!cleanQ) return [];
  const enc = encodeURIComponent(cleanQ);
  const isNigeriaOrAfrica = !marketCode || marketCode.toUpperCase() === 'NIGERIA' || marketCode.toUpperCase() === 'GHANA' || marketCode.toUpperCase() === 'KENYA';

  const links = [
    {
      name: 'Jumia Nigeria',
      site: 'jumia',
      title: `Search "${cleanQ}" on Jumia`,
      url: `https://www.jumia.com.ng/catalog/?q=${enc}`,
      badge: 'Local Express / COD',
      region: 'NG',
      color: '#f68b1e',
      description: 'Regional verified sellers, fast door-to-door delivery & cash on delivery'
    },
    {
      name: 'Konga Nigeria',
      site: 'konga',
      title: `Search "${cleanQ}" on Konga`,
      url: `https://www.konga.com/search?search=${enc}`,
      badge: 'Local Daily & Groceries',
      region: 'NG',
      color: '#ec008c',
      description: 'Daily foodstuffs, fresh produce, electronics, and local merchants'
    },
    {
      name: 'Amazon',
      site: 'amazon',
      title: `Search "${cleanQ}" on Amazon`,
      url: `https://www.amazon.com/s?k=${enc}`,
      badge: 'Global Marketplace',
      region: 'GLOBAL',
      color: '#ff9900',
      description: 'Worldwide inventory, brand-name goods, international air shipping'
    },
    {
      name: 'AliExpress',
      site: 'aliexpress',
      title: `Search "${cleanQ}" on AliExpress`,
      url: `https://www.aliexpress.com/wholesale?SearchText=${enc}`,
      badge: 'Factory Direct',
      region: 'GLOBAL',
      color: '#e62e04',
      description: 'Factory-direct pricing, electronics, replacement parts & bulk items'
    }
  ];

  return isNigeriaOrAfrica ? links : [links[2], links[3], links[0], links[1]];
}

function formatExternalSourcingMarkdown(query, externalLinks = [], substitutes = []) {
  const cleanQ = String(query || '').trim();
  const effectiveLinks = externalLinks.length > 0 ? externalLinks : buildExternalMarketplaceLinks(cleanQ);

  const linksList = effectiveLinks.map(link =>
    `- 🛒 [**${link.name} — Search "${cleanQ}"**](${link.url}) *(${link.badge})*\n  _${link.description}_`
  ).join('\n\n');

  let substitutesText = '';
  if (Array.isArray(substitutes) && substitutes.length > 0) {
    const subList = substitutes.map(s => `• **${s.term || s.label}**: ${s.note || 'Viable culinary or material alternative.'}`).join('\n');
    substitutesText = `\n\n### 🥗 Recommended Alternatives & Substitutes:\n${subList}\n`;
  }

  return `🔍 **No direct matches found in local W-Commerce stock for "${cleanQ}".**

We don't currently have verified local sellers stocking this exact item in W-Commerce, but you can find it directly on these verified external marketplaces:

${linksList}${substitutesText}

---

### 🌐 **W-Commerce Global Link & Escrow Import:**
Found the exact product on **Jumia, Konga, Amazon, or AliExpress**?
👉 **Simply copy the product URL and paste it right here into our chat!**
PayAI will instantly:
1. 📦 Resolve product specifications, live pricing, and images.
2. 🚚 Calculate landed delivery fees to your doorstep.
3. 🔒 Protect your purchase with **100% W-Commerce Escrow** until you receive and verify the item!`;
}

module.exports = {
  buildExternalMarketplaceLinks,
  formatExternalSourcingMarkdown
};
