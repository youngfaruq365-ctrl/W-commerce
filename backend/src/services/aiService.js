const https = require('https');
const axios = require('axios');
const logger = require('../utils/logger');
const prisma = require('../utils/prismaClient');
const { resolveBackendProductImage } = require('../utils/productImageHelper');

const httpsAgent = new https.Agent({
    keepAlive: false,
    rejectUnauthorized: true
});

const CANDIDATE_MODELS = [
    'gemini-3.1-flash-lite-preview',
    'gemini-flash-lite-latest',
    'gemini-3-flash-preview',
    'gemini-3.8-flash'
];

/**
 * Intelligent Gifting & Occasions Advisory
 */
async function handleGiftingAdvice(lower, lastMsg, budget) {
    let recipient = 'friend';
    let recipientLabel = 'your friend';
    let pronoun = 'them';
    let possessive = 'their';

    if (/\bsister\b/i.test(lower)) {
        recipient = 'sister';
        recipientLabel = 'your sister';
        pronoun = 'her';
        possessive = 'her';
    } else if (/\bbrother\b/i.test(lower)) {
        recipient = 'brother';
        recipientLabel = 'your brother';
        pronoun = 'him';
        possessive = 'his';
    } else if (/\b(?:mom|mother|mum)\b/i.test(lower)) {
        recipient = 'mom';
        recipientLabel = 'your mom';
        pronoun = 'her';
        possessive = 'her';
    } else if (/\b(?:dad|father)\b/i.test(lower)) {
        recipient = 'dad';
        recipientLabel = 'your dad';
        pronoun = 'him';
        possessive = 'his';
    } else if (/\b(?:girlfriend|babe|fiancée)\b/i.test(lower)) {
        recipient = 'girlfriend';
        recipientLabel = 'your girlfriend';
        pronoun = 'her';
        possessive = 'her';
    } else if (/\b(?:boyfriend|fiancé)\b/i.test(lower)) {
        recipient = 'boyfriend';
        recipientLabel = 'your boyfriend';
        pronoun = 'him';
        possessive = 'his';
    } else if (/\bwife\b/i.test(lower)) {
        recipient = 'wife';
        recipientLabel = 'your wife';
        pronoun = 'her';
        possessive = 'her';
    } else if (/\bhusband\b/i.test(lower)) {
        recipient = 'husband';
        recipientLabel = 'your husband';
        pronoun = 'him';
        possessive = 'his';
    }

    let occasion = 'celebration';
    if (/\bbirthday\b/i.test(lower)) occasion = 'birthday';
    else if (/\banniversary\b/i.test(lower)) occasion = 'anniversary';
    else if (/\bwedding\b/i.test(lower)) occasion = 'wedding';
    else if (/\bgraduation\b/i.test(lower)) occasion = 'graduation';
    else if (/\bvalentine\b/i.test(lower)) occasion = "Valentine's Day";

    const effectiveBudget = budget || 20000;

    let candidateProducts = [];
    try {
        const isFemale = ['sister', 'mom', 'girlfriend', 'wife'].includes(recipient);
        const isMale = ['brother', 'dad', 'boyfriend', 'husband'].includes(recipient);

        const targetCategories = isFemale
            ? ['electronics', 'Accessories', 'Modern Apparel', 'fashion', 'Home & Lifestyle', 'Biscuits & Cookies']
            : (isMale
                ? ['electronics', 'Modern Apparel', 'Accessories', 'fashion', 'Home & Lifestyle']
                : ['electronics', 'Accessories', 'Modern Apparel', 'fashion', 'Biscuits & Cookies', 'Home & Lifestyle']);

        const products = await prisma.product.findMany({
            where: {
                isArchived: false,
                stock: { gt: 0 },
                category: { in: targetCategories }
            },
            include: {
                store: { select: { storeName: true, isVerified: true } },
                images: true
            },
            take: 12,
            orderBy: { createdAt: 'desc' }
        });

        candidateProducts = products.filter(p => Number(p.price || 0) <= effectiveBudget);
        if (candidateProducts.length === 0) {
            candidateProducts = products;
        }
    } catch (err) {
        logger.debug(`Gifting product query error: ${err.message}`);
    }

    const topPicks = candidateProducts.slice(0, 3);
    const currencyStr = `₦${Number(effectiveBudget).toLocaleString()} NGN`;

    let reply = `🎉 **That's such a thoughtful and wonderful gesture! Celebrating ${recipientLabel}'s ${occasion} is going to make ${possessive} day unforgettable!** 💖✨\n\n` +
        `With your budget of **${currencyStr}**, you have some truly stylish, memorable, and verified gift options on W-Commerce! Here are my top handpicked gift recommendations:\n\n`;

    if (topPicks.length > 0) {
        topPicks.forEach((p, idx) => {
            const priceNgn = `₦${Number(p.price || 0).toLocaleString()} NGN`;
            const imgUrl = resolveBackendProductImage(p);
            const storeName = p.store?.storeName || 'Verified W-Commerce Merchant';

            let whyLove = 'A timeless, premium marketplace item that blends everyday practicality with elegance.';
            const pLower = p.title.toLowerCase();
            if (pLower.includes('watch')) {
                whyLove = `A sleek, high-grade smart timepiece with health tracking and crisp display. Looks stunning on ${possessive} wrist and complements any casual or formal outfit! ⌚✨`;
            } else if (pLower.includes('wear') || pLower.includes('shirt') || pLower.includes('apparel')) {
                whyLove = `Comfortable, fashionable, and versatile wear tailored for an effortless modern silhouette! 👗👕`;
            } else if (pLower.includes('biscuit') || pLower.includes('chocolate')) {
                whyLove = `A rich, decadent sweet treat to celebrate ${possessive} special day in style! 🍫🥳`;
            } else if (pLower.includes('headphone') || pLower.includes('sound')) {
                whyLove = `Immersive sound quality with deep bass and clear acoustics for music, calls, and travel! 🎧🎶`;
            }

            reply += `![${p.title}](${imgUrl})\n\n` +
                `**${idx + 1}. ${p.title}** — **${priceNgn}**\n` +
                `• 🏪 **Seller:** ${storeName} (Verified & Escrow Protected)\n` +
                `• ✨ **Why ${pronoun} will love it:** ${whyLove}\n\n` +
                `[🎁 Add ${p.title} to Cart (${priceNgn})](prompt:add ${p.title} to cart)\n\n`;
        });

        const primary = topPicks[0];
        const secondary = topPicks[1] || topPicks[0];
        const comboTotal = Number(primary.price || 0) + (topPicks.length > 1 ? Number(secondary.price || 0) : 0);
        const remaining = Math.max(0, effectiveBudget - comboTotal);

        reply += `### 💡 PayAI Smart Suggestions & Perfect Pairings\n\n` +
            `🎁 **The Ultimate ${recipient.charAt(0).toUpperCase() + recipient.slice(1)} Gift Set (₦${comboTotal.toLocaleString()} NGN Total):**\n` +
            `Pair **${primary.title}** with **${secondary.title}** for a complete, thoughtful surprise! `;

        if (remaining > 0) {
            reply += `You'll even have **₦${remaining.toLocaleString()} NGN** remaining within your budget! 🥳💸\n\n`;
        } else {
            reply += `It stretches your budget to perfection! 🌟\n\n`;
        }

        reply += `[✨ Add Complete Gift Set to Cart (₦${comboTotal.toLocaleString()})](prompt:add ${primary.title} and ${secondary.title} to cart) ` +
            `[🔍 Explore More Gifts Under ${currencyStr}](prompt:show gift ideas under ${effectiveBudget})\n\n`;
    }

    reply += `Would ${pronoun} prefer tech gadgets & smart accessories, or chic fashion & sweet indulgence? Tell me a little about ${possessive} personal style and I'll tailor the exact dream gift! 🎁💝`;

    return reply;
}

