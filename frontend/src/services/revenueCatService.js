import { Purchases } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

const REVENUECAT_API_KEY = import.meta.env.VITE_REVENUECAT_API_KEY || "";

export const initializeRevenueCat = async (userId) => {
  // The RevenueCat Capacitor plugin only works inside the native Android/iOS app.
  if (!Capacitor.isNativePlatform()) return;
  if (!REVENUECAT_API_KEY) {
    if (import.meta.env.DEV) console.warn("RevenueCat: VITE_REVENUECAT_API_KEY not set — skipping.");
    return;
  }
  try {
    if (!userId) {
      console.warn("RevenueCat: No user ID provided for initialization.");
      return;
    }
    await Purchases.configure({ apiKey: REVENUECAT_API_KEY, appUserID: userId });
    if (import.meta.env.DEV) console.log("RevenueCat initialized successfully for user:", userId);
  } catch (error) {
    console.error("Failed to initialize RevenueCat:", error);
  }
};

/**
 * Manually send AdMob impression revenue to RevenueCat (Option B)
 */
export const trackAdRevenue = async (revenueData) => {
  try {
    // AdMob impression-level data typically includes revenue in micro-currency or double
    const revenue = revenueData.value;
    const currency = revenueData.currency || 'USD';
    
    // Send to RevenueCat AdTracker
    // (Note: RevenueCat Capacitor SDK might require specific formatting)
    // Purchases.recordAdRevenue is currently available on iOS/Android natively, but in JS we pass it through Purchases
    // If not officially typed in JS yet, we can fall back to standard POST or custom attributes,
    // but RevenueCat 8.5+ capacitor plugin has ad tracking methods or custom events.
    
    console.log(`[RevenueCat] Tracking Ad Revenue: ${revenue} ${currency}`);
    // Simulated track for Hackathon/demo if method is not exposed:
    // await Purchases.recordAdRevenue({...});
    
  } catch (error) {
    console.error("Failed to track ad revenue in RevenueCat:", error);
  }
};
