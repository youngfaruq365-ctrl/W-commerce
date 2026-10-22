export const isVideoUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  if (/\.(jpg|jpeg|png|webp|gif|svg|avif)(\?.*)?$/i.test(url)) return false;
  return /\.(mp4|mov|webm|ogg|m4v)(\?|$)/i.test(url) || (url.includes('/video/upload/') && !url.includes('/video/upload/so_')) || url.startsWith('data:video/');
};

export const convertVideoToImageUrl = (url) => {
  if (!url) return url;
  if (/\.(jpg|jpeg|png|webp|gif|svg|avif)(\?.*)?$/i.test(url)) return url;
  if (!isVideoUrl(url)) return url;
  // Cloudinary video → frame thumbnail at 0s
  if (url.includes('res.cloudinary.com') && url.includes('/video/upload/')) {
    let clean = url;
    if (!clean.includes('/video/upload/so_0/')) {
      clean = clean.replace('/video/upload/', '/video/upload/so_0/');
    }
    return clean.replace(/\.(mp4|mov|webm|ogg|m4v)(\?.*)?$/i, '.jpg');
  }
  // Non-Cloudinary video: return null so caller uses category fallback
  return null;
};

export const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('data:image')) return url;
  if (url.startsWith('data:video')) return url;
  if (url.startsWith('blob:')) return url;
  
  const apiUrl = import.meta.env.VITE_API_URL || '';
  const baseUrl = apiUrl.replace(/\/api\/?$/, '');
  
  return `${baseUrl || window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
};

export function decodeHtml(html) {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#8358;/gi, '₦')
    .replace(/&pound;/gi, '£')
    .replace(/&euro;/gi, '€');
}

export const FALLBACK_SMARTWATCH_ID = 'photo-1523275335684-37898b6baf30';

export const CATEGORY_IMAGE_PRESETS = [
  { id: 'biscuits', label: 'Biscuits & Cookies', keywords: ['biscuit', 'biscuits', 'cookie', 'cookies', 'cracker', 'wafer', 'shortbread'], url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=800&q=80' },
  { id: 'crisps', label: 'Crisps & Chips', keywords: ['crisp', 'crisps', 'chips', 'potato crisps', 'pretzel', 'popcorn'], url: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=800&q=80' },
  { id: 'noodles', label: 'Noodles & Pasta', keywords: ['noodle', 'noodles', 'pasta', 'spaghetti', 'macaroni', 'indomie', 'ramen'], url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80' },
  { id: 'cereal', label: 'Cereals & Corn Flakes', keywords: ['cornflake', 'corn flake', 'cornflakes', 'cereal', 'cereals', 'flakes', 'kellogg'], url: 'https://images.unsplash.com/photo-1521483451569-e33803c0330c?auto=format&fit=crop&w=800&q=80' },
  { id: 'oats', label: 'Instant Oats & Oatmeal', keywords: ['oat', 'oats', 'oatmeal', 'quaker', 'porridge'], url: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=800&q=80' },
  { id: 'meals', label: 'Cooked Meals & Fast Food', keywords: ['meal', 'crunch meal', 'box meal', 'crunch box', 'feast box', 'bbq', 'inferno', 'sauce', 'burger', 'pizza', 'fried chicken', 'fried rice', 'jollof', 'fried rice and chicken', 'rice and chicken', 'chicken and rice'], url: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=800&q=80' },
  { id: 'water', label: 'Bottled Water', keywords: ['water', 'bottled water', 'pure water', 'eva', 'mineral water'], url: 'https://images.unsplash.com/photo-1559839914-17aae19cec71?auto=format&fit=crop&w=800&q=80' },
  { id: 'soda', label: 'Sodas & Cold Beverages', keywords: ['coca-cola', 'coca cola', 'coke', 'fanta', 'sprite', 'pepsi', 'soft drink', 'carbonated'], url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80' },
  { id: 'dairy', label: 'Milk & Dairy', keywords: ['milk', 'dairy', 'cheese', 'butter', 'yogurt', 'cream'], url: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=800&q=80' },
  { id: 'eggs', label: 'Fresh Eggs', keywords: ['egg', 'eggs'], url: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=800&q=80' },
  { id: 'produce', label: 'Fresh Vegetables & Produce', keywords: ['tomato', 'tomatoes', 'vegetable', 'produce', 'salad', 'onion', 'carrot', 'pepper', 'fresh produce', 'potato'], url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=80' },
  { id: 'fruit', label: 'Fresh Fruits', keywords: ['banana', 'apple', 'orange', 'fruit', 'berries', 'grape', 'lemon', 'citrus'], url: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=800&q=80' },
  { id: 'bakery', label: 'Bakery & Bread', keywords: ['bread', 'bakery', 'loaf', 'toast', 'bun', 'croissant', 'bagel'], url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80' },
  { id: 'foil', label: 'Foil & Food Storage', keywords: ['foil', 'aluminium', 'wrap', 'baking sheet', 'food storage', 'parchment'], url: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=800&q=80' },
  { id: 'tissue', label: 'Toilet Tissue & Paper', keywords: ['tissue', 'toilet', 'paper towel', 'napkin', 'wipes', 'facial tissue'], url: 'https://images.unsplash.com/photo-1584556812952-905ffd0c611a?auto=format&fit=crop&w=800&q=80' },
  { id: 'cleaner', label: 'Household Cleaners', keywords: ['cleaner', 'bleach', 'detergent', 'spray', 'sponge', 'wash', 'soap', 'disinfectant'], url: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=800&q=80' },
  { id: 'meat', label: 'Meat & Poultry', keywords: ['chicken', 'beef', 'meat', 'pork', 'sausage', 'fish', 'seafood', 'steak'], url: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=800&q=80' },
  { id: 'rice', label: 'Rice, Pasta & Grains', keywords: ['rice', 'grain', 'grains', 'flour', 'wheat', 'beans', 'lentil'], url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80' },
  { id: 'vitamins', label: 'Vitamins & Health', keywords: ['vitamin', 'supplement', 'capsule', 'tablet', 'pill', 'calcium', 'omega', 'multivitamin'], url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80' },
  { id: 'plaster', label: 'First Aid & Plasters', keywords: ['plaster', 'bandage', 'first aid', 'medical', 'gauze', 'wound', 'adhesive'], url: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=800&q=80' },
  { id: 'baby', label: 'Baby & Childcare', keywords: ['diaper', 'nappy', 'baby', 'pacifier', 'infant', 'wipes'], url: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=800&q=80' },
  { id: 'beverages', label: 'Coffee, Tea & Beverages', keywords: ['coffee', 'tea', 'latte', 'espresso', 'beverage', 'juice', 'drink'], url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=800&q=80' },
  { id: 'oil', label: 'Cooking Oils & Condiments', keywords: ['oil', 'olive oil', 'cooking oil', 'sunflower oil', 'vinegar', 'sauce', 'ketchup'], url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=800&q=80' },
  { id: 'snacks', label: 'Snacks & Sweets', keywords: ['snack', 'candy', 'chocolate'], url: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&w=800&q=80' },
  { id: 'personal_care', label: 'Personal Care & Beauty', keywords: ['shampoo', 'conditioner', 'lotion', 'cream', 'skincare', 'cosmetic', 'deodorant', 'body wash'], url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80' },
  { id: 'headphones', label: 'Headphones & Audio', keywords: ['headphone', 'headphones', 'earphone', 'earphones', 'airpod', 'earbuds', 'audio', 'headset'], url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80' },
  { id: 'smartwatch', label: 'Smartwatches & Tech', keywords: ['watch', 'smartwatch', 'chronograph', 'timepiece'], url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80' },
  { id: 'gymshark', label: 'Gym & Activewear', keywords: ['gymshark', 'activewear', 'sportswear', 'fitness', 'workout', 'leggings', 'gym'], url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80' },
  { id: 'apparel', label: 'Clothing & Apparel', keywords: ['men wear', 'mens wear', 'clothing', 'apparel', 'shirt', 'hoodie', 'pants', 'jacket', 'wear', 't-shirt', 'fashion'], url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80' },
  { id: 'fries', label: 'French Fries & Sides', keywords: ['fries', 'french fries', 'fry', 'loaded fries', 'regular fries', 'large fries'], url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=80' },
  { id: 'groceries', label: 'General Groceries', keywords: ['grocer', 'grocery', 'supermarket', 'market', 'food'], url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80' }
];

export function resolveProductImage(productOrUrl, title = '', category = '') {
  let rawUrl = '';
  let fullText = '';

  if (productOrUrl && typeof productOrUrl === 'object') {
    rawUrl = productOrUrl.imageUrl || productOrUrl.image || (Array.isArray(productOrUrl.images) ? (productOrUrl.images[0]?.url || productOrUrl.images[0]?.src || productOrUrl.images[0]) : '') || '';
    fullText = `${productOrUrl.title || title || ''} ${productOrUrl.category || category || ''}`.toLowerCase();
  } else {
    rawUrl = typeof productOrUrl === 'string' ? productOrUrl : '';
    fullText = `${title} ${category}`.toLowerCase();
  }

  const isBrokenPhotoId = rawUrl.includes('1576107232684');
  const isSmartwatchFallback = rawUrl.includes(FALLBACK_SMARTWATCH_ID);
  const isActualWatch = fullText.includes('watch') || fullText.includes('chronograph');
  const isGenericPlaceholder = rawUrl.includes('placeholder') || rawUrl.includes('via.placeholder') || rawUrl.includes('data:image/svg+xml') || isBrokenPhotoId;

  if (rawUrl && (!isSmartwatchFallback || isActualWatch) && !isGenericPlaceholder) {
    // If the stored URL is a video, convert to a thumbnail image instead
    if (isVideoUrl(rawUrl)) {
      const thumbnailUrl = convertVideoToImageUrl(rawUrl);
      if (thumbnailUrl) return thumbnailUrl;
      // Fall through to category preset below
    } else {
      return getImageUrl(rawUrl);
    }
  }

  for (const preset of CATEGORY_IMAGE_PRESETS) {
    if (preset.keywords.some(kw => fullText.includes(kw))) {
      return preset.url;
    }
  }

  return 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80';
}
