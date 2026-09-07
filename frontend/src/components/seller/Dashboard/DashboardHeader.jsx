import React from 'react';
import NotificationBell from '../../shared/NotificationBell';
import GXIcon from '../../shared/assets/GXIcon';
import { Link } from 'react-router-dom';
import { Palette, Menu } from 'lucide-react';

const DashboardHeader = ({ setIsSidebarOpen }) => {
  return (
    <div className="flex items-center justify-between mb-6 bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-slate-200/50 shadow-lg mt-4 relative z-50 transition-all duration-300">
      <div className="flex items-center gap-4">
        <h2 className="font-bold text-xl text-slate-800 tracking-tight hidden sm:block">Dashboard Menu</h2>
        {/* W-Commerce Commerce OS - Loop connection to Design Studio */}
        <Link 
          to="/preview/fashion/fash-2" 
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all font-bold text-sm"
        >
          <Palette size={18} />
          Design Studio
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <NotificationBell />
        <button 
          onClick={() => setIsSidebarOpen(true)} 
          className="p-2.5 bg-slate-100 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-200 hover:text-slate-900 transition-colors shadow-sm"
        >
          <Menu size={22} />
        </button>
      </div>
    </div>
  );
};

export default DashboardHeader;
