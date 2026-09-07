import { useSystemStore } from '../store/systemStore';

/**
 * useSystemStory — W-Commerce Feature Flag Hook
 *
 * Usage:
 *   const { enabled, status, story, feature } = useSystemStory('animated_splash');
 *   const { enabled } = useSystemStory('ch6_social_commerce', 'story');
 *
 * @param {string} id - featureId (e.g. 'live_shopping_sessions') OR storyId (e.g. 'ch6_social_commerce')
 * @param {'feature'|'story'} mode - defaults to 'feature'. Use 'story' to check an entire chapter.
 */
const useSystemStory = (id, mode = 'feature') => {
  const { isFeatureEnabled, isStoryEnabled, getStoryById, stories } = useSystemStore();

  if (mode === 'story') {
    const story = getStoryById(id);
    const enabled = isStoryEnabled(id);
    return {
      enabled,
      status: story?.status ?? 'planned',
      story: story ?? null,
      feature: null,
    };
  }

  // Feature mode — find the feature and its parent story
  let feature = null;
  let parentStory = null;
  for (const story of stories) {
    const f = story.features.find((f) => f.id === id);
    if (f) {
      feature = f;
      parentStory = story;
      break;
    }
  }

  const enabled = isFeatureEnabled(id);

  return {
    enabled,
    status: feature?.status ?? 'planned',
    story: parentStory,
    feature: feature ?? null,
  };
};

export default useSystemStory;