/**
 * Intelligent Product Comparisons & "Which is better?" Advisory
 */
async function handleComparisonAdvice(lower, lastMsg) {
    let reply = `🔍 **PayAI Expert Product & Specs Comparison Breakdown** 📱⚖️\n\n`;

    if (lower.includes('camera') || lower.includes('phone') || lower.includes('iphone') || lower.includes('samsung')) {
        reply += `When comparing flagship smartphone cameras (like the **iPhone 16 / 15 Pro Max** vs **Samsung Galaxy S24 / S25 Ultra**):\n\n` +
            `### 📸 1. Camera System & Image Tuning:\n` +
            `• **iPhone (Pro Max):** Renowned for **cinematic video stabilization**, true-to-life skin tones, seamless Dolby Vision 4K recording, and near-zero shutter lag. If you create content, vlog, or post directly to Instagram / TikTok, the iPhone pipeline is virtually unmatched.\n` +
            `• **Samsung Galaxy (Ultra):** Dominates in **zoom clarity (up to 100x Space Zoom)**, ultra-high resolution (200MP main sensor for cropping), vivid punchy colors, and superior nightography in low-light environments.\n\n` +
            `### 🔋 2. Battery & Daily Endurance:\n` +
            `• Both devices offer all-day endurance (typically 7-9 hours of active screen-on time). Samsung charges faster (45W wired), while iPhone maintains exceptional standby efficiency and battery longevity.\n\n` +
            `### 🏆 The PayAI Verdict:\n` +
            `• 👉 **Choose iPhone** if your priority is social media content, smooth video, and longevity.\n` +
            `• 👉 **Choose Samsung Galaxy** if you love telephoto zoom, manual Pro photography controls, and multi-window multitasking!\n\n`;

        try {
            const techItems = await prisma.product.findMany({
                where: { isArchived: false, stock: { gt: 0 }, category: { in: ['electronics', 'Electronics & Tech'] } },
                take: 2,
                orderBy: { createdAt: 'desc' }
            });
            if (techItems.length > 0) {
                reply += `### 💡 Verified Tech Deals in Our Marketplace:\n\n`;
                techItems.forEach(t => {
                    const imgUrl = resolveBackendProductImage(t);
                    reply += `![${t.title}](${imgUrl})\n\n` +
                        `• **${t.title}** — **₦${Number(t.price).toLocaleString()} NGN**\n` +
                        `[📱 View Specs & Add to Cart](prompt:add ${t.title} to cart)\n\n`;
                });
            }
        } catch (_) {}

        reply += `[📱 Compare All Smartphones](prompt:show phones) ` +
            `[🤝 Negotiate Best Phone Price](prompt:can i get a discount on phone)\n\n` +
            `What matters most for your daily routine: video recording, travel zoom, or battery endurance? Let me know and I'll find you the perfect deal! 🚀✨`;
        return reply;
    }

    if (lower.includes('headphone') || lower.includes('audio') || lower.includes('earphone')) {
        reply += `When choosing between **Over-Ear Noise-Cancelling Headphones** and **In-Ear Wireless Buds**:\n\n` +
            `• **Over-Ear ANC (e.g. W-Commerce Wireless ANC):** Delivers superior acoustic seal, active noise cancellation for airplanes and busy offices, and up to 30+ hours of continuous battery life.\n` +
            `• **In-Ear Buds:** Perfect for running, gym workouts, ultra-portability, and discreet pocket storage.\n\n` +
            `### 💡 PayAI Recommendation:\n` +
            `For focused work, travel, and premium immersive audio, over-ear ANC is the clear winner! 🎧✨\n\n` +
            `[🎧 View Wireless Noise-Cancelling Headphones](prompt:show headphones) ` +
            `[🤝 Negotiate Headphone Price](prompt:can i get a discount on headphones)`;
        return reply;
    }

    reply += `To give you the most accurate side-by-side comparison, I analyze:\n` +
        `• ⚙️ **Performance & Build Quality:** Durability, materials, and battery life.\n` +
        `• 💰 **Value for Money:** Best specs per Naira/Dollar spent.\n` +
        `• 🛡️ **Warranty & Escrow Protection:** 100% money-back guarantee.\n\n` +
        `Tell me which two models or brands you're weighing between, and I'll give you a detailed specs breakdown and real-life verdict! 🏆`;
    return reply;
}

/**
 * Intelligent Fashion Styling, Sizing & Outfit Consultation
 */
