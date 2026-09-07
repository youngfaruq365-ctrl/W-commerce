import React from 'react';
import { motion } from 'framer-motion';

const GXTabs = ({ tabs, activeTab, onChange }) => {
  return (
    <div className="flex space-x-1 border-b border-[var(--border-color)] overflow-x-auto hide-scrollbar relative">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`relative py-3 px-6 text-sm font-medium transition-colors whitespace-nowrap z-10 ${
            activeTab === tab.id
              ? 'text-[var(--text-main)] font-bold'
              : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          {tab.label}
          {activeTab === tab.id && (
            <motion.div
              layoutId="activeTabIndicator"
              className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--text-main)]"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
        </button>
      ))}
    </div>
  );
};

export default GXTabs;
