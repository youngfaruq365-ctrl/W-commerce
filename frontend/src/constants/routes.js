export const ROUTES = {
  // Public
  HOME: '/',
  SHOP: '/shop',
  FEED: '/feed',
  CART: '/cart',
  MESSAGES: '/messages',
  PRODUCT: '/product/:id',
  PAYAI: '/payai',
  
  // Auth
  LOGIN: '/login',
  SIGNUP: '/signup',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_OTP: '/verify-otp',
  VERIFY_EMAIL: '/verify-email',
  ROLE_SELECTION: '/role-selection',
  UNLOCK_ACCESS: '/unlock-access',
  FINGERPRINT_SETUP: '/security/fingerprint',
  TWO_FACTOR_AUTH: '/security/2fa',
  SESSION_MANAGEMENT: '/security/sessions',
  SYSTEM_STORIES: '/system-stories',

  // Buyer
  BUYER_DASHBOARD: '/buyer/dashboard',
  BUYER_ORDERS: '/buyer/orders',
  BUYER_ORDER_DETAIL: '/buyer/orders/:id',
  BUYER_PROFILE: '/buyer/profile',
  BUYER_REFERRALS: '/buyer/referrals',
  BUYER_WALLET: '/buyer/wallet',
  WALLET: '/wallet',
  ORDERS: '/orders',
  ORDER_DETAIL: '/orders/:id',
  // Courier
  COURIER_DASHBOARD: '/courier/dashboard',

  // Seller
  SELLER_DASHBOARD: '/seller/dashboard',
  SELLER_ORDERS: '/seller/orders',
  SELLER_PRODUCTS: '/seller/products',
  SELLER_WALLET: '/seller/wallet',
  SELLER_PROFILE: '/seller/:sellerId',
  SELLER_ONBOARDING: '/seller/onboarding',
  SELLER_SUBSCRIPTION: '/seller/subscription',

  // Admin
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_DISPUTES: '/admin/disputes',
  ADMIN_KYB_REVIEW: '/admin/kyb-review',
  ADMIN_REFERRALS: '/admin/referrals',

  // Storefronts
  STORE: '/store/:slug',
  STORE_FREE: '/store/:slug/free',
  STORE_PREMIUM: '/store/:slug/premium',
  STORE_PRO: '/store/:slug/pro',
  STORE_ULTRA: '/store/:slug/ultra'
};
