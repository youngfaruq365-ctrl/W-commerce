import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { WIcon } from '../../components/visual/WIcon';
import TwoFactorIcon from '../../assets/images/auth/two_factor.png';
import { ROUTES } from '../../constants/routes';
import { apiClient as axios } from '../../utils/apiClient';
import { useAuthStore } from '../../store/authStore';


const TwoFactorAuthentication = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Try to get email from location state
  const email = location.state?.email || '';

  const handleKeyPress = (num) => {
    if (code.length < 6) setCode(prev => prev + num);
  };
  const handleBackspace = () => {
    setCode(prev => prev.slice(0, -1));
  };

  useEffect(() => {
    if (code.length === 6) {
      verifyCode(code);
    }
  }, [code]);

  const verifyCode = async (otpCode) => {
    if (loading) return;
    if (!email) {
      toast.error('Email not found. Please login again.');
      return;
    }
    try {
      setLoading(true);
      const response = await axios.post('/api/v1/auth/verify-2fa', { email, code: otpCode });
      
      const { user, token } = response.data;
      if (token) localStorage.setItem('token', token);
      
      // We need to set the user state in auth store before navigating
      useAuthStore.getState().setUser(user);
      
      toast.success('Two-factor authentication successful!', { style: { background: '#333', color: '#fff', borderRadius: '8px' }});
      
      const role = user?.role?.toUpperCase();
      let target = ROUTES.BUYER_DASHBOARD;
      if (!role || role === 'PENDING') target = ROUTES.ROLE_SELECTION;
      else if (role === 'SELLER')  target = ROUTES.SELLER_DASHBOARD;
      else if (role === 'ADMIN')   target = ROUTES.ADMIN_DASHBOARD;
      else if (role === 'COURIER') target = ROUTES.COURIER_DASHBOARD;
      window.location.href = target;
    } catch(err) {
      toast.error(err.response?.data?.message || 'Invalid code');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-6 flex flex-col pt-4">
      <div className="flex items-center mb-8">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-900 hover:bg-gray-100 rounded-full transition-colors">
          <WIcon name="chevron-left" size={24} />
        </button>
      </div>

      <div className="flex flex-col items-center text-center">
        <div className="relative mb-6">
           <div className="absolute inset-0 bg-gray-100 rounded-full blur-2xl opacity-60 scale-150"></div>
           <img src={TwoFactorIcon} alt="2FA" className="w-24 h-24 object-contain relative z-10 drop-shadow-md" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Two-Factor Authentication</h1>
        <p className="text-gray-500 text-sm mb-10 max-w-[250px]">Enter the 6-digit code from your authenticator app.</p>

        <div className="flex gap-2 justify-center mb-8 w-full max-w-sm mx-auto">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div 
              key={index}
              className={`w-12 h-14 rounded-xl border flex items-center justify-center text-2xl font-bold transition-all ${
                code.length === index ? 'border-[#4A5568] shadow-sm' : 
                code.length > index ? 'border-gray-400 text-gray-900' : 'border-gray-200 text-gray-300'
              }`}
            >
              {code[index] || ''}
            </div>
          ))}
        </div>
        
        <button 
          disabled={loading}
          onClick={() => {
            if (code.length === 6) {
              verifyCode(code);
            } else {
              toast.error('Please enter the 6-digit code');
            }
          }}
          className="mb-4 bg-slate-900 text-white px-6 py-2 rounded-xl font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          {loading ? 'Verifying...' : 'Verify'}
        </button>

        <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  className="text-gray-500 text-sm hover:underline font-medium">
          Can't access your authenticator?
        </button>
      </div>

      <div className="mt-auto mb-8 bg-gray-50 rounded-[32px] p-6 shadow-sm border border-gray-100">
        <div className="grid grid-cols-3 gap-y-6 gap-x-8 max-w-xs mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button key={num} onClick={() => handleKeyPress(num)} className="text-3xl font-medium text-gray-900 py-1 hover:bg-gray-200 rounded-2xl transition-colors flex flex-col items-center active:scale-95">
              <span>{num}</span>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-1">
                 {num === 2 ? 'ABC' : num === 3 ? 'DEF' : num === 4 ? 'GHI' : num === 5 ? 'JKL' : num === 6 ? 'MNO' : num === 7 ? 'PQRS' : num === 8 ? 'TUV' : num === 9 ? 'WXYZ' : ' '}
              </span>
            </button>
          ))}
          <div />
          <button onClick={() => handleKeyPress(0)} className="text-3xl font-medium text-gray-900 py-1 hover:bg-gray-200 rounded-2xl transition-colors active:scale-95 flex items-center justify-center">0</button>
          <button onClick={handleBackspace} className="flex items-center justify-center text-gray-900 hover:bg-gray-200 rounded-2xl transition-colors active:scale-95">
            <svg width="28" height="20" viewBox="0 0 28 20" fill="none" xmlns="http://www.w3.org/2000/svg">
               <path d="M10 2L3 10L10 18H25C26.1046 18 27 17.1046 27 16V4C27 2.89543 26.1046 2 25 2H10Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
               <path d="M14 7L20 13M20 7L14 13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
export default TwoFactorAuthentication;
