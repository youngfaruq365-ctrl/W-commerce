import { trackAdRevenue } from './revenueCatService';

// Test Ad Unit ID for Android Rewarded Video
const REWARDED_AD_UNIT_ID = 'ca-app-pub-3940256099942544/5224354917';

// Lazy loader for native Capacitor AdMob plugin
let nativeAdMobPromise = null;
const getNativeAdMob = async () => {
  if (typeof window === 'undefined' || !window.Capacitor || !window.Capacitor.isNativePlatform()) {
    return null;
  }
  if (!nativeAdMobPromise) {
    nativeAdMobPromise = import('@capacitor-community/admob')
      .then((m) => ({ AdMob: m.AdMob, RewardAdPluginEvents: m.RewardAdPluginEvents }))
      .catch((err) => {
        console.warn('AdMob native plugin could not be loaded:', err);
        return null;
      });
  }
  return nativeAdMobPromise;
};

const simulateAdModal = (title, duration = 3000) => {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      setTimeout(resolve, duration);
      return;
    }

    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    overlay.style.color = 'white';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '999999';
    overlay.style.fontFamily = 'sans-serif';

    const h1 = document.createElement('h1');
    h1.innerText = `${title}\n(Simulated Web Ad)`;
    h1.style.marginBottom = '20px';
    h1.style.textAlign = 'center';

    const counter = document.createElement('h2');
    let timeLeft = duration / 1000;
    counter.innerText = `Closing in ${timeLeft}s...`;

    overlay.appendChild(h1);
    overlay.appendChild(counter);
    document.body.appendChild(overlay);

    const interval = setInterval(() => {
      timeLeft -= 1;
      if (timeLeft > 0) {
        counter.innerText = `Closing in ${timeLeft}s...`;
      }
    }, 1000);

    setTimeout(() => {
      clearInterval(interval);
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
      resolve();
    }, duration);
  });
};

export const initializeAdMob = async () => {
  const native = await getNativeAdMob();
  if (!native) return;
  try {
    await native.AdMob.initialize({
      requestTrackingAuthorization: true,
      testingDevices: ['2077ef9a63d2b398840261c8221a0c9b'],
      initializeForTesting: true,
    });
    console.log("AdMob initialized successfully.");
  } catch (error) {
    console.error("AdMob initialization failed:", error);
  }
};

/**
 * Show a rewarded ad (W-Roll) and track revenue
 */
export const showRewardedAd = async (onRewardEarned) => {
  // Check if we are running in a Capacitor native environment
  if (typeof window !== 'undefined' && (!window.Capacitor || !window.Capacitor.isNativePlatform())) {
    console.log("Simulating AdMob on Web...");
    await simulateAdModal('Sponsor Message', 3000);
    if (onRewardEarned) onRewardEarned({ type: 'simulated', amount: 1 });
    return;
  }

  const native = await getNativeAdMob();
  if (!native) {
    await simulateAdModal('Sponsor Message', 3000);
    if (onRewardEarned) onRewardEarned({ type: 'simulated', amount: 1 });
    return;
  }

  try {
    const { AdMob, RewardAdPluginEvents } = native;
    const options = {
      adId: REWARDED_AD_UNIT_ID,
      isTesting: true,
    };

    // Prepare the ad
    await AdMob.prepareRewardVideoAd(options);

    // Listen for reward
    AdMob.addListener(RewardAdPluginEvents.Rewarded, (rewardItem) => {
      console.log('Reward earned:', rewardItem);
      if (onRewardEarned) onRewardEarned(rewardItem);
    });

    // Listen for paid event (Impression-level ad revenue)
    AdMob.addListener(RewardAdPluginEvents.AdItemPaid, (info) => {
      console.log('AdMob Impression Paid:', info);
      trackAdRevenue({ value: info.value, currency: info.currencyCode });
    });

    // Show the ad
    await AdMob.showRewardVideoAd();

  } catch (error) {
    console.error("Failed to show rewarded ad:", error);
    throw error;
  }
};

/**
 * Show an Interstitial Ad (for page loads/storefront entry)
 */
export const showInterstitialAd = async (onDismissed) => {
  if (typeof window !== 'undefined' && (!window.Capacitor || !window.Capacitor.isNativePlatform())) {
    console.log("Simulating Interstitial Ad on Web...");
    await simulateAdModal('Welcome to our Store', 2000);
    if (onDismissed) onDismissed();
    return;
  }

  const native = await getNativeAdMob();
  if (!native) {
    await simulateAdModal('Welcome to our Store', 2000);
    if (onDismissed) onDismissed();
    return;
  }

  try {
    const { AdMob } = native;
    const INTERSTITIAL_AD_UNIT_ID = 'ca-app-pub-3940256099942544/1033173712'; // Test Unit ID
    const options = {
      adId: INTERSTITIAL_AD_UNIT_ID,
      isTesting: true,
    };

    await AdMob.prepareInterstitial(options);
    
    // Listen for paid event (Impression-level ad revenue)
    AdMob.addListener('interstitialAdItemPaid', (info) => {
      console.log('AdMob Impression Paid (Interstitial):', info);
      trackAdRevenue({ value: info.value, currency: info.currencyCode });
    });

    AdMob.addListener('interstitialAdDismissed', () => {
      if (onDismissed) onDismissed();
    });

    await AdMob.showInterstitial();

  } catch (error) {
    console.error("Failed to show interstitial ad:", error);
    if (onDismissed) onDismissed();
  }
};
