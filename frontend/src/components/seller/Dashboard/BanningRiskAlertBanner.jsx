import React, { useEffect, useState } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  Package, 
  Truck, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  HelpCircle,
  XCircle,
  FileText
} from 'lucide-react';
import { useSellerStore } from '../../../store/sellerStore';

const BanningRiskAlertBanner = ({ setActiveTab }) => {
  const { banningStatus, fetchBanningStatus, curePenalty, banningLoading } = useSellerStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [curingIncidentId, setCuringIncidentId] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  useEffect(() => {
    fetchBanningStatus();
  }, [fetchBanningStatus]);

  if (!banningStatus) return null;

  const {
    banningRate = 0,
    riskTier = 'SAFE',
    isSuspended = false,
    incidents = [],
    activeIncidentsCount = 0,
    recoveryChecklist = [],
    disputeMetrics = {}
  } = banningStatus;

  // Filter active and cured incidents
  const activeIncidents = incidents.filter(i => i.status === 'ACTIVE');
  const curedIncidents = incidents.filter(i => i.status === 'CURED');

  const handleCure = async (incident) => {
    setCuringIncidentId(incident.id);
    setActionMessage(null);
    try {
      const res = await curePenalty({ incidentId: incident.id, orderId: incident.orderId });
      if (res.success) {
        setActionMessage({ type: 'success', text: `Cured! -${res.data?.curedIncident?.points || 10}% deducted from banning rate.` });
      } else {
        setActionMessage({ type: 'error', text: res.message || 'Could not cure penalty yet. Follow instructions below.' });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to cure penalty.' });
    } finally {
      setCuringIncidentId(null);
    }
  };

  // Determine styles by risk level
  const getBannerStyle = () => {
    if (isSuspended || banningRate >= 100) {
      return {
        bg: 'bg-gradient-to-r from-red-950 via-rose-900 to-red-900 border-red-500/60 text-white',
        badgeBg: 'bg-red-500/30 text-red-200 border-red-500/50',
        icon: <ShieldAlert className="w-6 h-6 text-red-400 animate-pulse flex-shrink-0" />,
        headline: 'STORE SUSPENDED — Banning Rate Reached 100%',
        sub: 'Your storefront operations are halted due to critical compliance violations. Cure eligible penalties below or file an appeal to restore active status.',
        tier: 'SUSPENDED'
      };
    }
    if (banningRate >= 75) {
      return {
        bg: 'bg-gradient-to-r from-red-900/90 via-orange-950/90 to-amber-950/90 border-red-500/40 text-white',
        badgeBg: 'bg-red-500/20 text-red-300 border-red-500/40',
        icon: <AlertTriangle className="w-6 h-6 text-red-400 animate-bounce flex-shrink-0" />,
        headline: `CRITICAL SUSPENSION RISK (${banningRate}%)`,
        sub: 'Your store is within 25% of immediate suspension. Cure pending order penalties now.',
        tier: 'CRITICAL'
      };
    }
    if (banningRate >= 50) {
      return {
        bg: 'bg-gradient-to-r from-amber-950/80 via-orange-950/80 to-amber-900/80 border-amber-500/40 text-amber-100',
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        icon: <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0" />,
        headline: `WARNING: High Banning Risk (${banningRate}%)`,
        sub: 'Penalty points accumulated. Unfulfilled or disputed orders require urgent attention.',
        tier: 'WARNING'
      };
    }
    if (banningRate > 0) {
      return {
        bg: 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/50 text-amber-900 dark:text-amber-200',
        badgeBg: 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border-amber-300',
        icon: <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />,
        headline: `Caution: Store Banning Rate at ${banningRate}%`,
        sub: `${activeIncidentsCount} active penalty incident(s). Maintain fast packing to avoid escalation.`,
        tier: 'CAUTION'
      };
    }
    // Safe (0%)
    return {
      bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-950 dark:text-emerald-200',
      badgeBg: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      icon: <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" />,
      headline: 'Store Compliance: Excellent (0% Penalty Risk)',
      sub: 'All orders packed & dispatched on schedule. Store standing is fully healthy.',
      tier: 'SAFE'
    };
  };

  const style = getBannerStyle();

  return (
    <div className={`rounded-2xl border p-4 sm:p-5 shadow-lg transition-all duration-300 mb-6 ${style.bg}`}>
      {/* Top Bar Banner Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          {style.icon}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-base sm:text-lg tracking-tight">
                {style.headline}
              </h3>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${style.badgeBg}`}>
                {style.tier}
              </span>
            </div>
            <p className="text-xs sm:text-sm opacity-90 mt-0.5 max-w-2xl">
              {style.sub}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-center">
          {banningRate > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/20 hover:bg-white/30 backdrop-blur transition-all"
            >
              <span>{isExpanded ? 'Hide Causes' : `View ${activeIncidentsCount} Causes`}</span>
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}

          {banningRate === 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium opacity-80 hover:opacity-100 transition-opacity"
            >
              <span>{isExpanded ? 'Hide Health Guide' : 'View Standards'}</span>
              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          )}

          <button
            onClick={() => fetchBanningStatus()}
            title="Refresh status"
            disabled={banningLoading}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-xs"
          >
            <RefreshCw size={14} className={banningLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Action feedback message */}
      {actionMessage && (
        <div className={`mt-3 p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
          actionMessage.type === 'success' 
            ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40' 
            : 'bg-rose-500/20 text-rose-200 border border-rose-500/40'
        }`}>
          {actionMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Expandable Causes & Cure Checklist */}
      {isExpanded && (
        <div className="mt-5 pt-5 border-t border-white/15 space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Active Incidents Breakdown */}
          {activeIncidents.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-2.5 opacity-90 flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-400" />
                Active Penalty Incidents ({activeIncidents.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeIncidents.map((inc) => (
                  <div 
                    key={inc.id}
                    className="p-3.5 rounded-xl bg-black/25 backdrop-blur-sm border border-white/10 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                          {inc.causeCode.includes('UNPACKED') && <Package size={15} className="text-amber-400" />}
                          {inc.causeCode.includes('UNSHIPPED') && <Truck size={15} className="text-blue-400" />}
                          {inc.causeCode.includes('DISPUTE') && <AlertTriangle size={15} className="text-rose-400" />}
                          {inc.causeName}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-rose-500/30 text-rose-300 border border-rose-500/40">
                          +{inc.points}%
                        </span>
                      </div>

                      {inc.orderNumber && (
                        <p className="text-xs text-white/80 font-mono mb-1">
                          Order Ref: <span className="font-semibold text-white">#{inc.orderNumber}</span>
                        </p>
                      )}

                      <p className="text-xs text-white/70">
                        {inc.cureInstructions || 'Take required fulfillment action to cure.'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] text-white/50">
                        {new Date(inc.appliedAt).toLocaleDateString()} at {new Date(inc.appliedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      
                      <div className="flex items-center gap-2">
                        {setActiveTab && (
                          <button
                            onClick={() => setActiveTab('orders')}
                            className="px-2.5 py-1 text-xs rounded-md bg-white/15 hover:bg-white/25 text-white font-medium transition-colors flex items-center gap-1"
                          >
                            <span>Open Orders</span>
                            <ExternalLink size={12} />
                          </button>
                        )}

                        <button
                          onClick={() => handleCure(inc)}
                          disabled={curingIncidentId === inc.id}
                          className="px-3 py-1 text-xs rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-md flex items-center gap-1 disabled:opacity-50"
                        >
                          {curingIncidentId === inc.id ? (
                            <RefreshCw size={12} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={12} />
                          )}
                          <span>Verify & Cure</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Standards & Prevention Checklist */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-2.5 opacity-90 flex items-center gap-2">
              <ShieldCheck size={14} className="text-emerald-400" />
              Banning Protection & Compliance Standards
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {recoveryChecklist.map((item) => (
                <div 
                  key={item.id} 
                  className={`p-3 rounded-xl border backdrop-blur-sm text-xs space-y-1 ${
                    item.status === 'ATTENTION_NEEDED'
                      ? 'bg-rose-950/40 border-rose-500/40 text-rose-100'
                      : 'bg-black/20 border-white/10 text-white/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white tracking-tight">{item.title}</span>
                    {item.status === 'ATTENTION_NEEDED' ? (
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    ) : (
                      <CheckCircle2 size={13} className="text-emerald-400" />
                    )}
                  </div>
                  <p className="text-[11px] opacity-75">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick appeal link if store is impacted */}
          {banningRate > 0 && setActiveTab && (
            <div className="pt-2 flex items-center justify-between text-xs text-white/70">
              <span>Believe a penalty was applied in error due to courier delays?</span>
              <button
                onClick={() => setActiveTab('appeal-dispute')}
                className="text-amber-300 hover:text-white underline font-semibold flex items-center gap-1"
              >
                <FileText size={13} />
                <span>Submit Penalty Appeal</span>
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default BanningRiskAlertBanner;
