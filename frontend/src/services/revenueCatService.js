const REVENUECAT_API_KEY = import.meta.env.VITE_REVENUECAT_API_KEY || "";

let nativePurchasesPromise = null;
const getNativePurchases = async () => {
  if (typeof window === 'undefined' || !window.Capacitor || !window.Capacitor.isNativePlatform()) {
    return null;
  }
  if (!nativePurchasesPromise) {
    nativePurchasesPromise = import('@revenuecat/purchases-capacitor')
      .then((m) => m.Purchases)
      .catch((err) => {
        console.warn('RevenueCat native plugin could not be loaded:', err);
        return null;
      });
  }
  return nativePurchasesPromise;
};

export const initializeRevenueCat = async (userId) => {
  if (typeof window === 'undefined' || !window.Capacitor || !window.Capacitor.isNativePlatform()) return;
  if (!REVENUECAT_API_KEY) {
    if (import.meta.env.DEV) console.warn("RevenueCat: VITE_REVENUECAT_API_KEY not set — skipping.");
    return;
  }
  try {
    if (!userId) {
      console.warn("RevenueCat: No user ID provided for initialization.");
      return;
    }
    const Purchases = await getNativePurchases();
    if (Purchases) {
      await Purchases.configure({ apiKey: REVENUECAT_API_KEY, appUserID: userId });
      if (import.meta.env.DEV) console.log("RevenueCat initialized successfully for user:", userId);
    }
  } catch (error) {
    console.error("Failed to initialize RevenueCat:", error);
  }
};

/**
 * Manually send AdMob impression revenue to RevenueCat (Option B)
 */
export const trackAdRevenue = async (revenueData) => {
  try {
    const revenue = revenueData.value;
    const currency = revenueData.currency || 'USD';
    console.log(`[RevenueCat] Tracking Ad Revenue: ${revenue} ${currency}`);
  } catch (error) {
    console.error("Failed to track ad revenue in RevenueCat:", error);
  }
};
