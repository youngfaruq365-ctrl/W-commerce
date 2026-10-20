import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Truck } from 'lucide-react';
import { apiClient as axios } from '@/utils/apiClient';
import GXModal from '../shared/ui/GXModal';
import GXIcon from '../shared/assets/GXIcon';
import GXSkeleton from '../shared/ui/GXSkeleton';
import { MapView } from '../../maps/MapView';

const TrackingModal = ({ isOpen, onClose, orderId }) => {
  const navigate = useNavigate();
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && orderId) {
      fetchTrackingData();
    } else {
      setTrackingData(null);
      setLoading(true);
      setError(null);
    }
  }, [isOpen, orderId]);

  const fetchTrackingData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL || window.location.origin}/api/v1/tracking/by-order/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.success) {
        setTrackingData({
          ...data.data,
          events: data.data.trackingEvents || [],
          trackingNumber: data.data.trackingNumber || data.data.id || 'N/A',
          carrier: data.data.carrier || 'GlobalX Logistics'
        });
      } else {
        setError(data.message || 'Failed to load tracking');
      }
    } catch (err) {
      try {
        const payAiRes = await axios.get(`/api/v1/payai/orders/${orderId}/track`);
        if (payAiRes.data?.success && payAiRes.data.tracking) {
          const t = payAiRes.data.tracking;
          setTrackingData({
            trackingNumber: t.trackingNumber || t.orderNumber || orderId,
            carrier: t.carrier || t.carrierName || 'GIG Logistics Express',
            deliveryAddress: t.destination || t.destinationHub || 'Buyer Address',
            events: (t.checkpoints || []).map(cp => ({
              status: cp.status || 'IN_TRANSIT',
              message: cp.label || cp.status,
              location: t.origin || 'Regional Logistics Hub',
              createdAt: cp.timestamp || new Date()
            }))
          });
          return;
        }
      } catch (_) {}

      if (err.response && err.response.status === 404) {
        setTrackingData({ events: [], trackingNumber: 'PENDING', carrier: 'GIG Logistics Express' });
      } else {
        setError(err.response?.data?.message || 'An error occurred while fetching tracking info.');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderTimeline = () => {
    if (loading) return <div className="space-y-4"><GXSkeleton variant="card" /><GXSkeleton variant="card" /></div>;
    if (error) return <div className="text-gray-700 500 text-center">{error}</div>;
    if (!trackingData || !trackingData.events || trackingData.events.length === 0) {
      return <div className="text-center text-[var(--text-muted)] py-8">No tracking events available yet.</div>;
    }

    return (
      <div className="relative border-l border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] ml-4 space-y-8 pb-4">
        {trackingData.events.map((ev, index) => (
          <div key={index} className="relative pl-8 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${index * 100}ms` }}>
            <div className={`absolute -left-4 top-0 w-8 h-8 rounded-full flex items-center justify-center border-2 border-black
              ${index === 0 ? 'bg-[var(--accent-gray)] text-black shadow-[0_0_15px_var(--accent-gray-dim)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'}
            `}>
              {index === 0 ? <GXIcon name="success" size={16} /> : <div className="w-2 h-2 rounded-full bg-current" />}
            </div>
            <div>
              <p className={`font-bold ${index === 0 ? 'text-black' : 'text-[var(--text-muted)]'}`}>{ev.status.replace(/_/g, ' ')}</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">{ev.message}</p>
              <div className="flex justify-between items-center mt-2 text-xs text-[var(--text-muted)]">
                <span>{ev.location}</span>
                <span>{new Date(ev.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <GXModal
      isOpen={isOpen}
      onClose={onClose}
      title="Track Order"
      maxWidth="3xl"
    >
      <div className="p-2 flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/2 h-64 md:h-[500px] rounded-2xl overflow-hidden bg-[#e5e3df]">
           {trackingData && !loading ? (
             <MapView 
               activeRoute={{
                  pickupLat: 6.4281, // VI
                  pickupLng: 3.4219,
                  pickupAddress: "GlobalX Distribution Center",
                  dropoffLat: 6.5244, // Ikeja
                  dropoffLng: 3.3792,
                  dropoffAddress: trackingData?.deliveryAddress || "Buyer Address"
               }} 
               className="w-full h-full" 
             />
           ) : (
             <GXSkeleton variant="card" className="w-full h-full" />
           )}
        </div>
        
        <div className="w-full md:w-1/2 max-h-[500px] overflow-y-auto pr-2">
          {trackingData && !loading && (
            <div className="mb-6 p-4 neu-panel rounded-2xl border border-[var(--border-color)]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-wider">Tracking Number</span>
                <span className="font-mono text-[var(--text-main)] font-black text-sm">{trackingData.trackingNumber}</span>
              </div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-wider">Carrier</span>
                <span className="text-[var(--text-main)] font-bold text-xs">{trackingData.carrier}</span>
              </div>
              <button
                onClick={() => {
                  onClose();
                  navigate(`/payai?tab=tracking&orderId=${orderId}`);
                }}
                className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Truck size={14} />
                <span>Open in PayAI Live Delivery Radar</span>
                <ExternalLink size={12} className="ml-1 opacity-70" />
              </button>
            </div>
          )}
          
          {renderTimeline()}
        </div>
      </div>
    </GXModal>
  );
};

export default TrackingModal;
