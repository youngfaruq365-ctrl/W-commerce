import React, { useState, useEffect } from 'react';
import axios from 'axios';
import GXModal from '../shared/ui/GXModal';
import GXIcon from '../shared/assets/GXIcon';
import GXSkeleton from '../shared/ui/GXSkeleton';

const TrackingModal = ({ isOpen, onClose, orderId }) => {
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
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || window.location.origin}`}/api/v1/tracking/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.success) {
        setTrackingData(data);
      } else {
        setError(data.message || 'Failed to load tracking');
      }
    } catch (err) {
      setError('An error occurred while fetching tracking info.');
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
      maxWidth="md"
    >
      <div className="p-2">
        {trackingData && !loading && (
          <div className="mb-8 p-4 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[var(--text-muted)] text-sm">Tracking Number</span>
              <span className="font-mono text-black font-bold">{trackingData.trackingNumber}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-muted)] text-sm">Carrier</span>
              <span className="text-black font-bold">{trackingData.carrier}</span>
            </div>
          </div>
        )}
        
        {renderTimeline()}
      </div>
    </GXModal>
  );
};

export default TrackingModal;
