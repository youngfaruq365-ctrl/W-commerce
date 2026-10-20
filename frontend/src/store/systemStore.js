import { create } from 'zustand';
import { apiClient as axios } from '../utils/apiClient';
import SYSTEM_STORIES, { getStory, getFeature, getStatsSnapshot } from '../config/systemStories';
import fallbackConfig from '../config/storyConfig';

/**
 * W-Commerce System Store
 *
 * Flow:
 *   1. On boot, try GET /api/v1/system/stories/config
 *   2. If success → merge DB overrides with local SYSTEM_STORIES
 *   3. If failure → use local storyConfig.js as fallback
 *
 * Exposes:
 *   - stories[]          : full 20-chapter registry (with runtime overrides applied)
 *   - config             : current story settings (DB or fallback)
 *   - isFeatureEnabled() : check a single feature flag
 *   - isStoryEnabled()   : check a whole chapter/story
 *   - getStoryById()     : get enriched story data
 *   - updateConfig()     : admin: persist changes to DB
 *   - resetConfig()      : admin: reset to defaults
 *   - fetchHealth()      : admin: get per-chapter health metrics
 */
export const useSystemStore = create((set, get) => ({
  // ── State ────────────────────────────────────────────────────────────────
  stories: SYSTEM_STORIES,
  config: fallbackConfig,
  health: null,
  isLoaded: false,
  isLoading: false,
  error: null,
  usingFallback: false,

  // ── Boot ─────────────────────────────────────────────────────────────────
  /**
   * Called once at app start. Tries API, falls back to local config.
   */
  initialize: async () => {
    if (get().isLoaded) return;
    set({ isLoading: true, error: null });

    try {
      const res = await axios.get('/api/v1/system/stories/config', { timeout: 5000 });
      if (res.data.success) {
        const dbConfig = res.data.config;
        const mergedStories = applyOverrides(SYSTEM_STORIES, dbConfig.chapterOverrides || {});
        set({
          config: dbConfig,
          stories: mergedStories,
          isLoaded: true,
          isLoading: false,
          usingFallback: false,
        });
        return;
      }
    } catch {
      // API unreachable — silently fall back
    }

    // Fallback path
    set({
      config: fallbackConfig,
      stories: applyOverrides(SYSTEM_STORIES, fallbackConfig.chapterOverrides || {}),
      isLoaded: true,
      isLoading: false,
      usingFallback: true,
    });
  },

  // ── Queries ───────────────────────────────────────────────────────────────
  /**
   * Returns true if a named feature is enabled.
   * Checks: config flags → story status → feature status → chapterOverrides
   */
  isFeatureEnabled: (featureId) => {
    const { config, stories } = get();

    // Check top-level config flags
    const configKey = featureIdToConfigKey(featureId);
    if (configKey && config[configKey] === false) return false;

    // Find the feature in the story registry
    for (const story of stories) {
      const feat = story.features.find((f) => f.id === featureId);
      if (feat) {
        if (story.status === 'disabled') return false;
        return feat.status === 'live' || feat.status === 'partial';
      }
    }
    return false;
  },

  /**
   * Returns true if an entire story/chapter is enabled.
   */
  isStoryEnabled: (storyId) => {
    const { stories, config } = get();
    const story = stories.find((s) => s.id === storyId);
    if (!story) return false;
    // Check role-based top-level config
    if (storyId.includes('seller') && config.enableSellerStories === false) return false;
    if (storyId.includes('buyer') && config.enableBuyerStories === false) return false;
    return story.status !== 'disabled';
  },

  /**
   * Get a story with its current overrides applied.
   */
  getStoryById: (storyId) => {
    const { stories } = get();
    return stories.find((s) => s.id === storyId) || null;
  },

  /**
   * Summary stats for admin panel.
   */
  getStats: () => getStatsSnapshot(),

  // ── Admin Actions ─────────────────────────────────────────────────────────
  /**
   * Persist updated config to DB. Admin only.
   */
  updateConfig: async (updates) => {
    set({ isLoading: true, error: null });
    try {
      const res = await axios.put('/api/v1/system/stories/config', updates);
      if (res.data.success) {
        const dbConfig = res.data.config;
        const mergedStories = applyOverrides(SYSTEM_STORIES, dbConfig.chapterOverrides || {});
        set({ config: dbConfig, stories: mergedStories, isLoading: false });
        return true;
      }
      set({ error: 'Update failed', isLoading: false });
      return false;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Update failed', isLoading: false });
      return false;
    }
  },

  /**
   * Reset all story settings to defaults. Admin only.
   */
  resetConfig: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await axios.post('/api/v1/system/stories/config/reset');
      if (res.data.success) {
        const dbConfig = res.data.config;
        set({
          config: dbConfig,
          stories: applyOverrides(SYSTEM_STORIES, {}),
          isLoading: false,
        });
        return true;
      }
      set({ error: 'Reset failed', isLoading: false });
      return false;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Reset failed', isLoading: false });
      return false;
    }
  },

  /**
   * Toggle a single story chapter on/off. Admin only.
   */
  toggleStory: async (storyId, newStatus) => {
    const { config, updateConfig } = get();
    const overrides = { ...(config.chapterOverrides || {}) };
    overrides[storyId] = { ...(overrides[storyId] || {}), status: newStatus };
    return updateConfig({ chapterOverrides: overrides });
  },

  /**
   * Toggle a single feature flag within a story. Admin only.
   */
  toggleFeature: async (storyId, featureId, newStatus) => {
    const { config, updateConfig } = get();
    const overrides = { ...(config.chapterOverrides || {}) };
    if (!overrides[storyId]) overrides[storyId] = {};
    if (!overrides[storyId].features) overrides[storyId].features = {};
    overrides[storyId].features[featureId] = newStatus;
    return updateConfig({ chapterOverrides: overrides });
  },

  /**
   * Fetch real-time health data for all chapters. Admin only.
   */
  fetchHealth: async () => {
    try {
      const res = await axios.get('/api/v1/system/stories/health');
      if (res.data.success) {
        set({ health: res.data.health });
        return res.data.health;
      }
    } catch {
      // ignore
    }
    return null;
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Apply chapterOverrides from the DB config on top of the static SYSTEM_STORIES.
 */
function applyOverrides(stories, overrides) {
  if (!overrides || !Object.keys(overrides).length) return stories;
  return stories.map((story) => {
    const override = overrides[story.id];
    if (!override) return story;
    const merged = { ...story, ...override };
    if (override.features && story.features) {
      merged.features = story.features.map((feat) => ({
        ...feat,
        status: override.features[feat.id] || feat.status,
      }));
    }
    return merged;
  });
}

/**
 * Map a featureId prefix to a top-level config boolean key.
 */
function featureIdToConfigKey(featureId) {
  if (featureId.startsWith('live_shopping')) return 'enableLiveShoppingStories';
  if (featureId.startsWith('ai_')) return 'enableAIStories';
  if (featureId.includes('community') || featureId.includes('feed')) return 'enableCommunityStories';
  if (featureId.includes('flash')) return 'enableFlashStories';
  if (featureId.includes('sponsored')) return 'enableSponsoredStories';
  if (featureId.includes('seasonal')) return 'enableSeasonalStories';
  return null;
}
