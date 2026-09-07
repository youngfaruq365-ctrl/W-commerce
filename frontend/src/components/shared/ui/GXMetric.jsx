import React from 'react';
import GXIcon from '../assets/GXIcon';

const GXMetric = ({ label, value, change, trend = 'up', iconName }) => {
  const isPositive = trend === 'up';
  return (
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[var(--text-muted)] text-sm mb-1 font-medium">{label}</p>
        <h4 className="text-3xl font-extrabold text-black dark:text-white tracking-tight">{value}</h4>
        {change && (
          <p className={`text-sm mt-2 font-medium ${isPositive ? 'text-gray-700 400' : 'text-gray-700 400'} flex items-center gap-1`}>
            {isPositive ? '↑' : '↓'} {change}
          </p>
        )}
      </div>
      {iconName && (
        <div className="p-3 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] shadow-inner">
          <GXIcon name={iconName} size={24} className="text-[var(--accent-gray)]" />
        </div>
      )}
    </div>
  );
};

export default GXMetric;
