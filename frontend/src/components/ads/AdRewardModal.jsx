import React, { useState, useEffect } from 'react';
import { apiClient as axios } from '@/utils/apiClient';
import { toast } from 'react-hot-toast';
import { X } from 'lucide-react';

const AdRewardModal = ({ isOpen, onClose, productId, onSuccess, currentStage }) => {
  const [adPlaying, setAdPlaying] = useState(false);
  const [countdown, setCountdown] = useState(5); // 5 second mock ad
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let timer;
    if (adPlaying && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (adPlaying && countdown === 0) {
      completeAdWatch();
    }
    return () => clearTimeout(timer);
  }, [adPlaying, countdown]);

  const handleWatchAd = () => {
    setAdPlaying(true);
    setCountdown(5);
  };

  const completeAdWatch = async () => {
    setAdPlaying(false);
    setLoading(true);
    try {
      const endpoint = currentStage === 0 
        ? '/api/v1/ads/discount/start' 
        : '/api/v1/ads/discount/claim-next';

      const res = await axios.post(endpoint, { productId }, { withCredentials: true });
      if (res.data.success) {
        toast.success(res.data.message);
        onSuccess(res.data.data);
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to claim discount');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="modal-panel bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="font-bold text-lg text-black">Unlock Discount</h2>
          {!adPlaying && (
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-500">
              <X size={20} />
            </button>
          )}
        </div>
        
        <div className="flex flex-col items-center justify-center p-6">
          {!adPlaying ? (
            <>
              <div className="text-center mb-6">
                <p className="text-sm text-gray-600 mb-2">
                  Watch a short video ad to unlock your discount!
                </p>
                <div className="font-black text-2xl text-[var(--accent-primary)]">
                  {currentStage === 0 ? 'Get 2% Off' : currentStage === 1 ? 'Get 4% Off' : 'Get 5% Off'}
                </div>
              </div>
              <button 
                onClick={handleWatchAd} 
                disabled={loading} 
                className="w-full bg-black text-white font-bold py-3 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Processing...' : 'Watch Ad Now'}
              </button>
            </>
          ) : (
            <div className="w-full bg-black aspect-video flex items-center justify-center text-white relative rounded overflow-hidden shadow-inner">
              <span className="absolute top-2 right-2 text-xs font-bold bg-gray-800/80 px-2 py-1 rounded">
                Ad: {countdown}s
              </span>
              <p className="text-gray-400 text-sm font-medium animate-pulse">Sponsored Content Playing...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdRewardModal;
