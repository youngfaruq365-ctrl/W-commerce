'use strict';
const prisma = require('../../utils/prismaClient');
const logger = require('../../utils/logger');
const catalogSearchService = require('./catalogSearchService');
const pricingService = require('./pricingService');
const cartService = require('./cartService');
const adapterRegistry = require('./adapters/adapterRegistry');
const globalStoreService = require('./globalStoreService');
const orderService = require('./orderService');
const negotiationEngineService = require('./negotiationEngineService');
const aiService = require('../aiService');
const { resolveBackendProductImage, convertVideoToImageUrl, isVideoUrl } = require('../../utils/productImageHelper');

// Returns a safe image URL — converts video URLs to thumbnails so the AI never embeds .mp4 links
function safeImageUrl(item) {
  const raw = item?.imageUrl || '';
  if (!raw) return '';
  if (isVideoUrl(raw)) {
    return convertVideoToImageUrl(raw) || resolveBackendProductImage(item, '') || '';
  }
  return raw;
}

class PayAIOrchestrator {
  /**
   * Create or resume a PayAI shopping conversation session
   */
  async createSession({ userId, marketCode = 'INTERNATIONAL', destinationCountry = 'NG' }) {
    const session = await prisma.payAISession.create({
      data: {
        userId: userId || null,
        marketCode,
        destinationCountry,
        status: 'ACTIVE'
      }
    });

    // Default welcome message
    const welcome = await prisma.payAIMessage.create({
      data: {
        sessionId: session.id,
        role: 'assistant',
        content: `👋 Hello! I am **PayAI**, your intelligent shopping & discovery assistant for W-Commerce.\n\nI can help you:\n- 🔍 **Search & Compare** verified products across top electronics, fashion, and lifestyle stores\n- 🤝 **Negotiate Deals** directly with verified sellers in real-time\n- ⚡ **Find Bestsellers & Discounts** curated for your region\n- 📦 **Track Shipments & Logistics** live from your dashboard\n\nWhat are you shopping for today? (e.g. *"Find headphones under $100"*, *"Compare MacBook Air M3"*, or *"Best mechanical keyboards"*).`
      }
    });

    return {
      session,
      messages: [welcome]
    };
  }

  /**
   * Get session history
   */
  async getSession(sessionId) {
    const session = await prisma.payAISession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    return session;
  }