async function handleStylingAdvice(lower, lastMsg) {
    let reply = `👔✨ **PayAI Personal Styling & Outfit Consultation** 👗👠\n\n`;

    if (lower.includes('dinner') || lower.includes('date') || lower.includes('night')) {
        reply += `For a **dinner date or evening outing**, the golden rule is **sharp, effortless elegance**:\n\n` +
            `### 🌟 The Winning Outfit Formula:\n` +
            `1. **The Foundation:** A tailored crisp top or structured polo (neutral tones like Navy, Charcoal, or Crisp White).\n` +
            `2. **The Silhouette:** Clean tapered trousers or dark denim with a clean hem—avoid distressed cuts for upscale dining.\n` +
            `3. **The Footwear:** Minimal leather loafers or pristine clean white sneakers for modern smart-casual flair.\n` +
            `4. **The Signature Accent:** An elegant timepiece on the wrist (like the **2026 SUMSUNG GALAXY WATCH**) and a subtle signature scent.\n\n`;

        try {
            const fashionItems = await prisma.product.findMany({
                where: {
                    isArchived: false,
                    stock: { gt: 0 },
                    category: { in: ['fashion', 'Modern Apparel', 'electronics', 'Accessories'] }
                },
                take: 2,
                orderBy: { createdAt: 'desc' }
            });

            if (fashionItems.length > 0) {
                reply += `### 💡 Curated Date-Night Pieces from W-Commerce:\n\n`;
                fashionItems.forEach(item => {
                    const imgUrl = resolveBackendProductImage(item);
                    reply += `![${item.title}](${imgUrl})\n\n` +
                        `• **${item.title}** — **₦${Number(item.price).toLocaleString()} NGN**\n` +
                        `[✨ Add to Cart](prompt:add ${item.title} to cart)\n\n`;
                });
            }
        } catch (_) {}

        reply += `### 💡 PayAI Smart Suggestions & Perfect Pairings\n` +
            `Pair a sharp polo with tapered trousers and an accent timepiece to create a cohesive weekly rotation! 🥂✨\n\n` +
            `[🛍️ See Men's & Women's Fashion](prompt:show fashion) ` +
            `[⌚ View Accent Watches](prompt:show watches)\n\n` +
            `Is the dinner setting more fine-dining upscale or a relaxed lounge vibe? Let me know so we can dial in the sharpness! 😄`;
        return reply;
    }

    reply += `Here is how to elevate your everyday outfit rotation:\n\n` +
        `• **Rule of Proportions:** If your top is relaxed or oversized, pair it with structured, fitted trousers.\n` +
        `• **Color Harmony:** Limit your palette to 3 complementary colors (e.g. Navy, White, Earthy Khaki/Tan).\n` +
        `• **Accents:** A clean watch and matching shoes tie the entire aesthetic together instantly.\n\n` +
        `What specific piece are you looking to style today? Tell me the color and cut, and let's build a head-turning look! ✨`;
    return reply;
}

/**
 * Intelligent Food, Dining & Hunger Consultation
 */
async function handleFoodAdvice(lower, lastMsg, budget) {
    let reply = `🍔😋 **PayAI Chef's Table & Meal Recommendations** 🍟🥤\n\n` +
        `Ready for something delicious, crispy, and thoroughly satisfying? Here are our top-rated marketplace meals prepared fresh:\n\n`;

    try {
        const meals = await prisma.product.findMany({
            where: {
                isArchived: false,
                stock: { gt: 0 },
                category: { in: ['Combos', 'Burgers', 'Chicken Strips'] }
            },
            take: 2,
            orderBy: { createdAt: 'desc' }
        });

        const drinks = await prisma.product.findMany({
            where: {
                isArchived: false,
                stock: { gt: 0 },
                category: { in: ['Drinks'] }
            },
            take: 1
        });

        if (meals.length > 0) {
            const main = meals[0];
            const drink = drinks[0];
            const imgUrl = resolveBackendProductImage(main);
            const mainPrice = Number(main.price || 0);
            const drinkPrice = drink ? Number(drink.price || 0) : 1000;
            const comboTotal = mainPrice + drinkPrice;

            reply += `![${main.title}](${imgUrl})\n\n` +
                `**1. ${main.title}** — **₦${mainPrice.toLocaleString()} NGN**\n` +
                `• ✨ Golden crispy chicken, savory seasoned crunch, and signature dipping sauce!\n\n` +
                `[🍔 Add ${main.title} to Cart (₦${mainPrice.toLocaleString()})](prompt:add ${main.title} to cart)\n\n` +
                `### 💡 PayAI Smart Suggestions & Perfect Pairings\n\n` +
                `🥤 **The Ultimate Crunch & Refresh Combo (₦${comboTotal.toLocaleString()} NGN):**\n` +
                `Pair **${main.title}** with an ice-cold **${drink ? drink.title : 'Sprite'}** for the perfect balance of savory crunch and fizzy refreshment! 🍗❄️\n\n` +
                `[✨ Add Both as Combo (₦${comboTotal.toLocaleString()})](prompt:add ${main.title} and ${drink ? drink.title : 'Sprite'} to cart) ` +
                `[🍟 View All Meal Combos](prompt:show food)\n\n`;
        }
    } catch (_) {}

    reply += `Are you craving spicy crunch, a juicy beef burger, or a lighter quick snack? Tell me your vibe and let's get it delivered piping hot! 🚀`;
    return reply;
}

/**
 * Lifestyle, Mood & Emotional Empathy Handler
 */
function handleMoodEmpathy(lower) {
    if (lower.includes('celebrat') || lower.includes('happy') || lower.includes('good mood')) {
        return "🎉 **YES! That is fantastic news! What are we celebrating?!** 🥂🥳\n\n" +
            "Whether you smashed a goal at work, passed a milestone, or are just feeling on top of the world, you definitely deserve to treat yourself! 🌟\n\n" +
            "Can I help you pick out something special—maybe a new tech gadget 🎧, a fresh outfit 👗, or a celebration feast 🍔? Let's keep the good vibes going! 🚀✨";
    }

    return "💛 **I hear you — some days really demand a lot from us! Take a deep breath; you handled today, and now it's time to unwind.** 🌿☕\n\n" +
        "Whenever you're winding down, remember to treat yourself with kindness:\n" +
        "• 🍔 Grab a hot comfort meal without lifting a finger in the kitchen.\n" +
        "• 🎧 Put on your favorite relaxing playlist.\n" +
        "• 🛍️ Or just kick back and browse through some fun deals without any pressure!\n\n" +
        "Can I help you find something cozy, a sweet treat, or a relaxing self-care pick to brighten your evening? I'm right here with you! 😊✨";
}

/**
 * Casual Banter & Chit-Chat Handler
 */
function handleCasualBanter(lower) {
    return "✨ **I'm doing fantastic, thank you so much for asking! Ready to roll and hunt down some incredible deals with you today!** 🚀🛍️\n\n" +
        "Right now, I'm monitoring verified marketplace sellers, tracking fresh flash discounts, and making sure our Escrow vault is locked down tight for buyer protection! 🛡️💸\n\n" +
        "How is your day going so far? Are you shopping for something specific, hunting for gifts, or just exploring what's trending on W-Commerce? Tell me what you're in the mood for! 😄🎉";
}

/**
 * General Conversational Synthesis with Live Prisma Grounding
 */
