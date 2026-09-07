/**
 * W-Commerce Story Config — Frontend Fallback
 * Used when the API is unavailable or before backend connects.
 * The systemStore tries the API first; falls back here on failure.
 */
const storyConfig = {
  // Per-role story enabling
  enableSellerStories: true,
  enableBuyerStories: true,
  enableAdminStories: true,

  // Story types
  enableSponsoredStories: true,
  enableFlashStories: true,
  enableFeaturedStories: true,
  enableSeasonalStories: true,
  enableLiveShoppingStories: true,
  enableCommunityStories: true,
  enableAIStories: true,

  // Playback settings
  autoplay: true,
  storyDuration: 5000,   // ms per story slide
  maxStories: 20,
  defaultPrivacy: 'PUBLIC',

  /**
   * Per-chapter overrides.
   * Keys match systemStories.js story IDs.
   * Override a story's status or disable individual features.
   * Example: { ch6_social_commerce: { status: 'disabled' } }
   */
  chapterOverrides: {},
};

export default storyConfig;
