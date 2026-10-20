'use strict';

const FALLBACK_SMARTWATCH_ID = 'photo-1523275335684-37898b6baf30';

function isVideoUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return /\.(mp4|mov|webm|ogg|m4v)(\?|$)/i.test(url) || url.includes('/video/upload/');
}

function convertVideoToImageUrl(url) {
  if (!url || !isVideoUrl(url)) return url;
  if (url.includes('res.cloudinary.com') && url.includes('/video/upload/')) {
    return url
      .replace('/video/upload/', '/video/upload/so_0/')
      .replace(/\.(mp4|mov|webm|ogg|m4v)(\?.*)?$/i, '.jpg');
  }
  return null; // caller should use category fallback
}

function getCategoryFallbackImage(title = '', category = '', storeName = '') {
  const combined = `${title || ''} ${category || ''} ${storeName || ''}`.toLowerCase();

  // 1. Dairy, Milk, Eggs, Cheese
  if (/egg|eggs/i.test(combined)) {
    return 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=800&q=80';
  }
  if (/milk|dairy|cheese|yogurt|yoghurt|butter|cream|cheddar|mozzarella|condensed/i.test(combined)) {
    return 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80';
  }

  // 2. Fresh Produce, Fruits, Vegetables, Tomatoes, Onions
  if (/tomato|tomatoes/i.test(combined)) {
    return 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=80';
  }
  if (/onion|onions|garlic|shallot/i.test(combined)) {
    return 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=800&q=80';
  }
  if (/banana|bananas/i.test(combined)) {
    return 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=800&q=80';
  }
  if (/fruit|apple|citrus|grape|berry|mango|avocado|vegetable|salad|carrot|potato|pepper/i.test(combined)) {
    return 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80';
  }

  // 3. Meat, Poultry, Fish, Seafood
  if (/chicken|poultry|turkey/i.test(combined)) {
    return 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=800&q=80';
  }
  if (/beef|meat|steak|pork|lamb|sausage|bacon/i.test(combined)) {
    return 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&w=800&q=80';
  }
  if (/fish|salmon|tuna|seafood|prawn|shrimp/i.test(combined)) {
    return 'https://images.unsplash.com/photo-1534482421-64566f976cfa?auto=format&fit=crop&w=800&q=80';
  }

  // 4. Bakery, Bread, Biscuits, Snacks, Cereals
  if (/bread|toast|baguette|croissant|flour/i.test(combined)) {
    return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80';
  }
  if (/biscuit|cookie|cracker|wafer/i.test(combined)) {
    return 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=800&q=80';
  }
  if (/cereal|corn flakes|flakes/i.test(combined)) {
    return 'https://images.unsplash.com/photo-1521483451569-e33803c0330c?auto=format&fit=crop&w=800&q=80';
  }
  if (/oats|oatmeal|porridge/i.test(combined)) {
    return 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=800&q=80';
  }
  if (/crisp|chip|chips|snack|popcorn|pretzel/i.test(combined)) {
    return 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=800&q=80';
  }
  if (/noodle|noodles|pasta|spaghetti|macaroni/i.test(combined)) {
    return 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80';
  }
  if (/rice|grain|grains|lentil|beans/i.test(combined)) {
    return 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80';
  }

  // 5. Kitchen, Food Storage, Foil, Wraps, Cleaning
  if (/foil|aluminium|wrap|cling|ziploc|storage/i.test(combined)) {
    return 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=800&q=80';
  }
  if (/tissue|toilet|paper|napkin|towel|kitchen roll/i.test(combined)) {
    return 'https://images.unsplash.com/photo-1584556812952-905ffd0c611a?auto=format&fit=crop&w=800&q=80';
  }
  if (/detergent|laundry|wash powder|fabric softener/i.test(combined)) {
    return 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?auto=format&fit=crop&w=800&q=80';
  }
  if (/cleaner|surface|bleach|disinfectant|sponge|dishwash/i.test(combined)) {
    return 'https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=800&q=80';
  }

  // 6. Health, First Aid, Medical, Pharma
  if (/plaster|bandage|first aid|antiseptic|ointment|gauze|wound/i.test(combined)) {
    return 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=800&q=80';
  }
  if (/vitamin|supplement|tablet|capsule|pill|multivitamin|omega|calcium|zinc/i.test(combined)) {
    return 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80';
  }
  if (/toothpaste|tooth|oral|toothbrush|mouthwash/i.test(combined)) {
    return 'https://images.unsplash.com/photo-1559599101-f09722fb4948?auto=format&fit=crop&w=800&q=80';
  }

  // 7. Personal Care, Bath, Body, Baby
  if (/body wash|shower gel|soap|lotion|bath/i.test(combined)) {
    return 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80';
  }
  if (/diaper|diapers|nappy|nappies/i.test(combined)) {
    return 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=800&q=80';
  }
  if (/wipe|wipes|baby wipe/i.test(combined)) {
    return 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80';
  }

  // 8. Beverages, Coffee, Tea, Drinks, Water, Soda
  if (/water|pure water|mineral water/i.test(combined)) {
    return 'https://images.unsplash.com/photo-1559839914-17aae19cec71?auto=format&fit=crop&w=800&q=80';
  }
  if (/coca-cola|coke|fanta|sprite|pepsi|soda|soft drink/i.test(combined)) {
    return 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80';
  }
  if (/coffee|espresso|latte|cappuccino|tea|beverage|juice/i.test(combined)) {
    return 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=800&q=80';
  }

  // 9. Prepared meals, Fast Food, Restaurant
  if (/meal|crunch meal|box meal|crunch box|feast box|burger|pizza|bbq|inferno|sauce/i.test(combined)) {
    return 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=800&q=80';
  }

  // 10. Electronics, Audio, Headphones
  if (/headphone|earphone|airpod|earbuds|audio|speaker/i.test(combined)) {
    return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80';
  }
  if (/charger|cable|power bank|adapter|electronics|gadget/i.test(combined)) {
    return 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80';
  }

  // 11. Apparel, Fashion, Footwear, Gymshark
  if (/gymshark|sportswear|activewear|fitness|workout|legging/i.test(combined)) {
    return 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80';
  }
  if (/shirt|tee|hoodie|pants|trousers|dress|skirt|jacket|coat|bra|short|men wear|mens wear|clothing|apparel/i.test(combined)) {
    return 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80';
  }
  if (/shoe|sneaker|boot|sandal|footwear/i.test(combined)) {
    return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80';
  }

  // 12. Watches / Timepieces
  if (/watch|smartwatch|clock/i.test(combined)) {
    return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80';
  }

  // General high-quality store package default
  return 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80';
}