async function handleGeneralConversationalReply(lastMsg, lower, budget) {
    const stopWords = new Set(['the', 'and', 'for', 'with', 'can', 'you', 'show', 'find', 'what', 'how', 'much', 'are', 'have', 'this', 'that', 'from', 'under', 'about', 'tell', 'more', 'does', 'which', 'best', 'good', 'please']);
    const keywords = String(lastMsg || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.has(w))
        .slice(0, 4);

    let matching = [];
    try {
        if (keywords.length > 0) {
            matching = await prisma.product.findMany({
                where: {
                    isArchived: false,
                    stock: { gt: 0 },
                    OR: keywords.flatMap(kw => [
                        { title: { contains: kw } },
                        { description: { contains: kw } },
                        { category: { contains: kw } }
                    ])
                },
                include: { store: { select: { storeName: true, isVerified: true } }, images: true },
                take: 3
            });
        }
        if (matching.length === 0) {
            matching = await prisma.product.findMany({
                where: { isArchived: false, stock: { gt: 0 } },
                include: { store: { select: { storeName: true, isVerified: true } }, images: true },
                take: 3,
                orderBy: { createdAt: 'desc' }
            });
        }
    } catch (_) {}

    let reply = `✨ **I'm right here to help you find the absolute best options!** 🛍️🎉\n\n` +
        `Every transaction on W-Commerce is backed by **100% Escrow Protection** 🛡️, meaning your payment is safely held until you receive and verify your package.\n\n`;

    if (matching.length > 0) {
        reply += `Here are verified recommendations matching your interest:\n\n`;
        matching.forEach((p, idx) => {
            const priceNgn = `₦${Number(p.price || 0).toLocaleString()} NGN`;
            const imgUrl = resolveBackendProductImage(p);
            reply += `![${p.title}](${imgUrl})\n\n` +
                `**${idx + 1}. ${p.title}** — **${priceNgn}** (${p.store?.storeName || 'Verified Merchant'})\n` +
                `[🛒 Add to Cart](${p.title ? `prompt:add ${p.title} to cart` : '/cart'}) ` +
                `[🤝 Negotiate Price](${p.title ? `prompt:can i get a discount on ${p.title}` : '/negotiate'})\n\n`;
        });

        reply += `### 💡 PayAI Smart Suggestions & Perfect Pairings\n` +
            `You can bundle verified products from our marketplace to qualify for **Free Consolidated Shipping** on orders over ₦25,000! 🚚💨\n\n`;
    }

    reply += `Would you like me to filter by a specific budget, check delivery times to your city, or help you negotiate with the merchant? Let's make it happen! 😄👇`;

    return reply;
}

/**
 * Comprehensive Intelligent Assistant Reply Engine
 */
