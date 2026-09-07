import React from 'react';
import { X } from 'lucide-react';

const PopupHeader = ({ title, icon: Icon, iconColor, theme, onClose }) => {
  return (
    <div className="flex justify-between items-center p-4 border-b border-white/10" style={{ borderColor: theme?.divider || 'rgba(0,0,0,0.1)' }}>
      <div className="flex items-center gap-2 font-bold text-sm">
        {Icon && <Icon size={16} fill="currentColor" className={iconColor || "text-current"} />}
        {title}
      </div>
      <button onClick={onClose} className="p-1 rounded-full transition-colors opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10">
        <X size={20} />
      </button>
    </div>
  );
};

export default PopupHeader;
