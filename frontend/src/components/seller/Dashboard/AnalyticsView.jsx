import React from 'react';
import DashboardStats from './DashboardStats';
import DashboardCharts from './DashboardCharts';
import { Sparkles, Download } from 'lucide-react';

const AnalyticsView = ({ analytics, performanceData, products }) => {
  return (
    <div className="space-y-6 sm:space-y-8 animate-[fadeIn_0.5s_ease-in-out] px-2 sm:px-0 max-w-full overflow-hidden relative">
      {/* Decorative ambient background glows */}
      <div className="absolute -top-20 -right-20 w-[500px] h-[500px] bg-gradient-to-br from-[var(--color-10-accent)]/20 to-orange-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-40 -left-20 w-[400px] h-[400px] bg-gradient-to-tr from-blue-500/10 to-purple-500/10 blur-[100px] rounded-full pointer-events-none -z-10" />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 relative z-10 glass-premium p-6 md:p-8 rounded-3xl border border-white/20 dark:border-white/10 shadow-[var(--shadow-level-2)] hover-lift">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--color-10-accent)]/10 border border-[var(--color-10-accent)]/20 rounded-full text-[var(--color-10-accent)] text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles size={14} /> Live Insights
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400 mb-2 tracking-tight">Analytics Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base font-medium">Real-time overview of your store's performance & growth metrics.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-white/50 dark:bg-black/50 hover:bg-white dark:hover:bg-black border border-gray-200 dark:border-white/10 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-200 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 backdrop-blur-md group">
            <Download size={16} className="text-gray-500 dark:text-gray-400 group-hover:text-[var(--color-10-accent)] transition-colors" />
            Export Report
          </button>
        </div>
      </div>
      
      <div className="relative z-10">
        <DashboardStats analytics={analytics} />
      </div>
      
      <div className="relative z-10 glass-standard p-6 md:p-8 rounded-3xl border border-white/20 dark:border-white/10 shadow-[var(--shadow-level-3)] hover-glow">
        <DashboardCharts performanceData={performanceData} products={products} />
      </div>
    </div>
  );
};

export default AnalyticsView;