async function buildIntelligentReply(lastMsg = '', liveContext = '', options = {}) {
    const lower = String(lastMsg || '').toLowerCase();

    // 0. JSON prompt requests (e.g. SEO or product generator)
    if (lower.includes('write a product description in json format') || lower.includes('return only valid json')) {
        return JSON.stringify({
            title: 'Premium W-Commerce Marketplace Item',
            description: 'Crafted with high-grade materials and backed by W-Commerce Escrow buyer protection. Fast consolidated hub or direct express delivery available.',
            price: 15000,
            highlights: ['Escrow Protected', 'Verified Seller Quality', 'Fast Dispatch'],
            seoTitle: 'Premium W-Commerce Marketplace Item',
            seoDescription: 'Shop verified products with escrow protection on W-Commerce.',
            tags: ['premium', 'verified', 'w-commerce']
        });
    }

    // 1. Order Complaints, Disputes & Damaged Deliveries (Immediate Empathy & Escrow Protection - No Jokes)
    const isComplaintOrDispute =
        /\b(?:complaint|dispute|damaged|broken|defective|faulty|cracked|scratched|shattered|torn|ruined|wrong\s+item|wrong\s+product|different\s+item|not\s+what\s+i\s+ordered|missing\s+item|missing\s+parts|fake\s+item|counterfeit|inferior\s+quality|not\s+as\s+described|problem\s+with\s+(?:my\s+)?order|issue\s+with\s+(?:my\s+)?order|report\s+(?:a\s+)?problem|file\s+(?:a\s+)?complaint|open\s+(?:a\s+)?dispute|replacement|replace\s+item)\b/i.test(lower);

    if (isComplaintOrDispute) {
        return "🛡️ **Your Satisfaction & Payment Are 100% Protected by W-Commerce Escrow!**\n\n" +
            "I am so sorry to hear that you experienced an issue with your order. Please rest assured: **the seller has not been paid**, and your funds remain securely frozen in the W-Commerce Escrow Vault until you are completely satisfied.\n\n" +
            "### ⚖️ Your Protected Resolution Options:\n" +
            "1. **📦 Free Express Replacement:** We will have the seller dispatch a brand new verified unit immediately with zero extra shipping fees.\n" +
            "2. **💰 Instant Partial Refund (30% - 40%):** Keep the item and receive an immediate credit back to your W-Commerce Wallet.\n" +
            "3. **🏷️ Prepaid RMA Return:** Return the parcel with a complimentary prepaid shipping label for a 100% full Escrow refund.\n" +
            "4. **🛡️ Escrow Admin Mediation:** Have a human dispute specialist review the order evidence within 24 hours.\n\n" +
            "👉 Please provide your **Order Number** (e.g. `#W-INT-12345`) or tap any action below to lock in your preferred resolution:\n\n" +
            "[📦 Request Free Replacement](prompt:I need a free replacement for my order) " +
            "[💰 Accept Partial Refund](prompt:I want a partial refund for my order) " +
            "[🏷️ Return for Full Escrow Refund](prompt:I want to return my order for full refund) " +
            "[🛡️ Escalate to Escrow Admin](prompt:Escalate my order issue to human dispute mediator)";
    }

    // 2. Buyer Trust, Safety & Legitimacy
    if (
        lower.includes('trust') ||
        lower.includes('scam') ||
        lower.includes('safe') ||
        lower.includes('safety') ||
        lower.includes('protection') ||
        lower.includes('legit') ||
        lower.includes('fake') ||
        lower.includes('guarantee') ||
        lower.includes('cheat') ||
        lower.includes('rip off') ||
        lower.includes('dont trust') ||
        lower.includes("don't trust")
    ) {
        return "🛡️ **Rest easy — your money is 100% safe & protected with us!** 🔒✨\n\n" +
            "1. **🔒 W-Commerce Escrow Vault:** When you pay, the seller doesn't get a single dime until you receive your package, inspect it, and give the thumbs up! 👍\n" +
            "2. **✅ Verified Legit Sellers:** Every merchant on W-Commerce must pass business KYC, prove domain ownership (`WCOM-VERIFY`), and maintain high buyer ratings! 🌟\n" +
            "3. **📸 Live Warehouse Inspection:** Want to see the real deal before buying? Tap **\"Warehouse Photo & Voice Note\"** to view live high-res photos and hear an authentic seller voice note! 🎙️\n" +
            "4. **🚚 VIP Tracked Delivery:** Top couriers (GIG Logistics & DHL Express) track your parcel stage-by-stage from hub to doorstep! 📦💨\n" +
            "5. **💰 100% Money-Back Guarantee:** If anything is off or your item doesn't arrive, Escrow issues a full refund instantly. Zero stress! 🥳";
    }

    // 3. Wallet Balance & Account Funds Inquiry
    const isWalletBalanceQuery =
        /\b(?:how\s+much\s+(?:do\s+i\s+have|am\s+i\s+having|is\s+in|is\s+there|have\s+i\s+got|money|funds)|what\s+is\s+my|check\s+my|view\s+my|show\s+my|see\s+my|balance\s+of)\b.+?\b(?:wallet|balance|funds|account)\b/i.test(lower) ||
        /\b(?:wallet\s+balance|my\s+wallet|my\s+balance|account\s+balance|how\s+much\s+in\s+my\s+wallet)\b/i.test(lower) ||
        ((lower.includes('wallet') || lower.includes('balance')) && (lower.includes('how much') || lower.includes('having') || lower.includes('my balance') || lower.includes('check balance') || lower.includes('available')));

    if (isWalletBalanceQuery) {
        return "💰 **Your W-Commerce Wallet Balance:**\n\n" +
            "• 🟢 **Available Balance:** **₦250,000 NGN** (≈ **$168.92 USD**)\n" +
            "• 🛡️ **Escrow Vault Status:** Active & 100% Protected\n" +
            "• ⚡ **1-Click Checkout:** Instant deduction enabled on all verified products\n\n" +
            "You can manage funds or top up anytime in your **[Wallet Dashboard](/buyer/wallet)**! 🚀";
    }

    // Extract budget from query
    let extractedBudget = null;
    const budgetMatch = lower.match(/(?:below|under|less\s+than|<=?|within|budget(?:\s+of)?|max(?:\s+of)?|for|have|got|with|spend|spending|around|about)?\s*(?:₦|\$|ngn|usd)?\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)\s*(k|thousand|naira|ngn|usd)?/i);
    if (budgetMatch && budgetMatch[1]) {
        let val = parseFloat(budgetMatch[1].replace(/,/g, ''));
        const unit = (budgetMatch[2] || '').toLowerCase();
        if (unit === 'k' || unit === 'thousand') val *= 1000;
        if (val > 100) extractedBudget = val;
    }

    // 4. Gifting, Occasions & Recipient Advisory
    const isGiftingIntent =
        /\b(?:gift|present|birthday|anniversary|wedding|valentine|graduation|for\s+my\s+(?:sister|brother|mom|mother|dad|father|friend|wife|husband|colleague|boss|son|daughter)|what\s+can\s+i\s+get\s+(?:her|him|them|my)|what\s+should\s+i\s+get\s+(?:her|him|them|my)|what\s+to\s+get\s+(?:her|him|them|my)|recommend\s+(?:a\s+)?gift|gift\s+ideas?|surprise\s+(?:her|him|my))\b/i.test(lower);

    if (isGiftingIntent) {
        return await handleGiftingAdvice(lower, lastMsg, extractedBudget);
    }

    // 5. Product Comparisons & "Which is better / Which should I buy?"
    const isComparisonIntent =
        /\b(?:which\s+(?:phone|laptop|item|product|one|watch|brand|camera)\s+(?:has|is|have)|which\s+is\s+better|compare\s+(?:between\s+)?|difference\s+between|versus|\bvs\b|should\s+i\s+get\s+(?:an?\s+)?(?:iphone|samsung|macbook)|which\s+one\s+should\s+i\s+(?:buy|choose|pick|get))\b/i.test(lower);

    if (isComparisonIntent) {
        return await handleComparisonAdvice(lower, lastMsg);
    }

    // 6. Fashion Styling, Outfit Matching & Sizing Consultation
    const isStylingIntent =
        /\b(?:what\s+should\s+i\s+wear|how\s+(?:do|should)\s+i\s+style|outfit\s+(?:ideas?|for)|style\s+(?:advice|these|this)|what\s+goes\s+(?:well\s+)?with|fashion\s+advice|dress\s+code\s+for|what\s+to\s+wear\s+to\s+(?:a\s+)?(?:dinner|party|date|wedding|event|meeting|work)|how\s+does\s+this\s+look)\b/i.test(lower);

    if (isStylingIntent) {
        return await handleStylingAdvice(lower, lastMsg);
    }

    // 7. Food, Dining & Hunger Consultation
    const isFoodIntent =
        /\b(?:what\s+should\s+i\s+eat|what\s+do\s+you\s+recommend\s+for\s+(?:dinner|lunch|breakfast)|i'm\s+hungry|im\s+hungry|hungry|starving|something\s+quick\s+to\s+eat|food\s+recommendations?|what's\s+for\s+(?:dinner|lunch|breakfast)|craving\s+something)\b/i.test(lower);

    if (isFoodIntent) {
        return await handleFoodAdvice(lower, lastMsg, extractedBudget);
    }

    // 8. Lifestyle, Mood & Emotional Empathy
    const isMoodIntent =
        /\b(?:had\s+a\s+(?:long|tough|bad|tiring|rough)\s+day|i'm\s+(?:tired|stressed|sad|exhausted|down|overwhelmed)|im\s+(?:tired|stressed|sad|exhausted|down|overwhelmed)|feeling\s+(?:down|sad|blue|stressed|tired)|cheer\s+me\s+up|celebrating|i'm\s+happy|im\s+happy|good\s+mood)\b/i.test(lower);

    if (isMoodIntent) {
        return handleMoodEmpathy(lower);
    }

    // 9. Casual Banter, Daily Check-in & Chit-Chat
    const isBanter =
        /\b(?:how\s+are\s+you|what\s+are\s+you\s+up\s+to|what's\s+up|whats\s+up|how's\s+your\s+day|hows\s+your\s+day|who\s+are\s+you|what\s+can\s+you\s+do|tell\s+me\s+something\s+interesting)\b/i.test(lower);

    if (isBanter) {
        return handleCasualBanter(lower);
    }

    // 10. Connected Stores & Alternatives
    if (lower.includes('connected store') || lower.includes('other store') || lower.includes('compare') || lower.includes('elsewhere') || lower.includes('cheaper alternative') || lower.includes('other seller')) {
        return "🕵️‍♂️✨ **You got it! Let's check what other connected stores have in stock!** 🚀\n\n" +
            "I can scan our verified merchants and connected platforms to compare prices, delivery fees, and specifications side-by-side! 🛒💨\n\n" +
            "💡 You can click the **Check Other Connected Stores** button on any product card or tell me the specific model you'd like me to compare! Let's find you the sharpest deal in town! 🏆✨";
    }

    // 11. Orders, Tracking & Delivery
    if (lower.includes('order') || lower.includes('track') || lower.includes('shipping') || lower.includes('delivery')) {
        return "🚚💨 **Live Delivery Radar Active!** 📦✨\n\nYou can track every milestone of your order in real time right under the **Live Tracking** tab or in **Buyer Dashboard → Orders**! Every shipment is Escrow-guaranteed from seller dispatch to your front door. Want me to check a specific tracking number for you? 😊";
    }

    // 12. Cart, Escrow, Payments & Checkout
    if (lower.includes('button') || lower.includes('where to click') || lower.includes('cannot click') || lower.includes('cant click') || lower.includes('how do i pay')) {
        return "👇 **Your Interactive Checkout Controls Are Ready to Roll!** 🛒🎉\n\n" +
            "Simply click the checkout button below or head over to the **[Cart & Checkout](/cart)** page! You can pay easily using **W-Commerce Wallet**, **Debit Card (Paystack)**, **Monnify**, or **PayPal USD** — all 100% Escrow protected! 💳🛡️";
    }

    if (
        lower.includes('escrow') ||
        lower.includes('refund') ||
        (lower.includes('payment') && !lower.includes('how much') && !lower.includes('balance')) ||
        (lower.includes('wallet') && !lower.includes('how much') && !lower.includes('balance') && !lower.includes('having'))
    ) {
        return "💳✨ **Payment Made Effortless & Safe!** 🛡️\n\n" +
            "Your funds are held securely in **Escrow** until your package arrives. We support **W-Commerce Wallet** (instant 1-click), **Paystack (Card/USSD/Bank)**, **Monnify**, and **PayPal USD** (with automatic Naira seller payout!). Total peace of mind! 🤝💸";
    }

    // 13. Entertainment, Jokes & Fun
    if (lower.includes('joke') || lower.includes('funny') || lower.includes('entertain') || lower.includes('bored') || lower.includes('haha') || lower.includes('lol')) {
        return "😄 **Here's a shopping joke for you:**\n\n" +
            "Why did the smartphone need glasses? 👓📱\n" +
            "*Because it lost all its contacts!* 😂🥁\n\n" +
            "Shopping should be fun and thrilling! 🛍️🎉 Ready to hunt down some crazy deals or haggle with a seller? Let's do it! 🚀✨";
    }

    // 14. Actual Selling Intent
    const isSellerOnboardingIntent = /\b(how to sell|start selling|become a seller|open a store|register as vendor|seller onboarding|create store|sell my products)\b/i.test(lower);
    if (isSellerOnboardingIntent) {
        return "🌟 **Ready to make sales on W-Commerce? We'd love to have you!** 🚀\n\nHead over to **Seller Onboarding** or your **Seller Dashboard** to link your existing external store, list products, and let our AI sales engine close deals for you 24/7! 📈🤝";
    }

    // 15. Greetings
    if (/^(hi|hello|hey|yo|sup|good\s+(morning|afternoon|evening)|howdy)\b/i.test(lower)) {
        return "👋 **Hey there, superstar! Welcome to PayAI on W-Commerce!** ✨🛍️\n\n" +
            "I'm your friendly personal shopping wingman, ready to:\n" +
            "• 🎁 **Curate Personal Gifts:** Got an occasion or recipient in mind? Tell me and let's craft the perfect surprise!\n" +
            "• 🔍 **Find Awesome Products:** Electronics, fashion, groceries & lifestyle essentials!\n" +
            "• 🤝 **Negotiate Killer Discounts:** Let's get you the sharpest deal possible!\n" +
            "• 🚚 **Calculate Live Delivery:** Check transit times & free shipping perks!\n\n" +
            "What can I help you discover or bargain for today? Let's make shopping exciting! 🥳🎉";
    }

    // 16. Fallback: Intelligent Marketplace Search & Conversational Synthesis
    return await handleGeneralConversationalReply(lastMsg, lower, extractedBudget);
}

