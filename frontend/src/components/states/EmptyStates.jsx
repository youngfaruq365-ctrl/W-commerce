import React from 'react';
import { motion } from 'framer-motion';
import { useAnimationLevel } from '../../context/AnimationContext';
import { fadeUp, bounce } from '../motion/MotionPresets';
import { ActivePress } from '../visual/AnimationLibrary';

const AnimatedIllustration = ({ children, color = "var(--accent-main, #3b82f6)" }) => {
  return (
    <motion.svg
      width="160"
      height="160"
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0, scale: 0.8 },
        visible: { opacity: 1, scale: 1, transition: { staggerChildren: 0.2, delayChildren: 0.1 } }
      }}
      className="mb-6 drop-shadow-xl"
    >
      <motion.circle cx="100" cy="100" r="80" fill={color} opacity="0.1" variants={fadeUp} />
      <motion.circle cx="100" cy="100" r="60" fill={color} opacity="0.15" variants={fadeUp} />
      {children}
    </motion.svg>
  );
};

export const GenericEmptyState = ({ icon: Icon, illustration, title, description, actionLabel, onAction }) => {
  const { getVariant } = useAnimationLevel();
  return (
    <motion.div {...getVariant(fadeUp)} className="flex flex-col items-center justify-center p-12 w-full min-h-[400px] text-center bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
      {illustration ? (
        illustration
      ) : (
        <motion.div {...getVariant(bounce)} className="w-24 h-24 rounded-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 flex items-center justify-center mb-6 shadow-inner">
          {Icon && <Icon className="w-12 h-12 text-slate-400" strokeWidth={1.5} />}
        </motion.div>
      )}
      <h3 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 mb-3 tracking-tight">{title}</h3>
      <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8 text-lg leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <ActivePress 
          onClick={onAction}
          className="px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/30 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/40"
        >
          {actionLabel}
        </ActivePress>
      )}
    </motion.div>
  );
};

export const EmptyCartState = ({ onAction }) => (
  <GenericEmptyState
    title="Your Cart is Empty"
    description="Looks like you haven't added anything to your cart yet. Discover our latest products and trends!"
    actionLabel="Start Shopping"
    onAction={onAction}
    illustration={
      <AnimatedIllustration color="#3b82f6">
        <motion.path
          d="M60 70 L140 70 L130 130 L70 130 Z"
          stroke="#3b82f6"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={{
            hidden: { pathLength: 0, opacity: 0 },
            visible: { pathLength: 1, opacity: 1, transition: { duration: 1.5, ease: "easeInOut" } }
          }}
        />
        <motion.circle cx="80" cy="150" r="10" fill="#3b82f6" variants={bounce} />
        <motion.circle cx="120" cy="150" r="10" fill="#3b82f6" variants={bounce} />
        <motion.path d="M40 50 L60 70" stroke="#3b82f6" strokeWidth="8" strokeLinecap="round" variants={fadeUp} />
      </AnimatedIllustration>
    }
  />
);

export const EmptyOrdersState = ({ onAction }) => (
  <GenericEmptyState
    title="No Orders Yet"
    description="You haven't placed any orders. Browse the marketplace to find something you'll love."
    actionLabel="Browse Products"
    onAction={onAction}
    illustration={
      <AnimatedIllustration color="#10b981">
        <motion.rect x="70" y="60" width="60" height="80" rx="8" stroke="#10b981" strokeWidth="8" fill="none" variants={{
            hidden: { pathLength: 0, opacity: 0 },
            visible: { pathLength: 1, opacity: 1, transition: { duration: 1.5 } }
          }} />
        <motion.path d="M85 85 H115" stroke="#10b981" strokeWidth="8" strokeLinecap="round" variants={fadeUp} />
        <motion.path d="M85 110 H105" stroke="#10b981" strokeWidth="8" strokeLinecap="round" variants={fadeUp} />
      </AnimatedIllustration>
    }
  />
);

export const EmptyProductsState = ({ onAction }) => (
  <GenericEmptyState
    title="No Products Found"
    description="We couldn't find any products matching your criteria. Try adjusting your filters or search terms."
    actionLabel="Clear Filters"
    onAction={onAction}
    illustration={
      <AnimatedIllustration color="#f59e0b">
        <motion.circle cx="90" cy="90" r="30" stroke="#f59e0b" strokeWidth="8" fill="none" variants={{
            hidden: { pathLength: 0, opacity: 0 },
            visible: { pathLength: 1, opacity: 1, transition: { duration: 1.5 } }
          }} />
        <motion.path d="M115 115 L140 140" stroke="#f59e0b" strokeWidth="8" strokeLinecap="round" variants={fadeUp} />
      </AnimatedIllustration>
    }
  />
);

export const EmptyNotificationsState = () => (
  <GenericEmptyState
    title="No Notifications"
    description="You're all caught up! Check back later for updates on your orders and store."
    illustration={
      <AnimatedIllustration color="#8b5cf6">
        <motion.path d="M100 50 C70 50 70 90 70 100 L60 120 H140 L130 100 C130 90 130 50 100 50 Z" stroke="#8b5cf6" strokeWidth="8" fill="none" strokeLinejoin="round" variants={{
            hidden: { pathLength: 0, opacity: 0 },
            visible: { pathLength: 1, opacity: 1, transition: { duration: 1.5 } }
          }} />
        <motion.path d="M90 130 C90 140 110 140 110 130" stroke="#8b5cf6" strokeWidth="8" strokeLinecap="round" variants={fadeUp} />
      </AnimatedIllustration>
    }
  />
);

export const EmptyMessagesState = ({ onAction }) => (
  <GenericEmptyState
    title="No Messages"
    description="You don't have any active conversations right now."
    actionLabel="Start a Conversation"
    onAction={onAction}
    illustration={
      <AnimatedIllustration color="#ec4899">
        <motion.path d="M50 70 C50 50 150 50 150 70 C150 110 50 110 50 70 Z" stroke="#ec4899" strokeWidth="8" fill="none" strokeLinejoin="round" variants={{
            hidden: { pathLength: 0, opacity: 0 },
            visible: { pathLength: 1, opacity: 1, transition: { duration: 1.5 } }
          }} />
        <motion.path d="M50 100 L70 130 L85 105" stroke="#ec4899" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" variants={fadeUp} />
      </AnimatedIllustration>
    }
  />
);

export const EmptyFollowersState = ({ onAction }) => (
  <GenericEmptyState
    title="No Followers Yet"
    description="Start posting updates and interacting with the community to grow your audience."
    actionLabel="Create Post"
    onAction={onAction}
    illustration={
      <AnimatedIllustration color="#06b6d4">
        <motion.circle cx="100" cy="75" r="25" stroke="#06b6d4" strokeWidth="8" fill="none" variants={{
            hidden: { pathLength: 0, opacity: 0 },
            visible: { pathLength: 1, opacity: 1, transition: { duration: 1.5 } }
          }} />
        <motion.path d="M50 150 C50 120 150 120 150 150" stroke="#06b6d4" strokeWidth="8" strokeLinecap="round" variants={fadeUp} />
      </AnimatedIllustration>
    }
  />
);
