import React from 'react';
import GXIcon from '../../shared/assets/GXIcon';
import { useNavigate } from 'react-router-dom';

const CapsuleButton = ({ label, icon, onClick, isBlue, isItalic, colorClass, iconColorClass }) => {
  let textClass = 'text-[var(--text-main)]';
  let iClass = 'text-[var(--text-main)]';
  
  const isPerformance = label === 'Performance';
  const isAnalytics = isBlue || label === 'Analytics';
  const isUpgrade = label === 'Upgrade Plan';
  const isLogout = label === 'Logout';

  if (isAnalytics) {
    textClass = 'text-[#008cff]';
    iClass = 'text-[#008cff]';
  } else if (isUpgrade) {
    textClass = 'text-[#e6a51a]';
    iClass = 'text-[#e6a51a]';
  } else if (isLogout) {
    textClass = 'text-[#e33b42]';
    iClass = 'text-[#e33b42]';
  } else if (colorClass) {
    textClass = colorClass;
  }
  
  if (iconColorClass) {
    iClass = iconColorClass;
  }

  return (
    <button
      onClick={onClick}
      className={`w-full max-w-[200px] h-10 px-4 flex items-center gap-3 cursor-pointer group transition-all duration-200 ease-out flex-shrink-0 mx-auto rounded-xl neu-input hover:scale-[1.02] active:scale-[0.98] ${isAnalytics ? '!shadow-[inset_4px_4px_8px_rgba(0,140,255,0.1),_inset_-4px_-4px_8px_rgba(0,140,255,0.2)]' : ''}`}
    >
      <div 
        className={`w-4 h-4 flex items-center justify-center shrink-0 ${iClass} [&>svg]:w-[14px] [&>svg]:h-[14px] [&>svg]:stroke-[1.5] [&>svg]:fill-none`}
        style={{
          filter: isAnalytics ? 'drop-shadow(0 0 2px rgba(0,140,255,.7))' :
                  isUpgrade ? 'drop-shadow(0 0 2px rgba(230,165,26,.45))' :
                  isLogout ? 'drop-shadow(0 0 2px rgba(227,59,66,.4))' : 'none'
        }}
      >
        {icon}
      </div>
      <span 
        className={`text-xs whitespace-nowrap leading-none ${textClass} ${isPerformance ? 'italic font-semibold' : 'font-medium'}`}
        style={{
          fontFamily: isPerformance ? 'Georgia, "Times New Roman", serif' : undefined,
          textShadow: isAnalytics ? '0 0 4px rgba(0,140,255,.55)' : 'none'
        }}
      >
        {label}
      </span>
    </button>
  );
};

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
    <aside className={`fixed lg:sticky lg:top-24 top-[4px] h-[calc(100dvh-8px)] lg:h-[calc(100vh-8rem)] left-[4px] lg:left-0 z-50 w-72 transform transition-transform duration-300 ease-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 flex-shrink-0`}>
      <div className="neu-panel p-6 pt-24 lg:pt-6 !rounded-none h-full flex flex-col">
        
        <div className="flex w-full justify-between items-start mb-8 pb-6 border-b-2 border-white relative">
          <div className="flex flex-col items-center w-full">
            <div className={`w-16 h-16 bg-[var(--bg-primary)] shadow-[6px_6px_12px_rgba(163,177,198,0.5),-6px_-6px_12px_rgba(255,255,255,0.9)] text-[var(--text-main)] rounded-2xl mb-4 flex items-center justify-center text-xl font-bold ${user?.isVerified ? 'border-2 border-[#006cff]' : ''}`}>
              {(user?.fullName || 'S').substring(0, 2).toUpperCase()}
            </div>
            <h3 className="font-bold text-[var(--text-main)] tracking-tight text-lg">{user?.fullName || 'Seller'}</h3>
            <p className="text-xs text-[var(--text-muted)] flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${user?.isVerified ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span> {user?.isVerified ? 'Store Online' : 'Unverified'}
            </p>
          </div>
          
          <button 
            onClick={() => setIsSidebarOpen(false)} 
            className="lg:hidden absolute right-0 top-0 p-2 rounded-full neu-button text-[var(--text-main)]"
          >
            <GXIcon name="shared.close" size={18} />
          </button>
        </div>

        <nav className="flex flex-col items-center gap-[10px] flex-1 overflow-y-auto overscroll-contain px-2 hide-scrollbar pb-20 md:pb-0 pt-2">
          {tabs.map((tab) => (
            <CapsuleButton 
              key={tab.id}
              label={tab.label}
              icon={<GXIcon name={tab.iconName} size={14} />}
              onClick={() => { setActiveTab(tab.id); setIsSidebarOpen(false); }}
              isBlue={activeTab === tab.id}
            />
          ))}
        </nav>

        <div className="mt-4 pt-4 border-t border-[var(--border-color)] flex flex-col items-center gap-[10px] px-2 pb-6">
          <CapsuleButton
            label="Upgrade Plan"
            icon={<GXIcon name="shared.star" size={14} />}
            onClick={() => navigate('/seller/subscription')}
            colorClass="text-amber-500"
            iconColorClass="text-amber-500"
          />
          <CapsuleButton
            label="Logout"
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>}
            onClick={handleLogout}
            colorClass="text-red-500"
            iconColorClass="text-red-500"
          />
        </div>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
