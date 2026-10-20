import React from 'react';
import { AlertTriangle, ShieldCheck, Info } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * BanningRateCard component
 * Displays store banning rate / suspension risk gauge for buyers before purchasing.
 * Exactly matches the design from the seller/admin analytics system.
 */
const BanningRateCard = ({ banningRate = 0, className = '', compact = false, showExplanation = true }) => {
  const rate = Math.max(0, Math.min(100, Math.round(Number(banningRate) || 0)));

  // Gauge parameters for SVG semi-circle
  // Radius = 68, Stroke width = 16
  // Arc center at (100, 92), arc radius = 68
  // Arc from (32, 92) to (168, 92)
  const radius = 68;
  const strokeWidth = 16;
  const arcPerimeter = Math.PI * radius; // ~213.63
  const strokeDashoffset = arcPerimeter - (arcPerimeter * rate) / 100;

  // Determine risk level color & label
  let statusColor = '#3b82f6'; // default/low
  let statusBadge = { text: 'Low Risk', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
  let statusDescription = 'Store is in good standing with active buyer protection and reliable order fulfillment.';

  if (rate >= 70) {
    statusColor = '#ef4444'; // Red
    statusBadge = { text: 'High Risk', bg: 'bg-red-500/10 text-red-400 border-red-500/20' };
    statusDescription = 'This store has accumulated critical fulfillment penalties. Exercise caution before ordering.';
  } else if (rate >= 30) {
    statusColor = '#f59e0b'; // Amber
    statusBadge = { text: 'Moderate Risk', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
    statusDescription = 'Minor order dispatch delays recorded. Protected by standard escrow.';
  } else if (rate === 0) {
    statusColor = '#10b981'; // Green
    statusBadge = { text: 'Optimal (0%)', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    statusDescription = 'Pristine track record with zero dispatch or dispute penalties.';
  }

  if (compact) {
    return (
      <div className={`bg-black text-white border border-white/10 rounded-2xl p-4 shadow-xl ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <div>
              <span className="text-xs font-bold text-white block leading-none">Banning Rate</span>
              <span className="text-[10px] text-gray-400 block mt-0.5">Suspension risk</span>
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge.bg}`}>
            {rate}%
          </span>
        </div>
        <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ 
              width: `${Math.max(rate, 4)}%`,
              backgroundColor: rate >= 70 ? '#ef4444' : rate >= 30 ? '#f59e0b' : '#10b981'
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`bg-black text-white border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden flex flex-col justify-between ${className}`}
    >
      {/* Subtle top ambient glow */}
      <div 
        className="absolute -top-12 -right-12 w-36 h-36 rounded-full blur-3xl pointer-events-none opacity-20"
        style={{ backgroundColor: rate >= 70 ? '#ef4444' : '#3b82f6' }}
      />

      {/* Header */}
      <div className="flex items-start justify-between z-10">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <span>Banning Rate</span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-400 mt-1 font-medium">Store suspension risk</p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusBadge.bg}`}>
          {statusBadge.text}
        </span>
      </div>

      {/* Semicircular Speedometer Gauge */}
      <div className="relative flex flex-col items-center justify-center my-4 py-2 z-10">
        <svg 
          viewBox="0 0 200 115" 
          className="w-48 sm:w-56 overflow-visible"
        >
          {/* Background Track Arc */}
          <path
            d="M 28 100 A 72 72 0 0 1 172 100"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
          />

          {/* Active Filled Arc */}
          {rate > 0 && (
            <path
              d="M 28 100 A 72 72 0 0 1 172 100"
              fill="none"
              stroke={statusColor}
              strokeWidth={strokeWidth}
              strokeLinecap="butt"
              strokeDasharray={arcPerimeter}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
            />
          )}
        </svg>

        {/* Center Labels */}
        <div className="absolute bottom-2 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {rate}%
          </span>
          <span className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-wider mt-0.5">
            {rate >= 100 ? 'SUSPENDED' : 'CURRENT RATE'}
          </span>
        </div>
      </div>

      {/* Buyer Protection Explanation */}
      {showExplanation && (
        <div className="z-10 mt-2 pt-3 border-t border-white/10 flex items-center gap-2 text-xs text-gray-400">
          <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
          <span className="line-clamp-2 leading-relaxed">{statusDescription}</span>
        </div>
      )}
    </motion.div>
  );
};

export default BanningRateCard;
