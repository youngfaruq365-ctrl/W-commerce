const PROMO_TYPES = {
    FLASH_DEAL: 'FLASH_DEAL',
    DEAL_OF_MONTH: 'DEAL_OF_MONTH',
    FESTIVAL_PROMO: 'FESTIVAL_PROMO',
    WEEKEND_PROMO: 'WEEKEND_PROMO',
    PLATFORM_CAMPAIGN: 'PLATFORM_CAMPAIGN'
};

const PACKING_ISSUE_TYPES = [
    'MISSING_ITEM',
    'WRONG_ITEM',
    'DAMAGED_PRODUCT',
    'LATE_DELIVERY'
];

const PACKING_RESPONSE_TEMPLATES = {
    SHIPPING_TOMORROW: {
        type: 'shipping_tomorrow',
        title: 'Will ship tomorrow',
        message: 'We have completed a final review and the package will be shipped tomorrow.'
    },
    REFUND_ISSUED: {
        type: 'refund_issued',
        title: 'Refund issued',
        message: 'A refund has been issued and the reversal should reflect shortly based on your payment method.'
    },
    REPLACEMENT_SENT: {
        type: 'replacement_sent',
        title: 'Replacement sent',
        message: 'A replacement has been prepared and dispatch is now underway.'
    },
    PRODUCT_UNAVAILABLE: {
        type: 'product_unavailable',
        title: 'Product unavailable',
        message: 'The requested product is no longer available and we are preparing the next best resolution.'
    }
};

const LOCAL_SEASONAL_CAMPAIGNS = [
    { title: 'Eid Market Rush', promoType: PROMO_TYPES.FESTIVAL_PROMO, seasonTag: 'EID', targetRegion: 'NG', autoSuggested: true },
    { title: 'Sallah Savings Wave', promoType: PROMO_TYPES.FESTIVAL_PROMO, seasonTag: 'SALLAH', targetRegion: 'NG', autoSuggested: true },
    { title: 'Christmas Countdown', promoType: PROMO_TYPES.FESTIVAL_PROMO, seasonTag: 'CHRISTMAS', targetRegion: 'GLOBAL', autoSuggested: true },
    { title: 'Back To School Essentials', promoType: PROMO_TYPES.DEAL_OF_MONTH, seasonTag: 'BACK_TO_SCHOOL', targetRegion: 'NG', autoSuggested: true },
    { title: 'Weekend Mega Sale', promoType: PROMO_TYPES.WEEKEND_PROMO, seasonTag: 'WEEKEND', targetRegion: 'NG', autoSuggested: true },
    { title: 'Black Friday Platform Push', promoType: PROMO_TYPES.PLATFORM_CAMPAIGN, seasonTag: 'BLACK_FRIDAY', targetRegion: 'GLOBAL', autoSuggested: true },
    { title: 'Monthly Super Sale', promoType: PROMO_TYPES.PLATFORM_CAMPAIGN, seasonTag: 'MONTHLY', targetRegion: 'GLOBAL', autoSuggested: true },
    { title: 'Ibadan Weekend Promo', promoType: PROMO_TYPES.WEEKEND_PROMO, seasonTag: 'IBADAN', targetRegion: 'NG', autoSuggested: true }
];

const BUYER_INTELLIGENCE_LABELS = {
    REPEAT_BUYER: 'repeat buyer',
    LOYAL_BUYER: 'loyal buyer',
    BULK_BUYER: 'bulk buyer',
    HIGH_VALUE_BUYER: 'high-value buyer'
};

function normalizeText(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function parseJsonList(value) {
    if (!value) return [];

    if (Array.isArray(value)) {
        return value.map((item) => String(item).trim()).filter(Boolean);
    }

    try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
            return parsed.map((item) => String(item).trim()).filter(Boolean);
        }
    } catch (error) {
        // Fall through to comma-separated parsing.
    }

    return String(value)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

function serializeJsonList(values) {
    return JSON.stringify(parseJsonList(values));
}

function priceToNumber(value) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
}

function calculateBestValueScore({ price, rating, deliveryDays }) {
    const safePrice = Math.max(priceToNumber(price), 1);
    const safeRating = Math.max(priceToNumber(rating), 0);
    const safeDeliveryDays = Math.max(priceToNumber(deliveryDays), 1);

    return Number((((safeRating * 28) + (100 / safeDeliveryDays)) / safePrice).toFixed(4));
}

function buildDealCountdownText(endDate) {
    const endsAt = new Date(endDate);
    const msRemaining = endsAt.getTime() - Date.now();
    if (msRemaining <= 0) {
        return 'Expired';
    }

    const hours = Math.floor(msRemaining / (1000 * 60 * 60));
    const minutes = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));
    return `Ends in ${hours}h ${minutes}m`;
}

function getUrgencyBadge(stock) {
    const safeStock = Number(stock || 0);
    if (safeStock <= 0) return null;
    if (safeStock <= 3) return `Only ${safeStock} left`;
    if (safeStock <= 8) return `Hot demand: ${safeStock} left`;
    return null;
}

function computeBuyerIntelligence({ totalOrders, totalSpend, averageOrderValue, bulkUnits }) {
    const safeOrders = Number(totalOrders || 0);
    const safeSpend = priceToNumber(totalSpend);
    const safeAov = priceToNumber(averageOrderValue);
    const safeBulkUnits = Number(bulkUnits || 0);

    const labels = [];
    let score = 0;

    if (safeOrders >= 2) {
        labels.push(BUYER_INTELLIGENCE_LABELS.REPEAT_BUYER);
        score += 25;
    }

    if (safeOrders >= 5 || safeSpend >= 1000) {
        labels.push(BUYER_INTELLIGENCE_LABELS.LOYAL_BUYER);
        score += 30;
    }

    if (safeBulkUnits >= 10 || safeAov >= 250) {
        labels.push(BUYER_INTELLIGENCE_LABELS.BULK_BUYER);
        score += 20;
    }

    if (safeSpend >= 1500 || safeAov >= 400) {
        labels.push(BUYER_INTELLIGENCE_LABELS.HIGH_VALUE_BUYER);
        score += 35;
    }

    return {
        labels,
        score: Math.min(score, 100)
    };
}

module.exports = {
    BUYER_INTELLIGENCE_LABELS,
    LOCAL_SEASONAL_CAMPAIGNS,
    PACKING_ISSUE_TYPES,
    PACKING_RESPONSE_TEMPLATES,
    PROMO_TYPES,
    buildDealCountdownText,
    calculateBestValueScore,
    computeBuyerIntelligence,
    getUrgencyBadge,
    normalizeText,
    parseJsonList,
    priceToNumber,
    serializeJsonList
};