function resolveBackendProductImage(product, rawUrl = '') {
  let url = rawUrl;
  let title = '';
  let category = '';

  if (product && typeof product === 'object') {
    title = product.title || '';
    category = product.category || '';
    if (!url) {
      if (Array.isArray(product.images) && product.images.length > 0) {
        url = product.images[0]?.url || product.images[0]?.src || (typeof product.images[0] === 'string' ? product.images[0] : '');
      } else if (typeof product.imageUrl === 'string') {
        url = product.imageUrl;
      }
    }
  }

  const isSmartwatch = typeof url === 'string' && url.includes(FALLBACK_SMARTWATCH_ID);
  const isActualWatch = (title + ' ' + category).toLowerCase().includes('watch');
  const isPlaceholder = typeof url === 'string' && (url.includes('placeholder') || url.includes('via.placeholder') || !url.trim());

  if (url && typeof url === 'string' && url.trim() && (!isSmartwatch || isActualWatch) && !isPlaceholder) {
    // Convert video URLs to image thumbnails
    if (isVideoUrl(url)) {
      const thumbnailUrl = convertVideoToImageUrl(url);
      if (thumbnailUrl) return thumbnailUrl;
      // Fall through to category fallback
    } else {
      return url.trim();
    }
  }

  return getCategoryFallbackImage(title, category);
}

module.exports = {
  getCategoryFallbackImage,
  resolveBackendProductImage,
  convertVideoToImageUrl,
  isVideoUrl,
  FALLBACK_SMARTWATCH_ID
};