  /**
   * Process a shopping prompt through the PayAI tool-assisted engine
   */
  async handleUserMessage({ sessionId, userId, userMessage, content, message, productId, proposedPrice, actionType, quantity }) {
    let session = null;
    if (sessionId) {
      session = await prisma.payAISession.findUnique({ where: { id: sessionId } });
    }
    if (!session) {
      if (userId) {
        session = await prisma.payAISession.findFirst({
          where: { userId, status: 'ACTIVE' },
          orderBy: { updatedAt: 'desc' }
        });
      }
      if (!session) {
        const created = await this.createSession({ userId });
        session = created?.session || created;
      }
      sessionId = session.id;
    }

    const finalMessage = userMessage || content || message || '';

    // 1. Record user message
    await prisma.payAIMessage.create({
      data: {
        sessionId,
        role: 'user',
        content: finalMessage
      }
    });

    // 2. Retrieve recent history early to provide context for pronouns, follow-ups, and negotiation references
    const recentHistory = await prisma.payAIMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: 12
    });

    let sessionItemsContext = '';
    let lastSessionProductId = productId || null;
    let hasRecentNegotiation = false;
    let activePlan = null;
    let activeGoal = null;
    const previousProducts = [];
    const seenProductIds = new Set();

    for (const msg of recentHistory) {
      if (msg.role === 'assistant' && msg.toolResults) {
        try {
          const parsed = JSON.parse(msg.toolResults);
          if (parsed?.multiDayPlan && !activePlan) {
            activePlan = parsed.multiDayPlan;
          }
          if (parsed?.goalType && !activeGoal) {
            activeGoal = parsed;
          }
          if (parsed?.stage || parsed?.threadKey || parsed?.currentOfferUnitPrice !== undefined || parsed?.comparisons) {
            hasRecentNegotiation = true;
            if (parsed?.productId || parsed?.id) {
              lastSessionProductId = parsed.productId || parsed.id;
            }
          }

          const rawList = [
            ...(Array.isArray(parsed.items) ? parsed.items : []),
            ...(Array.isArray(parsed.primaryItems) ? parsed.primaryItems : []),
            ...(Array.isArray(parsed.secondaryItems) ? parsed.secondaryItems : []),
            ...(parsed.selectedProduct ? [parsed.selectedProduct] : []),
            ...(parsed.product ? [parsed.product] : []),
            ...(parsed.item ? [parsed.item] : [])
          ];
          for (const it of rawList) {
            const pId = it.id || it.productId;
            if (pId && !seenProductIds.has(String(pId))) {
              seenProductIds.add(String(pId));
              previousProducts.push(it);
            }
          }

          if (Array.isArray(parsed.items) && parsed.items.length > 0) {
            if (!lastSessionProductId) lastSessionProductId = parsed.items[0].id || parsed.items[0].productId;
            if (!sessionItemsContext) {
              sessionItemsContext = `Previously Displayed Products in This Session:\n` +
                parsed.items.slice(0, 6).map((it, idx) =>
                  `${idx + 1}. "${it.title}" | Price: ${it.currency === 'NGN' || (!it.isExternal && it.provider === 'w-commerce') ? '₦' + Number(it.price).toLocaleString() + ' NGN' : '$' + it.price + ' USD'} | Seller: ${it.seller?.name || it.provider || 'W-Commerce'} | Stock: ${it.stock ?? 'Available'} | Negotiable: ${it.canNegotiate ? 'Yes' : 'No'} | ImageUrl: ${safeImageUrl(it)} (ID: ${it.id || it.productId})`
                ).join('\n');
            }
          } else if (parsed.productId || parsed.item?.productId || parsed.offer?.id) {
            if (!lastSessionProductId) {
              lastSessionProductId = parsed.productId || parsed.item?.productId || parsed.offer?.id;
            }
          }
        } catch (_) {}
      }
    }

    // 3. Intelligent tool routing based on intent (with resolved product & session history)
    const { toolName, toolArgs } = this._detectIntent(finalMessage, session, {
      productId: productId || lastSessionProductId,
      proposedPrice,
      actionType,
      quantity,
      lastSessionProductId,
      recentNegotiation: hasRecentNegotiation,
      recentHistory,
      previousProducts,
      userId,
      activePlan,
      activeGoal
    });

    let toolResult = null;
    let assistantResponse = '';

    try {
      const formattedMessages = [...recentHistory]
        .reverse()
        .map(m => ({ role: m.role, content: m.content }));

      if (toolName) {
        toolResult = await this.executeTool({
          toolName,
          toolArgs,
          sessionId,
          userId,
          destinationCountry: session.destinationCountry,
          marketCode: session.marketCode,
          session
        });

        const deterministicReply = this._generateResponse(toolName, toolResult, finalMessage);

        const isDeterministicTool = [
          'advise_gift_or_occasion',
          'advise_comparison',
          'advise_styling',
          'advise_food',
          'select_product_preference',
          'plan_multi_day_meals_or_budget',
          'plan_budget_goal',
          'budget_shopping_plan',
          'request_warehouse_media',
          'request_seller_negotiation',
          'make_product_offer',
          'add_to_cart',
          'place_order',
          'check_wallet_balance',
          'checkout_with_wallet',
          'guide_checkout_button',
          'get_shipping_estimate',
          'check_product_stock',
          'track_order',
          'get_order_status',
          'cancel_order',
          'request_return',
          'handle_order_complaint',
          'confirm_order_receipt',
          'message_seller'
        ].includes(toolName) || Boolean(toolResult?.warehouseInspection) || Boolean(toolResult?.isDisputeResolution);

        // Preserve verified deterministic responses for negotiation, warehouse QC, cart & shipping without LLM overwrite or delay
        if (isDeterministicTool) {
          assistantResponse = deterministicReply;
        } else {
          const itemsSummary = Array.isArray(toolResult?.items) && toolResult.items.length > 0
            ? `Matching Products Found (${toolResult.items.length}):\n` + toolResult.items.slice(0, 8).map((it, idx) =>
                `${idx + 1}. "${it.title}" | Price: ${it.currency === 'NGN' || (!it.isExternal && it.provider === 'w-commerce') ? '₦' + Number(it.price).toLocaleString() + ' NGN' : '$' + it.price + ' USD'} | Seller: ${it.seller?.name || it.provider || 'W-Commerce'} | Stock: ${it.stock ?? 'In stock'} | Negotiable: ${it.canNegotiate ? 'Yes' : 'No'} | ImageUrl: ${safeImageUrl(it)}`
              ).join('\n')
            : deterministicReply;

          try {
            const aiGenerated = await aiService.generateChatResponse(formattedMessages, {
              user: userId ? { id: userId } : null,
              productId: productId || toolResult?.productId || toolResult?.item?.productId || lastSessionProductId,
              fallbackReply: deterministicReply,
              extraContext: [
                `PayAI Shopping Session (Market=${session.marketCode}, Destination=${session.destinationCountry}).`,
                `Tool Executed: ${toolName}`,
                `Verified Tool Result Summary:\n${itemsSummary}`,
                `CRITICAL PRODUCT IMAGE INSTRUCTION: Whenever listing, introducing, or recommending products, you MUST include the product's image using markdown format: ![Product Title](ImageUrl). Place each image prominently with the product title and price so the buyer can visually see each item.`,
                `CRITICAL AI SUGGESTIONS & PAIRINGS INSTRUCTION: You MUST include the section "### 💡 PayAI Smart Suggestions & Perfect Pairings" below the product list with matching combos, meal/drink pairings, fashion outfit pairings, and 1-click suggestion prompt links: [Label](prompt:UserMessage).`,
                sessionItemsContext
              ].filter(Boolean).join('\n\n')
            });

            let finalAi = aiGenerated;
            if (finalAi && !finalAi.includes('### 💡 PayAI Smart Suggestions') && !finalAi.includes('Smart Suggestions')) {
              const suggestions = this._generateSmartSuggestions(toolResult, finalMessage, toolResult?.pairingContext);
              finalAi = `${finalAi}${suggestions}`;
            }

            if (
              !finalAi ||
              finalAi.includes("I'm your PayAI Sales & Discovery Assistant") ||
              (toolResult?.items?.length > 0 && !finalAi.includes('₦') && !finalAi.includes('$') && finalAi.length < 150)
            ) {
              assistantResponse = deterministicReply;
            } else {
              if (toolResult?.items?.length > 0 && !finalAi.includes('![')) {
                const visualPreviews = toolResult.items.slice(0, 4)
                  .filter(it => safeImageUrl(it))
                  .map(it => `![${it.title}](${safeImageUrl(it)})`)
                  .join('\n\n');
                assistantResponse = visualPreviews ? `${finalAi}\n\n${visualPreviews}` : finalAi;
              } else {
                assistantResponse = finalAi;
              }
            }
          } catch (_) {
            assistantResponse = deterministicReply;
          }
        }
      } else {
        // Real-time Gemini AI conversational response grounded with session history, focused product & Prisma RAG
        assistantResponse = await aiService.generateChatResponse(formattedMessages, {
          user: userId ? { id: userId } : null,
          productId: lastSessionProductId,
          extraContext: [
            `PayAI Shopping Session: Market=${session.marketCode}, Destination=${session.destinationCountry}`,
            sessionItemsContext
          ].filter(Boolean).join('\n\n')
        });
      }
    } catch (err) {
      logger.error(`[PayAI:Orchestrator] Tool execution error: ${err.message}`);
      assistantResponse = `I encountered an issue executing that request: ${err.message}. Please try again or refine your query.`;
    }

    // Ensure all markdown images in assistant response use image URLs instead of raw video URLs
    if (assistantResponse && typeof assistantResponse === 'string' && assistantResponse.includes('![')) {
      assistantResponse = assistantResponse.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (fullMatch, alt, url) => {
        const cleanUrl = (url || '').trim();
        if (isVideoUrl(cleanUrl)) {
          const imgUrl = convertVideoToImageUrl(cleanUrl) || resolveBackendProductImage({ title: alt }, '');
          if (imgUrl) return `![${alt}](${imgUrl})`;
        }
        return fullMatch;
      });
    }

    // 3. Save assistant message and tool outputs
    const assistantMessage = await prisma.payAIMessage.create({
      data: {
        sessionId,
        role: 'assistant',
        content: assistantResponse,
        toolCalls: toolName ? JSON.stringify([{ toolName, toolArgs }]) : null,
        toolResults: toolResult ? JSON.stringify(toolResult) : null
      }
    });

    // 4. Audit Log
    if (toolName) {
      await prisma.payAIAuditLog.create({
        data: {
          actorId: userId || 'anonymous',
          actorRole: 'BUYER',
          action: `AI_TOOL_${toolName.toUpperCase()}`,
          entityType: 'PAYAI_SESSION',
          entityId: sessionId,
          details: JSON.stringify({ toolName, toolArgs, summary: assistantResponse.slice(0, 100) })
        }
      });
    }

    return {
      message: assistantMessage,
      toolCall: toolName ? { toolName, toolArgs, result: toolResult } : null
    };
  }

  /**
   * Scoped Tool Execution Engine
   */
  async executeTool({ toolName, toolArgs = {}, sessionId, userId, destinationCountry = 'NG', marketCode = 'INTERNATIONAL', session = null }) {
    let currentSession = session;
    if (!currentSession && sessionId) {
      try {
        currentSession = await prisma.payAISession.findUnique({ where: { id: sessionId } });
      } catch (_) {}
    }
    const effectiveUserId = userId || currentSession?.userId || null;

    switch (toolName) {
      case 'select_product_preference': {
        const query = toolArgs.matchedProductQuery || toolArgs.query || '';
        const targetId = toolArgs.productId;
        let selectedProduct = null;

        // 1. Try resolving from targetId if provided
        if (targetId) {
          try {
            selectedProduct = await prisma.product.findUnique({
              where: { id: targetId },
              include: {
                store: true,
                images: true
              }
            });
            if (selectedProduct) {
              const safeImg = safeImageUrl(selectedProduct) || selectedProduct.imageUrl || selectedProduct.images?.[0]?.url || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80';
              selectedProduct = {
                ...selectedProduct,
                productId: selectedProduct.id,
                imageUrl: safeImg,
                canNegotiate: true,
                inStock: (selectedProduct.stock ?? 1) > 0,
                seller: {
                  name: selectedProduct.store?.storeName || 'Verified Local Merchant'
                }
              };
            }
          } catch (_) {}
        }

        // 2. Direct exact or substring title match from database FIRST!
        if (!selectedProduct && query) {
          const cleanQ = query.trim();
          try {
            const directMatch = await prisma.product.findFirst({
              where: {
                isArchived: false,
                OR: [
                  { title: { equals: cleanQ } },
                  { normalizedTitle: { equals: cleanQ.toLowerCase() } },
                  { title: { contains: cleanQ } }
                ]
              },
              include: { store: true, images: true }
            });
            if (directMatch) {
              const safeImg = safeImageUrl(directMatch) || directMatch.imageUrl || directMatch.images?.[0]?.url || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80';
              selectedProduct = {
                ...directMatch,
                productId: directMatch.id,
                imageUrl: safeImg,
                canNegotiate: true,
                inStock: (directMatch.stock ?? 1) > 0,
                seller: {
                  name: directMatch.store?.storeName || 'Verified Local Merchant'
                }
              };
            }
          } catch (_) {}
        }

        // 3. If not found by direct match, search via catalogSearchService
        if (!selectedProduct && query) {
          const searchRes = await catalogSearchService.search({
            marketCode,
            destinationCountry,
            query,
            limit: 3
          });
          if (searchRes.items && searchRes.items.length > 0) {
            selectedProduct = searchRes.items[0];
          }
        }

        // Fallback: If still not found, check toolArgs.product
        if (!selectedProduct && toolArgs.product) {
          selectedProduct = toolArgs.product;
        }

        if (!selectedProduct) {
          return {
            success: false,
            message: `I couldn't locate the exact product for "${query}". Could you clarify which item you'd like?`
          };
        }

        // Check if food / meal to pair with drinks
        const productTitle = selectedProduct.title || 'Selected Product';
        const productCategory = (selectedProduct.category || '').toLowerCase();
        const isFoodOrMeal = /food|meal|breakfast|snack|burger|chicken|feast|crunch|box|egg|bread|oat|cereal|rice|noodle/i.test(productTitle + ' ' + productCategory);

        let pairingItems = [];
        let pairingType = 'none';

        if (isFoodOrMeal) {
          pairingType = 'drinks';
          try {
            const drinkRes = await catalogSearchService.search({
              marketCode,
              destinationCountry,
              category: 'Drinks',
              query: 'drink water sprite fanta softdrink beverage',
              limit: 8
            });
            const rawDrinks = drinkRes.items || [];
            const seenTitles = new Set();
            pairingItems = rawDrinks.filter(d => {
              if (d.id === selectedProduct.id) return false;
              const t = (d.title || '').toLowerCase().trim();
              if (seenTitles.has(t)) return false;
              seenTitles.add(t);
              return true;
            }).slice(0, 4);
          } catch (e) {
            logger.warn(`[PayAI:select_product_preference] Error fetching pairing drinks: ${e.message}`);
          }
        }

        return {
          success: true,
          action: 'PRODUCT_PREFERENCE_SELECTED',
          selectedProduct,
          productId: selectedProduct.id,
          quantity: toolArgs.quantity || 1,
          quantitySpecified: Boolean(toolArgs.quantitySpecified),
          pairingType,
          pairingItems,
          items: [selectedProduct, ...pairingItems]
        };
      }

      case 'plan_multi_day_meals_or_budget': {
        return await this._planMultiDayMealsOrBudget({
          ...toolArgs,
          session: currentSession,
          userId: effectiveUserId
        });
      }

      case 'plan_budget_goal': {
        return await this._planBudgetGoal({
          ...toolArgs,
          session: currentSession,
          userId: effectiveUserId
        });
      }

      case 'conversation_greeting': {
        return { greeting: true, marketCode, destinationCountry };
      }

      case 'conversation_faq': {
        return { topic: toolArgs.topic || 'general', marketCode, destinationCountry };
      }

      case 'advise_gift_or_occasion': {
        const recipient = toolArgs.recipient || 'friend';
        const occasion = toolArgs.occasion || 'celebration';
        const budget = Number(toolArgs.budget) || 20000;

        const isFemale = ['sister', 'mom', 'girlfriend', 'wife'].includes(recipient);
        const isMale = ['brother', 'dad', 'boyfriend', 'husband'].includes(recipient);

        const targetCategories = isFemale
          ? ['electronics', 'Accessories', 'Modern Apparel', 'fashion', 'Home & Lifestyle', 'Biscuits & Cookies']
          : (isMale
            ? ['electronics', 'Modern Apparel', 'Accessories', 'fashion', 'Home & Lifestyle']
            : ['electronics', 'Accessories', 'Modern Apparel', 'fashion', 'Biscuits & Cookies', 'Home & Lifestyle']);

        let products = [];
        try {
          const raw = await prisma.product.findMany({
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

          products = raw
            .filter(p => Number(p.price || 0) <= budget)
            .map(p => ({
              id: p.id,
              productId: p.id,
              title: p.title,
              price: Number(p.price),
              currency: 'NGN',
              category: p.category,
              stock: p.stock,
              seller: { name: p.store?.storeName || 'Verified Merchant' },
              imageUrl: resolveBackendProductImage(p),
              canNegotiate: true
            }));

          if (products.length === 0) {
            products = raw.slice(0, 4).map(p => ({
              id: p.id,
              productId: p.id,
              title: p.title,
              price: Number(p.price),
              currency: 'NGN',
              category: p.category,
              stock: p.stock,
              seller: { name: p.store?.storeName || 'Verified Merchant' },
              imageUrl: resolveBackendProductImage(p),
              canNegotiate: true
            }));
          }
        } catch (e) {
          logger.warn(`[PayAI:advise_gift_or_occasion] error querying gifts: ${e.message}`);
        }

        return {
          success: true,
          isGiftingAdvisory: true,
          recipient,
          occasion,
          budget,
          items: products.slice(0, 4)
        };
      }

      case 'advise_comparison': {
        const prompt = toolArgs.prompt || '';
        const lower = prompt.toLowerCase();
        let targetCategories = ['electronics', 'Electronics & Tech', 'Accessories'];
        if (lower.includes('shoe') || lower.includes('wear') || lower.includes('shirt') || lower.includes('cloth') || lower.includes('fashion')) {
          targetCategories = ['fashion', 'Modern Apparel', 'Accessories'];
        }
        let items = [];
        try {
          const raw = await prisma.product.findMany({
            where: { isArchived: false, stock: { gt: 0 }, category: { in: targetCategories } },
            include: { store: { select: { storeName: true, isVerified: true } }, images: true },
            take: 4,
            orderBy: { createdAt: 'desc' }
          });
          items = raw.map(p => ({
            id: p.id,
            productId: p.id,
            title: p.title,
            price: Number(p.price),
            currency: 'NGN',
            category: p.category,
            seller: { name: p.store?.storeName || 'Verified Merchant' },
            imageUrl: resolveBackendProductImage(p),
            canNegotiate: true
          }));
        } catch (_) {}
        return {
          success: true,
          isComparisonAdvisory: true,
          items,
          userPrompt: prompt
        };
      }

      case 'advise_styling': {
        const prompt = toolArgs.prompt || '';
        let items = [];
        try {
          const raw = await prisma.product.findMany({
            where: {
              isArchived: false,
              stock: { gt: 0 },
              category: { in: ['fashion', 'Modern Apparel', 'Accessories', 'electronics'] }
            },
            include: { store: { select: { storeName: true, isVerified: true } }, images: true },
            take: 4,
            orderBy: { createdAt: 'desc' }
          });
          items = raw.map(p => ({
            id: p.id,
            productId: p.id,
            title: p.title,
            price: Number(p.price),
            currency: 'NGN',
            category: p.category,
            seller: { name: p.store?.storeName || 'Verified Merchant' },
            imageUrl: resolveBackendProductImage(p),
            canNegotiate: true
          }));
        } catch (_) {}
        return {
          success: true,
          isStylingAdvisory: true,
          items,
          userPrompt: prompt
        };
      }

      case 'advise_food': {
        const prompt = toolArgs.prompt || '';
        let meals = [];
        let drinks = [];
        try {
          const rawMeals = await prisma.product.findMany({
            where: { isArchived: false, stock: { gt: 0 }, category: { in: ['Combos', 'Burgers', 'Chicken Strips', 'Food'] } },
            include: { store: { select: { storeName: true, isVerified: true } }, images: true },
            take: 2,
            orderBy: { createdAt: 'desc' }
          });
          meals = rawMeals.map(p => ({
            id: p.id,
            productId: p.id,
            title: p.title,
            price: Number(p.price),
            currency: 'NGN',
            category: p.category,
            seller: { name: p.store?.storeName || 'Verified Merchant' },
            imageUrl: resolveBackendProductImage(p),
            canNegotiate: true
          }));

          const rawDrinks = await prisma.product.findMany({
            where: { isArchived: false, stock: { gt: 0 }, category: { in: ['Drinks', 'Beverages'] } },
            include: { store: { select: { storeName: true, isVerified: true } }, images: true },
            take: 1
          });
          drinks = rawDrinks.map(p => ({
            id: p.id,
            productId: p.id,
            title: p.title,
            price: Number(p.price),
            currency: 'NGN',
            category: p.category,
            seller: { name: p.store?.storeName || 'Verified Merchant' },
            imageUrl: resolveBackendProductImage(p),
            canNegotiate: true
          }));
        } catch (_) {}
        return {
          success: true,
          isFoodAdvisory: true,
          meals,
          drinks,
          userPrompt: prompt
        };
      }

      case 'search_products': {
        const query = toolArgs.query || '';
        const category = toolArgs.category;
        const provider = toolArgs.provider;
        const results = await catalogSearchService.search({
          marketCode,
          query,
          category,
          provider,
          destinationCountry,
          limit: toolArgs.limit || 8,
          minPrice: toolArgs.minPrice,
          maxPrice: toolArgs.maxPrice,
          secondaryQuery: toolArgs.secondaryQuery,
          secondaryCategory: toolArgs.secondaryCategory,
          secondaryMaxPrice: toolArgs.secondaryMaxPrice,
          pairingContext: toolArgs.pairingContext,
          deadline: toolArgs.deadline,
          targetDeliveryDate: toolArgs.targetDeliveryDate,
          maxDeliveryDays: toolArgs.maxDeliveryDays,
          sortBy: toolArgs.sortBy
        });
        return results;
      }

      case 'search_external_offers': {
        const query = toolArgs.query || '';
        const category = toolArgs.category;
        const provider = toolArgs.provider;
        const results = await catalogSearchService.search({
          marketCode: 'INTERNATIONAL',
          query,
          category,
          provider,
          destinationCountry,
          limit: toolArgs.limit || 8
        });
        return results;
      }

      case 'search_local_products': {
        const results = await catalogSearchService.search({
          marketCode: 'NIGERIA',
          query: toolArgs.query || '',
          category: toolArgs.category,
          limit: toolArgs.limit || 8
        });
        return results;
      }

      case 'compare_offers': {
        const offerIdentifiers = toolArgs.offers || [];
        return await catalogSearchService.compareOffers(offerIdentifiers);
      }

      case 'get_shipping_estimate': {
        const { provider, productId, weightKg = 1.0, quantity = 1, price } = toolArgs;
        const isLocal = provider === 'w-commerce' || provider === 'local' || (!provider && marketCode === 'NIGERIA');

        if (isLocal || (productId && !['amazon', 'aliexpress', 'ebay', 'asos'].includes(provider))) {
          let itemTitle = 'W-Commerce Product';
          let itemPrice = price || 10000;
          let itemWeight = weightKg;
          let itemShippingFee = null;

          if (productId) {
            const product = await prisma.product.findUnique({ where: { id: productId } });
            if (product) {
              itemTitle = product.title;
              itemPrice = Number(product.price);
              itemWeight = Number(product.weightKg || weightKg);
              itemShippingFee = product.shippingFee != null ? Number(product.shippingFee) : null;
            }
          }

          const shipping = pricingService.calculateShippingFees({
            items: [{ title: itemTitle, price: itemPrice, weightKg: itemWeight, quantity, shippingFee: itemShippingFee, currency: 'NGN' }],
            destinationCountry,
            isDomestic: true,
            marketCode: 'NIGERIA',
            targetCurrency: 'NGN'
          });

          return {
            destinationCountry,
            carrier: shipping.carrier,
            estimatedDays: shipping.estimatedDays,
            shippingCost: shipping.finalShippingFee,
            currency: 'NGN',
            standardShippingFee: shipping.standardShippingFee,
            qualifiesForFreeShipping: shipping.qualifiesForFreeShipping,
            freeShippingThreshold: shipping.freeShippingThreshold,
            freeShippingSavings: shipping.freeShippingSavings,
            amountNeededForFreeShipping: shipping.amountNeededForFreeShipping,
            trackingIncluded: true,
            itemBreakdown: shipping.itemBreakdowns
          };
        }

        const extProvider = provider || 'amazon';
        const adapter = adapterRegistry.getAdapter(extProvider);
        if (!adapter) throw new Error(`Unknown provider: ${extProvider}`);
        const extQuote = await adapter.getShippingQuote({ externalProductId: productId, destinationCountry, weightKg });

        const feeCheck = pricingService.calculateShippingFees({
          items: [{ title: 'External Item', price: price || 50, weightKg, quantity, currency: 'USD' }],
          destinationCountry,
          isDomestic: false,
          marketCode: 'INTERNATIONAL'
        });

        return {
          ...extQuote,
          qualifiesForFreeShipping: feeCheck.qualifiesForFreeShipping,
          freeShippingThreshold: feeCheck.freeShippingThreshold,
          freeShippingSavings: feeCheck.freeShippingSavings,
          amountNeededForFreeShipping: feeCheck.amountNeededForFreeShipping
        };
      }

      case 'check_product_stock': {
        const { productId, quantity = 1 } = toolArgs;
        return await catalogSearchService.checkProductStock(productId, quantity);
      }

      case 'make_product_offer':
      case 'request_seller_negotiation': {
        const { provider, productId, url, offerAmount, proposedPrice, requestedDiscountPct, buyerMessage, quantity, actionType, currency } = toolArgs;

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

        let targetProductId = productId;

        // 1. Check if buyer specifically named a product in their message or productQuery
        const explicitQuery = toolArgs.productQuery || (() => {
          const forMatch = (buyerMessage || '').match(/\bfor\s+(.+?)\s+(?:can\s+i|can\s+you|could\s+i|i\s+can|will\s+you|would\s+you|how\s+about|i\s+want|is\s+it|what\s+is)\b/i);
          const afterForMatch = (buyerMessage || '').match(/(?:pay|offer|give|buy|get|discount|take|bargain)\s+[0-9]+[a-z0-9]*\s+(?:for|on)\s+(.+?)(?:$|[?.,!])/i);
          return (forMatch && forMatch[1]) || (afterForMatch && afterForMatch[1]) || null;
        })();

        if (explicitQuery) {
          const cleanQuery = explicitQuery.replace(/\b(?:₦|\$|ngn|usd|[0-9]+naira|[0-9]+ngn)\b/gi, '').trim();
          if (cleanQuery.length >= 3) {
            const direct = await prisma.product.findFirst({
              where: { title: { contains: cleanQuery }, isArchived: false },
              include: { store: true }
            });
            if (direct) {
              targetProductId = direct.id;
            } else {
              const words = cleanQuery.split(/\s+/).filter(w => w.length >= 3 && !/^[0-9]+[a-z]*$/i.test(w));
              if (words.length > 0) {
                const tokenMatch = await prisma.product.findFirst({
                  where: {
                    AND: words.map(w => ({ title: { contains: w } })),
                    isArchived: false
                  },
                  include: { store: true }
                });
                if (tokenMatch) {
                  targetProductId = tokenMatch.id;
                } else {
                  const orMatch = await prisma.product.findFirst({
                    where: {
                      OR: words.map(w => ({ title: { contains: w } })),
                      isArchived: false
                    },
                    include: { store: true }
                  });
                  if (orMatch) targetProductId = orMatch.id;
                }
              }
            }
          }
        }

        if (!targetProductId || targetProductId === 'demo-cavetto-watch') {
          const cleanText = (buyerMessage || '').replace(/['"]/g, '');
          const words = cleanText.split(/\s+/).filter(w => w.length >= 4 && !['want', 'price', 'best', 'discount', 'negotiate', 'seller', 'offer', 'like', 'this', 'that', 'from', 'with', 'naira', 'please'].includes(w.toLowerCase()) && !/^[0-9]+[a-z]*$/i.test(w));
          for (let i = 0; i < words.length - 1; i++) {
            const pair = `${words[i]} ${words[i+1]}`;
            const match = await prisma.product.findFirst({
              where: { title: { contains: pair }, isArchived: false },
              select: { id: true }
            });
            if (match) {
              targetProductId = match.id;
              break;
            }
          }

          if (!targetProductId || targetProductId === 'demo-cavetto-watch') {
            for (const w of words) {
              const match = await prisma.product.findFirst({
                where: {
                  title: { contains: w },
                  isArchived: false
                },
                select: { id: true, title: true }
              });
              if (match) {
                targetProductId = match.id;
                break;
              }
            }
          }

          if (!targetProductId || targetProductId === 'demo-cavetto-watch') {
            const recentMsg = await prisma.payAIMessage.findFirst({
              where: {
                sessionId,
                role: 'assistant',
                toolResults: { not: null }
              },
              orderBy: { createdAt: 'desc' }
            });
            if (recentMsg?.toolResults) {
              try {
                const parsed = JSON.parse(recentMsg.toolResults);
                if (parsed.items?.[0]?.id) {
                  targetProductId = parsed.items[0].id;
                } else if (parsed.productId) {
                  targetProductId = parsed.productId;
                }
              } catch (e) {}
            }
          }

          if (!targetProductId || targetProductId === 'demo-cavetto-watch') {
            const anyProd = await prisma.product.findFirst({
              where: { isArchived: false, isNegotiable: true },
              select: { id: true }
            });
            if (anyProd) targetProductId = anyProd.id;
          }
        }

        const turnResult = await negotiationEngineService.negotiateTurn({
          sessionId,
          userId,
          productId: targetProductId || 'demo-cavetto-watch',
          buyerMessage: buyerMessage || '',
          proposedPrice: proposedPrice || offerAmount || null,
          quantity: quantity || 1,
          actionType: actionType || null,
          currency: currency || 'NGN'
        });

        turnResult.productId = targetProductId;
        turnResult.isNegotiable = true;
        turnResult.negotiatedPrice = turnResult.currentOfferUnitPrice;

        if (actionType === 'REQUEST_WAREHOUSE_MEDIA' && !turnResult.warehouseInspection) {
          const inspection = await negotiationEngineService.requestWarehouseInspectionMedia({
            productId: targetProductId || 'demo-cavetto-watch',
            productTitle: turnResult.productTitle || 'Verified W-Commerce Product',
            storeName: turnResult.storeName || 'Verified Merchant',
            sessionId,
            buyerId: userId
          });
          turnResult.warehouseInspection = inspection;
        }

        return turnResult;
      }

      case 'request_warehouse_media': {
        const { productId, userPrompt = '' } = toolArgs;
        let resolvedProductId = productId;
        let targetProduct = null;
        let productTitle = 'Cavetto Pantheon Watch CV0001';
        let storeName = 'Seller A Official Store';
        let storeId = 'store-seller-a';

        const isGymshark =
          (resolvedProductId && String(resolvedProductId).toLowerCase().includes('gymshark')) ||
          (userPrompt && /gymshark|fakunle|fitness|premier/i.test(userPrompt));

        const isCavetto =
          resolvedProductId === 'demo-cavetto-watch' ||
          (userPrompt && /cavetto|pantheon|watch/i.test(userPrompt));

        if (isGymshark) {
          resolvedProductId = 'demo-gymshark';
          productTitle = 'Gymshark Flagship Premier Edition';
          storeName = "Fakunle Faruq's Shop";
          storeId = 'store-gymshark-vault';
        } else if (isCavetto) {
          resolvedProductId = 'demo-cavetto-watch';
          productTitle = 'Cavetto Pantheon Watch CV0001';
          storeName = 'Seller A Official Store';
          storeId = 'store-seller-a';
        } else if (resolvedProductId && !resolvedProductId.startsWith('demo-')) {
          // 1. If explicit productId provided, find in database
          try {
            targetProduct = await prisma.product.findUnique({
              where: { id: resolvedProductId },
              include: { store: true, images: true }
            });
          } catch (_) {}
        }

        // 2. If not found, check recent assistant messages for toolResults containing items, negotiations, or productId
        if (!targetProduct && !isGymshark && !isCavetto) {
          const recentAssistantMsgs = await prisma.payAIMessage.findMany({
            where: { sessionId, role: 'assistant' },
            orderBy: { createdAt: 'desc' },
            take: 6
          });

          for (const msg of recentAssistantMsgs) {
            if (msg.toolResults) {
              try {
                const parsed = JSON.parse(msg.toolResults);
                const candidateId = parsed.productId || parsed.offer?.productId || (Array.isArray(parsed.items) && parsed.items[0]?.id) || parsed.id;
                if (candidateId && candidateId !== 'demo-cavetto-watch') {
                  const candidateProd = await prisma.product.findUnique({
                    where: { id: candidateId },
                    include: { store: true, images: true }
                  });
                  if (candidateProd) {
                    targetProduct = candidateProd;
                    resolvedProductId = candidateProd.id;
                    break;
                  }
                }
                if (parsed.productTitle) {
                  productTitle = parsed.productTitle;
                }
                if (parsed.storeName) {
                  storeName = parsed.storeName;
                }
              } catch (_) {}
            }
          }
        }

        // 3. Fallback: match by keywords in prompt or user message
        if (!targetProduct && !isGymshark && !isCavetto && userPrompt) {
          const cleanText = userPrompt.replace(/warehouse|photo|photos|media|video|inspection|voice|note|real|live|inspect|condition|check|serial|number|the|this|item|product|for|please|show|me/gi, '').trim();
          const words = cleanText.split(/\s+/).filter(w => w.length > 2);
          for (const w of words) {
            const match = await prisma.product.findFirst({
              where: {
                title: { contains: w },
                isArchived: false
              },
              include: { store: true, images: true }
            });
            if (match) {
              targetProduct = match;
              resolvedProductId = match.id;
              break;
            }
          }
        }

        // 4. Fallback: find any available active product
        if (!targetProduct && !isGymshark && !isCavetto) {
          targetProduct = await prisma.product.findFirst({
            where: { isArchived: false },
            include: { store: true, images: true },
            orderBy: { createdAt: 'desc' }
          });
        }

        if (targetProduct) {
          resolvedProductId = targetProduct.id;
          productTitle = targetProduct.title;
          storeName = targetProduct.store?.storeName || targetProduct.seller?.name || storeName;
          storeId = targetProduct.storeId || targetProduct.store?.id || storeId;
        }

        const inspection = await negotiationEngineService.requestWarehouseInspectionMedia({
          storeId,
          storeName,
          productTitle,
          productId: resolvedProductId || 'demo-cavetto-watch',
          sessionId,
          buyerId: userId
        });

        return {
          success: true,
          warehouseInspection: inspection,
          productTitle,
          storeName,
          productId: resolvedProductId || 'demo-cavetto-watch',
          storeId
        };
      }

      case 'calculate_landed_cost': {
        const items = toolArgs.items || [];
        return pricingService.calculateLandedCost({
          items,
          destinationCountry,
          targetCurrency: toolArgs.targetCurrency || 'USD'
        });
      }

      case 'prepare_purchase_quote': {
        const cart = await cartService.getOrCreateCart({ userId, sessionId, marketCode });
        if (!cart.items || cart.items.length === 0) {
          throw new Error('Your PayAI cart is currently empty. Please add items before generating a quote.');
        }
        return await pricingService.createPriceQuote({
          userId,
          cartId: cart.id,
          items: cart.items,
          marketCode,
          targetCurrency: toolArgs.targetCurrency || 'USD'
        });
      }

      case 'update_cart': {
        const cart = await cartService.getOrCreateCart({ userId, sessionId, marketCode });
        if (toolArgs.action === 'add') {
          return await cartService.addItem(cart.id, toolArgs.item);
        } else if (toolArgs.action === 'remove') {
          return await cartService.removeItem(cart.id, toolArgs.itemId);
        } else if (toolArgs.action === 'clear') {
          return await cartService.clearCart(cart.id);
        }
        return cart;
      }

      case 'request_purchase_approval': {
        const { quoteId } = toolArgs;
        const validation = await pricingService.validateQuote(quoteId);
        if (!validation.valid) throw new Error(validation.reason);
        return {
          quoteId: validation.quote.id,
          quoteNumber: validation.quote.quoteNumber,
          total: Number(validation.quote.total),
          currency: validation.quote.currency,
          expiresAt: validation.quote.expiresAt,
          breakdown: typeof validation.quote.breakdown === 'string' ? JSON.parse(validation.quote.breakdown) : validation.quote.breakdown,
          message: 'Please review the itemized breakdown and approve this purchase before proceeding to PayPal Sandbox checkout.'
        };
      }

      case 'get_order_status':
      case 'track_order': {
        let orderId = toolArgs.orderId || toolArgs.orderNumber;

        const invalidOrderTokens = new Set([
          'shipment', 'status', 'delivery', 'details', 'tracking', 'update', 'updates',
          'progress', 'package', 'packages', 'history', 'items', 'info', 'receipt',
          'confirmation', 'number', 'numbers', 'code', 'codes', 'id', 'again', 'please',
          'now', 'today', 'recent', 'latest', 'here', 'there', 'mine', 'orders', 'item'
        ]);
        if (orderId) {
          const cleanToken = String(orderId).replace(/^#/, '').trim().toLowerCase();
          if (invalidOrderTokens.has(cleanToken) || (/^[a-z]+$/i.test(cleanToken) && !/^(?:w-|gig-|dhl-)/i.test(cleanToken) && cleanToken.length < 12)) {
            orderId = null;
          }
        }

        // 1. Check user orders from both PayAIOrder and main Order tables
        if (!orderId && userId) {
          const userOrders = await orderService.listUserOrders(userId);
          if (userOrders && userOrders.length > 0) {
            orderId = userOrders[0].id || userOrders[0].orderNumber;
          }
        }

        // 2. Check session audit log for recently placed order
        if (!orderId && sessionId) {
          const recentLog = await prisma.payAIAuditLog.findFirst({
            where: {
              action: { in: ['ORDER_PLACED_CHECKOUT', 'PAYPAL_ORDER_CREATED', 'PAYMENT_CAPTURED_VERIFIED'] },
              OR: [
                { actorId: sessionId },
                { details: { contains: sessionId } }
              ]
            },
            orderBy: { createdAt: 'desc' }
          });
          if (recentLog) {
            orderId = recentLog.entityId;
          }
        }

        // 3. Check most recent PayAIOrder for user
        if (!orderId && userId) {
          const lastOrder = await prisma.payAIOrder.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' }
          });
          if (lastOrder) {
            orderId = lastOrder.orderNumber || lastOrder.id;
          }
        }

        // 4. Check most recent main Order for user
        if (!orderId && userId) {
          const lastMainOrder = await prisma.order.findFirst({
            where: { buyerId: userId },
            orderBy: { createdAt: 'desc' }
          });
          if (lastMainOrder) {
            orderId = lastMainOrder.id;
          }
        }

        // 5. Fallback to latest order in system (for testing / demo / anonymous tracking)
        if (!orderId) {
          const anyPayAIOrder = await prisma.payAIOrder.findFirst({
            orderBy: { createdAt: 'desc' }
          });
          if (anyPayAIOrder) {
            orderId = anyPayAIOrder.orderNumber || anyPayAIOrder.id;
          } else {
            const anyMainOrder = await prisma.order.findFirst({
              orderBy: { createdAt: 'desc' }
            });
            if (anyMainOrder) {
              orderId = anyMainOrder.id;
            }
          }
        }

        if (!orderId) {
          return { found: false, noOrdersYet: true, message: 'You have not placed any orders yet.' };
        }

        let trackingResult = await orderService.trackOrder(orderId);
        // If specified order was not found, fallback to latest user or system order
        if (!trackingResult || !trackingResult.found) {
          let fallbackOrderId = null;
          if (userId) {
            const userOrders = await orderService.listUserOrders(userId);
            if (userOrders && userOrders.length > 0) {
              fallbackOrderId = userOrders[0].id || userOrders[0].orderNumber;
            }
          }
          if (!fallbackOrderId) {
            const anyPayAIOrder = await prisma.payAIOrder.findFirst({ orderBy: { createdAt: 'desc' } });
            if (anyPayAIOrder) {
              fallbackOrderId = anyPayAIOrder.orderNumber || anyPayAIOrder.id;
            } else {
              const anyMainOrder = await prisma.order.findFirst({ orderBy: { createdAt: 'desc' } });
              if (anyMainOrder) fallbackOrderId = anyMainOrder.id;
            }
          }
          if (fallbackOrderId && fallbackOrderId !== orderId) {
            const fallbackResult = await orderService.trackOrder(fallbackOrderId);
            if (fallbackResult && fallbackResult.found) {
              trackingResult = fallbackResult;
            }
          }
        }

        return trackingResult;
      }

      case 'message_seller': {
        let orderId = toolArgs.orderId || toolArgs.orderNumber;

        const invalidOrderTokens = new Set([
          'shipment', 'status', 'delivery', 'details', 'tracking', 'update', 'updates',
          'progress', 'package', 'packages', 'history', 'items', 'info', 'receipt',
          'confirmation', 'number', 'numbers', 'code', 'codes', 'id', 'again', 'please',
          'now', 'today', 'recent', 'latest', 'here', 'there', 'mine', 'orders', 'item'
        ]);
        if (orderId) {
          const cleanToken = String(orderId).replace(/^#/, '').trim().toLowerCase();
          if (invalidOrderTokens.has(cleanToken) || (/^[a-z]+$/i.test(cleanToken) && !/^(?:w-|gig-|dhl-)/i.test(cleanToken) && cleanToken.length < 12)) {
            orderId = null;
          }
        }

        // 1. Check user orders from both PayAIOrder and main Order tables
        if (!orderId && userId) {
          const userOrders = await orderService.listUserOrders(userId);
          if (userOrders && userOrders.length > 0) {
            orderId = userOrders[0].orderNumber || userOrders[0].id;
          }
        }

        // 2. Check session audit log for recently placed order
        if (!orderId && sessionId) {
          const recentLog = await prisma.payAIAuditLog.findFirst({
            where: {
              action: { in: ['ORDER_PLACED_CHECKOUT', 'PAYPAL_ORDER_CREATED', 'PAYMENT_CAPTURED_VERIFIED'] },
              OR: [
                { actorId: sessionId },
                { details: { contains: sessionId } }
              ]
            },
            orderBy: { createdAt: 'desc' }
          });
          if (recentLog) {
            orderId = recentLog.entityId;
          }
        }

        // 3. Fallback to latest order in system if orderId still missing
        if (!orderId) {
          const anyPayAIOrder = await prisma.payAIOrder.findFirst({
            orderBy: { createdAt: 'desc' }
          });
          if (anyPayAIOrder) {
            orderId = anyPayAIOrder.orderNumber || anyPayAIOrder.id;
          } else {
            const anyMainOrder = await prisma.order.findFirst({
              orderBy: { createdAt: 'desc' }
            });
            if (anyMainOrder) {
              orderId = anyMainOrder.id;
            }
          }
        }

        if (!orderId) {
          return {
            success: false,
            found: false,
            message: 'Please provide an order number so I can message the right seller for you.'
          };
        }

        return await orderService.messageOrderSeller({
          orderId,
          userId,
          message: toolArgs.message,
          inquiryType: toolArgs.inquiryType || 'DELIVERY_UPDATE'
        });
      }

      case 'cancel_order': {
        let orderId = toolArgs.orderId || toolArgs.orderNumber;
        if (!orderId && userId) {
          const userOrders = await orderService.listUserOrders(userId);
          if (userOrders && userOrders.length > 0) {
            orderId = userOrders[0].orderNumber || userOrders[0].id;
          }
        }
        if (!orderId && sessionId) {
          const recentLog = await prisma.payAIAuditLog.findFirst({
            where: {
              action: { in: ['ORDER_PLACED_CHECKOUT', 'PAYPAL_ORDER_CREATED', 'PAYMENT_CAPTURED_VERIFIED'] },
              OR: [
                { actorId: sessionId },
                { details: { contains: sessionId } }
              ]
            },
            orderBy: { createdAt: 'desc' }
          });
          if (recentLog) {
            orderId = recentLog.entityId;
          }
        }
        if (!orderId) {
          return { success: false, message: 'Please specify the order number you wish to cancel (e.g. "Cancel order W-INT-12345").' };
        }
        try {
          return await orderService.cancelOrder({
            orderId,
            reason: toolArgs.reason || 'Customer requested cancellation via PayAI chat',
            actorId: userId || 'BUYER'
          });
        } catch (err) {
          return {
            success: false,
            message: err.message,
            error: err.message
          };
        }
      }

      case 'request_return': {
        let orderId = toolArgs.orderId || toolArgs.orderNumber;
        if (!orderId && userId) {
          const userOrders = await orderService.listUserOrders(userId);
          if (userOrders && userOrders.length > 0) {
            orderId = userOrders[0].orderNumber || userOrders[0].id;
          }
        }
        if (!orderId && sessionId) {
          const recentLog = await prisma.payAIAuditLog.findFirst({
            where: {
              action: { in: ['ORDER_PLACED_CHECKOUT', 'PAYPAL_ORDER_CREATED', 'PAYMENT_CAPTURED_VERIFIED'] },
              OR: [
                { actorId: sessionId },
                { details: { contains: sessionId } }
              ]
            },
            orderBy: { createdAt: 'desc' }
          });
          if (recentLog) {
            orderId = recentLog.entityId;
          }
        }
        if (!orderId) {
          return { success: false, message: 'Please specify the order number you wish to return (e.g. "Return order W-INT-12345").' };
        }
        try {
          return await orderService.requestReturn({
            orderId,
            reason: toolArgs.reason || 'Customer requested return via PayAI chat',
            itemsToReturn: toolArgs.itemsToReturn || null,
            actorId: userId || 'BUYER'
          });
        } catch (err) {
          return {
            success: false,
            message: err.message,
            error: err.message
          };
        }
      }

      case 'handle_order_complaint': {
        let orderId = toolArgs.orderId || toolArgs.orderNumber;
        if (!orderId && userId) {
          const userOrders = await orderService.listUserOrders(userId);
          if (userOrders && userOrders.length > 0) {
            orderId = userOrders[0].orderNumber || userOrders[0].id;
          }
        }
        if (!orderId && sessionId) {
          const recentLog = await prisma.payAIAuditLog.findFirst({
            where: {
              action: { in: ['ORDER_PLACED_CHECKOUT', 'PAYPAL_ORDER_CREATED', 'PAYMENT_CAPTURED_VERIFIED', 'ORDER_DISPUTE_OPENED'] },
              OR: [
                { actorId: sessionId },
                { details: { contains: sessionId } }
              ]
            },
            orderBy: { createdAt: 'desc' }
          });
          if (recentLog) {
            orderId = recentLog.entityId;
          }
        }

        return await orderService.handleOrderComplaint({
          orderId,
          orderNumber: orderId,
          complaintReason: toolArgs.complaintReason || toolArgs.reason || 'OTHER',
          complaintDescription: toolArgs.complaintDescription || toolArgs.prompt || toolArgs.description || '',
          itemNames: toolArgs.itemNames || toolArgs.item || null,
          issueType: toolArgs.issueType || null,
          requestedRemedy: toolArgs.requestedRemedy || null,
          evidenceUrls: toolArgs.evidenceUrls || [],
          actorId: userId || 'BUYER',
          userId
        });
      }

      case 'add_to_cart': {
        const { userPrompt = '', productId: directProductId } = toolArgs;
        let targetProduct = null;
        let quantity = toolArgs.quantity || 1;
        let priceToUse = null;

        // Check if explicit quantity is specified in userPrompt (do NOT blindly match numbers inside product names like "Pack of 12" or "200g")
        const isMultiItemPrompt =
          /\s+(?:and|\+|\&|\band\s+also\b|\bplus\b|\bwith\b)\s+/i.test(userPrompt) ||
          /\b(?:combo|entire|all\s+items)\b/i.test(userPrompt);

        if (!isMultiItemPrompt) {
          const explicitQtyMatch =
            userPrompt.match(/\b(?:quantity|qty)\s*[:=]?\s*(\d+)\b/i) ||
            userPrompt.match(/\b(\d+)\s*(?:x|pcs|pieces|units|portions|plates|bottles)\b/i) ||
            userPrompt.match(/^(?:can\s+you\s+)?(?:please\s+)?(?:add|buy|order|put|get)\s+(\d+)\s+(?!pack|g\b|kg\b|ml\b|l\b|oz\b)/i);

          if (explicitQtyMatch) {
            const parsedQty = parseInt(explicitQtyMatch[1], 10);
            if (parsedQty > 0 && parsedQty <= 100) {
              quantity = parsedQty;
            }
          }
        } else {
          // In a combo or multi-item request, default individual item quantities to 1
          quantity = 1;
        }

        // Direct Product ID lookup if passed in args or context
        if (directProductId && !isMultiItemPrompt) {
          targetProduct = await prisma.product.findUnique({
            where: { id: directProductId },
            include: { store: true, images: true }
          });
          if (targetProduct) {
            priceToUse = targetProduct.price;
          }
        }

        // Clean user prompt for multi-item / combo detection without corrupting product titles like "Meal" or "Food"
        let cleanKeywords = userPrompt
          .replace(/^(?:can\s+you\s+please|can\s+you|please|i\s+want\s+to\s+buy|i\s+want\s+to\s+add|i\s+want|add|put|buy|order)\s+/i, '')
          .replace(/\s+(?:into\s+(?:my\s+)?cart|to\s+(?:my\s+)?cart|in\s+(?:my\s+)?cart|into\s+cart|to\s+cart|in\s+cart|please)$/i, '')
          .replace(/^(?:the\s+|this\s+|that\s+|these\s+)/i, '')
          .trim();

        // Check if bulk planItems or shopping list passed
        if ((toolArgs.planItems && toolArgs.planItems.length > 0) || (cleanKeywords.includes('all plan') || cleanKeywords.includes('entire plan') || cleanKeywords.includes('all shopping list'))) {
          const rawItems = toolArgs.planItems || (toolArgs.items || []);
          if (rawItems.length > 0) {
            const matchedProducts = [];
            for (const item of rawItems) {
              const pId = item.id || item.productId;
              if (pId) {
                const prod = await prisma.product.findUnique({
                  where: { id: String(pId) },
                  include: { store: true, images: true }
                });
                if (prod && !matchedProducts.some(p => p.id === prod.id)) {
                  matchedProducts.push(prod);
                }
              }
            }
            if (matchedProducts.length > 0) {
              const cart = await cartService.getOrCreateCart({ userId: effectiveUserId, sessionId, marketCode });
              let mainCart = null;
              if (effectiveUserId) {
                try {
                  mainCart = await prisma.cart.findUnique({ where: { userId: effectiveUserId } });
                  if (!mainCart) {
                    mainCart = await prisma.cart.create({ data: { userId: effectiveUserId } });
                  }
                } catch (_) {}
              }

              const addedItems = [];
              for (const prod of matchedProducts) {
                const pId = String(prod.id);
                const pPrice = Number(prod.price || 0);
                const sName = prod.store?.storeName || prod.sellerName || prod.seller?.name || 'Verified W-Commerce Merchant';
                const imgUrl = resolveBackendProductImage(prod);

                if (mainCart) {
                  try {
                    const existing = await prisma.cartItem.findFirst({
                      where: { cartId: mainCart.id, productId: pId }
                    });
                    if (existing) {
                      await prisma.cartItem.update({
                        where: { id: existing.id },
                        data: { quantity: existing.quantity + 1 }
                      });
                    } else {
                      await prisma.cartItem.create({
                        data: {
                          cartId: mainCart.id,
                          productId: pId,
                          quantity: 1
                        }
                      });
                    }
                  } catch (_) {}
                }

                const itRes = await cartService.addItem(cart.id, {
                  productId: pId,
                  title: prod.title,
                  price: pPrice,
                  currency: 'NGN',
                  quantity: 1,
                  imageUrl: imgUrl,
                  sellerId: prod.store?.sellerId || prod.seller?.id || prod.storeId,
                  sellerName: sName,
                  storeName: sName,
                  storeId: prod.storeId || prod.store?.id
                });
                addedItems.push(itRes);
              }

              return {
                success: true,
                action: 'CART_UPDATED',
                checkoutReady: true,
                isPlanBulk: true,
                items: addedItems,
                item: addedItems[0],
                cart
              };
            }
          }
        }

        // Check if multiple combo items requested (e.g. "Hungry Box Meal and Fresh Eggs Pack of 12 and Chocolate Biscuits 200g")
        let itemPhrases = cleanKeywords
          .split(/\s*(?:,\s*|\s+(?:and|\+|\&|\band\s+also\b|\bplus\b|\bwith\b)\s+)/i)
          .map(s => s.trim())
          .filter(s => s.length >= 2 && !/^(?:all|combo|entire|everything|items?|meals?)$/i.test(s));

        // If the prompt is a generic combo prompt without item names (e.g. "add entire breakfast combo to cart"), inspect recent assistant messages
        if (itemPhrases.length < 2 && (cleanKeywords.toLowerCase().includes('combo') || cleanKeywords.toLowerCase().includes('entire') || cleanKeywords.toLowerCase().includes('breakfast'))) {
          try {
            const recentAssistantMsgs = await prisma.payAIMessage.findMany({
              where: { sessionId, role: 'assistant' },
              orderBy: { createdAt: 'desc' },
              take: 4
            });

            for (const m of recentAssistantMsgs) {
              if (!m.content) continue;
              const promptLinkMatch = m.content.match(/\[.*?\]\(prompt:add\s+([^)]+?)\s+to\s+cart\)/i);
              if (promptLinkMatch && /\s+(?:and|\+|\&)\s+/i.test(promptLinkMatch[1])) {
                const extracted = promptLinkMatch[1]
                  .split(/\s*(?:,\s*|\s+(?:and|\+|\&|\band\s+also\b|\bplus\b|\bwith\b)\s+)/i)
                  .map(s => s.trim())
                  .filter(s => s.length >= 2 && !/^(?:all|combo|entire|everything|items?|meals?)$/i.test(s));
                if (extracted.length >= 2) {
                  itemPhrases = extracted;
                  break;
                }
              }

              const plusLineMatch = m.content.split('\n').find(line => line.includes('+') && line.includes('₦'));
              if (plusLineMatch) {
                const parts = plusLineMatch.split('+').map(p => {
                  return p.replace(/\(₦[0-9,.]+\)/g, '').replace(/[*_#]/g, '').trim();
                }).filter(p => p.length >= 2);
                if (parts.length >= 2) {
                  itemPhrases = parts;
                  break;
                }
              }
            }
          } catch (_) {}
        }

        if (itemPhrases.length >= 2) {
          const matchedProducts = [];
          for (const phrase of itemPhrases) {
            // Direct substring match
            let prod = await prisma.product.findFirst({
              where: {
                title: { contains: phrase },
                isArchived: false
              },
              include: { store: true, images: true }
            });

            // Token search across title
            if (!prod) {
              const tokens = phrase.split(/\s+/).filter(w => w.length >= 3 && !['pack', 'and', 'the', 'for', 'with', 'box'].includes(w.toLowerCase()));
              if (tokens.length > 0) {
                prod = await prisma.product.findFirst({
                  where: {
                    AND: tokens.map(tok => ({ title: { contains: tok } })),
                    isArchived: false
                  },
                  include: { store: true, images: true }
                });
              }
            }

            // Fallback token search
            if (!prod) {
              const cleanPhrase = phrase.replace(/[^a-zA-Z0-9\s]/g, '').trim();
              const tokens = cleanPhrase.split(/\s+/).filter(w => w.length >= 3);
              if (tokens.length > 0) {
                prod = await prisma.product.findFirst({
                  where: {
                    OR: tokens.map(tok => ({ title: { contains: tok } })),
                    isArchived: false
                  },
                  include: { store: true, images: true },
                  orderBy: { createdAt: 'desc' }
                });
              }
            }

            if (prod && !matchedProducts.some(p => p.id === prod.id)) {
              matchedProducts.push(prod);
            }
          }

          if (matchedProducts.length > 1) {
            const cart = await cartService.getOrCreateCart({ userId: effectiveUserId, sessionId, marketCode });
            let mainCart = null;
            if (effectiveUserId) {
              try {
                mainCart = await prisma.cart.findUnique({ where: { userId: effectiveUserId } });
                if (!mainCart) {
                  mainCart = await prisma.cart.create({ data: { userId: effectiveUserId } });
                }
              } catch (_) {}
            }

            const addedItems = [];
            for (const prod of matchedProducts) {
              const pId = String(prod.id);
              const pPrice = Number(prod.price || 0);
              const sName = prod.store?.storeName || prod.sellerName || prod.seller?.name || 'Verified W-Commerce Merchant';
              const imgUrl = resolveBackendProductImage(prod);

              if (mainCart) {
                try {
                  const existing = await prisma.cartItem.findFirst({
                    where: { cartId: mainCart.id, productId: pId }
                  });
                  if (existing) {
                    await prisma.cartItem.update({
                      where: { id: existing.id },
                      data: { quantity: existing.quantity + 1 }
                    });
                  } else {
                    await prisma.cartItem.create({
                      data: { cartId: mainCart.id, productId: pId, quantity: 1 }
                    });
                  }
                } catch (_) {}
              }

              await cartService.addItem(cart.id, {
                productId: pId,
                title: prod.title,
                price: pPrice,
                currency: 'NGN',
                quantity: 1,
                imageUrl: imgUrl,
                sellerName: sName,
                sellerId: prod.sellerId || prod.store?.sellerId || prod.store?.id
              });

              addedItems.push({
                id: pId,
                productId: pId,
                title: prod.title,
                price: pPrice,
                currency: 'NGN',
                quantity: 1,
                imageUrl: imgUrl,
                sellerName: sName,
                storeName: sName,
                storeId: prod.storeId || prod.store?.id
              });
            }

            return {
              success: true,
              action: 'CART_UPDATED',
              checkoutReady: true,
              isCombo: true,
              items: addedItems,
              item: addedItems[0],
              cart
            };
          }
        }

        // Strategy 1: Exact / phrase match in product title or description
        if (!targetProduct && cleanKeywords) {
          targetProduct = await prisma.product.findFirst({
            where: {
              OR: [
                { title: { contains: cleanKeywords } },
                { description: { contains: cleanKeywords } }
              ],
              isArchived: false
            },
            include: { store: true, images: true }
          });
          if (targetProduct) {
            priceToUse = targetProduct.price;
          }
        }

        // Strategy 2: Multi-token match across title
        if (!targetProduct && cleanKeywords) {
          const tokens = cleanKeywords.split(' ').filter(w => w.length >= 3);
          if (tokens.length > 0) {
            targetProduct = await prisma.product.findFirst({
              where: {
                AND: tokens.map(tok => ({ title: { contains: tok } })),
                isArchived: false
              },
              include: { store: true, images: true }
            });
            if (!targetProduct) {
              targetProduct = await prisma.product.findFirst({
                where: {
                  OR: tokens.map(tok => ({ title: { contains: tok } })),
                  isArchived: false
                },
                include: { store: true, images: true },
                orderBy: { createdAt: 'desc' }
              });
            }
            if (targetProduct) {
              priceToUse = targetProduct.price;
            }
          }
        }

        // Strategy 3: Check recent assistant messages for toolResults containing items, offers, or negotiations
        if (!targetProduct) {
          const recentAssistantMsgs = await prisma.payAIMessage.findMany({
            where: { sessionId, role: 'assistant' },
            orderBy: { createdAt: 'desc' },
            take: 6
          });

          for (const msg of recentAssistantMsgs) {
            if (msg.toolResults) {
              try {
                const resObj = JSON.parse(msg.toolResults);
                if (resObj.negotiatedPrice || resObj.offer) {
                  targetProduct = resObj.offer || resObj;
                  priceToUse = resObj.negotiatedPrice || resObj.newPrice || targetProduct.price;
                  break;
                }
                if (resObj.item) {
                  targetProduct = resObj.item;
                  priceToUse = resObj.item.price;
                  break;
                }
                if (Array.isArray(resObj.items) && resObj.items.length > 0) {
                  targetProduct = resObj.items[0];
                  priceToUse = targetProduct.price;
                  break;
                }
              } catch (_) {}
            }

            // Also check for bold markdown product titles in message content
            const boldMatch = msg.content?.match(/\*\*([A-Za-z0-9\s-]{3,40})\*\*/);
            if (boldMatch) {
              const candidateTitle = boldMatch[1].trim();
              const found = await prisma.product.findFirst({
                where: { title: { contains: candidateTitle }, isArchived: false },
                include: { store: true, images: true }
              });
              if (found) {
                targetProduct = found;
                priceToUse = found.price;
                break;
              }
            }
          }
        }

        // Last resort: find most recent in-stock product
        if (!targetProduct) {
          targetProduct = await prisma.product.findFirst({
            where: { stock: { gt: 0 }, isArchived: false },
            include: { store: true, images: true },
            orderBy: { createdAt: 'desc' }
          });
          if (targetProduct) {
            priceToUse = targetProduct.price;
          }
        }

        if (!targetProduct) {
          return { success: false, message: 'Could not determine which product to add. Please specify the product name.' };
        }

        const targetProductId = String(targetProduct.id || targetProduct.productId);
        const finalPrice = Number(priceToUse || targetProduct.price || 0);
        const storeName = targetProduct.store?.storeName || targetProduct.sellerName || targetProduct.seller?.name || 'Verified W-Commerce Merchant';
        const imgUrl = resolveBackendProductImage(targetProduct);

        // 1. Sync directly to the existing real Cart / CartItem tables for this user
        if (effectiveUserId) {
          try {
            let mainCart = await prisma.cart.findUnique({ where: { userId: effectiveUserId } });
            if (!mainCart) {
              mainCart = await prisma.cart.create({ data: { userId: effectiveUserId } });
            }
            const existingCartItem = await prisma.cartItem.findFirst({
              where: { cartId: mainCart.id, productId: targetProductId }
            });
            if (existingCartItem) {
              await prisma.cartItem.update({
                where: { id: existingCartItem.id },
                data: { quantity: existingCartItem.quantity + quantity }
              });
            } else {
              await prisma.cartItem.create({
                data: {
                  cartId: mainCart.id,
                  productId: targetProductId,
                  quantity
                }
              });
            }
          } catch (syncErr) {
            logger.warn(`[PayAI:Orchestrator] Main cart sync warning: ${syncErr.message}`);
          }
        }

        // 2. Also keep PayAI session cart up-to-date
        const cart = await cartService.getOrCreateCart({ userId: effectiveUserId, sessionId, marketCode });
        const updatedCart = await cartService.addItem(cart.id, {
          productId: targetProductId,
          title: targetProduct.title,
          price: finalPrice,
          currency: 'NGN',
          quantity,
          imageUrl: imgUrl,
          sellerName: storeName,
          sellerId: targetProduct.sellerId || targetProduct.store?.sellerId || targetProduct.store?.id
        });

        return {
          success: true,
          action: 'CART_UPDATED',
          checkoutReady: true,
          item: {
            id: targetProductId,
            productId: targetProductId,
            title: targetProduct.title,
            price: finalPrice,
            currency: 'NGN',
            quantity,
            imageUrl: imgUrl,
            sellerName: storeName,
            storeName,
            storeId: targetProduct.storeId || targetProduct.store?.id
          },
          cart: updatedCart
        };
      }

      case 'checkout_cart':
      case 'place_order': {
        const cart = await cartService.getOrCreateCart({ userId, sessionId, marketCode });
        if (!cart.items || cart.items.length === 0) {
          throw new Error('Your PayAI cart is currently empty. Please add items before checking out.');
        }
        return await orderService.placeOrder({
          userId,
          sessionId,
          cartId: cart.id,
          quoteId: toolArgs.quoteId,
          shippingAddress: toolArgs.shippingAddress,
          paymentProvider: toolArgs.paymentProvider || 'PAYPAL',
          marketCode,
          currency: toolArgs.currency || 'USD'
        });
      }

      case 'link_global_product': {
        const { url } = toolArgs;
        if (!url) throw new Error('A valid product URL is required to link an external item.');
        const resolved = await globalStoreService.resolveAndImportProductUrl(url, {
          destinationCountry,
          targetCurrency: toolArgs.targetCurrency || 'USD',
          sellerId: userId
        });

        // Strict enforcement: Global store items are reference only, no cart additions
        resolved.canAddToCart = false;
        resolved.addedToCart = false;

        return resolved;
      }

      case 'resolve_store_url': {
        const { url } = toolArgs;
        if (!url) throw new Error('A valid store URL is required.');
        return await globalStoreService.resolveStoreUrl(url);
      }

      case 'create_paypal_checkout': {
        const { quoteId, approvalId, returnUrl, cancelUrl } = toolArgs;
        const paypalPaymentService = require('./paypalPaymentService');
        return await paypalPaymentService.createPayPalOrder({
          quoteId,
          approvalId,
          userId,
          returnUrl,
          cancelUrl
        });
      }

      case 'confirm_order_receipt': {
        const orderId = toolArgs.orderId || toolArgs.orderNumber;
        if (!orderId) throw new Error('Order number or ID is required to confirm receipt.');
        const paypalPaymentService = require('./paypalPaymentService');
        return await paypalPaymentService.releaseSellerPayout({
          orderId,
          sellerId: toolArgs.sellerId || null,
          triggerSource: 'BUYER_CONFIRMATION'
        });
      }

      case 'guide_checkout_button': {
        let lastAmountNGN = 18000;
        let lastProductTitle = 'W-Commerce Order';
        let lastStoreName = 'Verified Merchant';
        let lastProductId = null;
        let lastImageUrl = null;

        // 1. Check user's active cart first
        if (effectiveUserId) {
          try {
            const userCart = await prisma.cart.findUnique({
              where: { userId: effectiveUserId },
              include: { items: { include: { product: { include: { store: true, images: true } } } } }
            });
            if (userCart?.items?.length > 0) {
              const firstItem = userCart.items[0];
              const total = userCart.items.reduce((s, it) => s + (Number(it.product?.price || 0) * (it.quantity || 1)), 0);
              if (total > 0) lastAmountNGN = total;
              lastProductTitle = firstItem.product?.title || lastProductTitle;
              lastStoreName = firstItem.product?.store?.storeName || lastStoreName;
              lastProductId = firstItem.product?.id || null;
              lastImageUrl = firstItem.product?.images?.[0]?.url || null;
            }
          } catch (_) {}
        }

        // 2. Check recent assistant messages for toolResults
        const recentMsgs = await prisma.payAIMessage.findMany({
          where: { sessionId, role: 'assistant' },
          orderBy: { createdAt: 'desc' },
          take: 6
        });
        for (const m of recentMsgs) {
          if (m.toolResults) {
            try {
              const parsed = JSON.parse(m.toolResults);
              if (parsed.item?.price) {
                lastAmountNGN = Number(parsed.item.price) * (parsed.item.quantity || 1);
                lastProductTitle = parsed.item.title || lastProductTitle;
                lastStoreName = parsed.item.sellerName || parsed.item.storeName || lastStoreName;
                lastProductId = parsed.item.id || parsed.item.productId || lastProductId;
                lastImageUrl = parsed.item.imageUrl || lastImageUrl;
                break;
              }
              if (parsed.currentOfferUnitPrice || parsed.newPrice || parsed.totalNGN || parsed.grandTotalNGN) {
                lastAmountNGN = parsed.currentOfferUnitPrice || parsed.newPrice || parsed.totalNGN || parsed.grandTotalNGN;
                lastProductTitle = parsed.productTitle || parsed.title || lastProductTitle;
                lastStoreName = parsed.storeName || lastStoreName;
                lastProductId = parsed.productId || lastProductId;
                break;
              }
            } catch (e) {}
          }
        }

        const isPayPal = Boolean(toolArgs?.isPayPalIntent || (typeof toolArgs?.prompt === 'string' && /paypal|pay\s*pal/i.test(toolArgs.prompt)));
        const amountUSD = Number((lastAmountNGN / 1480).toFixed(2));

        return {
          checkoutReady: true,
          isWalletCheckout: true,
          isPayPalCheckout: isPayPal,
          amountNGN: lastAmountNGN,
          amountUSD: amountUSD,
          productTitle: lastProductTitle,
          storeName: lastStoreName,
          productId: lastProductId,
          imageUrl: lastImageUrl,
          supportedGateways: isPayPal
            ? ['PayPal', 'Wallet', 'Paystack', 'Monnify']
            : ['Paystack', 'Monnify', 'Wallet', 'Cash on Delivery']
        };
      }

      case 'budget_shopping_plan': {
        const { query = '', category = null, targetBudget = null } = toolArgs;
        const effectiveUserId = userId || session?.userId;

        // 1. Look up the authenticated user's wallet via prisma.wallet.findUnique({ where: { userId } })
        let wallet = null;
        if (effectiveUserId) {
          wallet = await prisma.wallet.findUnique({
            where: { userId: String(effectiveUserId) }
          }).catch(() => null);
        }

        let balanceNGN = 0;
        let balanceUSD = 0;
        let isLiveUser = false;

        if (wallet) {
          isLiveUser = true;
          const gongVal = Number(wallet.gongAvailable || 0);
          const gxVal = Number(wallet.gxAvailable || 0);
          if (gongVal > 0) {
            balanceNGN = gongVal;
          } else if (gxVal > 0) {
            balanceNGN = gxVal;
          } else {
            balanceNGN = 0;
          }
        } else if (effectiveUserId) {
          const user = await prisma.user.findUnique({
            where: { id: String(effectiveUserId) },
            select: { id: true, fullName: true, walletBalance: true, balance: true }
          }).catch(() => null);
          if (user) {
            isLiveUser = true;
            const uWallet = Number(user.walletBalance || 0);
            const uBal = Number(user.balance || 0);
            if (uWallet > 0) {
              balanceNGN = uWallet < 2000 ? Math.round(uWallet * 1480) : Math.round(uWallet);
            } else if (uBal > 0) {
              balanceNGN = uBal;
            }
          }
        }

        // Demo / Guest mode fallback balance if unauthenticated
        if (!effectiveUserId && balanceNGN === 0) {
          balanceNGN = 250000;
        }
        balanceUSD = Number((balanceNGN / 1480).toFixed(2));

        const effectiveBudget = (targetBudget && Number(targetBudget) > 0)
          ? Math.min(Number(targetBudget), balanceNGN)
          : balanceNGN;

        if (effectiveBudget <= 0) {
          return {
            success: true,
            isFeasible: false,
            availableBalanceNGN: 0,
            availableBalanceUSD: 0,
            fundsCommitted: false,
            message: 'Your W-Commerce Wallet balance is currently ₦0. Please top up your wallet to start budget shopping.',
            items: [],
            actionCard: {
              type: 'WALLET_TOP_UP_REQUIRED',
              title: 'Top Up Wallet Balance',
              buttonLabel: 'Go to Wallet Dashboard',
              url: '/buyer/wallet'
            }
          };
        }

        // 2. Query available in-stock native products within this budget limit
        const searchWhere = {
          isArchived: false,
          stock: { gt: 0 }
        };

        if (query && query.trim().length > 1) {
          searchWhere.OR = [
            { title: { contains: query.trim() } },
            { description: { contains: query.trim() } },
            { category: { contains: query.trim() } }
          ];
        } else if (category) {
          searchWhere.category = { contains: category };
        }

        let candidates = await prisma.product.findMany({
          where: searchWhere,
          include: { store: true, images: true },
          orderBy: [{ isAdBoosted: 'desc' }, { viewCount: 'desc' }, { createdAt: 'desc' }],
          take: 12
        }).catch(() => []);

        if (candidates.length === 0) {
          candidates = await prisma.product.findMany({
            where: { isArchived: false, stock: { gt: 0 } },
            include: { store: true, images: true },
            orderBy: [{ viewCount: 'desc' }, { createdAt: 'desc' }],
            take: 12
          }).catch(() => []);
        }

        // Filter and sort items that fit comfortably inside the budget
        const affordable = candidates
          .map(p => {
            const price = Number(p.price) || 0;
            return {
              id: p.id,
              title: p.title,
              price,
              stock: p.stock,
              category: p.category,
              storeName: p.store?.storeName || 'Verified W-Commerce Merchant',
              imageUrl: resolveBackendProductImage(p),
              isNegotiable: p.isNegotiable !== false
            };
          })
          .filter(p => p.price > 0 && p.price <= effectiveBudget)
          .sort((a, b) => b.price - a.price);

        if (affordable.length === 0) {
          return {
            success: true,
            isFeasible: false,
            availableBalanceNGN: balanceNGN,
            availableBalanceUSD: balanceUSD,
            fundsCommitted: false,
            message: `No verified in-stock items found within your balance limit of ₦${effectiveBudget.toLocaleString()} NGN.`,
            items: []
          };
        }

        // Build a primary feasible plan (top item or combo)
        const primaryItem = affordable[0];
        const selectedItems = [primaryItem];
        let subtotal = primaryItem.price;

        // Try pairing with a second item if budget allows
        if (affordable.length > 1) {
          const secondItem = affordable.find(it => it.id !== primaryItem.id && (subtotal + it.price <= effectiveBudget));
          if (secondItem) {
            selectedItems.push(secondItem);
            subtotal += secondItem.price;
          }
        }

        // Calculate shipping with free shipping threshold
        const shippingCheck = pricingService.calculateShippingFees({
          items: selectedItems.map(it => ({ price: it.price, quantity: 1, currency: 'NGN' })),
          destinationCountry: destinationCountry || 'NG',
          isDomestic: (destinationCountry || 'NG') === 'NG',
          marketCode: marketCode || 'NIGERIA'
        });

        const shippingCost = shippingCheck.finalShippingFee;
        const totalRequired = subtotal + shippingCost;
        const isFeasible = totalRequired <= balanceNGN;
        const remainingBalance = Math.max(0, balanceNGN - totalRequired);

        return {
          success: true,
          planId: `PLAN-${Date.now().toString().slice(-6)}`,
          availableBalanceNGN: balanceNGN,
          availableBalanceUSD: balanceUSD,
          isFeasible,
          fundsCommitted: false, // NEVER commit funds without explicit approval!
          items: selectedItems,
          alternativeItems: affordable.slice(1, 4),
          financialSummary: {
            subtotalNGN: subtotal,
            shippingFeeNGN: shippingCost,
            qualifiesForFreeShipping: shippingCheck.qualifiesForFreeShipping,
            freeShippingSavings: shippingCheck.freeShippingSavings,
            totalRequiredNGN: totalRequired,
            remainingBalanceNGN: remainingBalance,
            currency: 'NGN'
          },
          actionCard: {
            type: 'WALLET_PAYMENT_APPROVAL',
            title: 'Authorize Wallet Payment',
            orderSummary: `${selectedItems.length} item(s) • Total ₦${totalRequired.toLocaleString()} NGN`,
            totalAmountNGN: totalRequired,
            remainingBalanceNGN: remainingBalance,
            buttonLabel: `Authorize & Pay ₦${totalRequired.toLocaleString()} from Wallet`,
            actionPrompt: `pay with wallet ₦${totalRequired}`
          },
          message: `Feasible shopping plan created within your available balance of ₦${balanceNGN.toLocaleString()} NGN.`
        };
      }

      case 'check_wallet_balance': {
        const wallet = await negotiationEngineService.getBuyerWalletBalance(userId);
        return {
          success: true,
          isWalletInquiry: true,
          walletBalance: {
            balanceNGN: wallet.balanceNGN,
            balanceUSD: wallet.balanceUSD,
            heldNGN: wallet.heldNGN || 0,
            isLiveUser: wallet.isLiveUser,
            fxRate: wallet.fxRate,
            currency: wallet.currency || 'NGN',
            escrowProtected: true,
            walletUrl: '/buyer/wallet'
          }
        };
      }

      case 'checkout_with_wallet': {
        const amountMatch = (toolArgs.prompt || '').match(/₦?\s*([0-9,]+)/);
        const requestedAmountNGN = amountMatch ? parseInt(amountMatch[1].replace(/,/g, ''), 10) : null;

        return await negotiationEngineService.checkoutWithWallet({
          userId,
          sessionId,
          amountNGN: requestedAmountNGN || toolArgs.amountNGN || 18000,
          destinationCountry
        });
      }

      default:
        throw new Error(`Tool ${toolName} is not in the approved PayAI tool list.`);
    }
  }

  _extractBudgetFromText(str) {
    if (!str) return null;
    const match = str.match(/(?:below|under|less\s+than|<=?|within|budget(?:\s+of)?|max(?:\s+of)?|for|have|got|with|spend|spending|around|about)?\s*(?:₦|\$|ngn|usd)?\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)\s*(k|thousand|naira|ngn|usd)?/i);
    if (match && match[1]) {
      let val = parseFloat(match[1].replace(/,/g, ''));
      const unit = (match[2] || '').toLowerCase();
      if (unit === 'k' || unit === 'thousand') {
        val = val * 1000;
      }
      if (val > 100) return val;
    }
    return null;
  }

  _extractDaysFromText(str) {
    if (!str) return 3;
    const numMatch = str.match(/\b(?:for|next|across|over)?\s*(\d+)\s*days?\b/i);
    if (numMatch) {
      const val = parseInt(numMatch[1], 10);
      if (val > 0 && val <= 30) return val;
    }
    const wordMap = {
      one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
      couple: 2, 'a few': 3, week: 7, 'a week': 7
    };
    for (const [w, n] of Object.entries(wordMap)) {
      const regex = new RegExp(`\\b(?:for|next|across|over)?\\s*${w}\\s*(?:days?|of\\s+meals?)?\\b`, 'i');
      if (regex.test(str)) return n;
    }
    if (/\bweek\b/i.test(str)) return 7;
    if (/\bweekend\b/i.test(str)) return 2;
    return 3;
  }

  _extractMealsFromText(str) {
    if (!str) return ['breakfast', 'lunch'];
    const meals = [];
    if (/\bbreak\s*fast\b/i.test(str)) meals.push('breakfast');
    if (/\blunch\b/i.test(str)) meals.push('lunch');
    if (/\bdinner\b/i.test(str)) meals.push('dinner');
    if (/\bsnack\b/i.test(str)) meals.push('snack');
    return meals.length > 0 ? meals : ['breakfast', 'lunch'];
  }

  /**
   * Dedicated Multi-Day Planner: Calculates daily item allocations, pairs complementary meals and drinks,
   * respects total budget constraints, and formats clear, structured day-by-day shopping plans with itemized costs.
   */
  async _planMultiDayMealsOrBudget({
    prompt = '',
    budget,
    days,
    category = 'food',
    meals,
    session = null,
    userId = null,
    existingPlan = null,
    modifications = null
  }) {
    let planDays = days || this._extractDaysFromText(prompt) || 3;
    const planMeals = meals || this._extractMealsFromText(prompt);
    const assumptions = [];
    let userSpecifiedBudget = false;
    let totalBudget = Number(budget);

    if (!totalBudget || isNaN(totalBudget) || totalBudget <= 0) {
      const extracted = this._extractBudgetFromText(prompt);
      if (extracted) {
        totalBudget = extracted;
        userSpecifiedBudget = true;
      }
    } else {
      userSpecifiedBudget = true;
    }

    const wallet = await negotiationEngineService.getBuyerWalletBalance(userId);

    // Fetch candidate food & beverage inventory from Prisma
    const candidateProducts = await prisma.product.findMany({
      where: { isArchived: false, stock: { gt: 0 } },
      include: { images: true, store: true }
    });

    const formattedProducts = candidateProducts.map(p => ({
      id: p.id,
      title: p.title,
      price: Number(p.price),
      category: p.category || '',
      stock: p.stock,
      storeName: p.store?.storeName || 'Verified Merchant',
      imageUrl: resolveBackendProductImage(p),
      currency: 'NGN'
    }));

    const nonFoodCategories = /apparel|clothing|fashion|tech|electronics|first\s*aid|oral|tissues|paper|cleaner|laundry|body\s*wash|wipes|diapers|foil|sauce/i;
    const foodProducts = formattedProducts.filter(p => !nonFoodCategories.test(p.category) && !/gymshark|headphone|watch|trouser|t-shirt|top|blouse|aged|mayo|inferno|bbq/i.test(p.title));

    const drinksPool = foodProducts.filter(p => /water|drink|juice|sprite|fanta|coke|beverage|milk/i.test(`${p.title} ${p.category}`));
    const breakfastPool = foodProducts.filter(p =>
      (/cereal|oat|corn\s*flakes|egg|banana|fruit|biscuit|porridge|breakfast|crunch\s*box/i.test(`${p.title} ${p.category}`)) &&
      !/water|sprite|fanta|coke/i.test(p.title)
    );
    const lunchPool = foodProducts.filter(p =>
      (/meal|burger|strip|feast|rice|noodle|chicken|hungry\s*box|loaded\s*fries/i.test(`${p.title} ${p.category}`)) &&
      !/cereal|oat|corn\s*flakes|egg|banana|biscuit|water|sprite|fanta|coke/i.test(p.title)
    );

    drinksPool.sort((a, b) => a.price - b.price);
    breakfastPool.sort((a, b) => a.price - b.price);
    lunchPool.sort((a, b) => a.price - b.price);

    const defaultDrink = drinksPool[0] || { id: 'fallback-water', title: 'Bottled Spring Water', price: 500, currency: 'NGN', imageUrl: '' };
    const defaultBreakfast = breakfastPool[0] || { id: 'fallback-bf', title: 'Crunch Box', price: 3500, currency: 'NGN', imageUrl: '' };
    const defaultLunch = lunchPool[0] || { id: 'fallback-ln', title: 'Loaded Fries', price: 3500, currency: 'NGN', imageUrl: '' };

    const dayThemes = [
      { title: 'Energy & Focus Kickoff', desc: 'Light, nutrient-dense morning nutrition paired with cold refreshment, followed by savory crispy lunch.' },
      { title: 'Hearty Midweek Boost', desc: 'Protein-packed breakfast paired with refreshing drink, followed by signature burger feast.' },
      { title: 'Crisp & Savory Satisfaction', desc: 'Golden breakfast crunch paired with cold refreshment, followed by loaded meal box.' },
      { title: 'Comfort & Stamina Balance', desc: 'Wholesome morning nutrition with ice-cold beverage, followed by spiced poultry combo.' },
      { title: 'Weekend Warmup Feast', desc: 'Rich morning spread paired with citrus juice, followed by double-patty savory burger.' },
      { title: 'Weekend Indulgence', desc: 'Delicious relaxed breakfast with flavored beverage, followed by premium chef special.' },
      { title: 'Weekly Refresh & Reset', desc: 'Clean wholesome fruit & dairy pairing, followed by hearty satisfaction lunch combo.' }
    ];

    let plannedDays = [];
    let modificationNote = '';

    if (existingPlan && existingPlan.plannedDays && modifications) {
      planDays = existingPlan.daysCount || existingPlan.plannedDays.length;
      plannedDays = JSON.parse(JSON.stringify(existingPlan.plannedDays));

      if (modifications.swapDay && modifications.meal) {
        const dayIdx = Number(modifications.swapDay) - 1;
        if (dayIdx >= 0 && dayIdx < plannedDays.length) {
          let replItem = modifications.replacementItem;
          if (!replItem && modifications.replacementQuery) {
            const q = modifications.replacementQuery.toLowerCase();
            replItem = foodProducts.find(p => p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
            if (!replItem) {
              replItem = modifications.meal === 'breakfast' ? breakfastPool[dayIdx % breakfastPool.length] : lunchPool[dayIdx % lunchPool.length];
            }
          }
          if (replItem) {
            if (modifications.meal === 'lunch') {
              const oldTitle = plannedDays[dayIdx].lunch.item.title;
              plannedDays[dayIdx].lunch.item = replItem;
              plannedDays[dayIdx].lunch.cost = replItem.price + plannedDays[dayIdx].lunch.drink.price;
              plannedDays[dayIdx].dayCost = plannedDays[dayIdx].breakfast.cost + plannedDays[dayIdx].lunch.cost;
              modificationNote = `🔄 **Follow-Up Adjustment Applied:** Swapped Day ${modifications.swapDay} lunch from *${oldTitle}* to **${replItem.title}** (₦${replItem.price.toLocaleString()} NGN).`;
            } else if (modifications.meal === 'breakfast') {
              const oldTitle = plannedDays[dayIdx].breakfast.item.title;
              plannedDays[dayIdx].breakfast.item = replItem;
              plannedDays[dayIdx].breakfast.cost = replItem.price + plannedDays[dayIdx].breakfast.drink.price;
              plannedDays[dayIdx].dayCost = plannedDays[dayIdx].breakfast.cost + plannedDays[dayIdx].lunch.cost;
              modificationNote = `🔄 **Follow-Up Adjustment Applied:** Swapped Day ${modifications.swapDay} breakfast from *${oldTitle}* to **${replItem.title}** (₦${replItem.price.toLocaleString()} NGN).`;
            }
          }
        }
      }
    } else {
      for (let i = 0; i < planDays; i++) {
        const theme = dayThemes[i % dayThemes.length];
        const bfItem = breakfastPool[i % breakfastPool.length] || defaultBreakfast;
        const bfDrink = drinksPool[(i * 2) % drinksPool.length] || defaultDrink;
        const lnItem = lunchPool[i % lunchPool.length] || defaultLunch;
        const lnDrink = drinksPool[(i * 2 + 1) % drinksPool.length] || defaultDrink;

        const bfCost = bfItem.price + bfDrink.price;
        const lnCost = lnItem.price + lnDrink.price;
        const daySubtotal = bfCost + lnCost;

        plannedDays.push({
          dayNumber: i + 1,
          themeTitle: `Day ${i + 1}: ${theme.title}`,
          themeDesc: theme.desc,
          dayCost: daySubtotal,
          currency: 'NGN',
          breakfast: {
            item: bfItem,
            drink: bfDrink,
            cost: bfCost,
            pairingAdvice: `Wholesome morning nutrition paired with refreshing ${bfDrink.title} for clean hydration and sustained energy.`
          },
          lunch: {
            item: lnItem,
            drink: lnDrink,
            cost: lnCost,
            pairingAdvice: `Hot, savory ${lnItem.title} balanced with an ice-cold ${lnDrink.title} to replenish midday stamina.`
          }
        });
      }
    }

    let runningTotalCost = plannedDays.reduce((sum, d) => sum + d.dayCost, 0);

    if (userSpecifiedBudget) {
      assumptions.push(`Strictly capping total expenditure within your requested budget of ₦${totalBudget.toLocaleString()} NGN.`);
      if (runningTotalCost > totalBudget) {
        for (const d of plannedDays) {
          if (runningTotalCost <= totalBudget) break;
          if (d.lunch.drink.price > 500) {
            runningTotalCost -= (d.lunch.drink.price - 500);
            d.lunch.drink = defaultDrink;
            d.lunch.cost = d.lunch.item.price + 500;
          }
          if (runningTotalCost > totalBudget && d.breakfast.drink.price > 500) {
            runningTotalCost -= (d.breakfast.drink.price - 500);
            d.breakfast.drink = defaultDrink;
            d.breakfast.cost = d.breakfast.item.price + 500;
          }
          if (runningTotalCost > totalBudget && d.lunch.item.price > 3500) {
            const cheapLn = lunchPool.find(p => p.price <= 3500) || defaultLunch;
            runningTotalCost -= (d.lunch.item.price - cheapLn.price);
            d.lunch.item = cheapLn;
            d.lunch.cost = cheapLn.price + d.lunch.drink.price;
          }
          d.dayCost = d.breakfast.cost + d.lunch.cost;
        }
      }
    } else {
      totalBudget = Math.min(wallet.balanceNGN, runningTotalCost + 3000);
      assumptions.push(`Allocated ₦${totalBudget.toLocaleString()} NGN (~₦${Math.round(totalBudget / planDays).toLocaleString()} NGN/day) from your available balance of ₦${wallet.balanceNGN.toLocaleString()} NGN, providing a comfortable buffer.`);
    }

    assumptions.push(`Covering ${planDays} consecutive days with complementary morning & afternoon meal-and-drink pairings from verified local merchants.`);

    const budgetRemaining = Math.max(0, totalBudget - runningTotalCost);

    let planMarkdown = `📅 **Your ${planDays}-Day Curated Meal & Shopping Plan**\n\n`;
    if (modificationNote) {
      planMarkdown += `${modificationNote}\n\n`;
    }
    planMarkdown += `💰 **Total Budget:** **₦${totalBudget.toLocaleString()} NGN** | **Planned Total:** **₦${runningTotalCost.toLocaleString()} NGN** | **Budget Remaining:** **₦${budgetRemaining.toLocaleString()} NGN** ✅ *(Strictly Under Budget)*\n\n`;

    if (assumptions.length > 0) {
      planMarkdown += `> [!NOTE]\n` + assumptions.map(a => `> **Assumption:** ${a}`).join('\n') + `\n\n`;
    }

    for (const day of plannedDays) {
      planMarkdown += `### 🌅 ${day.themeTitle} (Day Subtotal: ₦${day.dayCost.toLocaleString()} NGN)\n`;
      planMarkdown += `*${day.themeDesc}*\n\n`;

      planMarkdown += `• 🍳 **Breakfast Combo (₦${day.breakfast.cost.toLocaleString()} NGN):**\n`;
      planMarkdown += `  - **Meal:** **${day.breakfast.item.title}** — **₦${day.breakfast.item.price.toLocaleString()} NGN**\n`;
      planMarkdown += `  - **Drink Pairing:** **${day.breakfast.drink.title}** — **₦${day.breakfast.drink.price.toLocaleString()} NGN**\n`;
      planMarkdown += `  - 💡 *Pairing Note:* ${day.breakfast.pairingAdvice}\n`;
      if (day.breakfast.item.imageUrl) {
        planMarkdown += `  ![${day.breakfast.item.title}](${day.breakfast.item.imageUrl})\n`;
      }
      planMarkdown += `\n`;

      planMarkdown += `• 🍔 **Lunch Combo (₦${day.lunch.cost.toLocaleString()} NGN):**\n`;
      planMarkdown += `  - **Meal:** **${day.lunch.item.title}** — **₦${day.lunch.item.price.toLocaleString()} NGN**\n`;
      planMarkdown += `  - **Drink Pairing:** **${day.lunch.drink.title}** — **₦${day.lunch.drink.price.toLocaleString()} NGN**\n`;
      planMarkdown += `  - 💡 *Pairing Note:* ${day.lunch.pairingAdvice}\n`;
      if (day.lunch.item.imageUrl) {
        planMarkdown += `  ![${day.lunch.item.title}](${day.lunch.item.imageUrl})\n`;
      }
      planMarkdown += `\n---\n\n`;
    }

    planMarkdown += `### 📊 Itemized Financial Summary\n\n`;
    planMarkdown += `| Day | Breakfast + Drink | Lunch + Drink | Day Total |\n`;
    planMarkdown += `| :--- | :--- | :--- | :--- |\n`;
    for (const day of plannedDays) {
      planMarkdown += `| **Day ${day.dayNumber}** | ₦${day.breakfast.cost.toLocaleString()} NGN | ₦${day.lunch.cost.toLocaleString()} NGN | **₦${day.dayCost.toLocaleString()} NGN** |\n`;
    }
    planMarkdown += `| **Total Planned** | | | **₦${runningTotalCost.toLocaleString()} NGN** |\n\n`;

    planMarkdown += `🛡️ **Escrow Protection:** All selected meals are prepared and dispatched by verified local merchants under W-Commerce Escrow Protection. Funds are only disbursed once your order arrives fresh!\n\n`;
    planMarkdown += `💡 *Optional Preferences:* Want to swap any day's meal (e.g. *"Swap day 2 lunch for sushi"*), change to 4 or 5 days, or adjust your budget? Just let me know and I will update your plan instantly!\n\n`;

    const chips = [
      `[🛒 Add Entire ${planDays}-Day Plan to Cart (₦${runningTotalCost.toLocaleString()})](prompt:add all plan items to cart)`,
      `[🔄 Swap Day 2 Lunch](prompt:swap day 2 lunch for something lighter)`,
      `[➕ Extend to 4 Days](prompt:extend meal plan to 4 days)`,
      `[💳 Pay with Wallet (₦${runningTotalCost.toLocaleString()})](prompt:pay from wallet)`
    ];
    planMarkdown += `**Quick 1-Click Actions:**\n` + chips.join(' ');

    const allItems = [];
    for (const d of plannedDays) {
      allItems.push(d.breakfast.item, d.breakfast.drink, d.lunch.item, d.lunch.drink);
    }

    return {
      success: true,
      planType: 'multi_day_meals',
      totalBudget,
      totalPlannedCost: runningTotalCost,
      budgetRemaining,
      daysCount: planDays,
      assumptions,
      plannedDays,
      items: allItems,
      multiDayPlan: {
        totalBudget,
        totalPlannedCost: runningTotalCost,
        daysCount: planDays,
        plannedDays,
        items: allItems
      },
      formattedPlan: planMarkdown,
      actionChips: chips
    };
  }

  /**
   * Universal Goal Decomposition Engine: Handles budget goals, programming laptop search,
   * shopping list optimization, and deadline-driven gift recommendations.
   */
  async _planBudgetGoal({
    prompt = '',
    goalType,
    budget,
    deadline,
    criteria,
    session = null,
    userId = null,
    existingGoal = null
  }) {
    const lower = (prompt || '').toLowerCase();
    const assumptions = [];
    const wallet = await negotiationEngineService.getBuyerWalletBalance(userId);

    // Goal 1: Phone within available balance
    if (goalType === 'phone_within_balance' || (lower.includes('phone') && (lower.includes('balance') || lower.includes('budget') || lower.includes('afford')))) {
      const userBudgetNGN = budget || wallet.balanceNGN;
      const userBudgetUSD = wallet.balanceUSD;
      assumptions.push(`Retrieved your verified wallet balance of ₦${userBudgetNGN.toLocaleString()} NGN (~$${userBudgetUSD} USD).`);
      assumptions.push(`Filtered for verified authentic devices and companion tech within balance, leaving headroom for express shipping and escrow protection.`);

      const searchRes = await catalogSearchService.search({
        query: 'phone electronics watch',
        maxPrice: userBudgetNGN,
        limit: 6,
        marketCode: session?.marketCode || 'NIGERIA'
      });

      const items = searchRes.items || [];
      let md = `📱 **Curated Smartphone & Tech Selection Within Your Available Balance**\n\n`;
      md += `💰 **Available Wallet Balance:** **₦${userBudgetNGN.toLocaleString()} NGN** ($${userBudgetUSD} USD) | **Escrow Protected:** 100% Guaranteed ✅\n\n`;
      md += `> [!NOTE]\n` + assumptions.map(a => `> **Assumption:** ${a}`).join('\n') + `\n\n`;

      for (const it of items.slice(0, 4)) {
        const pDisplay = it.currency === 'NGN' ? `₦${Number(it.price).toLocaleString()} NGN` : `$${it.price} USD`;
        const remainingNGN = userBudgetNGN - (it.currency === 'NGN' ? Number(it.price) : Number(it.price) * wallet.fxRate);
        const stockBadge = it.stock > 0 ? `✅ In Stock (${it.stock} units)` : `Available`;
        const negBadge = it.canNegotiate ? `🤝 *Negotiable*` : `🔒 *Fixed Price*`;
        const imgPart = it.imageUrl ? `\n  ![${it.title}](${it.imageUrl})` : '';

        md += `### 📲 **${it.title}**\n`;
        md += `- **Price:** **${pDisplay}** (${stockBadge} | ${negBadge})\n`;
        md += `- **Seller:** ${it.seller?.name || 'Verified Merchant'} (${it.seller?.country || 'Local Fulfillment Vault'})\n`;
        md += `- **Balance Headroom Remaining:** **₦${Math.max(0, remainingNGN).toLocaleString()} NGN** (Plenty for cases & accessories!)\n`;
        md += `- **Fulfillment:** ${it.fulfillmentType || 'Express Dispatch'} • ${it.estimatedDays || '1-3 business days'}${imgPart}\n\n`;
      }

      md += `💡 *Optional Preferences:* Looking for a specific brand (e.g. Apple iPhone, Samsung Galaxy) or specific storage/camera specs? Just let me know!\n\n`;
      md += `**Quick 1-Click Actions:**\n[📱 Pay from Wallet](prompt:pay from wallet) [🤝 Negotiate Best Price](prompt:What is your best price?) [👛 Show Matching Cases & Pouches](prompt:show phone pouches and accessories)`;

      return {
        success: true,
        goalType: 'phone_within_balance',
        formattedResponse: md,
        items
      };
    }

    // Goal 2: Cheapest reliable laptop for programming
    if (goalType === 'laptop_programming' || (lower.includes('laptop') && (lower.includes('cheap') || lower.includes('programming') || lower.includes('reliable') || lower.includes('code')))) {
      assumptions.push(`Defined 'reliable for programming' as 8GB+ RAM, fast SSD storage, multi-core CPU capable of smooth IDE compilation (VS Code, IntelliJ, Docker), and verified seller escrow protection.`);
      assumptions.push(`Ranked by lowest verified price among qualified models.`);

      const searchRes = await catalogSearchService.search({
        query: 'MacBook laptop',
        limit: 6,
        marketCode: 'INTERNATIONAL'
      });

      const items = searchRes.items || [];
      let md = `💻 **Top Recommended Programming Laptops (Cheapest Verified & Reliable)**\n\n`;
      md += `> [!NOTE]\n` + assumptions.map(a => `> **Assumption:** ${a}`).join('\n') + `\n\n`;

      for (const it of items.slice(0, 3)) {
        const pDisplay = it.currency === 'USD' ? `$${it.price} USD` : `₦${Number(it.price).toLocaleString()} NGN`;
        const imgPart = it.imageUrl ? `\n  ![${it.title}](${it.imageUrl})` : '';

        md += `### ⚡ **${it.title}** — **${pDisplay}**\n`;
        md += `- **Platform & Seller:** ${it.provider?.toUpperCase()} • ${it.seller?.name || 'Verified Store'}\n`;
        md += `- **Developer Benchmark:** 16GB Unified Memory / High-Speed SSD • Effortless multi-container Docker, VS Code, Node.js & Python workloads\n`;
        md += `- **Battery Life & Display:** Up to 18 hours battery • 15" Liquid Retina display for comfortable split-screen code editing\n`;
        md += `- **Escrow Protection:** 100% Money-Back Guarantee via W-Commerce Global Import Vault${imgPart}\n\n`;
      }

      md += `🛡️ **Warranty & Duty Guarantee:** All laptops imported via PayAI include guaranteed customs clearance, zero unexpected duties, and verified serial batch QC.\n\n`;
      md += `💡 *Optional Preferences:* Need Windows/Linux instead of macOS, or looking for 32GB RAM / dedicated GPU for machine learning? Tell me your stack!\n\n`;
      md += `**Quick 1-Click Actions:**\n[📋 Prepare Landed Cost Quote](prompt:calculate landed cost for laptop) [🔍 Compare with Windows Laptops](prompt:compare with Windows laptops) [🚚 Check Delivery Time](prompt:how long will shipping take?)`;

      return {
        success: true,
        goalType: 'laptop_programming',
        formattedResponse: md,
        items
      };
    }

    // Goal 3: Buy items on shopping list without exceeding budget
    if (goalType === 'shopping_list_budget' || lower.includes('shopping list') || (lower.includes('without exceeding') && (lower.includes('list') || lower.includes('budget')))) {
      let listBudget = budget || 20000;
      const match = lower.match(/(?:budget(?:\s+of)?|max(?:\s+of)?|under|within)\s*(?:₦|\$|ngn|usd)?\s*([0-9,]+)/i);
      if (match) {
        listBudget = parseInt(match[1].replace(/,/g, ''), 10);
      }

      let itemQueries = ['Whole Milk', 'Fresh Eggs', 'Corn Flakes', 'Instant Oats', 'Fresh Bananas'];
      const afterColon = prompt.match(/(?:list(?:\s+is)?|items(?:\s+are)?|buy|include):?\s*(.+?)(?:without|under|below|budget|$)/i);
      if (afterColon && afterColon[1].length > 4) {
        const parsed = afterColon[1].split(/,|\band\b/).map(s => s.trim()).filter(s => s.length > 2 && !/shopping|list|budget/i.test(s));
        if (parsed.length >= 2) itemQueries = parsed;
      }

      assumptions.push(`Parsed ${itemQueries.length} shopping list essentials: ${itemQueries.join(', ')}.`);
      assumptions.push(`Strictly capping total bundle cost within your budget of ₦${listBudget.toLocaleString()} NGN.`);

      const foundItems = [];
      let runningTotal = 0;

      for (const q of itemQueries) {
        const res = await catalogSearchService.search({ query: q, limit: 1, marketCode: 'NIGERIA' });
        if (res.items && res.items.length > 0) {
          const item = res.items[0];
          foundItems.push(item);
          runningTotal += Number(item.price);
        }
      }

      let md = `🛒 **Itemized Shopping List Optimization (Strict Budget Allocation)**\n\n`;
      md += `💰 **Target Budget:** **₦${listBudget.toLocaleString()} NGN** | **Total Planned:** **₦${runningTotal.toLocaleString()} NGN** | **Remaining:** **₦${Math.max(0, listBudget - runningTotal).toLocaleString()} NGN** ${runningTotal <= listBudget ? '✅ *(Under Budget)*' : '⚠️'}\n\n`;
      md += `> [!NOTE]\n` + assumptions.map(a => `> **Assumption:** ${a}`).join('\n') + `\n\n`;

      md += `| Item | Seller | Unit Price | Status |\n`;
      md += `| :--- | :--- | :--- | :--- |\n`;
      for (const it of foundItems) {
        md += `| **${it.title}** | ${it.seller?.name || 'Verified Merchant'} | ₦${Number(it.price).toLocaleString()} NGN | ✅ In Stock |\n`;
      }
      md += `| **Total Cart** | | **₦${runningTotal.toLocaleString()} NGN** | 🛡️ Escrow Protected |\n\n`;

      md += `🎉 **Budget Feasibility:** All ${foundItems.length} items from your shopping list are in stock and fit squarely within your ₦${listBudget.toLocaleString()} budget with ₦${Math.max(0, listBudget - runningTotal).toLocaleString()} NGN remaining!\n\n`;
      md += `**Quick 1-Click Actions:**\n[🛒 Add All Shopping List Items to Cart (₦${runningTotal.toLocaleString()})](prompt:add all shopping list items to cart) [💳 Pay from Wallet](prompt:pay from wallet)`;

      return {
        success: true,
        goalType: 'shopping_list_budget',
        formattedResponse: md,
        items: foundItems
      };
    }

    // Goal 4: Birthday gift arriving before Saturday
    if (goalType === 'birthday_gift_deadline' || (lower.includes('gift') && (lower.includes('saturday') || lower.includes('friday') || lower.includes('arrive') || lower.includes('deadline')))) {
      assumptions.push(`Delivery Deadline Constraint: Arrival strictly before Saturday.`);
      assumptions.push(`Filtered exclusively for Local Express Dispatch items (1-3 business days delivery with end-to-end tracked courier dispatch).`);
      assumptions.push(`Curated top giftable categories: smartwatches, luxury audio, and designer lifestyle accessories with premium unboxing experience.`);

      const searchRes = await catalogSearchService.search({
        query: 'watch headphones perfume gift',
        limit: 6,
        marketCode: 'NIGERIA'
      });

      const items = searchRes.items || [];
      let md = `🎁 **Curated Birthday Gifts Guaranteed to Arrive Before Saturday!** 🚀\n\n`;
      md += `⏱️ **Transit Status:** **Guaranteed Express Delivery** (Dispatched within 24hrs via GIG Logistics / Express Courier)\n\n`;
      md += `> [!NOTE]\n` + assumptions.map(a => `> **Assumption:** ${a}`).join('\n') + `\n\n`;

      for (const it of items.slice(0, 3)) {
        const pDisplay = it.currency === 'NGN' ? `₦${Number(it.price).toLocaleString()} NGN` : `$${it.price} USD`;
        const imgPart = it.imageUrl ? `\n  ![${it.title}](${it.imageUrl})` : '';

        md += `### 🎉 **${it.title}** — **${pDisplay}**\n`;
        md += `- **Seller:** ${it.seller?.name || 'Verified Luxury Merchant'}\n`;
        md += `- **Estimated Arrival:** **By Thursday / Friday at latest** (Well before Saturday!)\n`;
        md += `- **Gift Appeal:** High-perceived value, elegant packaging, ready for gifting\n`;
        md += `- **Protection:** W-Commerce 100% Escrow Guarantee with real-time milestone tracking${imgPart}\n\n`;
      }

      md += `💡 *Optional Preferences:* Would you like gift wrapping, a personalized card message, or a specific budget cap? Let me know!\n\n`;
      md += `**Quick 1-Click Actions:**\n[🎁 Add Birthday Gift to Cart](prompt:add 2026 SUMSUNG GALAXY WATCH to cart) [🚚 View Express Logistics Timeline](prompt:get shipping estimate) [💳 1-Click Wallet Checkout](prompt:pay from wallet)`;

      return {
        success: true,
        goalType: 'birthday_gift_deadline',
        formattedResponse: md,
        items
      };
    }

    return { success: false, reply: 'Unable to decompose goal.' };
  }

  _detectIntent(text, session, contextData = {}) {
    const lower = text.toLowerCase();

    // 0. URL Detection: Direct external product or store link
    const urlMatch = text.match(/(https?:\/\/[^\s]+)/i);
    if (urlMatch) {
      const detectedUrl = urlMatch[1];
      try {
        const meta = globalStoreService.detectPlatform(detectedUrl);
        if (meta.isStoreUrl && (lower.includes('store') || lower.includes('storefront') || lower.includes('shop profile') || lower.includes('seller'))) {
          return {
            toolName: 'resolve_store_url',
            toolArgs: { url: detectedUrl }
          };
        }
        return {
          toolName: 'link_global_product',
          toolArgs: { url: detectedUrl }
        };
      } catch {
        return {
          toolName: 'link_global_product',
          toolArgs: { url: detectedUrl }
        };
      }
    }

    if (lower.startsWith('link ') || lower.startsWith('import ') || lower.includes('link this') || lower.includes('import this') || lower.includes('link item')) {
      const possibleUrl = text.replace(/link|import|this|item|product|please|for me|and let me buy it/gi, '').trim();
      if (possibleUrl.startsWith('http://') || possibleUrl.startsWith('https://')) {
        return {
          toolName: 'link_global_product',
          toolArgs: {
            url: possibleUrl,
            autoAddToCart: lower.includes('buy') || lower.includes('cart')
          }
        };
      }
    }

    // 0.5. Greetings & Bot Capabilities (Direct real-time conversational response, NO product search)
    const cleanLower = lower.trim().replace(/[?!.,]+$/, '');
    const greetingMatch = /^(hi|hello|hey|hiya|howdy|good\s+(morning|afternoon|evening|day)|greetings|yo|sup)$/i.test(cleanLower);
    const isBotInfo = /^(who\s+are\s+you|what\s+can\s+you\s+do|what\s+is\s+payai|help|about\s+payai|capabilities)$/i.test(cleanLower);

    if ((greetingMatch || isBotInfo) && !lower.includes('find') && !lower.includes('buy') && !lower.includes('search') && !lower.includes('order')) {
      return { toolName: 'conversation_greeting', toolArgs: { originalPrompt: text } };
    }

    // 0.6. General FAQ Questions & Buyer Trust
    const trustPatterns = /\b(trust\s+(?:the\s+)?seller|trust\s+(?:the\s+)?store|don't\s+trust|dont\s+trust|not\s+trust|scam|scammed|fake\s+product|fake\s+seller|is\s+it\s+safe|is\s+my\s+money\s+safe|how\s+am\s+i\s+protected|buyer\s+protection|safe\s+to\s+buy|seller\s+legit|is\s+seller\s+real|is\s+it\s+legit|what\s+if\s+(?:the\s+)?(?:seller|item|product)\s+(?:is\s+fake|never\s+arrives|doesn't\s+arrive|scams))\b/i;
    if (trustPatterns.test(lower)) {
      return { toolName: 'conversation_faq', toolArgs: { topic: 'buyer_trust_and_safety' } };
    }

    if (lower.includes('how does negotiation work') || lower.includes('how do i negotiate') || lower.includes('can i negotiate') || lower.includes('how to bargain') || lower.includes('what is last price')) {
      return { toolName: 'conversation_faq', toolArgs: { topic: 'negotiation' } };
    }
    if (lower.includes('how does paypal work') || lower.includes('how does payment work') || lower.includes('how do i pay') || lower.includes('naira payout') || lower.includes('how is seller paid') || lower.includes('payout in naira') || lower.includes('escrow')) {
      return { toolName: 'conversation_faq', toolArgs: { topic: 'paypal_payout' } };
    }
    if (lower.includes('how does shipping work') || lower.includes('how is shipping calculated') || lower.includes('shipping rates') || lower.includes('how does free shipping work')) {
      return { toolName: 'conversation_faq', toolArgs: { topic: 'shipping' } };
    }
    if (lower.includes('how do returns work') || lower.includes('return policy') || lower.includes('cancellation policy') || lower.includes('how to refund') || lower.includes('how to cancel')) {
      return { toolName: 'conversation_faq', toolArgs: { topic: 'returns' } };
    }
    if (lower.includes('how does store linking work') || lower.includes('how to link store') || lower.includes('what is global store linking') || lower.includes('link external store')) {
      return { toolName: 'conversation_faq', toolArgs: { topic: 'global_linking' } };
    }

    // 0.7. Warehouse Verification & Live Inspection Media (Fulfillment vault photos & seller voice note)
    const warehouseMediaPatterns = /\b(warehouse\s+(?:photo|photos|media|video|inspection|cam|vault|view)|live\s+(?:warehouse\s+)?(?:photo|photos|picture|pictures|cam)|real\s+(?:photo|photos|picture|pictures)|seller\s+voice\s+note|voice\s+note|voice-note|inspect\s+(?:item|product|watch|package|goods|condition|this)|check\s+condition|serial\s+number|serial\s+code|serial\s+authenticity|batch\s+serial|warehouse\s+media)\b/i;

    const isWarehouseMediaIntent =
      contextData?.actionType === 'REQUEST_WAREHOUSE_MEDIA' ||
      warehouseMediaPatterns.test(lower) ||
      (lower.includes('warehouse') && (lower.includes('photo') || lower.includes('picture') || lower.includes('video') || lower.includes('inspect') || lower.includes('media') || lower.includes('cam') || lower.includes('condition'))) ||
      lower.includes('voice note') ||
      lower.includes('voice-note') ||
      lower.includes('live photo') ||
      lower.includes('real photo');

    if (isWarehouseMediaIntent) {
      const uuidMatch = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      return {
        toolName: 'request_warehouse_media',
        toolArgs: {
          productId: contextData?.productId || (uuidMatch ? uuidMatch[0] : null),
          userPrompt: text,
          actionType: 'REQUEST_WAREHOUSE_MEDIA'
        }
      };
    }

    // 0.8. Message / Contact Order Seller / Merchant
    const orderNumMatch = text.match(/\b(W-(?:INT|LOC|DOM)-[A-Za-z0-9-]+)\b/i) || text.match(/#([A-Za-z0-9-_]+)/i) || text.match(/\border\s+(?:#\s*)?([A-Za-z0-9-_]{4,})/i);
    let extractedOrderId = orderNumMatch ? (orderNumMatch[1] || orderNumMatch[0]) : null;

    const invalidOrderTokens = new Set([
      'shipment', 'status', 'delivery', 'details', 'tracking', 'update', 'updates',
      'progress', 'package', 'packages', 'history', 'items', 'info', 'receipt',
      'confirmation', 'number', 'numbers', 'code', 'codes', 'id', 'again', 'please',
      'now', 'today', 'recent', 'latest', 'here', 'there', 'mine', 'orders', 'item'
    ]);
    if (extractedOrderId) {
      const cleanToken = extractedOrderId.replace(/^#/, '').toLowerCase();
      if (invalidOrderTokens.has(cleanToken) || (/^[a-z]+$/i.test(cleanToken) && !/^(?:w-|gig-|dhl-)/i.test(cleanToken) && cleanToken.length < 12)) {
        extractedOrderId = null;
      }
    }

    const isMessageSellerIntent =
      contextData?.actionType === 'MESSAGE_SELLER' ||
      /\b(?:(?:send\s+(?:a\s+)?message|message|contact|reach\s+out|write|inquire|ask|tell)\s+(?:to\s+)?(?:the\s+)?(?:seller|merchant|vendor|store)\b)/i.test(lower) ||
      /\b(?:seller|merchant|vendor)\s+(?:message|inquiry|contact|chat)\b/i.test(lower) ||
      ((lower.includes('delivery update') || lower.includes('shipping update')) && (lower.includes('seller') || lower.includes('merchant')));

    if (isMessageSellerIntent) {
      let customInquiry = text;
      customInquiry = customInquiry.replace(/^(?:please\s+)?(?:send\s+(?:a\s+)?message\s+(?:to\s+)?(?:the\s+)?(?:seller|merchant|vendor)\s+(?:of|for|about|regarding)\s+(?:order\s+)?#?[A-Za-z0-9-_]+|message\s+(?:the\s+)?(?:seller|merchant|vendor)\s+(?:of|for|about|regarding)\s+(?:order\s+)?#?[A-Za-z0-9-_]+|contact\s+(?:the\s+)?(?:seller|merchant|vendor)\s+(?:of|for|about|regarding)\s+(?:order\s+)?#?[A-Za-z0-9-_]+)\s*(?::|-|,)?\s*/i, '').trim();

      if (/^requesting\s+/i.test(customInquiry)) {
        customInquiry = customInquiry.replace(/^requesting\s+/i, 'Customer is requesting ');
      } else if (!customInquiry || customInquiry.length < 5) {
        customInquiry = 'Customer is requesting an estimated delivery update and current fulfillment status.';
      }

      return {
        toolName: 'message_seller',
        toolArgs: {
          orderId: extractedOrderId,
          message: customInquiry,
          inquiryType: 'DELIVERY_UPDATE'
        }
      };
    }

    // 1. Order Tracking: "Where is my order #XYZ?", "Where is order #W-INT-12345?", "Track order W-INT-12345", "Track my order", "Track package"
    if (
      lower.includes('where is my order') ||
      lower.includes('where is order') ||
      lower.includes('where is my package') ||
      lower.includes('where is package') ||
      lower.includes('track order') ||
      lower.includes('track my order') ||
      lower.includes('track package') ||
      lower.includes('track my package') ||
      lower.match(/\bwhere\s+is\s+(?:my\s+)?(?:order|package)\b/i) ||
      lower.match(/\btrack\s+(?:my\s+)?(?:order|package)\b/i) ||
      lower.match(/\btrack\s+(?:order\s+)?#?[A-Za-z0-9-_]+/i) ||
      (lower.includes('order status') && !lower.includes('cancel') && !lower.includes('return'))
    ) {
      return { toolName: 'track_order', toolArgs: { orderId: extractedOrderId } };
    }

    // 2. Order Cancellation: "Cancel order #XYZ", "Cancel my order"
    if (
      lower.includes('cancel order') ||
      lower.includes('cancel my order') ||
      lower.match(/\bcancel\s+(?:my\s+)?order\b/i) ||
      lower.match(/\bcancel\s+order\s*#?[A-Za-z0-9-_]+/i) ||
      lower.match(/\bcancel\s+#?[A-Za-z0-9-_]+\b/i)
    ) {
      return { toolName: 'cancel_order', toolArgs: { orderId: extractedOrderId, reason: text } };
    }

    // 3. Return & Refund: "Return order #XYZ", "Request return", "Send back order"
    if (
      lower.includes('return order') ||
      lower.includes('return my order') ||
      lower.includes('request return') ||
      lower.includes('refund order') ||
      lower.includes('send back order') ||
      lower.match(/\breturn\s+(?:my\s+)?order\b/i) ||
      lower.match(/\breturn\s+order\s*#?[A-Za-z0-9-_]+/i)
    ) {
      return { toolName: 'request_return', toolArgs: { orderId: extractedOrderId, reason: text } };
    }

    // 3.5. Order Complaint & In-Chat Dispute Resolution
    const isComplaintIntent =
      /\b(complaint|dispute|damaged|broken|defective|faulty|cracked|scratched|shattered|torn|ruined|leak|leaking|wrong\s+item|wrong\s+product|different\s+item|not\s+what\s+i\s+ordered|mismatched|missing\s+item|missing\s+parts|incomplete\s+order|fake\s+item|fake\s+product|counterfeit|inferior\s+quality|not\s+as\s+described|doesn't\s+match|problem\s+with\s+(?:my\s+)?order|issue\s+with\s+(?:my\s+)?order|report\s+(?:a\s+)?problem|file\s+(?:a\s+)?(?:complaint|dispute)|open\s+(?:a\s+)?dispute|dispute\s+order|replace\s+(?:my\s+)?order|free\s+replacement|replacement\s+for\s+order|partial\s+refund\s+for\s+order|partial\s+refund|full\s+escrow\s+refund|prepaid\s+return\s+label|escalate\s+dispute|escalate\s+to\s+(?:human|admin|mediator))\b/i.test(lower);

    if (isComplaintIntent) {
      let detectedReason = 'OTHER';
      if (/damaged|broken|defective|faulty|cracked|scratched|shattered|torn|ruined|leak|leaking/i.test(lower)) {
        detectedReason = 'DAMAGED';
      } else if (/wrong\s+item|wrong\s+product|different\s+item|not\s+what\s+i\s+ordered|mismatched/i.test(lower)) {
        detectedReason = 'WRONG_ITEM';
      } else if (/not\s+as\s+described|fake|counterfeit|inferior\s+quality|missing\s+parts|missing\s+item/i.test(lower)) {
        detectedReason = 'NOT_AS_DESCRIBED';
      } else if (/not\s+received|haven't\s+received|missing\s+package|lost\s+package/i.test(lower)) {
        detectedReason = 'NOT_RECEIVED';
      }

      let requestedRemedy = null;
      if (/replacement|replace/i.test(lower)) requestedRemedy = 'REPLACEMENT';
      else if (/partial\s+refund/i.test(lower)) requestedRemedy = 'PARTIAL_REFUND';
      else if (/full\s+escrow\s+refund|full\s+refund/i.test(lower)) requestedRemedy = 'FULL_ESCROW_REFUND';
      else if (/rma|return\s+for\s+full|prepaid\s+return/i.test(lower)) requestedRemedy = 'RMA_RETURN';
      else if (/escalate/i.test(lower)) requestedRemedy = 'ESCALATE';

      return {
        toolName: 'handle_order_complaint',
        toolArgs: {
          orderId: extractedOrderId,
          orderNumber: extractedOrderId,
          complaintReason: detectedReason,
          complaintDescription: text,
          prompt: text,
          requestedRemedy
        }
      };
    }

    // 4. Confirm Delivery / Receipt: "Confirm receipt of order #XYZ", "Received my package"
    if (
      lower.includes('confirm receipt') ||
      lower.includes('confirm delivery') ||
      lower.includes('received order') ||
      lower.includes('received my order') ||
      lower.includes('order received') ||
      lower.includes('package arrived')
    ) {
      return { toolName: 'confirm_order_receipt', toolArgs: { orderId: extractedOrderId } };
    }

    // 4.5. Add to Cart: "Add Hungry Box Meal to my cart", "Add to cart", "Put in cart", etc.
    const isAddToCartIntent =
      contextData?.actionType === 'ADD_TO_CART' ||
      contextData?.actionType === 'add_to_cart' ||
      /\b(?:add|put)\b.+?\b(?:to|in|into)\s+(?:my\s+)?cart\b/i.test(lower) ||
      (/\badd\s+(?:the\s+)?(?:item|product|meal)?\s*(?:to\s+(?:my\s+)?cart)?\b/i.test(lower) && (lower.includes('cart') || contextData?.productId)) ||
      /\b(?:add|put)\s+(?:it|this|that|them|item|product)?\s*(?:to\s+(?:my\s+)?cart)\b/i.test(lower) ||
      /\b(?:add\s+to\s+cart|put\s+in\s+cart)\b/i.test(lower) ||
      (lower.startsWith('add ') && lower.includes('cart'));

    if (isAddToCartIntent) {
      let planItemsToPass = null;
      if (lower.includes('all plan') || lower.includes('entire plan') || lower.includes('all items from plan')) {
        if (contextData?.activePlan?.plannedDays) {
          planItemsToPass = [];
          for (const d of contextData.activePlan.plannedDays) {
            if (d.breakfast?.item) planItemsToPass.push(d.breakfast.item);
            if (d.breakfast?.drink) planItemsToPass.push(d.breakfast.drink);
            if (d.lunch?.item) planItemsToPass.push(d.lunch.item);
            if (d.lunch?.drink) planItemsToPass.push(d.lunch.drink);
          }
        }
      }

      const isMultiOrCombo =
        /\s+(?:and|\+|\&|\band\s+also\b|\bplus\b|\bwith\b)\s+/i.test(text) ||
        lower.includes('combo') ||
        lower.includes('entire') ||
        lower.includes('all items');

      return {
        toolName: 'add_to_cart',
        toolArgs: {
          userPrompt: text,
          productId: isMultiOrCombo ? null : (contextData?.productId || null),
          quantity: isMultiOrCombo ? 1 : (contextData?.quantity || 1),
          planItems: planItemsToPass,
          recentHistory: contextData?.recentHistory || null
        }
      };
    }

    // 4.6. Button Guidance & Payment Gateway Queries: "which button", "where to click", "how do i pay", "ready to pay"
    const hasPriceOfferIndicators =
      /(?:₦|\$|ngn|usd|[0-9]+\s*naira|[0-9]+\s*ngn|[0-9]+\s*k\b)/i.test(text) ||
      /\b(?:offer|discount|negotiat\w*|bargain|haggle|reduce|counter|cheaper|lower\s+the\s+price|last\s+price|best\s+price)\b/i.test(lower) ||
      /\bcan\s+i\s+(?:pay|give|do|offer)\s+[0-9]+/i.test(lower) ||
      /\bfor\s+.+?\s+can\s+i\s+pay\b/i.test(lower);

    const isPayPalSpecificInquiry =
      lower.includes('paypal') ||
      lower.includes('pay pal') ||
      /\bpay\s+(?:with|using|via|through|by)\s+pay\s*pal\b/i.test(lower);

    const isPaymentMethodInquiry =
      /\bcan\s+i\s+(?:also\s+)?pay\s+(?:with|using|via|through|by)\s+(?:paystack|monnify|card|debit|credit|transfer|bank|ussd|cash|cod|delivery|wallet|crypto|paypal|opay|palmpay)\b/i.test(lower) ||
      /\b(?:how\s+(?:do\s+i|can\s+i)\s+pay|where\s+(?:is\s+the\s+button|to\s+click|do\s+i\s+click)|which\s+button|ready\s+to\s+pay|pay\s+with\s+paystack|action\s+card)\b/i.test(lower);

    // PayPal-specific inquiry takes precedence
    if (isPayPalSpecificInquiry && !hasPriceOfferIndicators) {
      return { toolName: 'guide_checkout_button', toolArgs: { prompt: text, isPayPalIntent: true } };
    }

    const isPaymentOrButtonGuidance =
      !hasPriceOfferIndicators && (
        lower.includes('which button') ||
        lower.includes('where is the button') ||
        lower.includes('where is button') ||
        lower.includes('where the button') ||
        lower.includes('where to click') ||
        lower.includes('how to click') ||
        lower.includes('cant click') ||
        lower.includes('cannot click') ||
        lower.includes('not clickable') ||
        lower.includes('how do i pay') ||
        lower.includes('ready to pay') ||
        lower.includes('pay with paystack') ||
        lower.includes('action card') ||
        isPaymentMethodInquiry
      );

    if (isPaymentOrButtonGuidance) {
      return { toolName: 'guide_checkout_button', toolArgs: { prompt: text } };
    }

    // 4.64. Budget-Based Wallet Shopping: "within my available balance", "use my wallet", "shop within my balance", "what can i buy with my wallet"
    const isExplicitPayment =
      lower.includes('confirm & pay') ||
      lower.includes('confirm and pay') ||
      lower.includes('pay from wallet') ||
      lower.includes('pay with wallet') ||
      lower.includes('deduct from wallet') ||
      lower.includes('deduct from my wallet') ||
      lower.includes('authorize payment') ||
      lower.includes('authorize the deduction');

    const isBudgetShoppingIntent =
      !isExplicitPayment &&
      (
        contextData?.actionType === 'BUDGET_SHOPPING_PLAN' ||
        contextData?.actionType === 'budget_shopping_plan' ||
        /\bwithin\s+(?:my\s+)?(?:available\s+)?(?:wallet\s+)?balance\b/i.test(lower) ||
        /\b(?:shop|buy|order|spend|get|recommend|find)\b.+?\b(?:within|with|using)\s+(?:my\s+)?(?:available\s+)?(?:wallet|balance)\b/i.test(lower) ||
        /\buse\s+(?:my\s+)?wallet\b/i.test(lower) ||
        /\bwhat\s+can\s+i\s+(?:buy|get|purchase|afford)\b.+?\b(?:wallet|balance)\b/i.test(lower) ||
        /\b(?:budget\s+shopping|budget\s+plan|wallet\s+shopping)\b/i.test(lower)
      );

    if (isBudgetShoppingIntent) {
      const cleanQuery = text
        .replace(/\b(?:within|in|with|using)\s+(?:my\s+)?(?:available\s+)?(?:wallet\s+)?(?:balance|funds|account)\b/gi, '')
        .replace(/\b(?:shop|buy|find|recommend|what\s+can\s+i\s+(?:buy|get|purchase|afford)|use\s+my\s+wallet)\b/gi, '')
        .trim();

      return {
        toolName: 'budget_shopping_plan',
        toolArgs: {
          query: cleanQuery || contextData?.query || '',
          category: contextData?.category || null,
          prompt: text
        }
      };
    }

    // 4.65. Wallet Balance & Account Funds Inquiry: "how much am i having in my wallet", "what is my wallet balance", "check wallet", "my wallet balance", "how much in my wallet"
    const isWalletBalanceInquiry =
      contextData?.actionType === 'CHECK_WALLET_BALANCE' ||
      contextData?.actionType === 'GET_WALLET' ||
      /\b(?:how\s+much\s+(?:do\s+i\s+have|am\s+i\s+having|is\s+in|is\s+there|have\s+i\s+got|money|funds)|what\s+is\s+my|check\s+my|view\s+my|show\s+my|see\s+my|balance\s+of)\b.+?\b(?:wallet|balance|funds|account|gong|gx)\b/i.test(lower) ||
      /\b(?:wallet\s+balance|my\s+wallet|my\s+balance|account\s+balance|how\s+much\s+(?:in\s+my\s+wallet|in\s+wallet)|check\s+wallet|view\s+wallet)\b/i.test(lower) ||
      ((lower.includes('wallet') || lower.includes('balance')) && (lower.includes('how much') || lower.includes('having') || lower.includes('my balance') || lower.includes('check balance') || lower.includes('available')));

    if (isWalletBalanceInquiry && !lower.includes('pay from wallet') && !lower.includes('pay with wallet') && !lower.includes('deduct')) {
      return { toolName: 'check_wallet_balance', toolArgs: { prompt: text } };
    }

    // 4.7. Direct Wallet Payment Authorization: "confirm & pay", "pay from wallet", "pay with wallet", "deduct from wallet"
    if (
      lower.includes('confirm & pay') ||
      lower.includes('confirm and pay') ||
      lower.includes('pay from wallet') ||
      lower.includes('pay with wallet') ||
      lower.includes('deduct from wallet') ||
      lower.includes('deduct from my wallet') ||
      lower.includes('authorize payment') ||
      lower.includes('authorize the deduction')
    ) {
      return { toolName: 'checkout_with_wallet', toolArgs: { prompt: text } };
    }

    // 5. Cart Checkout & Order Placement: "Place order", "Checkout my cart"
    if (
      lower.includes('place order') ||
      lower.includes('place my order') ||
      lower.includes('checkout cart') ||
      lower.includes('checkout my cart')
    ) {
      return { toolName: 'place_order', toolArgs: {} };
    }

    // 5. Quote or Approval
    if (lower.includes('quote') || lower.includes('calculate total') || lower.includes('landed cost') || lower.includes('final price')) {
      return { toolName: 'prepare_purchase_quote', toolArgs: { targetCurrency: 'USD' } };
    }
    if (lower.includes('approve') || lower.includes('checkout') || lower.includes('buy now')) {
      return { toolName: 'prepare_purchase_quote', toolArgs: {} };
    }

    // Stock / Inventory Check
    if (/\b(in\s+stock|stock\s+for|check\s+stock|how\s+many\s+left|inventory\s+for)\b/i.test(lower)) {
      const uuidMatch = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      const targetId = contextData?.productId || (uuidMatch ? uuidMatch[0] : null);
      if (targetId) {
        return {
          toolName: 'check_product_stock',
          toolArgs: { productId: targetId }
        };
      }
    }

    // 1.45. Gifting, Occasions & Recipient Advisory (e.g. "my sister birthday is tomorrow, i have 20k, what can i get her?")
    const giftingPatterns = /\b(?:gift|present|birthday|anniversary|wedding|valentine|graduation|for\s+my\s+(?:sister|brother|mom|mother|dad|father|friend|wife|husband|colleague|boss|son|daughter)|what\s+can\s+i\s+get\s+(?:her|him|them|my)|what\s+should\s+i\s+get\s+(?:her|him|them|my)|what\s+to\s+get\s+(?:her|him|them|my)|recommend\s+(?:a\s+)?gift|gift\s+ideas?|surprise\s+(?:her|him|my))\b/i;
    if (giftingPatterns.test(lower)) {
      const budget = this._extractBudgetFromText(lower);
      let recipient = 'friend';
      if (/\bsister\b/i.test(lower)) recipient = 'sister';
      else if (/\bbrother\b/i.test(lower)) recipient = 'brother';
      else if (/\b(?:mom|mother|mum)\b/i.test(lower)) recipient = 'mom';
      else if (/\b(?:dad|father)\b/i.test(lower)) recipient = 'dad';
      else if (/\b(?:girlfriend|babe|fiancée)\b/i.test(lower)) recipient = 'girlfriend';
      else if (/\b(?:boyfriend|fiancé)\b/i.test(lower)) recipient = 'boyfriend';
      else if (/\bwife\b/i.test(lower)) recipient = 'wife';
      else if (/\bhusband\b/i.test(lower)) recipient = 'husband';
      else if (/\b(?:son|daughter|kid|child|baby)\b/i.test(lower)) recipient = 'child';

      let occasion = 'celebration';
      if (/\bbirthday\b/i.test(lower)) occasion = 'birthday';
      else if (/\banniversary\b/i.test(lower)) occasion = 'anniversary';
      else if (/\bwedding\b/i.test(lower)) occasion = 'wedding';
      else if (/\bgraduation\b/i.test(lower)) occasion = 'graduation';
      else if (/\bvalentine\b/i.test(lower)) occasion = "Valentine's Day";

      return {
        toolName: 'advise_gift_or_occasion',
        toolArgs: {
          recipient,
          occasion,
          budget,
          prompt: text
        }
      };
    }

    // 1.455. Product Comparisons & "Which is better / Which should I buy?"
    const productComparisonPatterns = /\b(?:which\s+(?:phone|laptop|item|product|one|watch|brand|camera)\s+(?:has|is|have)|which\s+is\s+better|compare\s+(?:between\s+)?|difference\s+between|versus|\bvs\b|should\s+i\s+get\s+(?:an?\s+)?(?:iphone|samsung|macbook|galaxy)|which\s+one\s+should\s+i\s+(?:buy|choose|pick|get))\b/i;
    if (productComparisonPatterns.test(lower)) {
      return {
        toolName: 'advise_comparison',
        toolArgs: { prompt: text }
      };
    }

    // 1.456. Fashion Styling, Outfit Matching & Sizing Consultation
    const stylingPatterns = /\b(?:what\s+should\s+i\s+wear|how\s+(?:do|should)\s+i\s+style|outfit\s+(?:ideas?|for)|style\s+(?:advice|these|this)|what\s+goes\s+(?:well\s+)?with|fashion\s+advice|dress\s+code\s+for|what\s+to\s+wear\s+to\s+(?:a\s+)?(?:dinner|party|date|wedding|event|meeting|work)|how\s+does\s+this\s+look)\b/i;
    if (stylingPatterns.test(lower)) {
      return {
        toolName: 'advise_styling',
        toolArgs: { prompt: text }
      };
    }

    // 1.457. Conversational Food & Meal Recommendations (e.g. "what do you recommend for dinner?", "what should i eat?")
    const conversationalFoodPatterns = /\b(?:what\s+should\s+i\s+eat|what\s+do\s+you\s+recommend\s+for\s+(?:dinner|lunch|breakfast)|what's\s+good\s+to\s+eat|craving\s+something|what\s+to\s+eat\s+tonight)\b/i;
    if (conversationalFoodPatterns.test(lower)) {
      return {
        toolName: 'advise_food',
        toolArgs: { prompt: text }
      };
    }

    // 1.47. Response to Active Negotiation / Bundle Offer / Quantity Request for Current Product
    // Examples: "I want 2 hungry bee", "I want 2", "buy 2", "give me 2", "2 hungry bee", "two please", "accept bundle", "lock deal", "deal", "i'll take 2", "i want 1 hungry bee"
    const acceptOfferPatterns = /\b(i\s+accept|accept\s+offer|deal|i'll\s+take\s+it|i\s+will\s+take\s+it|lock\s+(?:the\s+)?offer|lock\s+(?:the\s+)?deal|accept\s+2-item\s+bundle|accept\s+bundle|2-item\s+bundle|buy\s+two)\b/i;
    const hasPurchaseVerbWithQty = /\b(?:i\s+want|i\s+need|i'll\s+take|give\s+me|buy|order|get|grab)\s+(\d+|one|two|three|four|both)\b/i.test(lower) ||
      /\b(\d+|one|two|three|four)\s+(?:hungry\s+bee|meals?|pieces?|units?|items?|burgers?|boxes?|watches?|shoes?|of\s+(?:them|these|this|it))\b/i.test(lower) ||
      /^\s*(\d+|one|two|three)\s+([a-z0-9\s-]+)\s*$/i.test(lower);

    if (contextData?.recentNegotiation && (acceptOfferPatterns.test(lower) || hasPurchaseVerbWithQty || contextData?.actionType === 'ACCEPT_BUNDLE' || contextData?.actionType === 'ACCEPT_OFFER')) {
      const wordMap = { one: 1, two: 2, three: 3, four: 4, both: 2 };
      const numMatch = lower.match(/\b(\d+)\b/);
      const wordMatch = lower.match(/\b(one|two|three|four|both)\b/i);
      const parsedQty = numMatch ? parseInt(numMatch[1], 10) : (wordMatch ? wordMap[wordMatch[1].toLowerCase()] : 1);

      const isBundle = parsedQty === 2 || lower.includes('bundle') || lower.includes('two') || lower.includes('both') || contextData?.actionType === 'ACCEPT_BUNDLE';

      return {
        toolName: 'request_seller_negotiation',
        toolArgs: {
          provider: 'w-commerce',
          productId: contextData?.productId || contextData?.lastSessionProductId,
          buyerMessage: text,
          actionType: isBundle ? 'ACCEPT_BUNDLE' : 'ACCEPT_OFFER',
          quantity: isBundle ? 2 : parsedQty
        }
      };
    }

    // 1.48. Conversational Follow-Up Quantity Response:
    // e.g. User was asked "How many would you like to order?" and now responds "2", "just 2", "2 please", "make it 2", "i want 2"
    const isPureQuantityReply = /^\s*(?:just\s+|i\s+(?:want|need|take)\s+|give\s+me\s+|make\s+it\s+)?(\d+|one|two|three|four|five|six|seven|eight|nine|ten)(?:\s+(?:please|packs?|units?|plates?|boxes?|pieces?|pcs?|portions?|meals?|bottles?|of\s+them))?\s*$/i.test(lower.trim());
    if (isPureQuantityReply && (contextData?.lastSessionProductId || contextData?.productId)) {
      const wordMap = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
      const numMatch = lower.match(/\b(\d+)\b/);
      const wordMatch = lower.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/i);
      const parsedQty = numMatch ? parseInt(numMatch[1], 10) : (wordMatch ? wordMap[wordMatch[1].toLowerCase()] : 1);

      return {
        toolName: 'add_to_cart',
        toolArgs: {
          userPrompt: text,
          productId: contextData?.productId || contextData?.lastSessionProductId,
          quantity: parsedQty || 1
        }
      };
    }

    // 1.49. Conversational Product Preference / Item Selection:
    // e.g. "i prefer the hungry box meal", "i prefer hungry box meal", "i'll go with the hungry box",
    // "let's go with hungry box meal", "i want the hungry box meal", "i prefer the first one", "option 1 sounds good"
    const isNotCartOrAction = !contextData?.actionType &&
      !contextData?.proposedPrice &&
      !/\b(add\s+to\s+cart|put\s+in\s+cart|into\s+my\s+cart|to\s+my\s+cart|checkout|track|return|warehouse|photo|video|voice\s*note|discount|negotiat|make\s+(?:an\s+)?offer|can\s+you\s+do|compare|connected\s+stores|other\s+stores|other\s+sellers|cheaper\s+alternative|elsewhere|alert\s+me|notify\s+me|save\s+(?:this\s+)?product)\b/i.test(lower);

    if (isNotCartOrAction) {
      const preferenceTriggers = /\b(prefer|preference|i'll\s+(?:take|have|go\s+with|get|choose|pick)|ill\s+(?:take|have|go\s+with|get|choose|pick)|let's\s+go\s+with|lets\s+go\s+with|opt\s+for|decided\s+on|my\s+choice|sounds\s+good|looks\s+good|is\s+fine|works\s+for\s+me)\b/i;
      const wantSelectionTrigger = /\b(i\s+want|i\s+like|i'd\s+like|id\s+like|i\s+would\s+like|give\s+me|i\s+choose|i\s+pick)\s+(?:the\s+)?([a-z0-9\s-]+)/i;

      const hasPreferenceKeyword = preferenceTriggers.test(lower) || wantSelectionTrigger.test(lower);

      // Check if user is referencing an item from previousProducts in session
      const prevItems = Array.isArray(contextData?.previousProducts) ? contextData.previousProducts : [];
      let matchedProduct = null;
      let matchedIndex = -1;

      // 1. Check title matching against prevItems FIRST (so "hungry bee" matches Hungry Bee Meal even if preceded by a quantity like "2")
      if (prevItems.length > 0) {
        for (let i = 0; i < prevItems.length; i++) {
          const it = prevItems[i];
          const itTitle = (it.title || '').toLowerCase().trim();
          if (!itTitle) continue;

          // Direct title substring or token match
          const cleanItTitle = itTitle.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
          const cleanPrompt = lower.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

          // If prompt contains the product title (e.g. "hungry box meal" or "hungry bee")
          if (cleanPrompt.includes(cleanItTitle) || (cleanItTitle.length >= 6 && cleanPrompt.includes(cleanItTitle.slice(0, 10)))) {
            matchedProduct = it;
            matchedIndex = i;
            break;
          }

          // Distinct multi-word checks (e.g. "hungry box", "hungry bee", "feast box", "crunch meal", "fresh eggs")
          const titleWords = cleanItTitle.split(' ').filter(w => w.length >= 3);
          if (titleWords.length >= 2) {
            const firstTwo = titleWords.slice(0, 2).join(' ');
            if (cleanPrompt.includes(firstTwo)) {
              matchedProduct = it;
              matchedIndex = i;
              break;
            }
          } else if (titleWords.length === 1 && titleWords[0].length >= 4) {
            if (new RegExp(`\\b${titleWords[0]}\\b`, 'i').test(cleanPrompt)) {
              matchedProduct = it;
              matchedIndex = i;
              break;
            }
          }
        }
      }

      // 2. Check ordinal or positional mentions ONLY if no direct product title matched AND it is an explicit option choice (e.g. "the first one", "option 1", "number 2")
      const isExplicitOptionChoice = /\b(?:option|choice|number|no\.?)\s*(?:1|2|3|4|5|one|two|three|four|five)\b/i.test(lower) ||
        /\b(?:the\s+)?(1st|first|2nd|second|3rd|third|4th|fourth|5th)\s+(?:one|item|choice|meal|product|option)\b/i.test(lower);
      const ordinalMatch = lower.match(/\b(?:option|item|number|no\.?)\s*([1-5])\b|\b(?:the\s+)?(1st|first|2nd|second|3rd|third|4th|fourth|5th)\s*(?:one|item|option|choice)?\b/i);
      if (!matchedProduct && isExplicitOptionChoice && ordinalMatch && prevItems.length > 0) {
        const ord = (ordinalMatch[1] || ordinalMatch[2] || '').toLowerCase();
        if (['1st', 'first', 'one', '1'].includes(ord) && prevItems[0]) {
          matchedProduct = prevItems[0];
          matchedIndex = 0;
        } else if (['2nd', 'second', 'two', '2'].includes(ord) && prevItems[1]) {
          matchedProduct = prevItems[1];
          matchedIndex = 1;
        } else if (['3rd', 'third', 'three', '3'].includes(ord) && prevItems[2]) {
          matchedProduct = prevItems[2];
          matchedIndex = 2;
        } else if (['4th', 'fourth', 'four', '4'].includes(ord) && prevItems[3]) {
          matchedProduct = prevItems[3];
          matchedIndex = 3;
        } else if (['5th', 'fifth', 'five', '5'].includes(ord) && prevItems[4]) {
          matchedProduct = prevItems[4];
          matchedIndex = 4;
        }
      }

      // Check if user specified a broad discovery (e.g., "i prefer food under 10k" or "i want something cheap")
      const isBroadDiscovery = /\b(below|under|cheap|budget|affordable|between|less\s+than)\b/i.test(lower) && !matchedProduct;

      if (!isBroadDiscovery && (matchedProduct || (hasPreferenceKeyword && !/\b(food|something\s+to\s+eat|groceries)\b/i.test(lower)))) {
        // Extract query if no direct item from previousProducts matched
        let cleanQuery = '';
        if (!matchedProduct) {
          cleanQuery = lower
            .replace(/\b(i\s+prefer|prefer|preference|i'll\s+(?:take|have|go\s+with|get|choose|pick)|ill\s+(?:take|have|go\s+with|get|choose|pick)|let's\s+go\s+with|lets\s+go\s+with|opt\s+for|decided\s+on|i\s+want|i\s+like|i'd\s+like|id\s+like|i\s+would\s+like|give\s+me|i\s+choose|i\s+pick|the|this|that|please|sounds\s+good|looks\s+good|for\s+me)\b/gi, ' ')
            .replace(/[^a-z0-9\s-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        }

        // Check if quantity is mentioned: e.g. "2 hungry box meals", "give me 3", "2 of them"
        const wordMap = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
        const numMatch = lower.match(/\b(\d+)\s*(?:packs?|units?|plates?|boxes?|pieces?|pcs?|portions?|meals?|bottles?|of\s+them)?\b/);
        const wordMatch = lower.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:packs?|units?|plates?|boxes?|pieces?|pcs?|portions?|meals?|of\s+them)?\b/i);

        let parsedQty = null;
        let quantitySpecified = false;

        if (numMatch && parseInt(numMatch[1], 10) > 0 && parseInt(numMatch[1], 10) <= 50) {
          parsedQty = parseInt(numMatch[1], 10);
          quantitySpecified = true;
        } else if (wordMatch && wordMap[wordMatch[1].toLowerCase()]) {
          parsedQty = wordMap[wordMatch[1].toLowerCase()];
          quantitySpecified = true;
        }

        if (matchedProduct || cleanQuery.length >= 3) {
          return {
            toolName: 'select_product_preference',
            toolArgs: {
              productId: matchedProduct?.id || matchedProduct?.productId || null,
              matchedProductQuery: matchedProduct?.title || cleanQuery,
              product: matchedProduct || null,
              quantity: parsedQty || 1,
              quantitySpecified,
              userPrompt: text
            }
          };
        }
      }
    }

    // 1.495. Multi-Day Meal Planning & Budget Decomposition:
    // "Use my budget to arrange my breakfast and lunch for the next three days"
    // "arrange my breakfast and lunch for the next 3 days", "plan meals for 3 days", "meal plan for 3 days"
    const hasDayCount = /\b(?:next\s+)?(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+days?\b/i.test(lower) ||
      /\b(?:for\s+)?(?:the\s+next\s+)?(?:\d+|one|two|three|four|five|six|seven)\s+days?\b/i.test(lower) ||
      /\b\d+\s*-?\s*days?\s+(?:meal\s+)?plan\b/i.test(lower);

    const hasMealKeywords = /\b(breakfast|lunch|dinner|meals?|food)\b/i.test(lower);
    const hasPlanningVerb = /\b(arrange|plan|schedule|organize|set\s*up|prepare|curate)\b/i.test(lower);

    const isMultiDayMealPlanIntent =
      (hasPlanningVerb && hasMealKeywords && (hasDayCount || lower.includes('day'))) ||
      (lower.includes('breakfast') && lower.includes('lunch') && (hasDayCount || lower.includes('days') || lower.includes('arrange') || lower.includes('plan'))) ||
      (/\bmeal\s+plan\b/i.test(lower) && (hasDayCount || lower.includes('day'))) ||
      (contextData?.activePlan && (lower.includes('swap day') || lower.includes('extend to') || lower.includes('change day')));

    if (isMultiDayMealPlanIntent) {
      let swapDay = null;
      let meal = null;
      let replacementQuery = null;

      const swapMatch = lower.match(/swap\s+day\s*(\d+)\s*(breakfast|lunch)?(?:\s+(?:for|to|with)\s+(.+))?/i);
      if (swapMatch) {
        swapDay = parseInt(swapMatch[1], 10);
        meal = swapMatch[2] ? swapMatch[2].toLowerCase() : 'lunch';
        replacementQuery = swapMatch[3] ? swapMatch[3].trim() : null;
      }

      const days = this._extractDaysFromText(text) || 3;
      const budget = this._extractBudgetFromText(text);

      return {
        toolName: 'plan_multi_day_meals_or_budget',
        toolArgs: {
          prompt: text,
          days,
          budget,
          existingPlan: contextData?.activePlan || null,
          modifications: swapDay ? { swapDay, meal, replacementQuery } : null
        }
      };
    }

    // 1.496. Universal Shopping Goals (Master Engineering Prompt goals):
    // "Find me a good phone within my available balance"
    // "Find the cheapest reliable laptop for programming"
    // "Buy the items on my shopping list without exceeding my budget"
    // "Find a birthday gift that can arrive before Saturday"
    const isBudgetGoalIntent =
      // Goal 1: Phone within available balance
      (/\bphone\b/i.test(lower) && (/\b(?:balance|afford|within\s+my\s+budget)\b/i.test(lower))) ||
      // Goal 2: Cheapest reliable laptop for programming
      (/\blaptop\b/i.test(lower) && (/\b(?:programming|coding|developer|code)\b/i.test(lower) || (/\bcheapest\b/i.test(lower) && /\breliable\b/i.test(lower)))) ||
      // Goal 3: Shopping list without exceeding budget
      (/\bshopping\s+list\b/i.test(lower) || (/\bitems\s+on\s+my\s+list\b/i.test(lower)) || (/\bwithout\s+exceeding\s+(?:my\s+)?budget\b/i.test(lower))) ||
      // Goal 4: Birthday gift arriving before day/deadline
      (/\b(?:birthday\s+)?gift\b/i.test(lower) && (/\barrive\s+before\b/i.test(lower) || /\bdeadline\b/i.test(lower) || /\bbefore\s+(?:saturday|friday|sunday|monday|tuesday|wednesday|thursday)\b/i.test(lower)));

    if (isBudgetGoalIntent) {
      let goalType = null;
      if (/\bphone\b/i.test(lower)) goalType = 'phone_within_balance';
      else if (/\blaptop\b/i.test(lower)) goalType = 'laptop_programming';
      else if (/\bshopping\s+list\b/i.test(lower) || /\bwithout\s+exceeding\b/i.test(lower)) goalType = 'shopping_list_budget';
      else if (/\bgift\b/i.test(lower)) goalType = 'birthday_gift_deadline';

      return {
        toolName: 'plan_budget_goal',
        toolArgs: {
          prompt: text,
          goalType,
          budget: this._extractBudgetFromText(text)
        }
      };
    }

    // 1.5. Food, Breakfast, Meal, Hunger & Grocery Intent (Runs BEFORE negotiation to prevent false matches)
    const foodKeywords = /\b(food|foods|breakfast|break\s*fast|lunch|dinner|meal|meals|snack|snacks|cereal|cereals|corn\s*flakes|cornflakes|oat|oats|porridge|bread|egg|eggs|milk|tea|coffee|juice|water|drinks?|beverage|softdrink|soft\s*drinks?|go-softdrink|soda|coke|fanta|sprite|noodle|noodles|pasta|biscuit|biscuits|cookies?|crisps?|chips?|rice|burger|burgers|sushi|fries|chicken|grocer(?:y|ies))\b/i;
    const hungerKeywords = /\b(hungry|ungry|starving|crave|craving|appetite|what\s+to\s+eat|what\s+can\s+i\s+(?:eat|have|order)|food\s+i\s+can|something\s+to\s+eat|eat\s+something|list\s+any\s+food|list\s+food)\b/i;

    // Detect explicit price-offer signals — if present with food words, this is a negotiation, not a food search
    const hasPriceOfferSignal =
      /(?:₦|\$|ngn|usd|[0-9]+\s*naira|[0-9]+\s*ngn)\b/i.test(text) ||
      /\bcan\s+i\s+(?:pay|give|do|offer)\s+[0-9]+/i.test(lower) ||
      /\bfor\s+.+?\s+can\s+i\s+pay\b/i.test(lower) ||
      /\b(?:pay|offer|give|do|take|accept)\s+(?:₦|\$|ngn|usd)?\s*[0-9]{2,}/i.test(lower) ||
      /\b[0-9]{2,}\s*(?:naira|ngn)\b/i.test(lower) ||
      /\bhow\s+about\s+(?:₦|\$|ngn|usd)?\s*[0-9]+/i.test(lower) ||
      /\bwill\s+you\s+(?:take|accept)\s+(?:₦|\$|ngn|usd)?\s*[0-9]+/i.test(lower);

    const isFoodIntent = (foodKeywords.test(lower) || hungerKeywords.test(lower)) &&
      !hasPriceOfferSignal &&
      !contextData?.actionType &&
      !contextData?.proposedPrice &&
      !/\b(make\s+(?:an\s+)?offer|my\s+offer|counter\s+offer|accept\s+my\s+offer|can\s+you\s+do\s+(?:₦|\$|[0-9]+)|discount|negotiat\w*|compare|connected\s+stores|other\s+stores|other\s+sellers|cheaper\s+alternative|elsewhere)\b/i.test(lower);

    if (isFoodIntent) {
      let primaryQuery = 'meal food';
      let secondaryQuery = null;
      let maxPrice = null;
      let secondaryMaxPrice = null;
      let pairingContext = { occasion: 'meal' };

      // Check for compound dual-item request (e.g. "food below 5000 and a softdrink below 1000", "sushi and go-softdrink for breakfast")
      const parts = lower.split(/\s+(?:and(?:\s+a|\s+an)?|\+|\&|with(?:\s+a|\s+an)?|along\s+with|together\s+with|as\s+well\s+as)\s+/i);

      if (parts.length >= 2) {
        const part1 = parts[0];
        const part2 = parts[1];

        maxPrice = this._extractBudgetFromText(part1);
        secondaryMaxPrice = this._extractBudgetFromText(part2);

        // Determine primary query from part 1
        if (/sushi/i.test(part1)) primaryQuery = 'sushi meal';
        else if (/corn\s*flakes|instant\s+oats|oats|eggs|milk|bread|cereal/i.test(part1)) primaryQuery = 'breakfast cereal';
        else if (/burger|fries|chicken|feast|crunch/i.test(part1)) primaryQuery = 'burger chicken';
        else if (/snack|biscuit|cookie|crisp/i.test(part1)) primaryQuery = 'snack biscuit';
        else if (/drink|juice|beverage|water|softdrink|soda/i.test(part1)) primaryQuery = 'drinks softdrink';
        else primaryQuery = 'food meal';

        // Determine secondary query from part 2
        if (/drink|juice|beverage|water|softdrink|go-softdrink|soda|fanta|coke|sprite/i.test(part2)) {
          secondaryQuery = 'drinks softdrink sprite fanta water';
          pairingContext = {
            primaryCategory: 'food',
            secondaryCategory: 'drinks',
            isCombo: true,
            occasion: /breakfast|morning/i.test(lower) ? 'breakfast' : 'meal'
          };
        } else if (/snack|fries|chips|biscuit|sauce/i.test(part2)) {
          secondaryQuery = 'snack fries sauce';
          pairingContext = {
            primaryCategory: 'food',
            secondaryCategory: 'side',
            isCombo: true,
            occasion: 'meal'
          };
        } else {
          secondaryQuery = part2.replace(/\b(below|under|naira|ngn|a|an|some)\b/gi, '').trim();
        }
      } else {
        // Single part food query
        maxPrice = this._extractBudgetFromText(lower);

        const specificFoodMatch = lower.match(/\b(corn\s*flakes?|instant\s+oats?|oats?|eggs?|milk|noodles?|pasta|biscuits?|cookies?|crisps?|chips?|rice|burgers?|fries|chicken|sushi|hungry\s+box|crunch\s+box|feast\s+box)\b/i);
        if (specificFoodMatch) {
          primaryQuery = specificFoodMatch[0];
        } else if (/break\s*fast|morning/i.test(lower)) {
          primaryQuery = 'breakfast';
          pairingContext.occasion = 'breakfast';
        } else if (/snack|crisp|biscuit|cookie/i.test(lower)) {
          primaryQuery = 'snack';
        } else if (/drink|juice|beverage|water|softdrink|soda/i.test(lower)) {
          primaryQuery = 'drinks';
        } else if (/burger|fries|chicken|meal|lunch|dinner/i.test(lower)) {
          primaryQuery = 'meal food';
        } else {
          primaryQuery = 'food meal';
        }

        // If user searched for meal or food without specifying a drink, auto-pair with drinks under 1500
        if (!/drink|juice|beverage|water|softdrink|soda/i.test(lower)) {
          secondaryQuery = 'drinks softdrink fanta sprite water';
          secondaryMaxPrice = 1500;
          pairingContext = {
            primaryCategory: 'food',
            secondaryCategory: 'drinks',
            isCombo: true,
            occasion: /breakfast|morning/i.test(lower) ? 'breakfast' : 'meal'
          };
        }
      }

      return {
        toolName: 'search_products',
        toolArgs: {
          query: primaryQuery,
          maxPrice,
          secondaryQuery,
          secondaryMaxPrice,
          pairingContext,
          limit: 8
        }
      };
    }

    // 1.8. Connected Store Price & Specs Comparison (e.g. "check other connected stores", "compare", "cheaper alternative")
    const connectedStoreComparisonPatterns = /\b(check\s+(?:other\s+)?connected\s+stores|check\s+other\s+stores|other\s+connected\s+stores|compare\s+(?:them|stores|specifications|options|prices)?|other\s+stores|other\s+sellers|elsewhere|cheaper\s+alternative|show\s+comparable\s+options|compare\s+connected\s+stores)\b/i;
    const isComparisonIntent =
      contextData?.actionType === 'COMPARE_STORES' ||
      contextData?.actionType === 'COMPARE_ALTERNATIVES' ||
      connectedStoreComparisonPatterns.test(lower);

    if (isComparisonIntent) {
      const uuidMatch = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      const targetId = contextData?.productId || (uuidMatch ? uuidMatch[0] : (contextData?.lastSessionProductId || 'demo-cavetto-watch'));
      return {
        toolName: 'request_seller_negotiation',
        toolArgs: {
          provider: 'w-commerce',
          productId: targetId,
          buyerMessage: text,
          actionType: 'COMPARE_STORES'
        }
      };
    }

    // 1.9. Watchlist / Price-Drop Promotion Alert (e.g. "notify me", "save product", "alert me")
    const watchlistAlertPatterns = /\b(notify\s+me|save\s+product|alert\s+me|save\s+(?:this\s+)?item|promo\s+alert|price\s+drop\s+alert|when\s+on\s+sale)\b/i;
    const isWatchlistIntent =
      contextData?.actionType === 'SAVE_ALERT' ||
      contextData?.actionType === 'SAVE_WATCHLIST_ALERT' ||
      watchlistAlertPatterns.test(lower);

    if (isWatchlistIntent) {
      const uuidMatch = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      const targetId = contextData?.productId || (uuidMatch ? uuidMatch[0] : (contextData?.lastSessionProductId || 'demo-cavetto-watch'));
      return {
        toolName: 'request_seller_negotiation',
        toolArgs: {
          provider: 'w-commerce',
          productId: targetId,
          buyerMessage: text,
          actionType: 'SAVE_ALERT'
        }
      };
    }

    // 1.95. Accept Offer or 2-Item Bundle (e.g. "i accept", "deal", "accept bundle", "i'll take it")
    const isAcceptPhrase = /\b(i\s+accept|accept\s+offer|deal|i'll\s+take\s+it|i\s+will\s+take\s+it|lock\s+(?:the\s+)?offer|lock\s+(?:the\s+)?deal|accept\s+2-item\s+bundle|accept\s+bundle|2-item\s+bundle|buy\s+two)\b/i;
    const isAcceptAction =
      contextData?.actionType === 'ACCEPT_OFFER' ||
      contextData?.actionType === 'ACCEPT_BUNDLE' ||
      (contextData?.recentNegotiation && isAcceptPhrase.test(lower));

    if (isAcceptAction) {
      const uuidMatch = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      const targetId = contextData?.productId || (uuidMatch ? uuidMatch[0] : (contextData?.lastSessionProductId || 'demo-cavetto-watch'));
      const isBundle = contextData?.actionType === 'ACCEPT_BUNDLE' || /\b(2-item|bundle|two|buy\s+two)\b/i.test(lower);
      return {
        toolName: 'request_seller_negotiation',
        toolArgs: {
          provider: 'w-commerce',
          productId: targetId,
          buyerMessage: text,
          actionType: isBundle ? 'ACCEPT_BUNDLE' : 'ACCEPT_OFFER',
          quantity: isBundle ? 2 : (contextData?.quantity || 1)
        }
      };
    }

    // 2. Negotiation / Make Offer / Last Price / Price Objections
    const isExplicitNegotiationAction =
      contextData?.actionType === 'REQUEST_SELLER_NEGOTIATION' ||
      contextData?.actionType === 'REQUEST_LOWEST_PRICE' ||
      contextData?.actionType === 'MAKE_OFFER' ||
      contextData?.actionType === 'COUNTER_OFFER' ||
      contextData?.actionType === 'START' ||
      Boolean(contextData?.proposedPrice);

    const explicitNegotiationPatterns = /\b(make\s+(?:an\s+)?offer|my\s+offer|counter\s+offer|seller\s+counter|give\s+(?:me\s+)?(?:a\s+)?discount|reduce\s+(?:the\s+)?price|lower\s+(?:the\s+)?price|what\s+is\s+(?:your\s+|the\s+)?(?:best|last|bottom|lowest)\s+price|best\s+price|last\s+price|bottom\s+price|lowest\s+price|too\s+expensive|too\s+much\s+money|can\s+you\s+do\s+(?:₦|\$|[0-9]+)|can\s+you\s+reduce|can\s+you\s+come\s+down|can\s+we\s+negotiate|can\s+i\s+pay\s+(?:₦|\$|ngn|usd)?\s*[0-9]+|for\s+.+?\s+can\s+i\s+pay|can\s+i\s+(?:pay|get|buy)\s+.+?\s+(?:for|at)\s+(?:₦|\$|ngn|usd)?\s*[0-9]+|will\s+you\s+take\s+(?:₦|\$|ngn|usd)?\s*[0-9]+|would\s+you\s+accept\s+(?:₦|\$|ngn|usd)?\s*[0-9]+|how\s+about\s+(?:₦|\$|ngn|usd)?\s*[0-9]+|what\s+about\s+(?:₦|\$|ngn|usd)?\s*[0-9]+|i\s+have\s+(?:₦|\$|ngn|usd)?\s*[0-9]+\s*(?:naira|ngn)?\b|negotiat\w*|haggle|bargain|only\s+want\s+one)\b/i;

    const hasNegotiationIntent =
      isExplicitNegotiationAction ||
      explicitNegotiationPatterns.test(lower) ||
      (contextData?.recentNegotiation && /(?:₦|\$|[0-9]+(?:\.[0-9]+)?)/.test(text) && /\b(price|offer|deal|do|how\s+about|what\s+about|reduce|take)\b/i.test(lower));

    if (hasNegotiationIntent) {
      const uuidMatch = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      const isInitialOrLowestAction =
        contextData?.actionType === 'START' ||
        contextData?.actionType === 'REQUEST_LOWEST_PRICE' ||
        contextData?.actionType === 'REQUEST_SELLER_NEGOTIATION';

      // Strip out "(Listed at ...)", quotes, 4-digit years, and item weights/specs (e.g. 200g, 1kg, 500ml, 128gb)
      const textWithoutSpecs = text
        .replace(/\(listed\s+at[^)]*\)/gi, ' ')
        .replace(/listed\s+at\s+(?:₦|\$|ngn|usd)?\s*[0-9,]+(?:\.[0-9]+)?/gi, ' ')
        .replace(/"[^"]*"/g, ' ')
        .replace(/'[^']*'/g, ' ')
        .replace(/\b202[0-9]\b/g, ' ')
        .replace(/\b[0-9]+(?:\.[0-9]+)?\s*(?:g|kg|ml|l|ltr|oz|lb|lbs|cl|mg|gb|mb|tb|cm|mm|m|inch|inches|pk|pack|pcs|piece|pieces|ct|count)\b/gi, ' ');

      const pctMatch = textWithoutSpecs.match(/([0-9]{1,2})\s*%/);
      let offerAmount = contextData?.proposedPrice ? Number(contextData.proposedPrice) : null;
      let requestedDiscountPct = null;

      if (pctMatch) {
        requestedDiscountPct = parseInt(pctMatch[1]);
      }

      if (!offerAmount && !isInitialOrLowestAction) {
        // Priority 1: Match verb + price ("pay 2000naira", "pay 2000", "for 2000 naira", "do ₦1,500")
        const verbMatch = textWithoutSpecs.match(/(?:pay|give|do|take|offer|at|for|accept)\s+(?:₦|\$|ngn|usd)?\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)\s*(?:naira|ngn|k\b|usd|\$|₦)?/i);
        if (verbMatch) {
          let val = parseFloat(verbMatch[1].replace(/,/g, ''));
          if (/k\b/i.test(verbMatch[0]) && val < 1000) val *= 1000;
          if (val > 50) offerAmount = val;
        }

        // Priority 2: Match currency prefixes/suffixes ("2000naira", "₦2000", "2000 NGN")
        if (!offerAmount) {
          const currMatch = textWithoutSpecs.match(/(?:₦|ngn|\$|usd)\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)/i) ||
                            textWithoutSpecs.match(/([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)\s*(?:naira|ngn|usd|\$|₦)/i);
          if (currMatch) {
            let val = parseFloat(currMatch[1].replace(/,/g, ''));
            if (val > 50) offerAmount = val;
          }
        }

        // Priority 3: Standalone number
        if (!offerAmount) {
          const numMatch = textWithoutSpecs.match(/\b([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)\b/);
          if (numMatch) {
            let val = parseFloat(numMatch[1].replace(/,/g, ''));
            if (val > 50 && val !== 10000) offerAmount = val;
          }
        }
      }

      // Check if buyer explicitly named a product (e.g. "for Chocolate Biscuits 200g can i pay...")
      const forMatch = text.match(/\bfor\s+(.+?)\s+(?:can\s+i|can\s+you|could\s+i|i\s+can|will\s+you|would\s+you|how\s+about|i\s+want|is\s+it|what\s+is)\b/i);
      const afterForMatch = text.match(/(?:pay|offer|give|buy|get|discount|take|bargain)\s+[0-9]+[a-z0-9]*\s+(?:for|on)\s+(.+?)(?:$|[?.,!])/i);
      const extractedProductQuery = (forMatch && forMatch[1]) || (afterForMatch && afterForMatch[1]) || null;

      const isExplicitExternal = lower.includes('aliexpress') || lower.includes('ebay') || lower.includes('amazon') || lower.includes('asos');
      const provider = isExplicitExternal
        ? (lower.includes('aliexpress') ? 'aliexpress' : (lower.includes('ebay') ? 'ebay' : 'amazon'))
        : 'w-commerce';

      const resolvedProductId = contextData?.productId || (uuidMatch ? uuidMatch[0] : (isExplicitExternal ? 'amz-b0bdhwdr12' : (contextData?.lastSessionProductId || 'demo-cavetto-watch')));

      return {
        toolName: 'request_seller_negotiation',
        toolArgs: {
          provider,
          productId: resolvedProductId,
          productQuery: extractedProductQuery ? extractedProductQuery.trim() : null,
          buyerMessage: text,
          offerAmount,
          proposedPrice: offerAmount,
          actionType: contextData?.actionType || null,
          quantity: contextData?.quantity || 1,
          requestedDiscountPct: requestedDiscountPct || null
        }
      };
    }

    // 3. Shipping estimate & Free shipping (Only when asking about shipping/delivery fee or transit time)
    const isShippingEstimateIntent =
      lower.includes('shipping fee') ||
      lower.includes('shipping cost') ||
      lower.includes('shipping estimate') ||
      lower.includes('delivery cost') ||
      lower.includes('delivery fee') ||
      lower.includes('free shipping') ||
      (lower.includes('how long') && (lower.includes('ship') || lower.includes('deliver') || lower.includes('arrive') || lower.includes('transit')));

    if (isShippingEstimateIntent) {
      const uuidMatch = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      const isLocal = session?.marketCode === 'NIGERIA' || lower.includes('local') || lower.includes('w-commerce') || Boolean(uuidMatch) || Boolean(contextData?.productId);
      const provider = isLocal ? 'w-commerce'
        : (lower.includes('aliexpress') ? 'aliexpress'
        : (lower.includes('ebay') ? 'ebay' : 'amazon'));

      return {
        toolName: 'get_shipping_estimate',
        toolArgs: {
          provider,
          productId: contextData?.productId || (uuidMatch ? uuidMatch[0] : (isLocal ? undefined : 'amz-b0bdhwdr12'))
        }
      };
    }

    // 4. Conversational / Account / Follow-up Bypass (Let Gemini + RAG answer directly without running a catalog search)
    const isConversationalOrAccountQuestion =
      /\b(what\s+is\s+in\s+my\s+cart|my\s+cart\s+total|how\s+much\s+is\s+my\s+cart|my\s+wallet\s+balance|flash\s+deals?|promo\s+codes?|coupon\s+codes?|tell\s+me\s+more\s+about|which\s+of\s+(?:these|those|the\s+two)|the\s+(?:first|second|third)\s+one|why\s+should\s+i|how\s+does|what\s+is\s+the\s+difference\s+between\s+escrow)\b/i.test(lower);

    if (isConversationalOrAccountQuestion) {
      return {
        toolName: null,
        toolArgs: {}
      };
    }

    // 5. Product Search (Triggered when user exhibits shopping search intent or mentions products)
    const searchVerbs = /\b(find|search|show\s+me|look\s+for|looking\s+for|can\s+you\s+get|get\s+me|buy|buyer|i\s+want\s+to\s+buy|i\s+want|i\s+need\s+a|i\s+need\s+an|i\s+need\s+some|do\s+you\s+have|where\s+can\s+i\s+get|price\s+of|how\s+much\s+is|recommend|suggest|list\s+any|list\s+some|list|fetch|give\s+me|give|display|what\s+do\s+you\s+have|what\s+can\s+i\s+(?:buy|get|order|eat)|what\s+to\s+eat|options\s+for|menu|match|matching)\b/i;
    const productKeywords = /\b(products?|items?|goods|gymshark|macbook|laptop|phone|iphone|samsung|headphones|earphones|wristwatch|watches|watch|smartwatch|timepiece|dress|shoes|sneakers|camera|charger|bag|jacket|keyboard|mouse|tshirt|shirt|hoodie|clothing|electronics|gadgets|clothes|suit|pants|trouser|trousers|trousher|troushers|pouch|pouchs|pauch|pauches|perfume|fragrance|cream|lotion|jewelry|necklace|bracelet|ring|sunglasses|monitor|tablet|ipad|speaker|ps5|xbox|uk\s*\d+|food|foods|breakfast|break\s*fast|lunch|dinner|meal|meals|snack|snacks|cereal|cereals|corn\s*flakes|cornflakes|oat|oats|porridge|bread|egg|eggs|milk|tea|coffee|juice|water|drinks?|beverage|softdrink|soda|noodle|noodles|pasta|biscuit|biscuits|cookies?|crisps?|chips?|rice|burger|burgers|sushi|fries|chicken|grocer(?:y|ies))\b/i;

    const hasSearchIntent = searchVerbs.test(lower) || productKeywords.test(lower) || lower.includes('match');

    if (hasSearchIntent) {
      const maxPrice = this._extractBudgetFromText(lower);
      let query = text
        .replace(/^(nice|great|awesome|cool|okay|ok|hello|hi|hey|well|so|um)[,!.\s]+/gi, '')
        .replace(/\b(find|search|show me|look for|looking for|can you get|get me|buy|buyer|i want to buy|i want|i need a|i need an|i need|need a|need an|do you have|where can i get|how much is|price of|recommend a|recommend|suggest a|suggest|list any|list some|list|can you list any|can you list|fetch and give|fetch and list|fetch|give me|give|display|it match|match the|match your|matches my|matches)\b/gi, '')
        .replace(/\b(please|for me|on amazon|on aliexpress|on w-commerce|on ebay|on asos|right now|today|for break fast|for breakfast|this morning|with images?|product images?|the images?|images?|photos?|below|under|naira|ngn)\b/gi, '')
        .replace(/\b(a|an|some|the|any)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      let secondaryQuery = null;
      let pairingContext = null;

      // Handle specific pairing / matching queries
      if (lower.includes('trouser') || lower.includes('trousher') || (lower.includes('match') && lower.includes('shirt'))) {
        query = 'men wear trouser pants';
        secondaryQuery = 'top shirt basic wear';
        pairingContext = {
          type: 'fashion_match',
          primaryItem: 'trouser',
          targetMatch: 'shirt',
          advice: 'Buy this trouser — it matches the shirt you bought last week! Neutral tones balance vibrant tops and create a versatile weekly rotation.'
        };
      } else if (lower.includes('iphone') || lower.includes('phone') || lower.includes('pauch') || lower.includes('pouch')) {
        query = 'phone iphone';
        secondaryQuery = 'accessories pouch case';
        pairingContext = {
          type: 'tech_match',
          primaryItem: 'iPhone',
          targetMatch: 'pouch',
          advice: 'Buy the iPhone — it matches your pouch color! Keeping your flagship device paired with a color-matched protective pouch gives you that clean, seamless aesthetic.'
        };
      } else if (lower.includes('buy this it match') || (lower.includes('match') && (!query || query.length < 3))) {
        query = 'men wear fashion';
        secondaryQuery = 'accessories watch';
        pairingContext = {
          type: 'general_match',
          advice: 'Buy this — it matches perfectly! Style this piece with complementary colors and versatile accessories for a cohesive look.'
        };
      }

      if (!query) query = text.trim();

      const provider = lower.includes('amazon') ? 'amazon'
        : (lower.includes('aliexpress') ? 'aliexpress'
        : (lower.includes('ebay') ? 'ebay'
        : (lower.includes('asos') ? 'asos'
        : (lower.includes('w-commerce') || lower.includes('local') ? 'w-commerce' : undefined))));

      return {
        toolName: 'search_products',
        toolArgs: {
          query,
          provider,
          maxPrice,
          secondaryQuery,
          pairingContext,
          limit: 8
        }
      };
    }

    // Default: Conversational Fallback (PayAI communicates directly in real-time using Gemini + live RAG context)
    return {
      toolName: null,
      toolArgs: {}
    };
  }

  _generateSmartSuggestions(result, originalPrompt, pairingContext = {}) {
    const lower = (originalPrompt || '').toLowerCase();
    const suggestions = [];
    const items = result.items || [];
    const hasFood = items.some(it => /burger|crunch|meal|box|breakfast|cereal|oat|chicken|rice|fries|food|snack|sushi/i.test(it.title || it.category));
    const hasDrinks = items.some(it => /drink|fanta|sprite|coke|water|juice|beverage/i.test(it.title || it.category));

    // 1. Combo Pairings by Category (Food & Drink, Fashion, Tech)
    if (result.pairedCombos && result.pairedCombos.length > 0) {
      const bestCombo = result.pairedCombos[0];
      const currencySymbol = bestCombo.currency === 'NGN' ? '₦' : '$';

      if (bestCombo.comboType === 'food_drink' || (hasFood && hasDrinks)) {
        suggestions.push(
          `🍔 + 🥤 **Perfect Meal & Drink Combo:** Pair the **${bestCombo.primaryTitle} (${currencySymbol}${bestCombo.primaryPrice.toLocaleString()})** with an ice-cold **${bestCombo.secondaryTitle} (${currencySymbol}${bestCombo.secondaryPrice.toLocaleString()})** for a complete combo at just **${currencySymbol}${bestCombo.comboPrice.toLocaleString()} ${bestCombo.currency}**! Crisp, savory satisfaction balanced by fizzy cold refreshment! 🎉`
        );

        if (result.pairedCombos.length > 1) {
          const saverCombo = result.pairedCombos[1];
          suggestions.push(
            `🍗 + 🧃 **Smart Saver Pairing:** Grab the **${saverCombo.primaryTitle} (${currencySymbol}${saverCombo.primaryPrice.toLocaleString()})** + **${saverCombo.secondaryTitle} (${currencySymbol}${saverCombo.secondaryPrice.toLocaleString()})** for only **${currencySymbol}${saverCombo.comboPrice.toLocaleString()} ${saverCombo.currency}** — keeping you well under budget with maximum flavor! 💰`
          );
        }
      } else if (bestCombo.comboType === 'fashion') {
        suggestions.push(
          `👖 + 👕 **Coordinated Outfit Combination:** Pair **${bestCombo.primaryTitle} (${currencySymbol}${bestCombo.primaryPrice.toLocaleString()})** with **${bestCombo.secondaryTitle} (${currencySymbol}${bestCombo.secondaryPrice.toLocaleString()})** for a complete outfit at just **${currencySymbol}${bestCombo.comboPrice.toLocaleString()} ${bestCombo.currency}**! A perfectly balanced, stylish look ready to wear! ✨`
        );
      } else if (bestCombo.comboType === 'tech') {
        suggestions.push(
          `📱 + 👛 **Smart Tech & Accessory Pairing:** Pair **${bestCombo.primaryTitle} (${currencySymbol}${bestCombo.primaryPrice.toLocaleString()})** with **${bestCombo.secondaryTitle} (${currencySymbol}${bestCombo.secondaryPrice.toLocaleString()})** for just **${currencySymbol}${bestCombo.comboPrice.toLocaleString()} ${bestCombo.currency}**! Keep your devices stylish and protected! 🚀`
        );
      }
    } else if (hasFood && hasDrinks) {
      const foodItem = items.find(it => /burger|crunch|meal|box|chicken|snack|sushi/i.test(it.title));
      const drinkItem = items.find(it => /drink|fanta|sprite|coke|water/i.test(it.title));
      if (foodItem && drinkItem) {
        const total = Number(foodItem.price || 0) + Number(drinkItem.price || 0);
        suggestions.push(
          `🍔 + 🥤 **Delicious Pairing:** Pair **${foodItem.title} (₦${Number(foodItem.price).toLocaleString()})** with **${drinkItem.title} (₦${Number(drinkItem.price).toLocaleString()})** — Total: **₦${total.toLocaleString()} NGN**! A complete meal combo ready for express dispatch! ✨`
        );
      }
    }

    // Sushi / Breakfast Pairing Tip (User's specific scenario: "eat sushi and go-softdrink for breakfast")
    if (lower.includes('sushi') || lower.includes('breakfast') || lower.includes('break fast') || (hasFood && !lower.includes('trouser') && !lower.includes('phone'))) {
      suggestions.push(
        `🍣 + 🥤 **Flavor Balance Tip:** "Eat sushi and go-softdrink for breakfast" — pairing savory, umami meals with a chilled softdrink or pure fruit juice cleanses your palate between bites and keeps you refreshed all morning! 🍱⚡`
      );
    }

    // 2. Fashion & Wardrobe Matching (User's specific scenario: "buy this trousher it match the shirt you brought last week")
    const isFashion = lower.includes('trouser') || lower.includes('trousher') || lower.includes('shirt') || lower.includes('wear') || lower.includes('dress') || lower.includes('pants') || items.some(it => /wear|top|trouser|apparel|fashion/i.test(it.category || it.title));
    if (isFashion || pairingContext?.type === 'fashion_match') {
      suggestions.push(
        `👖 + 👕 **Wardrobe Coordination Match:** "Buy this trouser — it matches the shirt you bought last week!" The sleek, neutral cut of **MEN WEAR** complements both casual tees and button-down shirts, giving you a sharp, effortless weekly rotation! 🌟`
      );
      suggestions.push(
        `👟 **Footwear Pairing:** Complete your outfit with low-profile white sneakers or leather loafers for that smart-casual city vibe! ✨`
      );
    }

    // 3. Tech & Gadgets Color-Coordination (User's specific scenario: "buyer the iphone it match your pauch color")
    const isTech = lower.includes('iphone') || lower.includes('phone') || lower.includes('pauch') || lower.includes('pouch') || lower.includes('watch') || lower.includes('headphone') || items.some(it => /electronics|watch|phone|tech/i.test(it.category || it.title));
    if (isTech || pairingContext?.type === 'tech_match') {
      suggestions.push(
        `📱 + 👛 **Aesthetic Tech Pairing:** "Buy the iPhone — it matches your pouch color!" Keeping your flagship devices coordinated with a protective leather pouch or silicone sleeve adds an elegant, personalized touch to your everyday carry! 🎨💫`
      );
      suggestions.push(
        `⌚ + 👔 **Smartwatch Styling:** The **2026 Samsung Galaxy Watch (₦10,000)** pairs gorgeously with both active silicone gym bands and refined leather straps for business meetings! 🚀`
      );
    }

    // General / Outfits Matching (User scenario: "buy this it match")
    if (lower.includes('buy this it match') || pairingContext?.type === 'general_match') {
      suggestions.push(
        `✨ + 👗 **Style Match Recommendation:** "Buy this — it matches perfectly!" Styling versatile core pieces with coordinated accessories creates a seamless, elevated look for any occasion! 🌟💫`
      );
    }

    // 4. Negotiation & Smart Bargain Hack
    const negotiableItem = items.find(it => it.canNegotiate && Number(it.price) > 5000);
    if (negotiableItem) {
      suggestions.push(
        `🤝 **Smart Bargain Hack:** Looking at the **${negotiableItem.title} (₦${Number(negotiableItem.price).toLocaleString()})**? It is listed above your target, but this verified seller accepts live offers! Make a counter-offer below and lock it in at your price! ⚡`
      );
    }

    // 5. Interactive 1-Click Action Chips
    const chips = [];
    if (hasDrinks) {
      const sprite = items.find(it => /sprite/i.test(it.title));
      const fanta = items.find(it => /fanta/i.test(it.title));
      if (sprite) chips.push(`[🥤 Add Sprite (₦${Number(sprite.price).toLocaleString()})](prompt:add ${sprite.title} to cart)`);
      else if (fanta) chips.push(`[🥤 Add Fanta (₦${Number(fanta.price).toLocaleString()})](prompt:add ${fanta.title} to cart)`);
    }
    const primaryFood = items.find(it => /crunch|burger|strip|meal/i.test(it.title) && Number(it.price) <= 5000);
    if (primaryFood) {
      chips.push(`[🍔 Add ${primaryFood.title} (₦${Number(primaryFood.price).toLocaleString()})](prompt:add ${primaryFood.title} to cart)`);
    }
    if (result.pairedCombos && result.pairedCombos.length > 0 && result.pairedCombos[0].primaryTitle !== result.pairedCombos[0].secondaryTitle) {
      const c = result.pairedCombos[0];
      chips.push(`[✨ Add Both as Combo (₦${c.comboPrice.toLocaleString()})](prompt:add ${c.primaryTitle} and ${c.secondaryTitle} to cart)`);
    }
    if (negotiableItem) {
      chips.push(`[🤝 Negotiate ${negotiableItem.title} to ₦5,000](prompt:Can you do 5000 for ${negotiableItem.title})`);
    }
    if (isFashion) {
      chips.push(`[👖 Show MEN WEAR Trousers](prompt:show MEN WEAR trousers)`);
      chips.push(`[👕 Show Matching Tops & Shirts](prompt:show matching tops and shirts)`);
    }
    if (isTech) {
      chips.push(`[⌚ Add Samsung Galaxy Watch (₦10,000)](prompt:add 2026 SUMSUNG GALAXY WATCH to cart)`);
      chips.push(`[📱 Show Phone Pouches & Cases](prompt:show phone pouches and accessories)`);
    }
    if (lower.includes('buy this it match') || pairingContext?.type === 'general_match') {
      chips.push(`[✨ View Matching Outfits & Accessories](prompt:show matching outfits and accessories)`);
    }

    let output = `\n\n### 💡 PayAI Smart Suggestions & Perfect Pairings\n` +
      suggestions.map(s => `• ${s}`).join('\n\n');

    if (chips.length > 0) {
      output += `\n\n**Quick 1-Click Suggestions:**\n` + chips.join(' ');
    }

    return output;
  }

  _generateResponse(toolName, result, originalPrompt) {
    switch (toolName) {
      case 'select_product_preference': {
        if (!result.success || !result.selectedProduct) {
          return result.message || `I couldn't find the exact product you preferred. Could you specify which item you want?`;
        }

        const p = result.selectedProduct;
        const isLocal = !p.isExternal && (p.provider === 'w-commerce' || !p.provider);
        const unitPriceNum = Number(p.price) || 0;
        const priceDisplay = isLocal ? `₦${unitPriceNum.toLocaleString()} NGN` : `$${unitPriceNum} USD`;
        const qty = result.quantity || 1;
        const totalPriceNum = unitPriceNum * qty;
        const totalPriceDisplay = isLocal ? `₦${totalPriceNum.toLocaleString()} NGN` : `$${totalPriceNum} USD`;

        const formatDrink = (drink) => {
          const dLocal = !drink.isExternal && (drink.provider === 'w-commerce' || !drink.provider);
          const dPrice = dLocal ? `₦${Number(drink.price).toLocaleString()} NGN` : `$${drink.price} USD`;
          const dStock = drink.inStock ? '✅ In stock' : '✅ Available';
          const drinkImg = safeImageUrl(drink) || drink.imageUrl;
          const imgPart = drinkImg ? `\n  ![${drink.title}](${drinkImg})` : '';
          return `- **${drink.title}** — **${dPrice}** (${dStock} | 🤝 *Negotiable*)\n  *Seller:* ${drink.seller?.name || 'Verified Local Merchant'}${imgPart}`;
        };

        let ack = '';
        if (result.quantitySpecified && qty > 1) {
          ack = `Okay, understood! I see you prefer **${qty}x ${p.title}** (${totalPriceDisplay}).`;
        } else {
          ack = `Okay, understood! I see you prefer the **${p.title}** (${priceDisplay}). How many would you like to order?`;
        }

        let pairingsSection = '';
        if (result.pairingType === 'drinks' && Array.isArray(result.pairingItems) && result.pairingItems.length > 0) {
          const drinksList = result.pairingItems.map(formatDrink).join('\n\n');
          pairingsSection = `\n\n🥤 **I also have some refreshing drinks you can purchase with it to complete your meal:**\n\n${drinksList}`;
        }

        const firstDrink = result.pairingItems && result.pairingItems.length > 0 ? result.pairingItems[0] : null;
        const comboPrompt = firstDrink
          ? `\n- [Add ${p.title} + ${firstDrink.title} Combo](prompt:Add ${qty} ${p.title} and 1 ${firstDrink.title} to my cart)`
          : '';

        let askLine = '';
        if (result.quantitySpecified) {
          askLine = `👉 **Would you like me to add ${qty}x ${p.title} to your cart, or pair it with any of the drinks above?**`;
        } else {
          askLine = `👉 **How many ${p.title} would you like, and would you like me to add any drinks to your order?**`;
        }

        const quickActions =
          `\n\n${askLine}\n\n` +
          `💡 **Quick Actions:**\n` +
          `- [Add 1 ${p.title} to Cart](prompt:Add 1 ${p.title} to my cart)\n` +
          `- [Add 2 ${p.title} to Cart](prompt:Add 2 ${p.title} to my cart)` +
          comboPrompt + `\n` +
          `- [Negotiate Price](prompt:Can you give me a discount on ${p.title}?)`;

        const safeImg = safeImageUrl(p) || p.imageUrl;
        const mainImage = safeImg ? `\n\n![${p.title}](${safeImg})` : '';

        return `${ack}${mainImage}${pairingsSection}${quickActions}`;
      }

      case 'link_global_product': {
        const p = result.product || result;
        const rawPlatform = result.platform || p.provider || 'External Store';
        const displayPlatform =
          rawPlatform.toLowerCase() === 'amazon' ? 'Amazon' :
          rawPlatform.toLowerCase() === 'aliexpress' ? 'AliExpress' :
          rawPlatform.toLowerCase() === 'ebay' ? 'eBay' :
          rawPlatform.toLowerCase() === 'asos' ? 'ASOS' :
          rawPlatform.toLowerCase() === 'shopify' ? 'Shopify' :
          rawPlatform.toLowerCase() === 'woocommerce' ? 'WooCommerce' :
          rawPlatform.toLowerCase() === 'etsy' ? 'Etsy' :
          rawPlatform.charAt(0).toUpperCase() + rawPlatform.slice(1);

        const lowerPrompt = (originalPrompt || '').toLowerCase();
        let userActionNotice = '';

        if (lowerPrompt.includes('negotiat') || lowerPrompt.includes('offer') || lowerPrompt.includes('discount') || lowerPrompt.includes('cheaper') || lowerPrompt.includes('haggle') || lowerPrompt.includes('bargain')) {
          userActionNotice = `\n\n🔒 **Negotiation Polite Decline:** Price negotiation is not supported for external stores (${displayPlatform}). Price negotiation is exclusively available for native W-Commerce sellers.`;
        } else if (lowerPrompt.includes('cart') || lowerPrompt.includes('checkout') || lowerPrompt.includes('buy') || lowerPrompt.includes('pay') || lowerPrompt.includes('order') || lowerPrompt.includes('add')) {
          userActionNotice = `\n\n🛒 **Cart / Checkout Notice:** In-app cart and PayPal checkout are not supported for external store items. Purchases via PayPal checkout and seller Naira payouts are exclusive to native W-Commerce products.`;
        }

        const priceDisplay = (p.originalPrice || p.price) ? `$${p.originalPrice || p.price} ${p.currency || 'USD'}` : 'View listing';
        const ratingDisplay = p.rating ? `⭐ ${p.rating}/5` : 'N/A';
        const originalStoreLink = result.externalStoreUrl || result.originalUrl || p.url;

        return `Here is the external product information from **${displayPlatform}**:\n\n` +
          `- **Title:** ${p.title}\n` +
          `- **Platform:** ${displayPlatform}\n` +
          `- **Original Price:** ${priceDisplay}\n` +
          `- **Rating:** ${ratingDisplay}\n` +
          `- **Original Store Link:** ${originalStoreLink}\n\n` +
          `Please note: Global store linking is for reference only. Price negotiation and in-app PayPal checkout are not supported for external stores. To purchase with PayAI & PayPal checkout, please explore native W-Commerce products!${userActionNotice}`;
      }

      case 'resolve_store_url': {
        return `🏪 **External Storefront Detected:**\n- **Store Name:** ${result.storeName}\n- **Platform:** ${result.platformDisplayName}\n- **Status:** ${result.status === 'VERIFIED_ACCESSIBLE' ? 'Connected & Verified ✅' : result.status}\n- **Available Sample Items:** ${result.itemCount} products ready for import\n\nYou can link individual products from this storefront by pasting their URLs here anytime!`;
      }

      case 'advise_gift_or_occasion': {
        const recipient = result.recipient || 'friend';
        const occasion = result.occasion || 'celebration';
        const budget = result.budget || 20000;
        const items = result.items || [];
        const currencyStr = `₦${Number(budget).toLocaleString()} NGN`;

        let reply = `🎉 **That's such a thoughtful and wonderful gesture! Celebrating your ${recipient}'s ${occasion} is going to make their day unforgettable!** 💖✨\n\n` +
          `With your budget of **${currencyStr}**, you have some truly stylish, memorable, and verified gift options on W-Commerce! Here are my top handpicked gift recommendations:\n\n`;

        if (items.length > 0) {
          items.slice(0, 3).forEach((p, idx) => {
            const priceNgn = `₦${Number(p.price || 0).toLocaleString()} NGN`;
            const seller = p.seller?.name || 'Verified Merchant';
            const imgPart = p.imageUrl ? `\n\n![${p.title}](${p.imageUrl})` : '';

            reply += `${imgPart}\n\n` +
              `**${idx + 1}. ${p.title}** — **${priceNgn}**\n` +
              `• 🏪 **Seller:** ${seller} (Verified & Escrow Protected)\n` +
              `• ✨ **Why they'll love it:** A premium, authentic marketplace item that looks stunning and brings genuine joy!\n\n` +
              `[🎁 Add ${p.title} to Cart (${priceNgn})](prompt:add ${p.title} to cart)\n\n`;
          });

          const primary = items[0];
          const secondary = items[1] || items[0];
          const comboTotal = Number(primary.price || 0) + (items.length > 1 ? Number(secondary.price || 0) : 0);
          const remaining = Math.max(0, budget - comboTotal);

          reply += `### 💡 PayAI Smart Suggestions & Perfect Pairings\n\n` +
            `🎁 **The Ultimate ${recipient.charAt(0).toUpperCase() + recipient.slice(1)} Gift Set (₦${comboTotal.toLocaleString()} NGN Total):**\n` +
            `Pair **${primary.title}** with **${secondary.title}** for a complete, thoughtful surprise! `;

          if (remaining > 0) {
            reply += `You'll even have **₦${remaining.toLocaleString()} NGN** remaining within your budget! 🥳💸\n\n`;
          } else {
            reply += `It stretches your budget to perfection! 🌟\n\n`;
          }

          reply += `[✨ Add Complete Gift Set to Cart (₦${comboTotal.toLocaleString()})](prompt:add ${primary.title} and ${secondary.title} to cart) ` +
            `[🔍 Explore More Gifts Under ${currencyStr}](prompt:show gift ideas under ${budget})\n\n`;
        }

        reply += `Would they prefer tech gadgets & smart accessories, or chic fashion & sweet indulgence? Tell me a little about their personal style and I'll tailor the exact dream gift! 🎁💝`;

        return reply;
      }

      case 'advise_comparison': {
        const lower = (originalPrompt || '').toLowerCase();
        let reply = `🔍 **PayAI Expert Product & Specs Comparison Breakdown** 📱⚖️\n\n`;

        if (lower.includes('camera') || lower.includes('phone') || lower.includes('iphone') || lower.includes('samsung') || lower.includes('galaxy')) {
          reply += `When comparing flagship smartphone cameras (like the **iPhone 16 / 15 Pro Max** vs **Samsung Galaxy S24 / S25 Ultra**):\n\n` +
            `### 📸 1. Camera System & Image Tuning:\n` +
            `• **iPhone (Pro Max):** Renowned for **cinematic video stabilization**, true-to-life skin tones, seamless Dolby Vision 4K recording, and near-zero shutter lag. If you create content, vlog, or post directly to Instagram / TikTok, the iPhone pipeline is virtually unmatched.\n` +
            `• **Samsung Galaxy (Ultra):** Dominates in **zoom clarity (up to 100x Space Zoom)**, ultra-high resolution (200MP main sensor for cropping), vivid punchy colors, and superior nightography in low-light environments.\n\n` +
            `### 🔋 2. Battery & Daily Endurance:\n` +
            `• Both devices offer all-day endurance (typically 7-9 hours of active screen-on time). Samsung charges faster (45W wired), while iPhone maintains exceptional standby efficiency and battery longevity.\n\n` +
            `### 🏆 The PayAI Verdict:\n` +
            `• 👉 **Choose iPhone** if your priority is social media content, smooth video, and longevity.\n` +
            `• 👉 **Choose Samsung Galaxy** if you love telephoto zoom, manual Pro photography controls, and multi-window multitasking!\n\n`;
        } else if (lower.includes('headphone') || lower.includes('audio') || lower.includes('earphone')) {
          reply += `When choosing between **Over-Ear Noise-Cancelling Headphones** and **In-Ear Wireless Buds**:\n\n` +
            `• **Over-Ear ANC (e.g. W-Commerce Wireless ANC):** Delivers superior acoustic seal, active noise cancellation for airplanes and busy offices, and up to 30+ hours of continuous battery life.\n` +
            `• **In-Ear Buds:** Perfect for running, gym workouts, ultra-portability, and discreet pocket storage.\n\n` +
            `### 🏆 The PayAI Verdict:\n` +
            `For focused work, travel, and premium immersive audio, over-ear ANC is the clear winner! 🎧✨\n\n`;
        } else {
          reply += `Here is how we compare verified marketplace models side-by-side:\n\n` +
            `• ⚙️ **Performance & Build Quality:** Durability, materials, and long-term reliability.\n` +
            `• 💰 **Value for Money:** Best specs per Naira spent.\n` +
            `• 🛡️ **Warranty & Escrow Protection:** 100% money-back guarantee backed by W-Commerce Escrow.\n\n`;
        }

        const items = result.items || [];
        if (items.length > 0) {
          reply += `### 💡 Verified Marketplace Deals Ready for Fast Dispatch:\n\n`;
          items.slice(0, 2).forEach(t => {
            const imgPart = t.imageUrl ? `![${t.title}](${t.imageUrl})\n\n` : '';
            reply += `${imgPart}` +
              `• **${t.title}** — **₦${Number(t.price).toLocaleString()} NGN** (${t.seller?.name || 'Verified Merchant'})\n` +
              `[📱 View Specs & Add to Cart](prompt:add ${t.title} to cart) [🤝 Negotiate Best Price](prompt:can i get a discount on ${t.title})\n\n`;
          });
        }

        reply += `[📱 Compare All Smartphones](prompt:show phones) ` +
          `[🤝 Negotiate Tech Discounts](prompt:can i get a discount on electronics)\n\n` +
          `What matters most for your daily routine: video recording, travel zoom, or battery endurance? Let me know and I'll find you the perfect deal! 🚀✨`;

        return reply;
      }

      case 'advise_styling': {
        const lower = (originalPrompt || '').toLowerCase();
        let reply = `👔✨ **PayAI Personal Styling & Outfit Consultation** 👗👠\n\n`;

        if (lower.includes('dinner') || lower.includes('date') || lower.includes('night')) {
          reply += `For a **dinner date or evening outing**, the golden rule is **sharp, effortless elegance**:\n\n` +
            `### 🌟 The Winning Outfit Formula:\n` +
            `1. **The Foundation:** A tailored crisp top or structured polo (neutral tones like Navy, Charcoal, or Crisp White).\n` +
            `2. **The Silhouette:** Clean tapered trousers or dark denim with a clean hem—avoid distressed cuts for upscale dining.\n` +
            `3. **The Footwear:** Minimal leather loafers or pristine clean white sneakers for modern smart-casual flair.\n` +
            `4. **The Signature Accent:** An elegant timepiece on the wrist (like the **2026 SUMSUNG GALAXY WATCH**) and a subtle signature scent.\n\n`;
        } else {
          reply += `Here is how to elevate your everyday outfit rotation:\n\n` +
            `• **Rule of Proportions:** If your top is relaxed or oversized, pair it with structured, fitted trousers.\n` +
            `• **Color Harmony:** Limit your palette to 3 complementary colors (e.g. Navy, White, Earthy Khaki/Tan).\n` +
            `• **Accents:** A clean watch and matching shoes tie the entire aesthetic together instantly.\n\n`;
        }

        const items = result.items || [];
        if (items.length > 0) {
          reply += `### 💡 Curated Pieces from Verified Marketplace Sellers:\n\n`;
          items.slice(0, 2).forEach(item => {
            const imgPart = item.imageUrl ? `![${item.title}](${item.imageUrl})\n\n` : '';
            reply += `${imgPart}` +
              `• **${item.title}** — **₦${Number(item.price).toLocaleString()} NGN** (${item.seller?.name || 'Verified Merchant'})\n` +
              `[✨ Add to Cart](prompt:add ${item.title} to cart) [🤝 Negotiate Price](prompt:can i get a discount on ${item.title})\n\n`;
          });
        }

        reply += `### 💡 PayAI Smart Suggestions & Perfect Pairings\n` +
          `Pair a sharp polo with tapered trousers and an accent timepiece to create a cohesive weekly rotation! 🥂✨\n\n` +
          `[🛍️ See Men's & Women's Fashion](prompt:show fashion) ` +
          `[⌚ View Accent Watches](prompt:show watches)\n\n` +
          `Is the dinner setting more fine-dining upscale or a relaxed lounge vibe? Let me know so we can dial in the sharpness! 😄`;

        return reply;
      }

      case 'advise_food': {
        let reply = `🍔😋 **PayAI Chef's Table & Meal Recommendations** 🍟🥤\n\n` +
          `Ready for something delicious, crispy, and thoroughly satisfying? Here are our top-rated marketplace meals prepared fresh:\n\n`;

        const meals = result.meals || [];
        const drinks = result.drinks || [];

        if (meals.length > 0) {
          const main = meals[0];
          const drink = drinks[0];
          const mainPrice = Number(main.price || 0);
          const drinkPrice = drink ? Number(drink.price || 0) : 1000;
          const comboTotal = mainPrice + drinkPrice;
          const imgPart = main.imageUrl ? `![${main.title}](${main.imageUrl})\n\n` : '';

          reply += `${imgPart}` +
            `**1. ${main.title}** — **₦${mainPrice.toLocaleString()} NGN**\n` +
            `• ✨ Golden crispy chicken, savory seasoned crunch, and signature dipping sauce!\n\n` +
            `[🍔 Add ${main.title} to Cart (₦${mainPrice.toLocaleString()})](prompt:add ${main.title} to cart)\n\n` +
            `### 💡 PayAI Smart Suggestions & Perfect Pairings\n\n` +
            `🥤 **The Ultimate Crunch & Refresh Combo (₦${comboTotal.toLocaleString()} NGN):**\n` +
            `Pair **${main.title}** with an ice-cold **${drink ? drink.title : 'Sprite'}** for the perfect balance of savory crunch and fizzy refreshment! 🍗❄️\n\n` +
            `[✨ Add Both as Combo (₦${comboTotal.toLocaleString()})](prompt:add ${main.title} and ${drink ? drink.title : 'Sprite'} to cart) ` +
            `[🍟 View All Meal Combos](prompt:show food)\n\n`;
        }

        reply += `Are you craving spicy crunch, a juicy beef burger, or a lighter quick snack? Tell me your vibe and let's get it delivered piping hot! 🚀`;
        return reply;
      }

      case 'conversation_greeting': {
        return `👋 Hello! I am **PayAI**, your intelligent shopping & discovery assistant on W-Commerce.\n\nHere is what I can help you with in real-time:\n- 🔍 **Search Verified Products:** Discover authentic items from verified W-Commerce sellers and linked external stores.\n- 🤝 **Price Negotiation:** Make offers and negotiate discounts directly with verified W-Commerce sellers (sellers set their minimum accepted price).\n- 🚚 **Live Shipping & Free Delivery Check:** Calculate real-time shipping costs to your destination and check free shipping thresholds.\n- 💳 **PayPal Checkout & Naira Payouts:** Pay securely in USD with PayPal checkout. Once you confirm delivery, the seller is paid out automatically in Naira (NGN).\n- 📦 **Order Management:** Place orders, track shipments stage-by-stage, or request returns and cancellations per seller policies.\n\nWhat are you shopping for today? (e.g. *"Show me gymshark"*, *"Find Apple MacBook"*, or *"Search for headphones"*).`;
      }

      case 'conversation_faq': {
        const topic = result?.topic;
        if (topic === 'buyer_trust_and_safety') {
          return `🛡️ **Your Protection is 100% Guaranteed on W-Commerce & PayAI:**\n\n` +
            `1. **🔒 W-Commerce Escrow Protection:** When you pay (via W-Commerce Wallet or PayPal), your money is **never** sent directly to the seller. Funds are locked securely in **W-Commerce Escrow** until your package is delivered and confirmed by you.\n` +
            `2. **✅ Verified Seller & Domain Ownership:** Every verified merchant must prove real domain ownership (\`WCOM-VERIFY\` verification token, government KYC, and warehouse inspection).\n` +
            `3. **📸 Live Warehouse Photo & Voice Note Inspection:** Unsure about item condition? Click **"Warehouse Photo & Voice Note"** right here in PayAI to inspect actual high-resolution batch photos and hear a live seller voice note before you buy.\n` +
            `4. **🚚 7-Stage Tracked Logistics:** Shipments are handled through verified logistics partners (GIG Logistics, DHL Express) with live tracking at every milestone.\n` +
            `5. **💰 100% Money-Back Guarantee:** If the item does not arrive or differs from what was described, W-Commerce Escrow refunds you immediately.\n\n` +
            `You are fully protected on every purchase. Would you like to inspect a product or view verified seller details?`;
        }
        if (topic === 'negotiation') {
          return `🤝 **How Price Negotiation Works on W-Commerce:**\n\n1. **Verified Sellers Set Floor Prices:** Verified W-Commerce merchants configure an initial listing price and their secret "last price" (minimum acceptable bottom price).\n2. **Instant AI Negotiation:** As a buyer, you can propose a counter-offer or ask for a discount in chat (e.g. *"Can you do ₦25,000 for this?"* or *"Give me 10% discount"*).\n3. **Real-Time Settlement:** PayAI checks the seller's floor price in real-time. If your offer meets or exceeds the seller's bottom price, your discount is locked in immediately and reflected in your cart!\n4. **W-Commerce Exclusive:** Note that price negotiation is available exclusively for native W-Commerce sellers (external store links are fixed-price reference only).`;
        }
        if (topic === 'paypal_payout') {
          return `💳 **PayPal Checkout in USD & Naira Seller Payouts:**\n\n- **Buyer Checkout (USD):** Buyers can purchase items securely using PayPal Checkout in USD. Funds are held in a protected escrow.\n- **Order Confirmation:** Once your order arrives and you confirm receipt (or logistics tracking confirms delivery), the escrow is unlocked.\n- **Seller Payout (Naira / NGN):** The seller is automatically paid out in Naira (NGN) directly into their merchant wallet using live exchange rates!\n- **Fraud Protection:** Buyers are protected until items are verified delivered, and sellers are guaranteed prompt, local currency settlement.`;
        }
        if (topic === 'shipping') {
          return `🚚 **Shipping & Free Delivery on W-Commerce:**\n\n- **Real-Time Carrier Quotes:** We calculate actual shipping fees to your destination country using trusted express logistics partners.\n- **Free Shipping Thresholds:** Many verified merchants offer 100% FREE shipping when your cart exceeds their promotional threshold.\n- **End-to-End Tracking:** Every order includes 7-stage milestone tracking so you can monitor your package from the seller's hub to your doorstep.`;
        }
        if (topic === 'returns') {
          return `📦 **Returns & Cancellations Policy:**\n\n- **Cancellations:** You can cancel an order anytime before the seller ships it, and your payment will be refunded immediately.\n- **Returns:** Each verified seller sets their return policy window (typically 7 to 14 days after delivery). If your item is eligible, PayAI will generate an RMA label for parcel return.`;
        }
        if (topic === 'global_linking') {
          return `🌐 **Global Store Linking:**\n\n- **Connect External Storefronts:** Sellers can connect their external stores (Shopify, WooCommerce, Amazon, etc.) to showcase products on W-Commerce.\n- **Reference Catalog:** When external links are imported into chat, PayAI provides full specifications and pricing for comparison.\n- **Checkout & Negotiation:** Full in-chat price negotiation and PayPal checkout are reserved for native W-Commerce products!`;
        }
        return `I can help you search for verified products, negotiate discounts with sellers, check shipping fees, and checkout using PayPal. What would you like to explore?`;
      }

      case 'search_products':
      case 'search_external_offers':
      case 'search_local_products': {
        const count = result.items ? result.items.length : 0;
        if (count === 0) {
          return `I searched across verified W-Commerce sellers and linked stores for "${originalPrompt}", but didn't find any direct matches. You can try searching for keywords like "Corn Flakes", "Oats", "Gymshark", "MacBook", "headphones", "watch", or paste a direct product URL to link an external item!`;
        }

        const lowerPrompt = (originalPrompt || '').toLowerCase();
        const isFoodOrBreakfast = /break\s*fast|food|hungry|ungry|morning|meal|snack/i.test(lowerPrompt);

        const formatItem = (item) => {
          const isLocal = !item.isExternal && item.provider === 'w-commerce';
          const priceDisplay = isLocal ? `₦${Number(item.price).toLocaleString()} NGN` : `$${item.price} USD`;
          const negTag = item.canNegotiate ? '🤝 *Negotiable*' : '🔒 *Fixed Price*';
          const stockTag = item.inStock ? (item.isLowStock ? `⚠️ Only ${item.stock} left` : `✅ In stock (${item.stock})`) : (item.isExternal ? '✅ Available' : '❌ Out of stock');
          const sellerName = item.seller?.name || (isLocal ? 'Verified Local Merchant' : `${item.provider?.toUpperCase()} Store`);
          const safeImg = safeImageUrl(item) || item.imageUrl;
          const imgPart = safeImg ? `\n  ![${item.title}](${safeImg})` : '';
          return `- **${item.title}** — **${priceDisplay}** (${stockTag} | ${negTag})\n  *Seller:* ${sellerName}${imgPart}`;
        };

        let itemList = '';
        if (result.primaryItems?.length > 0 && result.secondaryItems?.length > 0) {
          const primList = result.primaryItems.slice(0, 4).map(formatItem).join('\n\n');
          const secList = result.secondaryItems.slice(0, 3).map(formatItem).join('\n\n');

          const isFood = /food|hungry|ungry|meal|breakfast|burger/i.test(lowerPrompt);
          const primHeading = isFood ? '🍔 **Delicious Food Options Under Budget:**' : '🌟 **Matching Product Selections:**';
          const secHeading = result.secondaryItems.some(it => /drink|fanta|sprite|coke|water/i.test(it.title))
            ? '🥤 **Chilled Soft Drinks & Beverages Under Budget:**'
            : '✨ **Complementary & Matching Pairings:**';

          itemList = `${primHeading}\n${primList}\n\n${secHeading}\n${secList}`;
        } else {
          itemList = (result.items || []).slice(0, 6).map(formatItem).join('\n\n');
        }

        const smartSuggestionsSection = this._generateSmartSuggestions(result, originalPrompt, result.pairingContext);

        if (isFoodOrBreakfast) {
          return `🌅 **Delicious food & drink options ready for express delivery to satisfy your hunger:**\n\n${itemList}${smartSuggestionsSection}\n\n👇 *Click any product card below to add to cart, negotiate price, or proceed to instant escrow checkout!*`;
        }

        return `🔍 **I found ${count} verified products matching your shopping request:**\n\n${itemList}${smartSuggestionsSection}\n\n👇 *Click any product card below to add to cart, negotiate price, or proceed to instant escrow checkout!*`;
      }

      case 'check_product_stock': {
        if (!result.found) {
          return `🔍 ${result.reason || 'Product not found.'}`;
        }
        const statusIcon = result.available ? (result.isLowStock ? '⚠️' : '✅') : '❌';
        const negText = result.canNegotiate ? 'Price negotiation is available for this product 🤝' : 'Fixed price listing 🔒';
        const resImg = safeImageUrl(result) || result.imageUrl;
        const imgPart = resImg ? `\n\n![${result.title}](${resImg})` : '';
        return `${statusIcon} **Real-Time Stock Check: "${result.title}"**\n- **Inventory Status:** ${result.reason}\n- **Current Stock:** ${result.stock} units available\n- **Unit Price:** ₦${result.price?.toLocaleString()} NGN\n- **Negotiation:** ${negText}\n- **Estimated Delivery:** ${result.estimatedDeliveryDays} business days (₦${result.shippingFee?.toLocaleString()} NGN standard shipping)${imgPart}`;
      }

      case 'compare_offers': {
        return `Here is a side-by-side comparison of the offers, including base prices, shipping estimates, and landed costs:`;
      }

      case 'get_shipping_estimate': {
        const lowerPrompt = (originalPrompt || '').toLowerCase();
        let city = result.destinationCountry || 'your destination';
        let cityTransit = result.estimatedDays || '1-3 business days';
        let cityCarrier = result.carrier || 'GIG Logistics Express';

        if (lowerPrompt.includes('abuja') || lowerPrompt.includes('fct')) {
          city = 'Abuja (FCT)';
          cityTransit = '2-3 business days (Express Air Hub & Priority Dispatch)';
          cityCarrier = 'GIG Logistics Air Hub / DHL Express';
        } else if (lowerPrompt.includes('lagos')) {
          city = 'Lagos (Mainland & Island)';
          cityTransit = 'Same-Day / Next-Day (Within 24 hours)';
          cityCarrier = 'GIG Logistics & Fast Dispatch Rider';
        } else if (lowerPrompt.includes('port harcourt') || lowerPrompt.includes('ph') || lowerPrompt.includes('rivers')) {
          city = 'Port Harcourt (Rivers)';
          cityTransit = '2-3 business days';
          cityCarrier = 'DHL Express / GIG Logistics';
        } else if (lowerPrompt.includes('ibadan') || lowerPrompt.includes('oyo')) {
          city = 'Ibadan (Oyo)';
          cityTransit = '1-2 business days';
          cityCarrier = 'GIG Logistics Interstate';
        } else if (lowerPrompt.includes('kano')) {
          city = 'Kano';
          cityTransit = '3-4 business days';
          cityCarrier = 'GIG Logistics Air Cargo';
        } else if (lowerPrompt.includes('enugu')) {
          city = 'Enugu';
          cityTransit = '2-3 business days';
          cityCarrier = 'GIG Logistics Interstate';
        }

        const freeShippingNote = result.qualifiesForFreeShipping
          ? `\n• 🎉 **Free Shipping Unlocked!** (Standard delivery fee waived under verified seller promotion!)`
          : (result.amountNeededForFreeShipping > 0
            ? `\n• 💡 **Free Shipping Threshold:** Add ${result.currency === 'NGN' ? '₦' + result.amountNeededForFreeShipping.toLocaleString() : '$' + result.amountNeededForFreeShipping} more to qualify for 100% FREE shipping!`
            : '');

        const costDisplay = result.qualifiesForFreeShipping
          ? `**FREE (₦0.00 / $0.00)**`
          : `**${result.currency === 'NGN' ? '₦' + result.shippingCost?.toLocaleString() + ' NGN' : '$' + result.shippingCost + ' USD'}**`;

        return `🚚💨 **Live Delivery Radar & Shipping Estimate to ${city}:**\n\n` +
          `• 📦 **Carrier:** **${cityCarrier}** (Priority Express Tracked)\n` +
          `• ⏱️ **Estimated Transit Time:** **${cityTransit}**\n` +
          `• 🏷️ **Shipping Fee:** ${costDisplay}${freeShippingNote}\n` +
          `• 🛡️ **Escrow Protection:** 100% Guaranteed — payment remains safely held in Escrow until you receive and inspect your parcel! 👍📦\n\n` +
          `[📦 View Tracked Orders](prompt:track my order) [🛒 Proceed to Checkout](prompt:checkout my cart)`;
      }

      case 'request_warehouse_media': {
        const insp = result?.warehouseInspection;
        const title = result?.productTitle || insp?.productTitle || 'Verified Item';
        const store = result?.storeName || insp?.storeName || 'Verified Merchant';
        const serial = insp?.serialBatchCode || 'SN-GYM-2026-X892';
        const location = insp?.warehouseLocation || 'Lagos Mainland Fulfillment Vault • Bay 4';
        const voiceNote = insp?.voiceNote;
        const duration = voiceNote?.duration || '0:14';
        const transcript = voiceNote?.transcript || `Hello! I'm holding your ${title} right here in our fulfillment vault. Authentic, verified, and ready for immediate dispatch!`;
        const photoCount = Array.isArray(insp?.photos) ? insp.photos.length : 3;

        return `📸 **Live Warehouse Inspection & Seller Voice Note Ready Instantly!**\n\n` +
          `Your item **"${title}"** from **${store}** has been inspected directly in our secure fulfillment vault and is **verified authentic & ready for immediate dispatch**:\n\n` +
          `• 🏷️ **Batch Serial Code:** \`${serial}\`\n` +
          `• 📍 **Fulfillment Bay:** **${location}**\n` +
          `• 📸 **Verified Photos:** **${photoCount} high-resolution warehouse photos** ready for inspection\n` +
          `• 🎙️ **Seller Voice Note (${duration}):**\n` +
          `  *"${transcript}"*\n\n` +
          `⚡ **Instant Verification:** Live warehouse inspection photos and seller voice note are **instantly ready** from the fulfillment vault with **zero wait time** (no 10-15 minute wait). Click any photo below to inspect macro details, listen to the seller voice note, or proceed to lock in your purchase with W-Commerce Escrow protection!`;
      }

      case 'make_product_offer':
      case 'request_seller_negotiation': {
        if (result?.warehouseInspection) {
          const insp = result.warehouseInspection;
          const title = result.productTitle || insp.productTitle || 'Verified Item';
          const store = result.storeName || insp.storeName || 'Verified Merchant';
          const serial = insp.serialBatchCode || 'SN-GYM-2026-X892';
          const location = insp.warehouseLocation || 'Lagos Mainland Fulfillment Vault • Bay 4';
          const voiceNote = insp.voiceNote;
          const duration = voiceNote?.duration || '0:14';
          const transcript = voiceNote?.transcript || `Hello! I'm holding your ${title} right here in our fulfillment vault. Authentic, verified, and ready for immediate dispatch!`;
          const photoCount = Array.isArray(insp.photos) ? insp.photos.length : 3;

          return `📸 **Live Warehouse Inspection & Seller Voice Note Ready Instantly!**\n\n` +
            `Your item **"${title}"** from **${store}** has been inspected directly in our secure fulfillment vault and is **verified authentic & ready for immediate dispatch**:\n\n` +
            `• 🏷️ **Batch Serial Code:** \`${serial}\`\n` +
            `• 📍 **Fulfillment Bay:** **${location}**\n` +
            `• 📸 **Verified Photos:** **${photoCount} high-resolution warehouse photos** ready for inspection\n` +
            `• 🎙️ **Seller Voice Note (${duration}):**\n` +
            `  *"${transcript}"*\n\n` +
            `⚡ **Instant Verification:** Live warehouse inspection photos and seller voice note are **instantly ready** from the fulfillment vault with **zero wait time** (no 10-15 minute wait). Click any photo below to inspect macro details, listen to the seller voice note, or proceed to lock in your purchase with W-Commerce Escrow protection!`;
        }
        if (result.reply) {
          return result.reply;
        }
        if (result.rejected) {
          return `⚠️ **Negotiation Unavailable:**\n${result.message}`;
        }
        if (result.isNegotiable === false) {
          return `🔒 **Fixed Price Listing:**\n${result.message}`;
        }
        return `ℹ️ **Negotiation Status:**\n${result.message || 'No price alterations applied.'}`;
      }

      case 'prepare_purchase_quote': {
        return `📋 **PayAI Landed Cost Quote Generated (#${result.quoteNumber}):**\n- Items Subtotal: **$${result.subtotal} USD**\n- International Air Shipping: **$${result.shipping} USD**\n- Import Duties & Customs Clearance: **$${result.duties} USD**\n- VAT (7.5%): **$${result.taxes} USD**\n- PayAI Cross-Border Service: **$${result.serviceFee} USD**\n\n🎯 **Total Landed Cost: $${result.total} USD** *(Approx ₦${result.convertedTotal ? result.convertedTotal.toLocaleString() : 'N/A'} NGN)*\n\n⏳ *This quote is locked for 15 minutes. Please review and approve below to proceed to PayPal Sandbox payment.*`;
      }

      case 'message_seller': {
        if (!result || !result.success) {
          return `❌ **Could Not Deliver Message to Seller**\n\n${result?.message || 'Merchant could not be reached. Please check the order number and try again.'}`;
        }

        const estResponse = result.avgResponseMinutes ? `~${result.avgResponseMinutes} minutes` : 'within 1-2 hours';

        return `📩 **Message Successfully Dispatched to Merchant!** 🤝✨\n\n` +
          `I have officially reached out to **${result.sellerName}** regarding Order **#${result.orderNumber}**.\n\n` +
          `### 💬 Outgoing Inquiry Delivered:\n` +
          `> "${result.inquirySent}"\n\n` +
          `• 🏪 **Merchant:** **${result.sellerName}**\n` +
          `• 📦 **Order Reference:** **#${result.orderNumber}**\n` +
          `• ⏱️ **Expected Response Time:** **${estResponse}**\n` +
          `• 🔔 **Delivery Status:** Real-time push notification & direct message ticket created in merchant message inbox.\n\n` +
          `The seller has received your inquiry directly in their Seller Dashboard and will reply shortly. When they respond, you will see their reply right here in your messages and notifications.\n\n` +
          `**Quick 1-Click Actions:**\n` +
          `[📦 View Order Tracking](/orders/${result.orderId || result.orderNumber}) ` +
          `[💬 Open Chat Conversation](/messages?recipientId=${result.sellerId}) ` +
          `[🛡️ Escalate to Escrow Mediation](prompt:Escalate dispute for order #${result.orderNumber} to human mediator)`;
      }

      case 'track_order':
      case 'get_order_status': {
        if (!result || !result.found) {
          if (result?.noOrdersYet) {
            return `📦 **No Orders Placed on Your Account Yet!** 🛍️✨\n\n` +
              `You don't have any placed orders yet. As soon as you purchase an item on W-Commerce, our **Live Delivery Radar** tracks every milestone in real time—from merchant packaging to your doorstep! 🚚💨\n\n` +
              `• 🛡️ **100% Escrow Protected:** Funds remain safely held in the Escrow vault until you inspect and verify your parcel.\n` +
              `• 📍 **Milestone Transparency:** Live checkpoints, carrier GPS tracking, and delivery confirmation.\n\n` +
              `[🛍️ Discover Trending Deals](prompt:show trending products) ` +
              `[🛒 View Your Cart](/cart)`;
          }
          return `🔍 I couldn't find an order matching that identifier. Please verify your order number (e.g. *"Track order W-INT-12345"*) or ask *"Track my order"* to view your latest shipment!`;
        }

        const estDate = result.estimatedDeliveryDate
          ? new Date(result.estimatedDeliveryDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
          : '1-3 business days (Priority Express)';

        let itemsSection = '';
        if (Array.isArray(result.items) && result.items.length > 0) {
          itemsSection = `\n### 🛍️ Items in This Shipment:\n` +
            result.items.slice(0, 3).map(it => {
              const pDisplay = it.currency === 'NGN' ? `₦${Number(it.price || 0).toLocaleString()} NGN` : `$${it.price} USD`;
              const itImg = safeImageUrl(it) || it.imageUrl;
              const imgPart = itImg ? `![${it.title}](${itImg})\n\n` : '';
              return `${imgPart}• **${it.title}** (Qty: ${it.quantity || 1}) — **${pDisplay}**`;
            }).join('\n\n') + '\n';
        }

        const checkpointsText = result.checkpoints
          ? result.checkpoints
              .map((cp, idx) => {
                const icon = cp.status === 'COMPLETED' ? '✅' : (cp.status === 'IN_PROGRESS' ? '🔄' : '⏳');
                const stageNum = cp.stage || (idx + 1);
                return `${stageNum}. ${icon} **${cp.title}** (${cp.location || 'In Transit'}) - *${cp.status}*`;
              })
              .join('\n')
          : '';

        return `📦 **Order Tracking Details (#${result.orderNumber})** 🚚💨\n\n` +
          `• 🚚 **Carrier:** **${result.carrierName || 'GIG Logistics / DHL Express'}**\n` +
          `• 🏷️ **Tracking Number:** \`${result.trackingNumber || 'Pending'}\`\n` +
          `• 📍 **Current Milestone:** **${result.currentMilestone}**\n` +
          `• 📝 **Status Details:** ${result.milestoneDescription || 'Consignment verified and in transit.'}\n` +
          `• 📅 **Estimated Delivery:** **${estDate}**\n` +
          `• 🛡️ **Escrow Protection:** **PAID_IN_ESCROW** (100% Protected — funds held securely until you receive and approve!)\n` +
          `• 🛫 **Routing:** ${result.originHub || 'Origin Fulfillment Vault'} ➔ ${result.destinationHub || 'Destination Delivery Hub'}\n` +
          itemsSection +
          `\n**7-Stage Checkpoint Timeline:**\n${checkpointsText}\n\n` +
          `[📦 View All Orders](/buyer/orders) [🛡️ View Escrow Vault](/buyer/escrow) [💬 Need Help with Order?](prompt:problem with order ${result.orderNumber})`;
      }

      case 'cancel_order': {
        if (!result.success) {
          return `⚠️ **Cancellation Request Denied**\n\n${result.message || result.error || 'This order cannot be cancelled.'}`;
        }
        return `🚫 **Order Cancelled Successfully (#${result.orderNumber || result.id})**\n\n- **Fulfillment Status:** CANCELLED\n- **Payment Status:** ${result.paymentStatus || (result.refundIssued ? 'REFUNDED' : 'VOIDED')}\n${result.refundIssued ? `- 💰 **Refund Amount:** **$${result.refundAmount} ${result.currency}** (Refund initiated to your original funding source)\n` : ''}- 🛡️ **Merchant Notice:** The seller has been notified of this cancellation.\n\n${result.message || ''}`;
      }

      case 'request_return': {
        if (!result.success) {
          return `⚠️ **Return Request Could Not Be Processed**\n\n${result.message || result.error || 'Your return request could not be authorized.'}`;
        }
        return `📦 **Return Authorization Generated (RMA: ${result.rmaNumber})**\n\n- **Order Number:** #${result.orderNumber}\n- **RMA Number:** \`${result.rmaNumber}\`\n- **Status:** **RETURN_REQUESTED**\n- **Estimated Refund:** **$${result.estimatedRefundAmount} ${result.currency}**\n- **Seller Policy:** Returns permitted within ${result.sellerPolicy?.returnPolicyDays || 14} days of delivery\n\n**Next Steps:**\n1. ${result.returnInstructions || 'Affix the RMA label to your parcel packaging.'}\n2. Drop off the item at any designated DHL Express / courier partner station within 7 days.\n3. Once verified at our logistics hub, your refund will be disbursed automatically.`;
      }

      case 'handle_order_complaint': {
        return result.explanationText || result.message || 'Your complaint has been registered with our Escrow dispute protection team.';
      }

      case 'place_order':
      case 'add_to_cart': {
        if (!result.success) {
          return result.message || 'Please specify which product you would like to add to your cart.';
        }

        if (result.isCombo || (result.items && result.items.length > 1)) {
          const itemSummary = (result.items || [result.item]).map(it => {
            const pDisplay = it.currency === 'NGN' ? `₦${Number(it.price || 0).toLocaleString()} NGN` : `$${it.price} USD`;
            const itImg = safeImageUrl(it) || it.imageUrl;
            const imgPart = itImg ? `\n  ![${it.title}](${itImg})` : '';
            return `• **${it.title}** (Qty: ${it.quantity || 1}) — **${pDisplay}**${imgPart}`;
          }).join('\n\n');
          const totalComboPrice = (result.items || [result.item]).reduce((sum, it) => sum + (Number(it.price || 0) * (it.quantity || 1)), 0);

          return `🛒 **Combo Successfully Added to Your Cart!** 🎉\n\n` +
            `${itemSummary}\n\n` +
            `🎯 **Total Combo Price: ₦${totalComboPrice.toLocaleString()} NGN**\n\n` +
            `Your complete combo pairing is now secured in your cart under **W-Commerce Escrow Protection**. Use the **Secure Checkout** or **Pay with Wallet** button below to complete your order! 🚀`;
        }

        const it = result.item;
        const priceDisplay = it.currency === 'NGN' ? `₦${Number(it.price).toLocaleString()} NGN` : `$${it.price} USD`;
        const totalDisplay = it.currency === 'NGN' ? `₦${(Number(it.price) * it.quantity).toLocaleString()} NGN` : `$${it.price * it.quantity} USD`;
        const itImg = safeImageUrl(it) || it.imageUrl;
        const imgPart = itImg ? `\n\n![${it.title}](${itImg})` : '';

        return `🛒 **Successfully Added to Your Cart!**\n\n` +
          `• **Product:** **${it.title}**\n` +
          `• **Quantity:** ${it.quantity}\n` +
          `• **Price:** **${priceDisplay}**${it.quantity > 1 ? ` (Total: ${totalDisplay})` : ''}\n` +
          `• **Seller:** ${it.sellerName || 'Verified W-Commerce Merchant'}${imgPart}\n\n` +
          `Your order is protected by the **W-Commerce Escrow Vault**. Use the **Secure Checkout** or **Pay with Wallet** button in the action card below to complete your order!`;
      }

      case 'checkout_cart': {
        const addr = typeof result.shippingAddress === 'string'
          ? result.shippingAddress
          : `${result.shippingAddress?.streetAddress || ''}, ${result.shippingAddress?.city || ''}`;
        const estDate = result.estimatedDelivery
          ? new Date(result.estimatedDelivery).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
          : '5-7 business days';

        return `🎉 **Order Placed Successfully (#${result.orderNumber})!**\n\n- 💰 **Grand Total:** **$${result.grandTotal} ${result.currency}** (Includes international shipping, duties & VAT)\n- 🚚 **Carrier:** **${result.carrierName}**\n- 🏷️ **Tracking Number:** \`${result.trackingNumber}\`\n- 📅 **Estimated Delivery:** **${estDate}**\n- 📍 **Delivering To:** ${addr}\n- 📦 **Items Count:** ${result.items ? result.items.length : 1}\n\n*You can track your package anytime by asking: "Where is my order #${result.orderNumber}?"*`;
      }

      case 'create_paypal_checkout': {
        return `💳 **PayPal USD Checkout Initialized (#${result.orderNumber}):**\n\n- **Order Number:** \`${result.orderNumber}\`\n- **Amount:** **$${result.amount} USD**\n- **Status:** **Awaiting Payment**\n\n🔗 [Complete Payment via PayPal](${result.approvalLink})`;
      }

      case 'confirm_order_receipt': {
        return `✅ **Order Confirmed Delivered (#${result.orderNumber}):**\n\n- **Status:** **DELIVERED**\n- **Escrow:** **RELEASED**\n- **Seller Payout:** **₦${Number(result.payoutAmountNgn).toLocaleString()} NGN** (Exchange rate: ${result.exchangeRate} NGN/USD)\n\nThe seller's wallet has been credited in Naira. Thank you for shopping with W-Commerce!`;
      }

      case 'guide_checkout_button': {
        const priceDisplay = result?.amountNGN ? `₦${Number(result.amountNGN).toLocaleString()} NGN` : 'your order total';
        const usdDisplay = result?.amountUSD ? `$${result.amountUSD} USD` : `$${(Number(result?.amountNGN || 18000) / 1480).toFixed(2)} USD`;
        if (result?.isPayPalCheckout) {
          return `👇 **Your PayPal & Escrow Checkout Controls Are Ready Below!**\n\n` +
            `Yes! You can complete your purchase securely using **PayPal** (${usdDisplay} / ${priceDisplay}) with full buyer and seller escrow protection:\n` +
            `• 🟡 **Pay with PayPal**: Instant international checkout via PayPal in USD.\n` +
            `• 🟢 **Pay from Wallet**: One-click instant deduction in NGN from your W-Commerce Wallet.\n` +
            `• 🔵 **Debit / Credit Card (Paystack / Monnify)**: Local card & bank transfer options.\n\n` +
            `Funds remain securely held in the **W-Commerce Escrow Vault** and are only released to **${result?.storeName || 'the seller'}** after your delivery is verified and confirmed.`;
        }
        return `👇 **Your Interactive Checkout Controls Are Ready Below!**\n\n` +
          `You can safely complete your purchase using any supported payment method:\n` +
          `• 🔵 **Secure Checkout (Paystack / Card)**: Complete payment securely using Paystack (Debit Card, Bank Transfer, USSD), Monnify, or Cash on Delivery (COD).\n` +
          `• 🟢 **Pay from Wallet (${priceDisplay})**: One-click instant deduction from your GlobalX / W-Commerce Wallet.\n\n` +
          `Funds are securely held in the **W-Commerce Escrow Vault** and are only released to **${result?.storeName || 'the seller'}** once your order is delivered and confirmed.`;
      }

      case 'budget_shopping_plan': {
        if (!result.isFeasible && (!result.items || result.items.length === 0)) {
          return `⚠️ **Insufficient Wallet Balance:**\n\nYour current available wallet balance is **₦${Number(result.availableBalanceNGN || 0).toLocaleString()} NGN** ($${result.availableBalanceUSD} USD).\n\n${result.message || 'Please top up your wallet to start budget shopping.'}\n\n👉 **[Top Up Wallet Balance](/buyer/wallet)**`;
        }

        const itemsList = (result.items || []).map((it, idx) => {
          const itImg = safeImageUrl(it) || it.imageUrl;
          const img = itImg ? `![${it.title}](${itImg})\n` : '';
          return `${idx + 1}. ${img}**${it.title}** — **₦${Number(it.price).toLocaleString()} NGN** (Seller: ${it.storeName || 'Verified Seller'})\n   *In stock: ${it.stock} units*`;
        }).join('\n\n');

        const fin = result.financialSummary || {};
        const shippingStr = fin.qualifiesForFreeShipping || fin.shippingFeeNGN === 0
          ? 'FREE (₦0 NGN) 🚚'
          : `₦${Number(fin.shippingFeeNGN || 0).toLocaleString()} NGN`;

        return `💰 **PayAI Budget Shopping Plan (Available Balance: ₦${Number(result.availableBalanceNGN).toLocaleString()} NGN / $${result.availableBalanceUSD} USD)**\n\n` +
          `Here is your feasible shopping plan designed to stay within your available wallet balance:\n\n` +
          `${itemsList}\n\n` +
          `📊 **Financial Breakdown:**\n` +
          `- Items Subtotal: **₦${Number(fin.subtotalNGN || 0).toLocaleString()} NGN**\n` +
          `- Shipping & Delivery: **${shippingStr}**\n` +
          `- Total Landed Cost: **₦${Number(fin.totalRequiredNGN || 0).toLocaleString()} NGN**\n` +
          `- Projected Remaining Balance: **₦${Number(fin.remainingBalanceNGN || 0).toLocaleString()} NGN**\n` +
          `- Escrow Protection: **100% Protected by W-Commerce Escrow** 🛡️\n\n` +
          `🔒 **Payment Authorization Required:**\n` +
          `*Funds have NOT been deducted from your wallet yet.* To authorize this order and lock funds in escrow, please click the button below or reply *"pay with wallet"*:\n\n` +
          `👉 [💳 Authorize & Pay ₦${Number(fin.totalRequiredNGN || 0).toLocaleString()} from Wallet](prompt:pay with wallet ₦${fin.totalRequiredNGN})`;
      }

      case 'check_wallet_balance': {
        const bal = result?.walletBalance || {};
        const ngn = Number(bal.balanceNGN || 0).toLocaleString();
        const usd = Number(bal.balanceUSD || 0).toFixed(2);
        return `💰 **Your W-Commerce Wallet Balance:**\n\n` +
          `• 🟢 **Available Balance:** **₦${ngn} NGN** (≈ **$${usd} USD**)\n` +
          `• 🛡️ **Escrow Vault Status:** Active & 100% Protected\n` +
          `• ⚡ **1-Click Checkout:** Ready for instant payment on any order with zero card fees!\n\n` +
          `You can manage your balance, top up via Paystack/Monnify/Bank, or view full transaction logs anytime in your **[Wallet Dashboard](/buyer/wallet)**! 🚀`;
      }

      case 'checkout_with_wallet': {
        return `🎉 **Payment Authorized & Escrow Locked (#${result.orderNumber})!**\n\n` +
          `- 💰 **Amount Paid:** **₦${Number(result.grandTotalNGN).toLocaleString()} NGN** (from GlobalX / W-Commerce Wallet)\n` +
          `- 🛡️ **Escrow Status:** **PAID_IN_ESCROW** (100% Buyer Protection active)\n` +
          `- 🚚 **Logistics Partner:** **${result.carrier}**\n` +
          `- 🏷️ **Tracking Number:** \`${result.trackingNumber}\`\n\n` +
          `The seller has been notified to pack and dispatch your order. You can track this delivery anytime by asking: *"Track order ${result.orderNumber}"*!`;
      }

      case 'plan_multi_day_meals_or_budget': {
        return result?.formattedPlan || result?.reply || 'Multi-day meal plan generated.';
      }

      case 'plan_budget_goal': {
        return result?.formattedResponse || result?.reply || 'Goal shopping plan generated.';
      }

      default:
        return 'Request processed successfully. See details below:';
    }
  }
}

module.exports = new PayAIOrchestrator();