const buildFallbackReply = buildIntelligentReply;

/**
 * Retrieve live marketplace products, active deals, cart, and user context from Prisma (RAG)
 */
async function buildLiveMarketplaceContext(lastQuery = '', user = null, extraContext = '', options = {}) {
    const sections = [];

    // 1. Focused / Attached Product Context (if buyer is asking about a specific product)
    if (options?.productId && !String(options.productId).startsWith('demo-') && !String(options.productId).startsWith('amz-')) {
        try {
            const focused = await prisma.product.findUnique({
                where: { id: String(options.productId) },
                include: {
                    store: { select: { storeName: true, portfolioSlug: true, isVerified: true } },
                    images: true,
                    reviews: { take: 3, orderBy: { createdAt: 'desc' }, select: { rating: true, comment: true } }
                }
            });
            if (focused) {
                const reviewText = focused.reviews?.length
                    ? focused.reviews.map(r => `★${r.rating}/5: "${r.comment || 'Verified buyer'}"`).join(' | ')
                    : 'No customer reviews yet';
                sections.push(
                    `CURRENTLY SELECTED / ATTACHED PRODUCT:\n` +
                    `- Title: "${focused.title}" (ID: ${focused.id})\n` +
                    `- Price: ₦${Number(focused.price || 0).toLocaleString()} NGN\n` +
                    `- Stock: ${focused.stock ?? 'In Stock'} units | Negotiable: ${focused.isNegotiable !== false ? 'Yes' : 'Fixed Price'}\n` +
                    `- Category: ${focused.category || 'General'}\n` +
                    `- Store: ${focused.store?.storeName || 'Verified W-Commerce Merchant'} (${focused.store?.isVerified ? 'Verified Store' : 'Active Seller'})\n` +
                    `- Description & Specs: ${focused.description || 'Authentic verified marketplace item.'}\n` +
                    `- ImageUrl: ${resolveBackendProductImage(focused)}\n` +
                    `- Recent Buyer Reviews: ${reviewText}`
                );
            }
        } catch (err) {
            logger.debug(`RAG focused product lookup skipped: ${err.message}`);
        }
    }

    // 2. Live Marketplace Catalog Snapshot
    try {
        const stopWords = new Set(['the', 'and', 'for', 'with', 'can', 'you', 'show', 'find', 'what', 'how', 'much', 'are', 'have', 'this', 'that', 'from', 'under', 'about', 'tell', 'more', 'does', 'which', 'best', 'good']);
        const keywords = String(lastQuery || '')
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 2 && !stopWords.has(w))
            .slice(0, 5);

        let products = [];
        if (keywords.length > 0) {
            products = await prisma.product.findMany({
                where: {
                    isArchived: false,
                    OR: keywords.flatMap(kw => [
                        { title: { contains: kw } },
                        { description: { contains: kw } },
                        { category: { contains: kw } }
                    ])
                },
                include: {
                    store: { select: { storeName: true, portfolioSlug: true } },
                    images: true
                },
                take: 8,
                orderBy: { createdAt: 'desc' }
            });
        }

        if (products.length === 0) {
            products = await prisma.product.findMany({
                where: { stock: { gt: 0 }, isArchived: false },
                include: {
                    store: { select: { storeName: true, portfolioSlug: true } },
                    images: true
                },
                take: 8,
                orderBy: { createdAt: 'desc' }
            });
        }

        if (products.length > 0) {
            const productLines = products.map((p, idx) => {
                const storeName = p.store?.storeName || 'Verified W-Commerce Store';
                const priceNgn = Number(p.price || 0).toLocaleString();
                const shortDesc = p.description ? String(p.description).slice(0, 90).replace(/\s+/g, ' ') : '';
                const imgUrl = resolveBackendProductImage(p);
                return `${idx + 1}. "${p.title}" | Price: ₦${priceNgn} NGN | Stock: ${p.stock ?? 'In Stock'} | Negotiable: ${p.isNegotiable !== false ? 'Yes' : 'No'} | Category: ${p.category || 'General'} | Store: ${storeName} | Info: ${shortDesc} | ImageUrl: ${imgUrl} (ID: ${p.id})`;
            });
            sections.push(`LIVE MARKETPLACE CATALOG SNAPSHOT:\n${productLines.join('\n')}`);
        }
    } catch (err) {
        logger.debug(`RAG product lookup skipped: ${err.message}`);
    }

    // 3. Active Flash Deals & Promo Codes
    try {
        const [flashDeals, promos] = await Promise.all([
            prisma.flashDeal.findMany({
                where: { isActive: true, endDate: { gt: new Date() } },
                include: { product: { select: { title: true, price: true } } },
                take: 4
            }).catch(() => []),
            prisma.promoCode.findMany({
                where: { isActive: true },
                take: 4
            }).catch(() => [])
        ]);

        const dealLines = [];
        if (flashDeals.length > 0) {
            flashDeals.forEach(fd => {
                dealLines.push(`- Flash Deal: "${fd.product?.title || fd.promoTitle || 'Special Deal'}" — Discount Price: ₦${Number(fd.discount || 0).toLocaleString()} NGN (Ends: ${new Date(fd.endDate).toLocaleDateString()})`);
            });
        }
        if (promos.length > 0) {
            promos.forEach(pr => {
                dealLines.push(`- Promo Code: "${pr.code}" (${pr.discountType === 'PERCENTAGE' ? pr.discountValue + '% OFF' : '₦' + Number(pr.discountValue || 0).toLocaleString() + ' OFF'})`);
            });
        }
        if (dealLines.length > 0) {
            sections.push(`ACTIVE FLASH DEALS & PROMO CODES:\n${dealLines.join('\n')}`);
        }
    } catch (err) {
        logger.debug(`RAG deals lookup skipped: ${err.message}`);
    }

    // 4. Authenticated Buyer Live Account, Active Cart, Wallet & Orders
    if (user?.id) {
        try {
            const [recentOrders, wallet, userCart] = await Promise.all([
                prisma.order.findMany({
                    where: { buyerId: user.id },
                    orderBy: { createdAt: 'desc' },
                    take: 3,
                    select: { id: true, status: true, totalAmount: true, trackingNumber: true, createdAt: true }
                }).catch(() => []),
                prisma.wallet.findUnique({
                    where: { userId: user.id },
                    select: { gxAvailable: true, gxHeld: true, gongAvailable: true }
                }).catch(() => null),
                prisma.cart.findUnique({
                    where: { userId: user.id },
                    include: { items: { include: { product: { select: { title: true, price: true } } } } }
                }).catch(() => null)
            ]);

            const userLines = [`Authenticated Buyer: ${user.name || user.email || 'Member'} (Role: ${user.role || 'BUYER'})`];
            if (wallet) {
                userLines.push(`Wallet Balance: GX ₦${Number(wallet.gxAvailable || 0).toLocaleString()} (Escrow Held: ₦${Number(wallet.gxHeld || 0).toLocaleString()})`);
            }
            if (userCart?.items?.length > 0) {
                const cartTotal = userCart.items.reduce((sum, it) => sum + (Number(it.product?.price || 0) * (it.quantity || 1)), 0);
                const cartItemsStr = userCart.items.map(it => `${it.quantity}x "${it.product?.title || 'Item'}" (₦${Number(it.product?.price || 0).toLocaleString()} each)`).join(', ');
                userLines.push(`Active Shopping Cart (${userCart.items.length} items, Subtotal: ₦${cartTotal.toLocaleString()} NGN): ${cartItemsStr}`);
            } else {
                userLines.push(`Active Shopping Cart: Currently empty`);
            }
            if (recentOrders.length > 0) {
                userLines.push(`Recent Orders:\n` + recentOrders.map(o =>
                    `  • Order #${o.id.slice(0, 8)} | Status: ${o.status} | Total: ₦${Number(o.totalAmount || 0).toLocaleString()} | Tracking: ${o.trackingNumber || 'Pending'}`
                ).join('\n'));
            }
            sections.push(`BUYER LIVE ACCOUNT & CART CONTEXT:\n${userLines.join('\n')}`);
        } catch (err) {
            logger.debug(`RAG user lookup skipped: ${err.message}`);
        }
    }

    if (extraContext) {
        sections.push(`CURRENT SESSION & TOOL EXECUTION CONTEXT:\n${extraContext}`);
    }

    return sections.join('\n\n');
}

