import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { WIcon } from '../../components/visual/WIcon';
import { loginWithPasskey } from '../../utils/webauthnService';

const UnlockAccess = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');

  const handleUnlock = async () => {
    if (!email) {
      toast.error('Please enter your email to unlock access');
      return;
    }
    try {
      setLoading(true);
      await loginWithPasskey(email);
      toast.success('Successfully unlocked!', { icon: '🚀' });
      navigate('/dashboard'); 
    } catch (err) {
      toast.error(err.message || 'Failed to unlock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-6 flex flex-col items-center pt-20">
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-[#4A5568] rounded-2xl flex items-center justify-center mb-4 text-white font-bold text-3xl shadow-sm">W</div>
        <h2 className="text-xl font-bold text-gray-900">W-Commerce</h2>
      </div>

      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Unlock Access</h1>
        <p className="text-gray-500 text-sm max-w-[200px] mx-auto mb-4">Use your fingerprint to access your account</p>
        <input 
          type="email" 
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full max-w-xs border border-gray-300 rounded-xl px-4 py-2 text-center text-gray-900 focus:outline-none focus:border-[#4A5568]"
        />
      </div>

      <button 
        disabled={loading}
        onClick={handleUnlock}
        className="relative w-48 h-48 flex items-center justify-center mb-16 cursor-pointer hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 bg-transparent border-none"
      >
        {/* Corner Brackets */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-gray-300 rounded-tl-xl"></div>
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-gray-300 rounded-tr-xl"></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-gray-300 rounded-bl-xl"></div>
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-gray-300 rounded-br-xl"></div>
        
        {/* Fingerprint pulse effect */}
        <div className="absolute inset-0 bg-[#4A5568]/5 rounded-full blur-xl animate-pulse"></div>
        <WIcon name="fingerprint" className="w-24 h-24 text-[#4A5568] relative z-10" />
      </button>

      <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  className="text-sm font-bold text-gray-900 hover:underline">
        Use PIN Instead
      </button>
    </div>
  );
};
export default UnlockAccess;
