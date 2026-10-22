'use strict';
const prisma = require('../../utils/prismaClient');
const logger = require('../../utils/logger');
const adapterRegistry = require('./adapters/adapterRegistry');
const marketService = require('./marketService');
const { resolveBackendProductImage } = require('../../utils/productImageHelper');

class CatalogSearchService {
  /**
   * Search unified catalog based on market mode with multi-intent & pairing support
   */
  async search({
    marketCode = 'NIGERIA',
    query = '',
    category,
    provider,
    limit = 16,
    page = 1,
    destinationCountry = 'NG',
    minPrice,
    maxPrice,
    secondaryQuery,
    secondaryCategory,
    secondaryMaxPrice,
    pairingContext,
    deadline,
    targetDeliveryDate,
    maxDeliveryDays,
    sortBy = 'value'
  }) {
    const market = (marketCode || 'NIGERIA').toUpperCase();

    // 0. Detect Delivery Deadline from query if not explicitly passed
    let effectiveDeadline = deadline || targetDeliveryDate || null;
    let cleanQuery = query || '';

    const deadlinePatterns = [
      /\b(?:arrive|delivery|deliver|reach|need\s+it|ship)\s+(?:before|by|within|in)\s+([a-zA-Z0-9\s]+?)(?:$|\band\b|\bwith\b|\bunder\b|\bbelow\b|\bfor\b)/i,
      /\b(?:within|in)\s+(\d+)\s*(?:business\s+)?days?\b/i,
      /\b(?:before|by)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
      /\barrive\s+before\s+([a-zA-Z0-9]+)\b/i,
      /\bdelivery\s+within\s+([a-zA-Z0-9\s]+)\b/i
    ];

    if (!effectiveDeadline && cleanQuery) {
      for (const pattern of deadlinePatterns) {
        const match = cleanQuery.match(pattern);
        if (match) {
          effectiveDeadline = match[0].trim();
          cleanQuery = cleanQuery.replace(match[0], ' ').replace(/\s+/g, ' ').trim();
          break;
        }
      }
    }

    // 1. Primary Product Search
    let localRes = { items: [] };
    let intlRes = { items: [] };

    if (provider === 'w-commerce') {
      localRes = await this._searchLocalProducts({
        query: cleanQuery,
        category,
        limit: secondaryQuery ? Math.min(limit, 6) : limit,
        page,
        minPrice,
        maxPrice
      });
    } else if (provider && provider !== 'all' && ['amazon', 'aliexpress', 'ebay', 'asos'].includes(provider.toLowerCase())) {
      intlRes = await this._searchInternationalOffers({
        query: cleanQuery,
        category,
        provider,
        limit: secondaryQuery ? Math.min(limit, 6) : limit,
        page,
        destinationCountry,
        minPrice,
        maxPrice
      });
    } else {
      [localRes, intlRes] = await Promise.all([
        this._searchLocalProducts({
          query: cleanQuery,
          category,
          limit: secondaryQuery ? 6 : Math.ceil(limit / 2),
          page,
          minPrice,
          maxPrice
        }),
        this._searchInternationalOffers({
          query: cleanQuery,
          category,
          provider,
          limit: secondaryQuery ? 4 : Math.ceil(limit / 2),
          page,
          destinationCountry,
          minPrice,
          maxPrice
        })
      ]);
    }

    let primaryItems = [...(localRes.items || []), ...(intlRes.items || [])];

    // If strict price filtering yielded 0 results, relax the price filter to give the buyer closest options
    if (primaryItems.length === 0 && maxPrice) {
      const relaxed = await this._searchLocalProducts({
        query: cleanQuery,
        category,
        limit: 6,
        page
      });
      primaryItems = relaxed.items || [];
    }

    // 2. Secondary Pairing Search (e.g. food + drink, shirt + trouser, phone + pouch)
    let secondaryItems = [];
    if (secondaryQuery) {
      const secRes = await this._searchLocalProducts({
        query: secondaryQuery,
        category: secondaryCategory,
        limit: 4,
        page: 1,
        maxPrice: secondaryMaxPrice
      });
      secondaryItems = (secRes.items || []).map(it => ({
        ...it,
        isSecondaryPairing: true
      }));

      // Fallback if strict secondary price yielded 0 results
      if (secondaryItems.length === 0 && secondaryMaxPrice) {
        const relaxedSec = await this._searchLocalProducts({
          query: secondaryQuery,
          category: secondaryCategory,
          limit: 4,
          page: 1
        });
        secondaryItems = (relaxedSec.items || []).map(it => ({
          ...it,
          isSecondaryPairing: true
        }));
      }
    } else {
      // Auto-fetch complementary pairings for single queries to power smart suggestions
      const cleanQ = (query || '').toLowerCase();
      const isFoodQuery = /food|hungry|ungry|meal|breakfast|break\s*fast|lunch|dinner|snack|burger|sushi|chicken/i.test(cleanQ);
      const isDrinkOnly = /drink|beverage|soda|water|juice|coke|fanta|sprite/i.test(cleanQ);
      const isFashionQuery = /trouser|trousher|pants|shirt|wear|dress|clothing|suit/i.test(cleanQ);
      const isTechQuery = /phone|iphone|samsung|watch|smartwatch|airpod|headphone/i.test(cleanQ);

      if (isFoodQuery && !isDrinkOnly) {
        const autoDrinks = await this._searchLocalProducts({
          query: 'drinks softdrink water fanta sprite',
          limit: 3,
          page: 1,
          maxPrice: 2000
        });
        secondaryItems = (autoDrinks.items || []).map(it => ({
          ...it,
          isSecondaryPairing: true
        }));
      } else if (isFashionQuery) {
        const autoMatch = await this._searchLocalProducts({
          query: cleanQ.includes('trouser') || cleanQ.includes('trousher') ? 'top shirt wear basic' : 'men wear trouser pants',
          limit: 3,
          page: 1
        });
        secondaryItems = (autoMatch.items || []).map(it => ({
          ...it,
          isSecondaryPairing: true
        }));
      } else if (isTechQuery) {
        const autoAcc = await this._searchLocalProducts({
          query: 'electronics accessories watch headphones',
          limit: 3,
          page: 1
        });
        secondaryItems = (autoAcc.items || []).map(it => ({
          ...it,
          isSecondaryPairing: true
        }));
      }
    }

    // 3. Calculate Paired Combos
    const pairedCombos = [];
    if (primaryItems.length > 0 && secondaryItems.length > 0) {
      for (let i = 0; i < Math.min(primaryItems.length, 3); i++) {
        const prim = primaryItems[i];
        // Select a complementary item with a distinct product ID
        const sec = secondaryItems.find(s => s.id !== prim.id) || (secondaryItems[i % secondaryItems.length]?.id !== prim.id ? secondaryItems[i % secondaryItems.length] : null);
        if (sec && sec.id !== prim.id) {
          const primPrice = Number(prim.price || 0);
          const secPrice = Number(sec.price || 0);
          const comboTotal = primPrice + secPrice;

          const primText = `${prim.title} ${prim.category || ''}`.toLowerCase();
          const secText = `${sec.title} ${sec.category || ''}`.toLowerCase();

          const isFoodCombo = /burger|crunch|meal|box|breakfast|cereal|oat|chicken|rice|fries|food|snack|sushi/i.test(primText) &&
                              /drink|fanta|sprite|coke|water|juice|beverage|softdrink/i.test(secText);
          const isFashionCombo = /wear|top|trouser|trousher|pants|apparel|fashion|shirt|dress/i.test(primText) ||
                                 /wear|top|trouser|trousher|pants|apparel|fashion|shirt|dress/i.test(secText);
          const isTechCombo = /electronics|watch|phone|tech|headphone/i.test(primText) ||
                              /electronics|accessories|watch|pouch/i.test(secText);

          const comboType = isFoodCombo ? 'food_drink' : isFashionCombo ? 'fashion' : isTechCombo ? 'tech' : 'general';

          pairedCombos.push({
            primaryId: prim.id,
            primaryTitle: prim.title,
            primaryPrice: primPrice,
            secondaryId: sec.id,
            secondaryTitle: sec.title,
            secondaryPrice: secPrice,
            comboPrice: comboTotal,
            currency: prim.currency || 'NGN',
            comboType
          });
        }
      }
    }

    // 3.5. Evaluate Delivery Deadlines & Composite Value Scoring
    if (effectiveDeadline || maxDeliveryDays != null) {
      this.evaluateDeliveryDeadlines(primaryItems, effectiveDeadline, maxDeliveryDays);
      if (secondaryItems.length > 0) {
        this.evaluateDeliveryDeadlines(secondaryItems, effectiveDeadline, maxDeliveryDays);
      }
    }

    this.applyValueScoring(primaryItems, effectiveDeadline, sortBy, cleanQuery);
    if (secondaryItems.length > 0) {
      this.applyValueScoring(secondaryItems, effectiveDeadline, sortBy, secondaryQuery);
    }

    const allItems = [...primaryItems, ...secondaryItems];

    const bestValueItem = primaryItems.find(i => i.isBestValue) || allItems.find(i => i.isBestValue) || null;
    const budgetPickItem = primaryItems.find(i => i.isBudgetPick) || allItems.find(i => i.isBudgetPick) || null;

    let deliveryDeadlineSummary = null;
    if (effectiveDeadline || maxDeliveryDays != null) {
      const allowedDays = this.parseDeadlineToDays(effectiveDeadline, maxDeliveryDays);
      deliveryDeadlineSummary = {
        targetDeadline: effectiveDeadline,
        allowedDays,
        feasibleCount: allItems.filter(i => i.meetsDeadline === true).length,
        unfeasibleCount: allItems.filter(i => i.meetsDeadline === false).length
      };
    }

    return {
      marketCode: market,
      currency: allItems[0]?.currency || (localRes.items?.length > 0 ? 'NGN' : 'USD'),
      total: allItems.length,
      page: Number(page) || 1,
      limit: Number(limit) || 16,
      items: allItems,
      primaryItems,
      secondaryItems,
      pairedCombos,
      pairingContext,
      bestValue: bestValueItem,
      budgetPick: budgetPickItem,
      deliveryDeadline: deliveryDeadlineSummary
    };
  }

