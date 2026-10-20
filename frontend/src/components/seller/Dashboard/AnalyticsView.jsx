import React from 'react';
import DashboardStats from './DashboardStats';
import DashboardCharts from './DashboardCharts';
import DecorativeWidgets from './DecorativeWidgets';
import BanningRiskAlertBanner from './BanningRiskAlertBanner';
import { Sparkles, Download } from 'lucide-react';

const AnalyticsView = ({ analytics, performanceData, products, setActiveTab }) => {
  return (
    <div className="space-y-6 sm:space-y-8 animate-[fadeIn_0.5s_ease-in-out] p-6 max-w-full overflow-hidden relative bg-white dark:bg-white rounded-3xl">
      {/* Banning Risk & Fulfillment Standards Alert Banner */}
      <BanningRiskAlertBanner setActiveTab={setActiveTab} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 relative z-10 neu-card p-6 md:p-8 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#006cff]/10 border border-[#006cff]/20 rounded-full text-[#006cff] text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles size={14} /> Live Insights
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-[var(--text-main)] mb-2 tracking-tight">Analytics Dashboard</h1>
          <p className="text-[var(--text-muted)] text-sm md:text-base font-medium">Real-time overview of your store's performance & growth metrics.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-5 py-2.5 neu-button text-[var(--text-main)]">
            <Download size={16} className="text-[#006cff]" />
            Export Report
          </button>
        </div>
      </div>
      
      <DecorativeWidgets analytics={analytics} />
      
      <div className="relative z-10">
        <DashboardStats analytics={analytics} />
      </div>
      
      <div className="relative z-10 mt-6">
        <DashboardCharts performanceData={performanceData} products={products} banningRate={analytics?.banningRate || 0} />
      </div>
    </div>
  );
};

export default AnalyticsView;
