import React from 'react';
import { X, TrendingUp, Package, Star, Clock, MapPin, Truck, BrainCircuit } from 'lucide-react';

const AiInsightsModal = ({ isOpen, onClose, data }) => {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div 
        className="modal-panel relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] p-6"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--text-main)] text-[var(--bg-primary)] flex items-center justify-center">
              <BrainCircuit size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-main)]">AI Product Insights</h2>
              <p className="text-sm text-[var(--text-muted)]">Real-time analysis & tracking</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors rounded-full hover:bg-[var(--bg-primary)]"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Left Column */}
          <div className="space-y-6">
            
            {/* Product Image */}
            {data.images && data.images.length > 0 && (
              <div className="w-full h-48 rounded-xl overflow-hidden border border-[var(--border-color)]">
                <img 
                  src={data.images[0].url || data.images[0]} 
                  alt="Product tracking view" 
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Story/Details */}
            <div className="premium-glass p-4 rounded-xl border border-[var(--border-color)]">
              <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center gap-2">
                <BrainCircuit size={14} /> AI Analysis
              </h3>
              <p className="text-sm text-[var(--text-main)] leading-relaxed">
                {data.details}
              </p>
            </div>

            {/* Price Prediction */}
            <div className={`p-4 rounded-xl border ${data.pricePrediction ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
               <h3 className="text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                 <TrendingUp size={14} /> Price Forecast
               </h3>
               <p className="text-sm">
                 {data.pricePrediction 
                   ? 'High probability of price increase soon. Recommended to buy now.' 
                   : 'Price is expected to remain stable or drop. You may want to wait.'}
               </p>
            </div>
            
            {/* Seller Info */}
            <div className="premium-glass p-4 rounded-xl border border-[var(--border-color)]">
              <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Seller Details</h3>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-main)] font-medium">{data.seller?.name}</span>
                {data.seller?.isVerified && (
                  <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full border border-blue-500/30">Verified</span>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            
            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="premium-glass p-3 rounded-xl border border-[var(--border-color)] text-center">
                <Star size={16} className="mx-auto mb-1 text-yellow-500" />
                <div className="text-xl font-bold text-[var(--text-main)]">{data.recommendationScore}/100</div>
                <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">AI Score</div>
              </div>
              
              <div className="premium-glass p-3 rounded-xl border border-[var(--border-color)] text-center">
                <Package size={16} className="mx-auto mb-1 text-blue-400" />
                <div className="text-xl font-bold text-[var(--text-main)]">{data.inventory}</div>
                <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">In Stock</div>
              </div>
            </div>

            {/* Purchase Tracking */}
            <div className="premium-glass p-4 rounded-xl border border-[var(--border-color)]">
              <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2"><Truck size={14} /> Live Tracking</span>
                <span className="text-xs font-normal text-[var(--accent-gray)]">{data.purchaseTracking?.recentCount || 0} recent orders</span>
              </h3>
              
              {data.purchaseTracking?.purchases?.length > 0 ? (
                <div className="space-y-3">
                  {data.purchaseTracking.purchases.slice(0, 3).map((purchase, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm py-2 border-b border-[var(--border-color)] last:border-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-[var(--text-muted)]" />
                        <span className="text-[var(--text-main)] truncate max-w-[120px]">{purchase.buyerLocation}</span>
                      </div>
                      <div className="flex items-center gap-2">
                         <span className={`text-[10px] px-2 py-0.5 rounded-full ${purchase.isShipped ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                           {purchase.status}
                         </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--text-muted)] text-center py-4">No recent tracking data available.</p>
              )}
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiInsightsModal;
