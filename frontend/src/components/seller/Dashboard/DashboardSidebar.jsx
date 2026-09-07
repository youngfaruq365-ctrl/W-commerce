import React from 'react';
import GXIcon from '../../shared/assets/GXIcon';
import { useNavigate } from 'react-router-dom';

const DashboardSidebar = ({ 
  tabs, 
  activeTab, 
  setActiveTab, 
  isSidebarOpen, 
  setIsSidebarOpen, 
  user, 
  handleLogout 
}) => {
  const navigate = useNavigate();
  return (
    <aside className={`fixed lg:sticky lg:top-24 top-0 h-[100dvh] lg:h-[calc(100vh-8rem)] left-0 z-50 w-72 transform transition-transform duration-300 ease-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 flex-shrink-0`}>
      <div className="bg-white/95 lg:bg-white/80 backdrop-blur-md pt-24 lg:pt-6 p-6 border border-slate-200/50 rounded-2xl shadow-xl h-full flex flex-col">
        
        <div className="flex w-full justify-between items-start mb-8 pb-6 border-b border-slate-200 relative">
          <div className="flex flex-col items-center w-full">
            <div className={`w-16 h-16 bg-gradient-to-tr from-slate-800 to-slate-600 text-white rounded-2xl mb-4 flex items-center justify-center text-xl font-bold ${user?.isVerified ? 'shadow-[0_0_15px_rgba(34,197,94,0.5)] border-2 border-green-500' : 'shadow-lg'}`}>
              {(user?.fullName || 'S').substring(0, 2).toUpperCase()}
            </div>
            <h3 className="font-bold text-slate-800 tracking-tight text-lg">{user?.fullName || 'Seller'}</h3>
            <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Store Online
            </p>
          </div>
          
          <button 
            onClick={() => setIsSidebarOpen(false)} 
            className="lg:hidden absolute right-0 top-0 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
          >
            <GXIcon name="shared.close" size={18} />
          </button>
        </div>

        <nav className="space-y-2 flex-1 overflow-y-auto overscroll-contain pr-2 hide-scrollbar pb-20 md:pb-0">
          {tabs.map((tab) => (
            <button 
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setIsSidebarOpen(false); }} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-sm font-medium
                ${activeTab === tab.id 
                  ? 'bg-slate-800 text-white shadow-md font-bold translate-x-1' 
                  : 'text-slate-500 hover:bg-slate-100/50 hover:text-slate-900 hover:translate-x-1'
                }`}
            >
              <GXIcon name={tab.iconName} size={18} className={activeTab === tab.id ? "text-white" : "text-slate-400 group-hover:text-slate-700"} />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
          <button
            onClick={() => navigate('/seller/subscription')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-md hover:shadow-lg transition-all duration-300"
          >
            <GXIcon name="shared.star" size={18} className="text-white" />
            Upgrade Plan
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all duration-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
