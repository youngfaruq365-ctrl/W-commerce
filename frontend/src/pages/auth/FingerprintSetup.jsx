import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WIcon } from '../../components/visual/WIcon';
import toast from 'react-hot-toast';
import { ROUTES } from '../../constants/routes';
import { useAuthStore } from '../../store/authStore';

const FingerprintSetup = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { setupFingerprint } = useAuthStore();

  const handleSetup = async () => {
    try {
      setLoading(true);
      const result = await setupFingerprint();
      if (result.success) {
        toast.success('Passkey registered! You can now sign in with your fingerprint or face.', { icon: '🔐', duration: 5000 });
        window.history.length > 2 ? navigate(-1) : navigate(ROUTES.BUYER_PROFILE); // Go back if possible
      } else {
        toast.error(result.message || 'Failed to set up passkey');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to setup passkey');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-white p-6 flex flex-col pt-4">
      <div className="flex items-center mb-12">
        <button onClick={() => window.history.length > 2 ? navigate(-1) : navigate(ROUTES.BUYER_PROFILE)} className="p-2 text-gray-900 hover:bg-gray-100 rounded-full transition-colors">
          <WIcon name="chevron-left" size={24} />
        </button>
      </div>

      <div className="flex flex-col items-center text-center mb-12">
        <div className="mb-6 relative">
           <div className="absolute inset-0 bg-gray-100 rounded-full blur-2xl opacity-60 scale-150"></div>
           <WIcon name="fingerprint" size={96} className="text-gray-900 relative z-10 opacity-80" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Set Up Fingerprint</h1>
        <p className="text-gray-500 text-sm max-w-[220px] leading-relaxed">
          Add your fingerprint to login securely and quickly.
        </p>
      </div>

      <div className="space-y-6 max-w-xs mx-auto w-full mb-auto">
        <div className="flex items-center gap-4">
           <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
             <WIcon name="lock" size={18} className="text-gray-700" />
           </div>
           <span className="text-sm font-bold text-gray-900">Secure Access</span>
        </div>
        <div className="flex items-center gap-4">
           <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
             <WIcon name="zap" size={18} className="text-gray-700" />
           </div>
           <span className="text-sm font-bold text-gray-900">Fast Login</span>
        </div>
        <div className="flex items-center gap-4">
           <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
             <WIcon name="check-circle" size={18} className="text-gray-700" />
           </div>
           <span className="text-sm font-bold text-gray-900">Easy & Convenient</span>
        </div>
      </div>

      <div className="pt-8">
        <button 
          onClick={handleSetup} 
          disabled={loading}
          className="w-full bg-[#4A5568] text-white font-bold py-4 rounded-xl hover:bg-[#3A4558] transition-colors shadow-sm disabled:opacity-50"
        >
          {loading ? 'Setting up...' : 'Continue'}
        </button>
      </div>
    </div>
  );
};
export default FingerprintSetup;
