import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { WIcon } from '../../components/visual/WIcon';
import { useAuthStore } from '../../store/authStore';
import { ROUTES } from '../../constants/routes';
const UnlockAccess = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [usePinMode, setUsePinMode] = useState(false);
  const [pin, setPin] = useState('');
  const { loginWithFingerprint, login } = useAuthStore();

  const redirectUserRole = (user) => {
    const role = user?.role?.toUpperCase();
    if (!role || role === 'PENDING') navigate(ROUTES.ROLE_SELECTION, { replace: true });
    else if (role === 'SELLER') navigate(ROUTES.SELLER_DASHBOARD, { replace: true });
    else if (role === 'ADMIN') navigate(ROUTES.ADMIN_DASHBOARD, { replace: true });
    else if (role === 'COURIER') navigate(ROUTES.COURIER_DASHBOARD, { replace: true });
    else navigate(ROUTES.BUYER_DASHBOARD, { replace: true });
  };

  const handleUnlock = async () => {
    if (!email) {
      toast.error('Please enter your email to unlock access');
      return;
    }
    try {
      setLoading(true);
      const result = await loginWithFingerprint(email);
      if (result.success) {
        toast.success('Successfully unlocked!', { icon: '🚀' });
        redirectUserRole(result.user);
      } else {
        toast.error(result.message || 'Failed to unlock');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to unlock');
    } finally {
      setLoading(false);
    }
  };

  const handlePinUnlock = async (e) => {
    e.preventDefault();
    if (!email || !pin) {
      toast.error('Please enter both your email and PIN / password');
      return;
    }
    try {
      setLoading(true);
      const result = await login(email, pin);
      if (result?.success) {
        toast.success('Successfully unlocked!', { icon: '🚀' });
        redirectUserRole(result.user);
      } else {
        toast.error(result?.message || 'Invalid email or PIN');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to unlock with PIN');
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

      <div className="text-center mb-10 w-full max-w-xs">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Unlock Access</h1>
        <p className="text-gray-500 text-sm max-w-[220px] mx-auto mb-4">
          {usePinMode ? 'Enter your account PIN or password to unlock' : 'Use your fingerprint to access your account'}
        </p>
        <input 
          type="email" 
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full max-w-xs border border-gray-300 rounded-xl px-4 py-2 text-center text-gray-900 focus:outline-none focus:border-[#4A5568]"
        />
      </div>

      {usePinMode ? (
        <form onSubmit={handlePinUnlock} className="w-full max-w-xs flex flex-col items-center gap-4 mb-12">
          <input
            type="password"
            placeholder="Enter PIN or Password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-center tracking-widest text-gray-900 focus:outline-none focus:border-[#4A5568]"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#4A5568] text-white font-bold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {loading ? 'Unlocking...' : 'Unlock with PIN'}
          </button>
        </form>
      ) : (
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
      )}

      <button
        type="button"
        onClick={() => setUsePinMode((prev) => !prev)}
        className="text-sm font-bold text-gray-900 hover:underline"
      >
        {usePinMode ? 'Use Fingerprint Instead' : 'Use PIN Instead'}
      </button>
    </div>
  );
};
export default UnlockAccess;
