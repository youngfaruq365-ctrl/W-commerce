import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Shield, Globe, Award, Clock, HeartHandshake, Truck, RefreshCw, Star, Lock, Phone, ChevronRight } from 'lucide-react';
import { usePreview } from '../commerce/PreviewContext';

const FEATURE_ICONS = {
  restaurant: [
    { icon: Truck,          title: 'Fast Delivery',       desc: 'Order in minutes, delivered to your door.' },
    { icon: RefreshCw,      title: 'Fresh Daily',          desc: 'Ingredients sourced and prepped every morning.' },
    { icon: Shield,         title: 'Quality Guarantee',    desc: 'Not satisfied? We\'ll make it right.' },
    { icon: Star,           title: 'Top Rated',            desc: 'Over 10,000 five-star reviews.' },
  ],
  fashion: [
    { icon: RefreshCw,      title: 'Free Returns',         desc: '30-day hassle-free return policy.' },
    { icon: Truck,          title: 'Free Shipping',        desc: 'On orders over $100 — worldwide.' },
    { icon: Shield,         title: 'Authenticity',         desc: 'Every item verified before dispatch.' },
    { icon: Award,          title: 'Premium Quality',      desc: 'Curated to the highest standards.' },
  ],
  creator: [
    { icon: Zap,            title: 'Instant Access',       desc: 'Download or stream immediately after purchase.' },
    { icon: Globe,          title: 'Global Community',     desc: 'Connect with creators worldwide.' },
    { icon: Lock,           title: 'Secure Payments',      desc: 'Encrypted, trusted, protected.' },
    { icon: RefreshCw,      title: 'Money-Back',           desc: '14-day satisfaction guarantee.' },
  ],
  property: [
    { icon: Shield,         title: 'Verified Listings',    desc: 'Every property independently verified.' },
    { icon: Phone,          title: 'Expert Agents',        desc: 'Experienced local specialists on call.' },
    { icon: Globe,          title: 'Global Reach',         desc: 'Properties across 40+ countries.' },
    { icon: Clock,          title: '24/7 Support',         desc: 'Always here when you need us.' },
  ],
  healthcare: [
    { icon: Shield,         title: 'Certified Clinicians', desc: 'All practitioners fully verified.' },
    { icon: Lock,           title: 'Confidential',         desc: 'Your data, completely private.' },
    { icon: Clock,          title: 'Same-Day Care',        desc: 'See a doctor when you need one.' },
    { icon: HeartHandshake, title: 'Patient-First',        desc: 'Your wellbeing guides everything we do.' },
  ],
  automotive: [
    { icon: Shield,         title: 'Vehicle Inspection',   desc: 'Every car independently inspected.' },
    { icon: RefreshCw,      title: 'Test Drive',           desc: 'Try before you buy, guaranteed.' },
    { icon: Award,          title: 'Best Price Match',     desc: 'We\'ll match any verified price.' },
    { icon: Phone,          title: 'Expert Support',       desc: 'Automotive specialists on hand 7 days.' },
  ],
};

const DEFAULT_FEATURES = [
  { icon: Zap,    title: 'Lightning Fast',  desc: 'Engineered for performance at every level.' },
  { icon: Shield, title: 'Secure & Safe',   desc: 'Industry-leading security you can trust.' },
  { icon: Globe,  title: 'Global Scale',    desc: 'Built to grow with your business.' },
  { icon: Award,  title: 'Award Winning',   desc: 'Recognised for excellence by our community.' },
];

// Variants by motion level
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } }
};

// ── Style variants ─────────────────────────────────────────────────────────────
const GridFeatures = ({ features }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
    {features.map(({ icon: Icon, title, desc }, i) => (
      <motion.div key={i} variants={itemVariants}
        className="p-6 border border-[var(--s-border,#f0f0f0)] rounded-[var(--s-radius,8px)] hover:border-[var(--s-primary,#000)] transition-colors group bg-[var(--s-surface,#fafafa)]">
        <div className="w-12 h-12 rounded-xl bg-[var(--s-primary,#000)]/10 flex items-center justify-center mb-5 group-hover:bg-[var(--s-primary,#000)] transition-colors">
          <Icon size={22} style={{ color: 'var(--s-primary,#000)' }} className="group-hover:text-[var(--s-bg,#fff)] transition-colors" />
        </div>
        <h3 className="font-black text-base mb-2">{title}</h3>
        <p className="text-sm opacity-60 leading-relaxed">{desc}</p>
      </motion.div>
    ))}
  </div>
);

const StripFeatures = ({ features }) => (
  <div className="border-t border-b border-[var(--s-border,#f0f0f0)] divide-x divide-[var(--s-border,#f0f0f0)] hidden md:flex">
    {features.map(({ icon: Icon, title, desc }, i) => (
      <motion.div key={i} variants={itemVariants}
        className="flex-1 flex items-center gap-4 px-6 py-5 hover:bg-[var(--s-surface,#fafafa)] transition-colors">
        <Icon size={20} style={{ color: 'var(--s-primary,#000)' }} className="flex-shrink-0" />
        <div>
          <div className="font-bold text-sm">{title}</div>
          <div className="text-xs opacity-50 mt-0.5">{desc}</div>
        </div>
      </motion.div>
    ))}
  </div>
);

const CardFeatures = ({ features }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {features.map(({ icon: Icon, title, desc }, i) => (
      <motion.div key={i} variants={itemVariants}
        className="flex gap-5 p-6 bg-[var(--s-surface,#fafafa)] rounded-2xl items-start">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--s-primary,#000)', color: 'var(--s-bg,#fff)' }}>
          <Icon size={24} />
        </div>
        <div>
          <h3 className="font-black text-lg mb-1">{title}</h3>
          <p className="text-sm opacity-60 leading-relaxed">{desc}</p>
        </div>
      </motion.div>
    ))}
  </div>
);

const BentoFeatures = ({ features }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[140px]">
    {features.map(({ icon: Icon, title, desc }, i) => (
      <motion.div key={i} variants={itemVariants}
        className={`flex flex-col justify-end p-5 rounded-2xl ${i === 0 ? 'col-span-2 bg-[var(--s-primary,#000)] text-[var(--s-bg,#fff)]' : 'bg-[var(--s-surface,#f5f5f5)]'}`}>
        <Icon size={22} className="mb-3 opacity-70" />
        <div className="font-black text-base">{title}</div>
        <div className={`text-xs mt-1 ${i === 0 ? 'opacity-70' : 'opacity-50'}`}>{desc}</div>
      </motion.div>
    ))}
  </div>
);

// Engine-aware layout selector
const FEATURE_LAYOUTS = {
  restaurant: StripFeatures,
  fashion:    GridFeatures,
  creator:    CardFeatures,
  property:   CardFeatures,
  healthcare: GridFeatures,
  automotive: BentoFeatures,
};

export const FeatureHighlights = ({ store, motionVariants }) => {
  const features = FEATURE_ICONS[store?.engine] || DEFAULT_FEATURES;
  const Layout   = FEATURE_LAYOUTS[store?.engine] || GridFeatures;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <motion.div variants={itemVariants} className="mb-10 md:mb-12">
          <p className="text-xs font-black uppercase tracking-widest opacity-40 mb-2">Why Us</p>
          <h2 className="text-3xl md:text-4xl font-black" style={{ fontFamily: 'var(--s-font-heading)', letterSpacing: 'var(--s-letter-spacing)' }}>
            Everything you need
          </h2>
        </motion.div>
        <Layout features={features} />
      </motion.div>
    </section>
  );
};
