import React from 'react';
import { motion } from 'framer-motion';

export const DashboardCard = ({ 
  title, 
  value, 
  meta, 
  icon: Icon, 
  iconColor = 'text-gray-600', 
  iconBg = 'bg-gray-50',
  metaIcon: MetaIcon,
  metaColor = 'text-gray-500',
  pulse = false,
  className = '',
  children
}) => {
  return (
    <motion.div 
      whileHover={{ y: -3, boxShadow: '0 10px 30px rgba(255,107,0,0.12)' }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      className={`
        bg-gradient-to-b from-white/[0.9] to-white 
        rounded-xl p-4 sm:p-5
        shadow-[0_12px_30px_rgba(16,24,40,0.06)] 
        border border-[rgba(124,58,237,0.05)]
        relative overflow-hidden
        ${className}
      `}
    >
      {pulse && (
        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-red-500/10 rounded-full blur-xl pointer-events-none" />
      )}
      
      {(title || Icon) && (
        <div className="flex items-center justify-between mb-4 relative z-10">
          {Icon && (
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBg} ${iconColor} ${pulse ? 'animate-pulse' : ''}`}>
              <Icon size={20} />
            </div>
          )}
          {meta && (
            <div className={`text-sm font-bold flex items-center ${metaColor}`}>
              {MetaIcon && <MetaIcon size={14} className="mr-1" />} 
              {meta}
            </div>
          )}
        </div>
      )}

      {title && <div className="text-gray-500 font-bold text-sm mb-1 relative z-10">{title}</div>}
      
      {value && (
        <div className={`text-3xl font-black relative z-10 ${pulse ? 'text-red-500' : 'text-gray-900'}`}>
          {value}
        </div>
      )}

      {children && <div className="relative z-10">{children}</div>}
    </motion.div>
  );
};
