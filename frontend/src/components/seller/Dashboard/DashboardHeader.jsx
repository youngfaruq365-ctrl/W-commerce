import React from 'react';
import NotificationBell from '../../shared/NotificationBell';
import GXIcon from '../../shared/assets/GXIcon';
import { Link } from 'react-router-dom';
import { Palette, Menu } from 'lucide-react';

const DashboardHeader = ({ setIsSidebarOpen, user, storeConfig, setActiveTab }) => {
  return (
    <div className="flex items-center justify-between mb-6 neu-panel p-5 mt-4 relative z-50 transition-all duration-300 rounded-2xl">
      <div className="flex items-center gap-4">
        <h2 className="font-bold text-xl text-[var(--text-main)] tracking-tight hidden sm:block">Dashboard Menu</h2>
        {user?.subscriptionTier?.toLowerCase()?.includes('premium') && (
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setActiveTab('design-studio')}
              className="flex items-center gap-2 px-5 py-2.5 neu-button-primary"
            >
              <Palette size={18} />
              <span className="hidden sm:inline">Design Studio</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <NotificationBell />
        <button 
          onClick={() => setIsSidebarOpen(true)} 
          className="p-2.5 neu-button"
        >
          <Menu size={22} className="text-[var(--text-main)]" />
        </button>
      </div>
    </div>
  );
};

export default DashboardHeader;
