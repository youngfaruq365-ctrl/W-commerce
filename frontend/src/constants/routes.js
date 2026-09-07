export const ROUTES = {
  // Public
  HOME: '/',
  SHOP: '/shop',
  FEED: '/feed',
  CART: '/cart',
  MESSAGES: '/messages',
  PRODUCT: '/product/:id',
  
  // Auth
  LOGIN: '/login',
  SIGNUP: '/signup',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_OTP: '/verify-otp',
  VERIFY_EMAIL: '/verify-email',
  ROLE_SELECTION: '/role-selection',

  // Buyer
  BUYER_DASHBOARD: '/buyer/dashboard',
  BUYER_PROFILE: '/buyer/profile',
  BUYER_REFERRALS: '/buyer/referrals',
  ORDERS: '/orders',
  ORDER_DETAIL: '/orders/:id',
  // Courier
  COURIER_DASHBOARD: '/courier/dashboard',

  // Seller
  SELLER_DASHBOARD: '/seller/dashboard',
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