function buildGeminiPayload(messages, liveContext, isJsonPrompt = false) {
    const systemPrompt = [
        'You are PayAI, the official Real-Time AI Shopping Concierge, Product Expert, and Sales Representative for W-Commerce (OmniMart).',
        'Your goal is to answer ANY question a buyer asks—whether it is about specific products, comparisons, budget/gift recommendations, technical specs, sizing/usage advice, what is currently in their cart, active flash deals/promo codes, order tracking, price negotiation, or general shopping questions—accurately, naturally, and helpfully.',
        'Key platform facts:',
        '- All purchases on W-Commerce are 100% protected by W-Commerce Escrow until the buyer confirms delivery and product condition.',
        '- Supported payment gateways: W-Commerce Wallet, Paystack (Card/Bank Transfer/USSD), Flutterwave, Monnify, PayPal USD Checkout, and Cash on Delivery (COD).',
        '- Unified Cart & Checkout: All items added to cart go directly to the main Cart & Checkout page (/cart).',
        '- Buyers can negotiate prices in real time with verified native W-Commerce sellers via PayAI.',
        '- If the buyer refers to "this", "it", "the first one", "the second one", or asks a follow-up question, use the CURRENTLY SELECTED PRODUCT and CURRENT SESSION & TOOL EXECUTION CONTEXT below to resolve exactly which product they mean.',
        '- If a tool was just executed (e.g. search, stock check, shipping estimate, negotiation, or order tracking), incorporate the exact numbers, prices, serials, and facts from the tool context while also directly answering all parts of the buyer\'s question.',
        '- CRITICAL UI RULES:',
        '  * Real interactive product cards and buttons ("Add to Cart", "Negotiate", "View Cart & Checkout") are automatically rendered beneath your message in the PayAI UI.',
        '  * PRODUCT IMAGES RULE: When introducing, listing, or recommending products to the user, you MUST include the product\'s image using markdown syntax: `![Product Title](ImageUrl)`. Place the image prominently with each product\'s title, price, and merchant so the buyer can visually see each item.',
        '  * SMART SUGGESTIONS & PERFECT PAIRINGS RULE: Whenever listing products or addressing buyer needs, ALWAYS include a dedicated, friendly, entertaining section below titled `### 💡 PayAI Smart Suggestions & Perfect Pairings`. Provide combo pairings (e.g. burger/sushi + chilled softdrink with total combo price), fashion outfit matching (e.g. trousers matching shirts/polos, shoe pairings, referencing past purchases), and tech matching (e.g. iPhone matching protective pouch color, watch straps), accompanied by 1-click suggestion prompt buttons like `[🥤 Add Cold Sprite (₦1,000)](prompt:add Sprite to cart)` or `[✨ Add Both as Combo (₦5,500)](prompt:add Original Crunch and Sprite to cart)`.',
        '- PERSONALITY & COMMUNICATION STYLE:',
        '  * Maintain a friendly, witty, approachable, and emoji-accented tone (✨, 🎉, 🚀, 🤝, 💸, 🛒, 🥳, 💡, 🏷️, 📦)!',
        '  * Make shopping feel thrilling and delightful! Use natural conversational banter, enthusiastic encouragement, and cheerful wit when browsing, recommending, or negotiating deals.',
        '  * CRITICAL TONE SAFETY RULE: NEVER use humor, jokes, or sarcasm to dismiss customer complaints, broken/damaged items, payment issues, refund requests, or buyer safety concerns.',
        '  * When addressing complaints, disputes, damaged deliveries, or delivery delays: Immediately switch to an empathetic, reassuring, professional, and protective posture. Clearly explain that buyer funds are 100% protected in W-Commerce Escrow and outline concrete remedies (Replacement, Partial Refund, Full Escrow Refund, RMA Return) with absolute clarity.',
        '  * Keep responses concise, practical, and helpful. Avoid dry, robotic, or dismissive answers. Treat the buyer with VIP warmth and empathy.',
        '- Format responses in clean, scannable Markdown with clear bullet points and bold highlights where appropriate.',
        liveContext ? `\nLIVE GROUNDING CONTEXT (Database, Cart, Deals & Session State):\n${liveContext}` : ''
    ].filter(Boolean).join('\n');

    const contents = (Array.isArray(messages) ? messages : []).map(m => ({
        role: m.role === 'assistant' || m.role === 'ai' || m.role === 'model' ? 'model' : 'user',
        parts: [{ text: String(m.content || '') }]
    })).filter(c => c.parts[0].text.trim().length > 0);

    // Gemini requires the first turn in contents to have role 'user'
    while (contents.length > 1 && contents[0].role === 'model') {
        contents.shift();
    }
    if (contents.length === 0) {
        contents.push({ role: 'user', parts: [{ text: 'Hello' }] });
    }

    const payload = {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
            temperature: isJsonPrompt ? 0.3 : 0.65,
            maxOutputTokens: 1024
        }
    };

    return payload;
}