  async _searchLocalProducts({ query = '', category, limit = 16, page = 1, minPrice, maxPrice, inStockOnly = false }) {
    const requestedTake = Number(limit) || 16;
    const take = query && query.trim() ? Math.max(requestedTake * 4, 30) : requestedTake;
    const skip = ((Number(page) || 1) - 1) * take;

    // Strictly fetch products from verified or approved sellers
    const where = {
      isArchived: false,
      store: {
        OR: [
          { isVerified: true },
          { approvalStatus: 'APPROVED' }
        ]
      }
    };

    if (query) {
      const cleanQ = query.trim().toLowerCase();
      const isGenericKeyword = /^(products?|items?|goods|everything|all|catalog|store)$/i.test(cleanQ);
      if (!isGenericKeyword) {
        const termsSet = new Set([cleanQ]);
        cleanQ.split(/\s+/).filter(w => w.length > 2).forEach(w => termsSet.add(w));

        // Normalize misspellings
        if (cleanQ.includes('trousher') || cleanQ.includes('trouser') || cleanQ.includes('pants')) {
          ['trouser', 'pants', 'wear', 'men wear'].forEach(t => termsSet.add(t));
        }
        if (cleanQ.includes('pauch') || cleanQ.includes('pouch') || cleanQ.includes('case')) {
          ['pouch', 'case', 'cover', 'accessories'].forEach(t => termsSet.add(t));
        }
        if (cleanQ.includes('sushi')) {
          ['sushi', 'meal', 'food', 'combo', 'rice'].forEach(t => termsSet.add(t));
        }
        if (cleanQ.includes('softdrink') || cleanQ.includes('soft drink') || cleanQ.includes('go-softdrink') || cleanQ.includes('soda')) {
          ['drink', 'fanta', 'sprite', 'coke', 'coca-cola', 'water', 'beverage'].forEach(t => termsSet.add(t));
        }
        if (cleanQ.includes('wristwatch') || cleanQ.includes('smartwatch') || cleanQ.includes('timepiece')) {
          termsSet.add('watch');
        }
        if (cleanQ.includes('sneaker')) termsSet.add('shoe');
        if (cleanQ.includes('cellphone') || cleanQ.includes('mobile') || cleanQ.includes('iphone')) {
          ['phone', 'iphone', 'galaxy', 'mobile'].forEach(t => termsSet.add(t));
        }
        if (cleanQ.includes('earphone') || cleanQ.includes('airpod')) termsSet.add('headphone');
        if (cleanQ.includes('breakfast') || cleanQ.includes('break fast') || cleanQ.includes('morning')) {
          ['breakfast', 'cereal', 'oat', 'egg', 'milk', 'bread', 'juice', 'biscuit', 'meal', 'box', 'combo'].forEach(t => termsSet.add(t));
        }
        if (cleanQ.includes('food') || cleanQ.includes('hungry') || cleanQ.includes('ungry') || cleanQ.includes('eat') || cleanQ.includes('meal')) {
          ['food', 'meal', 'breakfast', 'cereal', 'oat', 'noodle', 'rice', 'egg', 'milk', 'burger', 'chicken', 'fries', 'biscuit', 'snack', 'box', 'combo'].forEach(t => termsSet.add(t));
        }
        if (cleanQ.includes('snack') || cleanQ.includes('biscuit') || cleanQ.includes('cookie') || cleanQ.includes('crisp')) {
          ['snack', 'biscuit', 'crisp', 'cookie', 'fries'].forEach(t => termsSet.add(t));
        }
        if (cleanQ.includes('drink') || cleanQ.includes('beverage') || cleanQ.includes('juice') || cleanQ.includes('water')) {
          ['drink', 'juice', 'water', 'milk', 'fanta', 'coke', 'sprite'].forEach(t => termsSet.add(t));
        }

        const terms = Array.from(termsSet);
        where.OR = terms.flatMap(term => {
          const conditions = [
            { title: { contains: term } },
            { category: { contains: term } },
            { subCategory: { contains: term } }
          ];
          // Only search description/tags for longer terms (>= 5 chars, not 'price', and not drink keywords that match meals)
          const isDrinkKeyword = /drink|beverage|juice|water|softdrink|soda/i.test(term);
          if (term.length >= 5 && term !== 'price' && !isDrinkKeyword) {
            conditions.push({ description: { contains: term } });
            conditions.push({ tags: { contains: term } });
          }
          return conditions;
        });

        // Exclude household/hygiene products from food searches
        if (cleanQ.includes('food') || cleanQ.includes('hungry') || cleanQ.includes('ungry') || cleanQ.includes('eat') || cleanQ.includes('meal') || cleanQ.includes('breakfast') || cleanQ.includes('burger')) {
          where.category = {
            notIn: [
              'Oral Care', 'Bath & Body', 'Tissues & Paper Products',
              'Surface & Floor Cleaners', 'First Aid', 'Laundry Care',
              'Baby Wipes', 'Diapers & Training Pants', 'Food Storage & Wraps'
            ]
          };
        } else if (cleanQ.includes('trouser') || cleanQ.includes('trousher') || cleanQ.includes('shirt') || cleanQ.includes('men wear')) {
          where.category = {
            notIn: [
              'Oral Care', 'Bath & Body', 'Tissues & Paper Products',
              'Surface & Floor Cleaners', 'First Aid', 'Laundry Care',
              'Baby Wipes', 'Diapers & Training Pants', 'Food Storage & Wraps',
              'Vitamins & Supplements'
            ]
          };
        }
      }
    }
    if (category) {
      where.category = { contains: category };
    }
    if (minPrice != null || maxPrice != null) {
      where.price = {};
      if (minPrice != null) where.price.gte = Number(minPrice);
      if (maxPrice != null) where.price.lte = Number(maxPrice);
    }
    if (inStockOnly) {
      where.stock = { gt: 0 };
    }

    try {
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          take,
          skip,
          include: {
            images: true,
            store: {
              select: {
                id: true,
                storeName: true,
                isVerified: true,
                approvalStatus: true,
                averageRating: true,
                country: true,
                portfolioConfig: true
              }
            }
          },
          orderBy: [{ isAdBoosted: 'desc' }, { viewCount: 'desc' }, { createdAt: 'desc' }]
        }),
        prisma.product.count({ where })
      ]);

      const formatted = products.map(p => {
        const stock = Number(p.stock || 0);
        const lowStockThreshold = Number(p.lowStockThreshold || 5);
        const inStock = stock > 0;
        const isLowStock = inStock && stock <= lowStockThreshold;
        let isStoreNegotiable = true;
        try {
          const pCfg = typeof p.store?.portfolioConfig === 'string'
            ? JSON.parse(p.store.portfolioConfig)
            : (p.store?.portfolioConfig || {});
          const prodRule = pCfg.productNegotiationRules?.[p.id];
          if (prodRule && prodRule.isNegotiable === false) {
            isStoreNegotiable = false;
          }
        } catch (_) {}

        return {
          id: p.id,
          isExternal: false,
          provider: 'w-commerce',
          title: p.title,
          description: p.description,
          price: Number(p.price),
          currency: 'NGN',
          stock,
          stockQuantity: stock,
          inStock,
          lowStockThreshold,
          isLowStock,
          shippingFee: Number(p.shippingFee || 0),
          isNegotiable: isStoreNegotiable,
          canNegotiate: isStoreNegotiable,
          imageUrl: resolveBackendProductImage(p),
          seller: {
            id: p.store?.id || 'w-commerce-seller',
            name: p.store?.storeName || 'Verified Local Merchant',
            country: p.store?.country || 'NG',
            isVerified: Boolean(p.store?.isVerified),
            averageRating: p.store?.averageRating != null ? Number(p.store.averageRating) : 4.7
          },
          marketCode: 'NIGERIA',
          rating: p.rating != null ? Number(p.rating) : (p.store?.averageRating != null ? Number(p.store.averageRating) : 4.7),
          fulfillmentType: 'LOCAL_EXPRESS_DISPATCH',
          minTransitDays: 1,
          maxTransitDays: p.estimatedDeliveryDays ? Number(p.estimatedDeliveryDays) : 3,
          estimatedDeliveryDays: p.estimatedDeliveryDays ? Number(p.estimatedDeliveryDays) : 3,
          estimatedDays: p.estimatedDeliveryDays ? `${p.estimatedDeliveryDays} business days` : '1-3 business days'
        };
      });

      return {
        marketCode: 'NIGERIA',
        currency: 'NGN',
        total,
        page: Number(page),
        limit: take,
        items: formatted
      };
    } catch (err) {
      logger.error(`[CatalogSearchService] _searchLocalProducts error: ${err.message}`);
      return {
        marketCode: 'NIGERIA',
        currency: 'NGN',
        total: 0,
        page: 1,
        limit: take,
        items: []
      };
    }
  }

  async _searchInternationalOffers({ query = '', category, provider, limit = 16, page = 1, destinationCountry = 'NG', minPrice, maxPrice }) {
    const rawOffers = await adapterRegistry.searchAll({
      query,
      category,
      provider,
      limit: Number(limit) || 16,
      page: Number(page) || 1,
      minPrice,
      maxPrice
    });

    const validatedOffers = rawOffers.map(offer => {
      const eligibility = marketService.validateEligibility({
        marketCode: 'INTERNATIONAL',
        sellerCountry: offer.sellerCountry,
        destinationCountry,
        category: offer.category
      });

      const providerLower = (offer.provider || 'amazon').toLowerCase();
      let minTransitDays = 4;
      let maxTransitDays = 7;
      let estDaysStr = '4-7 business days';

      if (providerLower === 'aliexpress') {
        minTransitDays = 10;
        maxTransitDays = 16;
        estDaysStr = '10-16 business days';
      } else if (providerLower === 'ebay') {
        minTransitDays = 7;
        maxTransitDays = 12;
        estDaysStr = '7-12 business days';
      } else if (providerLower === 'asos') {
        minTransitDays = 6;
        maxTransitDays = 9;
        estDaysStr = '6-9 business days';
      }

      const stockQty = Number(offer.stockQuantity ?? 25);

      return {
        id: offer.externalProductId,
        externalOfferId: offer.externalProductId,
        isExternal: true,
        provider: offer.provider,
        title: offer.title,
        description: offer.description,
        price: Number(offer.price),
        originalPrice: offer.originalPrice ? Number(offer.originalPrice) : null,
        currency: offer.listingCurrency,
        stockQuantity: stockQty,
        stock: stockQty,
        inStock: stockQty > 0,
        imageUrl: resolveBackendProductImage(offer, offer.imageUrl),
        url: offer.url,
        seller: {
          name: offer.sellerName,
          country: offer.sellerCountry,
          originCountry: offer.originCountry,
          averageRating: offer.rating || 4.8
        },
        rating: offer.rating || 4.8,
        reviewCount: offer.reviewCount,
        canNegotiate: offer.canNegotiate,
        eligible: eligibility.eligible,
        eligibilityReason: eligibility.reason,
        marketCode: 'INTERNATIONAL',
        fulfillmentType: 'GLOBAL_IMPORT_PAYAI',
        minTransitDays,
        maxTransitDays,
        estimatedDeliveryDays: maxTransitDays,
        estimatedDays: estDaysStr
      };
    });

    return {
      marketCode: 'INTERNATIONAL',
      currency: 'USD',
      total: validatedOffers.length,
      page: Number(page) || 1,
      limit: Number(limit) || 16,
      items: validatedOffers
    };
  }

  /**
   * Compare multiple offers side-by-side
   */
  async compareOffers(offerIdentifiers = []) {
    if (!Array.isArray(offerIdentifiers) || offerIdentifiers.length === 0) {
      return { comparisons: [] };
    }

    const comparisons = [];
    for (const item of offerIdentifiers) {
      const { provider, productId } = typeof item === 'string' ? { provider: 'amazon', productId: item } : item;

      if (!provider || provider === 'local' || provider === 'w-commerce') {
        const local = await prisma.product.findUnique({
          where: { id: productId },
          include: { images: true, store: true }
        });
        if (local) {
          comparisons.push({
            id: local.id,
            provider: 'Local W-Commerce',
            title: local.title,
            price: Number(local.price),
            currency: 'NGN',
            shippingEst: Number(local.shippingFee || 2500),
            landedCostEst: Number(local.price) + Number(local.shippingFee || 2500),
            landedCostCurrency: 'NGN',
            stock: Number(local.stock || 0),
            inStock: Number(local.stock || 0) > 0,
            rating: local.rating || local.store?.averageRating || 4.8,
            seller: local.store?.storeName || 'Local Seller',
            origin: 'Nigeria',
            speed: local.estimatedDeliveryDays ? `${local.estimatedDeliveryDays} days` : '1-3 days',
            canNegotiate: Boolean(local.isNegotiable),
            imageUrl: resolveBackendProductImage(local),
            buyerProtection: 'W-Commerce Escrow Protection'
          });
        }
      } else {
        try {
          const details = await adapterRegistry.getProductDetails(provider, productId);
          const adapter = adapterRegistry.getAdapter(provider);
          const shipping = adapter && typeof adapter.getShippingQuote === 'function'
            ? await adapter.getShippingQuote({ externalProductId: productId, weightKg: details.weightKg || 1 })
            : { shippingCost: 18.50, estimatedDays: '5-8 business days' };
          const estimatedDuties = Math.round((details.price * 0.05) * 100) / 100; // 5% est
          const landedUsd = Math.round((details.price + shipping.shippingCost + estimatedDuties) * 100) / 100;

            comparisons.push({
              id: details.externalProductId,
              provider: provider.toUpperCase(),
              title: details.title,
              price: details.price,
              currency: details.listingCurrency,
              shippingEst: shipping.shippingCost,
              dutiesEst: estimatedDuties,
              landedCostEst: landedUsd,
              landedCostCurrency: 'USD',
              rating: details.rating,
              seller: details.sellerName,
              origin: details.originCountry,
              speed: shipping.estimatedDays,
              canNegotiate: details.canNegotiate,
              buyerProtection: 'PayAI Guaranteed + PayPal Buyer Protection'
            });
          } catch (e) {
            // ignore item if lookup fails
          }
        }
      }

    return { comparisons };
  }

  /**
   * Real-time stock / inventory and price check for native W-Commerce product
   */
  async checkProductStock(productId, requestedQuantity = 1) {
    if (!productId) {
      return { found: false, available: false, reason: 'Product ID is required' };
    }

    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { store: true, images: true }
      });

      if (!product) {
        return { found: false, available: false, reason: 'Product not found in W-Commerce database' };
      }

      if (product.isArchived) {
        return {
          found: true,
          productId: product.id,
          title: product.title,
          available: false,
          inStock: false,
          currentStock: 0,
          reason: 'This product has been archived or discontinued by the seller'
        };
      }

      const reqQty = Math.max(1, Number(requestedQuantity) || 1);
      const stock = Number(product.stock || 0);
      const inStock = stock >= reqQty;
      const lowStockThreshold = Number(product.lowStockThreshold || 5);
      const isLowStock = stock > 0 && stock <= lowStockThreshold;
      const deliveryLeadTime = product.estimatedDeliveryDays
        ? `${product.estimatedDeliveryDays} business days`
        : '1-3 business days';

      return {
        found: true,
        productId: product.id,
        title: product.title,
        price: Number(product.price),
        currency: 'NGN',
        stock,
        stockCount: stock,
        requestedQuantity: reqQty,
        available: inStock,
        inStock,
        isLowStock,
        lowStockThreshold,
        lowStockWarning: isLowStock ? `Warning: Low stock! Only ${stock} items left.` : null,
        shippingFee: Number(product.shippingFee || 0),
        estimatedDeliveryDays: product.estimatedDeliveryDays || 5,
        deliveryLeadTime,
        isNegotiable: Boolean(product.isNegotiable),
        canNegotiate: Boolean(product.isNegotiable),
        imageUrl: resolveBackendProductImage(product),
        seller: {
          id: product.store?.id,
          name: product.store?.storeName || 'Verified Merchant',
          isVerified: Boolean(product.store?.isVerified)
        },
        reason: inStock
          ? (isLowStock ? `Only ${stock} left in stock - order soon!` : 'In stock and ready to ship')
          : (stock === 0 ? 'Currently out of stock' : `Only ${stock} available, less than requested ${reqQty}`)
      };
    } catch (err) {
      logger.error(`[CatalogSearchService] checkProductStock error: ${err.message}`);
      return { found: false, available: false, reason: err.message };
    }
  }

  /**
   * Dynamic Price Negotiation Engine for W-Commerce native products
   * Evaluates buyer offer against seller's bottom price and negotiation settings
   */
  async negotiateProductPrice({
    productId,
    proposedPrice,
    offerAmount,
    requestedDiscountPct,
    userId,
    cartId,
    sessionId,
    provider,
    url
  }) {
    // Purpose 1: Negotiation is strictly W-Commerce ONLY
    const isExternalProvider = provider && !['w-commerce', 'local'].includes(String(provider).toLowerCase());
    const isExternalUrl = url && (
      /amazon|aliexpress|ebay|asos/i.test(String(url)) ||
      (!String(url).includes('w-commerce') && (String(url).startsWith('http://') || String(url).startsWith('https://')))
    );
    const isExternalId = productId && (
      /^(amz|ali|ebay|asos)-/i.test(String(productId)) ||
      String(productId).startsWith('http://') ||
      String(productId).startsWith('https://')
    );

    if (isExternalProvider || isExternalUrl || isExternalId) {
      return {
        success: false,
        accepted: false,
        rejected: true,
        isNegotiable: false,
        message: 'Price negotiation is exclusively supported for native W-Commerce sellers. External store items cannot be negotiated.'
      };
    }

    if (!productId) {
      return {
        success: false,
        accepted: false,
        message: 'Product ID is required for price negotiation.'
      };
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        store: true,
        images: true
      }
    });

    if (!product) {
      return {
        success: false,
        accepted: false,
        message: `Product with ID ${productId} was not found.`
      };
    }

    const listingPrice = Number(product.price);
    const currency = 'NGN';

    // 1. Check if seller allows negotiation
    if (!product.isNegotiable) {
      return {
        success: true,
        accepted: false,
        isNegotiable: false,
        productId: product.id,
        title: product.title,
        currentPrice: listingPrice,
        currency,
        message: `The seller of "${product.title}" has set a fixed price of ₦${listingPrice.toLocaleString()} NGN. Price negotiation is not enabled for this product.`
      };
    }

    // 2. Determine seller's bottom price (minimum acceptable price)
    // If seller enabled negotiation but didn't set a specific bottom price, floor is 10% discount (90% of listing price)
    const bottomPrice = product.bottomPrice != null
      ? Number(product.bottomPrice)
      : Math.round(listingPrice * 0.90 * 100) / 100;

    // 3. Determine buyer's proposed price
    let proposed = proposedPrice != null
      ? Number(proposedPrice)
      : (offerAmount != null ? Number(offerAmount) : null);

    if (proposed == null && requestedDiscountPct != null) {
      proposed = Math.round((listingPrice * (1 - Number(requestedDiscountPct) / 100)) * 100) / 100;
    }

    if (proposed == null) {
      // Default initial offer if buyer simply asked to negotiate: 10% discount
      proposed = Math.round(listingPrice * 0.90 * 100) / 100;
    }

    // 4. Evaluate proposed offer against seller bottom price
    if (proposed >= listingPrice) {
      // Buyer offered full or higher price
      return {
        success: true,
        accepted: true,
        isNegotiable: true,
        productId: product.id,
        title: product.title,
        originalPrice: listingPrice,
        negotiatedPrice: listingPrice,
        savings: 0,
        discountPct: 0,
        currency,
        message: `Your offer of ₦${proposed.toLocaleString()} NGN meets the seller's asking price. Unit price confirmed at ₦${listingPrice.toLocaleString()} NGN.`
      };
    }

    if (proposed >= bottomPrice) {
      // Offer is acceptable to seller! Accept and record negotiated price
      const savings = Math.round((listingPrice - proposed) * 100) / 100;
      const discountPct = Math.round((savings / listingPrice) * 100);

      // Record in cart if cartId or sessionId available
      let cartUpdated = false;
      try {
        const cartService = require('./cartService');
        const activeCart = await cartService.getOrCreateCart({ userId, sessionId, marketCode: 'NIGERIA', currency: 'NGN' });
        if (activeCart) {
          await cartService.recordNegotiatedPrice(activeCart.id, {
            productId: product.id,
            title: product.title,
            originalPrice: listingPrice,
            negotiatedPrice: proposed,
            discountPct,
            currency: 'NGN',
            imageUrl: product.images?.[0]?.url || null,
            sellerName: product.store?.storeName || 'Verified Local Merchant'
          });
          cartUpdated = true;
        }
      } catch (cartErr) {
        logger.warn(`[CatalogSearchService] Could not update cart with negotiated price: ${cartErr.message}`);
      }

      // Record in ProductOffer if userId available
      if (userId && product.store?.sellerId) {
        try {
          await prisma.productOffer.create({
            data: {
              productId: product.id,
              buyerId: userId,
              sellerId: product.store.sellerId,
              offerAmount: proposed,
              quantity: 1,
              message: `Accepted via PayAI Dynamic Negotiation: ₦${proposed} (Original: ₦${listingPrice})`,
              status: 'ACCEPTED'
            }
          });
        } catch (offerErr) {
          logger.warn(`[CatalogSearchService] Could not create ProductOffer record: ${offerErr.message}`);
        }
      }

      return {
        success: true,
        accepted: true,
        isNegotiable: true,
        productId: product.id,
        title: product.title,
        originalPrice: listingPrice,
        negotiatedPrice: proposed,
        savings,
        discountPct,
        currency,
        cartUpdated,
        message: `Deal accepted! The seller agreed to your offer of ₦${proposed.toLocaleString()} NGN (a ${discountPct}% discount, saving ₦${savings.toLocaleString()} NGN). The negotiated price of ₦${proposed.toLocaleString()} NGN has been locked into your cart/quote.`
      };
    } else {
      // Proposed offer is below seller's bottom price: counter-offer at bottomPrice or midpoint
      // Midpoint between proposed offer and listing price
      const rawMidpoint = Math.round(((proposed + listingPrice) / 2) * 100) / 100;
      // Counter-offer must not be lower than seller's bottomPrice, and not higher than listing price
      const counterOffer = Math.round(Math.max(bottomPrice, Math.min(rawMidpoint, listingPrice)) * 100) / 100;
      const potentialSavings = Math.round((listingPrice - counterOffer) * 100) / 100;
      const counterDiscountPct = Math.round((potentialSavings / listingPrice) * 100);

      return {
        success: true,
        accepted: false,
        counterOffer: true,
        isNegotiable: true,
        productId: product.id,
        title: product.title,
        originalPrice: listingPrice,
        proposedPrice: proposed,
        minimumAcceptablePrice: bottomPrice,
        counterOfferPrice: counterOffer,
        potentialSavings,
        discountPct: counterDiscountPct,
        currency,
        message: `The seller cannot go below ₦${bottomPrice.toLocaleString()} NGN, but I can offer it to you for ₦${counterOffer.toLocaleString()} NGN. Would you like to accept this deal?`
      };
    }
  }

  /**
   * Value vs. Cheapest composite scoring engine
   * Balances price (35%), seller rating (30%), stock health (15%), and delivery speed (20%)
   * Highlights 'Best Value' vs 'Budget Pick' and ranks by overall valueScore
   */
  applyValueScoring(items = [], deadline = null, sortBy = 'value', searchQuery = '') {
    if (!Array.isArray(items) || items.length === 0) return items;

    // 1. Calculate normalized prices for fair cross-currency price comparison
    const normPrices = items.map(it => {
      const p = Number(it.price) || 0;
      const curr = (it.currency || 'NGN').toUpperCase();
      return curr === 'USD' ? p * 1480 : p;
    });

    const minPrice = Math.min(...normPrices);
    const maxPrice = Math.max(...normPrices);
    const priceRange = maxPrice - minPrice;

    // 2. Score each item
    for (let idx = 0; idx < items.length; idx++) {
      const it = items[idx];
      const normPrice = normPrices[idx];

      // A. Price Score (35% weight): Cheaper price = higher score
      let priceScore = 1.0;
      if (priceRange > 0) {
        priceScore = 1.0 - ((normPrice - minPrice) / priceRange);
      }

      // B. Seller Rating Score (30% weight): Rating from store.averageRating / it.rating (0-5 scale)
      const sellerRating = Number(it.seller?.averageRating ?? it.rating ?? 4.5);
      const ratingScore = Math.min(Math.max(sellerRating / 5.0, 0), 1.0);

      // C. Stock Health Score (15% weight)
      const stock = Number(it.stock ?? it.stockQuantity ?? 10);
      let stockScore = 0.5;
      if (stock <= 0) {
        stockScore = 0.0;
      } else if (stock <= 3) {
        stockScore = 0.4;
      } else if (stock <= 10) {
        stockScore = 0.8;
      } else {
        stockScore = 1.0;
      }

      // D. Delivery Speed Score (20% weight)
      const transitDays = Number(it.maxTransitDays ?? it.estimatedDeliveryDays ?? 3);
      let speedScore = Math.max(0.1, Math.min(1.0, 1.0 - (transitDays - 1) / 20));

      // Feasibility penalty if item fails a requested delivery deadline
      if (it.deliveryDeadlineCheck && it.deliveryDeadlineCheck.feasible === false) {
        speedScore *= 0.4;
      }

      // E. Title Relevance Score Boost
      let relevanceBoost = 0;
      if (searchQuery && typeof searchQuery === 'string') {
        const cleanQuery = searchQuery.toLowerCase().trim();
        const titleLower = (it.title || '').toLowerCase().trim();
        if (titleLower === cleanQuery) {
          relevanceBoost = 60;
        } else if (titleLower.includes(cleanQuery) || cleanQuery.includes(titleLower)) {
          relevanceBoost = 40;
        } else {
          const queryWords = cleanQuery.split(/\s+/).filter(w => w.length > 2 && !['want', 'need', 'give', 'like', 'food'].includes(w));
          const matchedWords = queryWords.filter(w => titleLower.includes(w));
          if (queryWords.length > 0 && matchedWords.length === queryWords.length) {
            relevanceBoost = 35;
          } else if (matchedWords.length > 0) {
            relevanceBoost = (matchedWords.length / queryWords.length) * 20;
          }
        }
      }

      // Composite Value Score (0 - 100) + relevance boost
      const compositeRaw = (priceScore * 0.35) + (ratingScore * 0.30) + (stockScore * 0.15) + (speedScore * 0.20);
      const valueScore = Math.round((compositeRaw * 100 + relevanceBoost) * 10) / 10;

      it.valueScore = valueScore;
      it.valueBreakdown = {
        priceScore: Math.round(priceScore * 100),
        ratingScore: Math.round(ratingScore * 100),
        stockScore: Math.round(stockScore * 100),
        speedScore: Math.round(speedScore * 100)
      };
      it._normPrice = normPrice;
    }

    // 3. Identify "Best Value" (highest valueScore) and "Budget Pick" (lowest sticker price among in-stock items)
    const inStockItems = items.filter(i => (i.stock ?? i.stockQuantity ?? 1) > 0);
    const candidateBudgetItems = inStockItems.length > 0 ? inStockItems : items;

    let bestValueItem = items[0];
    for (const it of items) {
      if (it.valueScore > bestValueItem.valueScore) {
        bestValueItem = it;
      }
    }

    let budgetPickItem = candidateBudgetItems[0];
    for (const it of candidateBudgetItems) {
      if (it._normPrice < budgetPickItem._normPrice) {
        budgetPickItem = it;
      }
    }

    // 4. Highlight items
    for (const it of items) {
      it.isBestValue = (it.id === bestValueItem.id);
      it.isBudgetPick = (it.id === budgetPickItem.id);

      if (it.isBestValue && it.isBudgetPick) {
        it.badge = 'Best Value & Budget Pick';
        it.valueTag = 'Best Value';
      } else if (it.isBestValue) {
        it.badge = 'Best Value';
        it.valueTag = 'Best Value';
      } else if (it.isBudgetPick) {
        it.badge = 'Budget Pick';
        it.valueTag = 'Budget Pick';
      } else {
        it.badge = null;
        it.valueTag = 'Standard';
      }
    }

    // 5. Rank by best overall value (valueScore descending) rather than solely lowest sticker price
    if (sortBy === 'price_asc') {
      items.sort((a, b) => a._normPrice - b._normPrice);
    } else if (sortBy === 'price_desc') {
      items.sort((a, b) => b._normPrice - a._normPrice);
    } else {
      // Default: Rank by best overall valueScore
      items.sort((a, b) => b.valueScore - a.valueScore);
    }

    return items;
  }

  /**
   * Calculate single item valueScore against optional context
   */
  calculateValueScore(item, itemsContext = []) {
    const list = itemsContext.length > 0 ? [...itemsContext] : [item];
    if (!list.some(i => i.id === item.id)) list.push(item);
    this.applyValueScoring(list);
    const scored = list.find(i => i.id === item.id) || list[0];
    return {
      valueScore: scored.valueScore,
      valueBreakdown: scored.valueBreakdown,
      badge: scored.badge,
      isBestValue: Boolean(scored.isBestValue),
      isBudgetPick: Boolean(scored.isBudgetPick)
    };
  }

  /**
   * Evaluate delivery deadline across item array
   */
  evaluateDeliveryDeadlines(items = [], deadline = null, maxDeliveryDays = null) {
    if (!Array.isArray(items) || items.length === 0) return items;
    if (!deadline && maxDeliveryDays == null) return items;

    for (const it of items) {
      const check = this.checkDeliveryFeasibility(it, deadline, maxDeliveryDays);
      it.deliveryDeadlineCheck = check;
      it.meetsDeadline = check.feasible;
    }
    return items;
  }

  /**
   * Check single item delivery feasibility against target deadline
   */
  checkDeliveryFeasibility(item, deadlineInput, maxDays = null) {
    const allowedDays = this.parseDeadlineToDays(deadlineInput, maxDays);
    const { minTransitDays, maxTransitDays, estimatedDays } = this.extractTransitDays(item);

    if (allowedDays == null) {
      return {
        feasible: true,
        meetsDeadline: true,
        targetDeadline: deadlineInput,
        allowedDays: null,
        minTransitDays,
        maxTransitDays,
        estimatedDays,
        confidence: 'MEDIUM',
        reason: 'No strict deadline constraint specified.'
      };
    }

    const feasible = maxTransitDays <= allowedDays;
    const estimatedDeliveryDate = new Date(Date.now() + maxTransitDays * 24 * 60 * 60 * 1000);

    return {
      feasible,
      meetsDeadline: feasible,
      targetDeadline: deadlineInput,
      allowedDays,
      minTransitDays,
      maxTransitDays,
      estimatedDays,
      estimatedDeliveryDate: estimatedDeliveryDate.toISOString().split('T')[0],
      confidence: feasible ? 'HIGH' : 'LOW',
      reason: feasible
        ? `Estimated delivery within ${maxTransitDays} days arrives before target deadline (${allowedDays} days)`
        : `Estimated delivery of ${maxTransitDays} days exceeds target deadline (${allowedDays} days)`
    };
  }

  /**
   * Extract min and max transit days for any item
   */
  extractTransitDays(item) {
    let minDays = item?.minTransitDays || 1;
    let maxDays = item?.maxTransitDays || item?.estimatedDeliveryDays;

    if (!maxDays && item?.estimatedDays) {
      const match = String(item.estimatedDays).match(/(\d+)\s*(?:-\s*(\d+))?/);
      if (match) {
        minDays = Number(match[1]);
        maxDays = match[2] ? Number(match[2]) : Number(match[1]);
      }
    }

    if (!maxDays) {
      const prov = (item?.provider || '').toLowerCase();
      if (prov === 'aliexpress') {
        minDays = 10;
        maxDays = 16;
      } else if (prov === 'amazon') {
        minDays = 4;
        maxDays = 7;
      } else if (prov === 'ebay') {
        minDays = 7;
        maxDays = 12;
      } else if (prov === 'asos') {
        minDays = 6;
        maxDays = 9;
      } else {
        minDays = 1;
        maxDays = 3;
      }
    }

    return {
      minTransitDays: minDays,
      maxTransitDays: maxDays,
      estimatedDays: item?.estimatedDays || `${minDays}-${maxDays} business days`
    };
  }

  /**
   * Helper to parse natural deadline queries into integer days
   */
  parseDeadlineToDays(deadlineStr, maxDays = null) {
    if (maxDays != null) return Number(maxDays);
    if (!deadlineStr) return null;
    if (typeof deadlineStr === 'number') return deadlineStr;
    const lower = String(deadlineStr).toLowerCase().trim();

    const daysMatch = lower.match(/\b(?:within|in|under)?\s*(\d+)\s*(?:business\s+)?days?\b/i);
    if (daysMatch) return parseInt(daysMatch[1], 10);

    const hoursMatch = lower.match(/\b(?:within|in)?\s*(\d+)\s*hours?\b/i);
    if (hoursMatch) return Math.ceil(parseInt(hoursMatch[1], 10) / 24);

    if (lower.includes('tomorrow')) return 1;
    if (lower.includes('today')) return 0;

    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (let i = 0; i < daysOfWeek.length; i++) {
      if (lower.includes(daysOfWeek[i])) {
        const todayDay = new Date().getDay();
        let diff = i - todayDay;
        if (diff <= 0) diff += 7;
        return diff;
      }
    }

    const parsedDate = new Date(deadlineStr);
    if (!isNaN(parsedDate.getTime())) {
      const now = new Date();
      const diffMs = parsedDate.getTime() - now.getTime();
      return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    return null;
  }
}

module.exports = new CatalogSearchService();
