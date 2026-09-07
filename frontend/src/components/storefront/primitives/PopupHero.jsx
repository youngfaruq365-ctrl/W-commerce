import React from 'react';

const PopupHero = ({ title, subtitle, badge, icon: Icon, theme, style = 'center' }) => {
  return (
    <div className={`p-8 ${style === 'center' ? 'text-center flex flex-col items-center' : 'text-left'}`}>
      {Icon && (
        <div 
          className="w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(216,180,90,0.3)]"
          style={{ backgroundColor: theme?.accent || '#D8B45A' }}
        >
          <Icon size={40} style={{ color: theme?.background || '#35104A' }} />
        </div>
      )}
      
      {title && (
        <h2 className="text-3xl font-extrabold mb-2" style={{ color: theme?.accent || '#D8B45A' }}>
          {title}
        </h2>
      )}
      
      {subtitle && (
        <p className="opacity-80 font-medium mb-4 text-lg">
          {subtitle}
        </p>
      )}

      {badge && (
        <span 
          className="inline-block px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wider"
          style={{ backgroundColor: theme?.accent || '#D8B45A', color: theme?.background || '#35104A' }}
        >
          {badge}
        </span>
      )}
    </div>
  );
};

export default PopupHero;