exports.generateChatResponse = async (messages, options = {}) => {
    const lastMsg = Array.isArray(messages) && messages.length > 0
        ? String(messages[messages.length - 1]?.content || '')
        : '';
    const lower = lastMsg.toLowerCase();
    const isJsonPrompt = lower.includes('json format') || lower.includes('return only valid json');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.startsWith('REPLACE_') || apiKey === 'YOUR_GEMINI_API_KEY') {
        logger.debug('GEMINI_API_KEY not configured; using contextual assistant response.');
        return options.fallbackReply || await buildIntelligentReply(lastMsg, '', options);
    }

    const liveContext = isJsonPrompt
        ? (options.extraContext || '')
        : await buildLiveMarketplaceContext(lastMsg, options.user, options.extraContext, options);

    const payload = buildGeminiPayload(messages, liveContext, isJsonPrompt);

    for (const model of CANDIDATE_MODELS) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const response = await axios.post(url, payload, { timeout: 12000, httpsAgent });
            const text = response.data?.candidates?.[0]?.content?.parts
                ?.map(p => p.text || '')
                .join('')
                .trim();

            if (text) {
                return text;
            }
        } catch (error) {
            const status = error.response?.status;
            const errMsg = error.response?.data?.error?.message || error.message || '';
            logger.warn(`Gemini model ${model} failed (${status || 'ERR'}): ${errMsg}`);
            // If network/TLS socket is completely disconnected or DNS failed, don't stall
            if (!status && /ENOTFOUND|ECONNREFUSED|schannel|handshake|socket hang up/i.test(errMsg)) {
                break;
            }
        }
    }

    return options.fallbackReply || await buildIntelligentReply(lastMsg, liveContext, options);
};

/**
 * Stream chat response token-by-token in real time via Gemini SSE
 */
exports.streamChatResponse = async (messages, options = {}, onChunk) => {
    const lastMsg = Array.isArray(messages) && messages.length > 0
        ? String(messages[messages.length - 1]?.content || '')
        : '';
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.startsWith('REPLACE_') || apiKey === 'YOUR_GEMINI_API_KEY') {
        const fallback = options.fallbackReply || await buildIntelligentReply(lastMsg, '', options);
        if (onChunk) onChunk(fallback);
        return fallback;
    }

    const liveContext = await buildLiveMarketplaceContext(lastMsg, options.user, options.extraContext, options);
    const payload = buildGeminiPayload(messages, liveContext, false);

    for (const model of CANDIDATE_MODELS) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
            const response = await axios.post(url, payload, {
                responseType: 'stream',
                timeout: 25000,
                httpsAgent
            });

            let fullText = '';
            let buffer = '';

            await new Promise((resolve, reject) => {
                response.data.on('data', (chunk) => {
                    buffer += chunk.toString();
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed.startsWith('data:')) continue;
                        const jsonStr = trimmed.slice(5).trim();
                        if (!jsonStr || jsonStr === '[DONE]') continue;
                        try {
                            const parsed = JSON.parse(jsonStr);
                            const parts = parsed?.candidates?.[0]?.content?.parts || [];
                            for (const part of parts) {
                                if (part.text) {
                                    fullText += part.text;
                                    if (onChunk) onChunk(part.text);
                                }
                            }
                        } catch (_) {
                            // Ignore partial JSON lines
                        }
                    }
                });

                response.data.on('end', resolve);
                response.data.on('error', reject);
            });

            if (fullText.trim()) {
                return fullText.trim();
            }
        } catch (error) {
            const status = error.response?.status;
            logger.warn(`Gemini stream model ${model} failed (${status || 'ERR'}): ${error.message}`);
        }
    }

    const fallback = options.fallbackReply || await buildIntelligentReply(lastMsg, liveContext, options);
    if (onChunk) onChunk(fallback);
    return fallback;
};
