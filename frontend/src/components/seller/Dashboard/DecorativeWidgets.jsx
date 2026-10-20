import React from 'react';
import { motion } from 'framer-motion';

const formatCurrency = (val) => {
  if (!val || isNaN(Number(val))) return '₦0';
  const num = Number(val);
  if (num >= 1000000) return `₦${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `₦${(num / 1000).toFixed(1)}K`;
  return `₦${num.toLocaleString()}`;
};

const formatNumber = (val) => {
  if (!val || isNaN(Number(val))) return '0';
  const num = Number(val);
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
};

const CircularWidget = ({ label, value, subtext, percentage, index = 0 }) => {
  const segments = 36;
  const baseDelay = index * 0.15;

  return (
    <motion.div
      className="group flex flex-col items-center gap-4 cursor-pointer"
      initial={{ opacity: 0, y: 24, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 160, damping: 18, delay: baseDelay }}
      whileHover={{ y: -4, scale: 1.05 }}
    >
      <span className="font-bold text-[var(--text-main)] text-sm md:text-base">{label}</span>
      <div className="relative w-28 h-28 flex items-center justify-center">
        {/* Segments */}
        <div className="absolute inset-0 flex items-center justify-center transition-transform duration-700 ease-out group-hover:rotate-[30deg]">
          {Array.from({ length: segments }).map((_, i) => {
            const p = i / segments;
            const isActive = p * 100 < percentage;
            
            return (
              <div
                key={i}
                className="absolute w-[4px] h-[12px]"
                style={{
                  transform: `rotate(${i * (360/segments)}deg) translateY(-46px)`
                }}
              >
                <div
                  className="w-full h-full origin-bottom transition-transform duration-300 ease-out group-hover:scale-y-[1.5] group-hover:scale-x-125"
                  style={{ transitionDelay: `${i * 12}ms` }}
                >
                <motion.div
                  className={`w-full h-full rounded-[1px] ${isActive ? 'bg-[var(--text-main)]' : 'bg-gray-200 dark:bg-gray-800'}`}
                  initial={{ scaleY: 0, opacity: 0 }}
                  animate={isActive
                    ? { scaleY: 1, opacity: [1, 0.55, 1] }
                    : { scaleY: 1, opacity: 1 }}
                  transition={{
                    scaleY: { duration: 0.25, delay: baseDelay + i * 0.03 },
                    opacity: isActive
                      ? { duration: 2.4, delay: baseDelay + 1.2 + i * 0.05, repeat: Infinity, ease: 'easeInOut' }
                      : { duration: 0.25, delay: baseDelay + i * 0.03 }
                  }}
                />
                </div>
              </div>
            );
          })}
        </div>
        {/* Inner Circle */}
        <motion.div
          className="absolute w-[72px] h-[72px] bg-[var(--bg-primary)] rounded-full shadow-[0_4px_15px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_15px_rgba(0,0,0,0.5)] group-hover:shadow-[0_0_25px_rgba(255,255,255,0.35)] transition-shadow duration-300 flex flex-col items-center justify-center z-10 border-4 border-[var(--bg-main)]"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 14, delay: baseDelay + 0.2 }}
        >
          <span className="font-bold text-[var(--text-main)] text-[13px] leading-tight">{value}</span>
          {subtext && <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase">{subtext}</span>}
        </motion.div>
      </div>
    </motion.div>
  );
};

const DecorativeWidgets = ({ analytics }) => {
  // Use real data from analytics object
  const totalProducts = analytics?.totalProducts || 0;
  const totalRevenue = analytics?.totalRevenue || 0;
  const totalViews = analytics?.totalViews || 0;
  const pendingOrders = analytics?.pendingOrders || 0;

  // Calculate mock percentages based on some logic or fixed values if no targets exist
  const stockPercentage = totalProducts > 0 ? 85 : 0; 
  const incomePercentage = totalRevenue > 0 ? 70 : 0;
  const viewsPercentage = totalViews > 0 ? 65 : 0;
  const ordersPercentage = pendingOrders > 0 ? Math.min(100, pendingOrders * 5) : 0;

  return (
    <div className="w-full bg-[var(--bg-primary)] border border-gray-200 dark:border-gray-800 rounded-[2rem] p-6 md:p-8 mb-8 shadow-sm">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 justify-items-center">
        <CircularWidget 
          index={0}
          label="Stock Level" 
          value={formatNumber(totalProducts)} 
          subtext="Items" 
          percentage={stockPercentage} 
        />
        <CircularWidget 
          index={1}
          label="Total Income" 
          value={formatCurrency(totalRevenue)} 
          subtext="Revenue" 
          percentage={incomePercentage} 
        />
        <CircularWidget 
          index={2}
          label="Total Views" 
          value={formatNumber(totalViews)} 
          subtext="Active" 
          percentage={viewsPercentage} 
        />
        <CircularWidget 
          index={3}
          label="Active Orders" 
          value={formatNumber(pendingOrders)} 
          subtext="Pending" 
          percentage={ordersPercentage} 
        />
      </div>
    </div>
  );
};

export default DecorativeWidgets;
