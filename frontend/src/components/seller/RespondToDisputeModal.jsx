import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Package, 
  RotateCcw, 
  ShieldAlert, 
  FileCheck, 
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';
import { useSellerStore } from '../../store/sellerStore';

const RespondToDisputeModal = ({ isOpen, onClose, dispute }) => {
  const { respondToDispute, isLoading } = useSellerStore();
  const [responseType, setResponseType] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ hours: 48, minutes: 0, seconds: 0, expired: false });

  // Parse structured description or plain text
  const parsedDispute = React.useMemo(() => {
    if (!dispute) return {};
    let structured = null;
    if (dispute.description) {
      try {
        structured = JSON.parse(dispute.description);
      } catch {
        structured = null;
      }
    }

    return {
      userStatement: structured?.userStatement || dispute.description || 'No detailed statement provided.',
      causeCategory: structured?.causeCategory || dispute.reason || 'GENERAL_DISPUTE',
      causeTitle: structured?.causeTitle || dispute.reason || 'Product Issue',
      subCause: structured?.subCause || null,
      subCauseLabel: structured?.subCauseLabel || null,
      desiredResolution: structured?.desiredResolution || 'REFUND'
    };
  }, [dispute]);

  // Live 48-hour countdown timer
  useEffect(() => {
    if (!dispute) return;

    const deadline = dispute.responseDeadline 
      ? new Date(dispute.responseDeadline).getTime()
      : new Date(dispute.createdAt).getTime() + (48 * 60 * 60 * 1000);

    const updateTimer = () => {
      const now = Date.now();
      const diff = deadline - now;
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, expired: true });
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds, expired: false });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [dispute]);

  if (!isOpen || !dispute) return null;

  const parseEvidence = (urls) => {
    if (!urls) return [];
    if (typeof urls === 'string') {
      try { return JSON.parse(urls); } catch (e) { return [urls]; }
    }
    return Array.isArray(urls) ? urls : [];
  };

  const evidenceList = parseEvidence(dispute.evidenceUrls);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!responseType) {
      return window.__gxAlert?.('Please choose an action option.') ?? alert('Please choose an action option.');
    }
    if (!message.trim()) {
      return window.__gxAlert?.('Please write a message explaining your decision.') ?? alert('Please write a message.');
    }

    const payload = {
      response: responseType,
      message,
    };

    const success = await respondToDispute(dispute.id, payload);
    if (success) {
      setIsSuccess(true);
      setTimeout(() => {
        setResponseType('');
        setMessage('');
        setIsSuccess(false);
        onClose();
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                Respond to Buyer Dispute
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                #{dispute.orderId?.slice(0, 8)?.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Review claim causes & respond within 48 hours to preserve store rating
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in duration-300 text-center">
            <CheckCircle className="text-emerald-500 w-20 h-20 animate-bounce" />
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">Response Submitted!</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">
              Your resolution response has been recorded. Both the buyer and escrow ledger have been notified.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
            
            {/* 48-Hour Live Countdown Banner */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
              timeLeft.expired 
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400' 
                : timeLeft.hours < 12 
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300' 
                  : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-700 dark:text-indigo-300'
            }`}>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 flex-shrink-0 animate-pulse" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider">
                    {timeLeft.expired ? 'Response Window Expired' : 'Seller Response Deadline'}
                  </p>
                  <p className="text-xs opacity-90 mt-0.5">
                    {timeLeft.expired 
                      ? 'Admin mediation triggered due to elapsed response window.' 
                      : 'Unanswered disputes auto-escalate and add penalty risk to your store rating.'}
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="font-mono font-black text-lg sm:text-xl">
                  {timeLeft.expired ? '00:00:00' : `${String(timeLeft.hours).padStart(2, '0')}:${String(timeLeft.minutes).padStart(2, '0')}:${String(timeLeft.seconds).padStart(2, '0')}`}
                </span>
              </div>
            </div>

            {/* Banning Risk Alert Pill */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span>
                <strong>Store Rating Notice:</strong> Amicable refund or replacement agreements protect your store from the +20% high-dispute banning rate penalty.
              </span>
            </div>

            {/* Buyer Claim & Structured Causes */}
            <div className="bg-zinc-50 dark:bg-zinc-800/60 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                  <Package size={16} className="text-blue-500" />
                  Buyer's Stated Cause
                </h3>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                  {parsedDispute.desiredResolution === 'REFUND' ? 'Requesting Full Refund' : parsedDispute.desiredResolution === 'REPLACEMENT' ? 'Requesting Replacement' : 'Requesting Solution'}
                </span>
              </div>

              {/* Cause Badges */}
              <div className="flex flex-wrap gap-2 pt-1">
                <div className="px-3 py-1 rounded-lg text-xs font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 shadow-sm flex items-center gap-1.5">
                  <AlertTriangle size={13} className="text-amber-500" />
                  <span>Category: {parsedDispute.causeTitle}</span>
                </div>
                {parsedDispute.subCauseLabel && (
                  <div className="px-3 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                    Sub-Cause: {parsedDispute.subCauseLabel}
                  </div>
                )}
              </div>

              {/* Buyer Statement */}
              <div className="pt-2">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium uppercase mb-1">Buyer's Description</p>
                <p className="text-zinc-800 dark:text-zinc-200 text-sm whitespace-pre-wrap bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-700/50">
                  {parsedDispute.userStatement}
                </p>
              </div>

              {/* Evidence Gallery */}
              {evidenceList.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium uppercase mb-2">
                    Evidence Attached ({evidenceList.length})
                  </p>
                  <div className="flex gap-2.5 overflow-x-auto pb-1">
                    {evidenceList.map((url, idx) => (
                      <a 
                        key={idx} 
                        href={url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="group relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-zinc-300 dark:border-zinc-700 shadow-sm hover:ring-2 hover:ring-blue-500 transition-all"
                      >
                        <img src={url} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                          <ExternalLink size={14} />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3-Way Action Chooser */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-2">
                Choose Your Resolution Action
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Approve Refund */}
                <button
                  type="button"
                  onClick={() => setResponseType('SELLER_REFUND_APPROVED')}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    responseType === 'SELLER_REFUND_APPROVED'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/50'
                      : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 hover:border-emerald-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">Approve Refund</span>
                    <CheckCircle size={16} className={responseType === 'SELLER_REFUND_APPROVED' ? 'text-emerald-500' : 'text-zinc-400'} />
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">
                    Releases escrow back to buyer immediately. 0% penalty to store rating.
                  </p>
                </button>

                {/* 2. Offer Replacement */}
                <button
                  type="button"
                  onClick={() => setResponseType('SELLER_REPLACEMENT')}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    responseType === 'SELLER_REPLACEMENT'
                      ? 'bg-blue-500/10 border-blue-500 text-blue-950 dark:text-blue-100 ring-2 ring-blue-500/50'
                      : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 hover:border-blue-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-blue-600 dark:text-blue-400">Offer Replacement</span>
                    <RotateCcw size={16} className={responseType === 'SELLER_REPLACEMENT' ? 'text-blue-500' : 'text-zinc-400'} />
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">
                    Dispatch free replacement unit. Escrow stays safely locked.
                  </p>
                </button>

                {/* 3. Contest / Reject */}
                <button
                  type="button"
                  onClick={() => setResponseType('SELLER_REJECTED')}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    responseType === 'SELLER_REJECTED'
                      ? 'bg-rose-500/10 border-rose-500 text-rose-950 dark:text-rose-100 ring-2 ring-rose-500/50'
                      : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 hover:border-rose-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-rose-600 dark:text-rose-400">Contest Claim</span>
                    <ShieldAlert size={16} className={responseType === 'SELLER_REJECTED' ? 'text-rose-500' : 'text-zinc-400'} />
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">
                    Dispute goes to admin mediation. Submit your counter-evidence.
                  </p>
                </button>
              </div>
            </div>

            {/* Explanation / Notes input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                {responseType === 'SELLER_REJECTED' ? 'Contest Grounds & Counter-Evidence Summary' : 'Response Message to Buyer'}
              </label>
              <textarea
                rows={3}
                className="w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-2xl p-3.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder={
                  responseType === 'SELLER_REFUND_APPROVED'
                    ? 'e.g. We apologize for the damaged parcel and approved your full refund right away.'
                    : responseType === 'SELLER_REPLACEMENT'
                      ? 'e.g. We will dispatch a brand new unit via express courier within 24 hours. Tracking will be provided.'
                      : responseType === 'SELLER_REJECTED'
                        ? 'e.g. Order was verified weighed at drop-off and courier signature confirmed delivery to customer address.'
                        : 'Write message explaining your chosen resolution...'
                }
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !responseType}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                {isLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm Resolution</span>
                    <ChevronRight size={14} />
                  </>
                )}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};

export default RespondToDisputeModal;
