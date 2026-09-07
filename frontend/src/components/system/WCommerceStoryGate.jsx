import React from 'react';
import useSystemStory from '../../hooks/useSystemStory';

/**
 * WCommerceStoryGate
 *
 * Conditionally renders children based on whether a W-Commerce story/feature is enabled.
 * Shows a premium "Coming Soon" fallback when disabled or planned.
 *
 * Usage:
 *   // Gate an entire chapter
 *   <WCommerceStoryGate story="ch6_social_commerce">
 *     <LiveShoppingPage />
 *   </WCommerceStoryGate>
 *
 *   // Gate a single feature
 *   <WCommerceStoryGate feature="barcode_search" inline>
 *     <BarcodeButton />
 *   </WCommerceStoryGate>
 *
 *   // Custom fallback
 *   <WCommerceStoryGate story="ch19_enterprise" fallback={<UpgradeBanner />}>
 *     <EnterprisePanel />
 *   </WCommerceStoryGate>
 */
const WCommerceStoryGate = ({
  story: storyId,
  feature: featureId,
  children,
  fallback,
  inline = false,   // true = render nothing (not even fallback) when disabled
  showBadge = true, // show "Coming Soon" badge on partial features
}) => {
  const id = storyId || featureId;
  const mode = storyId ? 'story' : 'feature';
  const { enabled, status, story, feature } = useSystemStory(id, mode);

  if (enabled) return children;

  // Hard disabled — render nothing
  if (status === 'disabled' || inline) return null;

  // Custom fallback provided
  if (fallback) return fallback;

  // Default premium "Coming Soon" card
  const label = storyId
    ? story?.title ?? 'This Feature'
    : feature?.label ?? 'This Feature';
  const icon = story?.icon ?? '🚧';
  const color = story?.color ?? 'var(--accent-gray)';

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-dashed"
      style={{ borderColor: `${color}40` }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 30% 40%, ${color}, transparent 70%)` }}
      />

      <div className="relative z-10 flex flex-col items-center justify-center py-16 px-8 text-center gap-4">
        {/* Icon ring */}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl mb-2"
          style={{ background: `${color}15`, border: `1.5px solid ${color}40` }}
        >
          {icon}
        </div>

        {/* Badge */}
        {showBadge && (
          <span
            className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
            style={{ background: `${color}20`, color }}
          >
            {status === 'partial' ? 'Coming Soon' : 'Planned'}
          </span>
        )}

        <h3 className="text-lg font-bold text-[var(--text-main)]">{label}</h3>

        <p className="text-sm text-[var(--text-muted)] max-w-xs leading-relaxed">
          {status === 'partial'
            ? 'This feature is partially implemented and will be fully released soon.'
            : 'This feature is on the W-Commerce roadmap and will be available in a future update.'}
        </p>

        {/* W-Commerce chapter reference */}
        {story && (
          <p className="text-xs text-[var(--text-muted)] mt-1 opacity-60">
            W-Commerce Vision · Chapter {story.chapter}
          </p>
        )}
      </div>
    </div>
  );
};

export default WCommerceStoryGate;
