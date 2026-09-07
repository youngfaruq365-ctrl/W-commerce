import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ROUTES } from '../../constants/routes';
import { useAuthStore } from '../../store/authStore';
import { WIcon } from '../../components/visual/WIcon';

const OTPVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Phone shown in the UI; email is required for actual API verification
  const phone = location.state?.phone || '';
  const email = location.state?.email || '';

  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const timerRef = useRef(null);

  const { verifyOTP } = useAuthStore();

  // Countdown timer for resend
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const handleKeyPress = (num) => {
    if (code.length < 6) setCode(prev => prev + String(num));
  };

  const handleBackspace = () => {
    setCode(prev => prev.slice(0, -1));
  };

  const submitCode = async (enteredCode) => {
    if (isVerifying) return;
    const finalCode = enteredCode || code;
    if (finalCode.length !== 6) return;

    if (!email) {
      toast.error('Session expired. Please sign up again.');
      navigate(ROUTES.SIGNUP);
      return;
    }

    setIsVerifying(true);
    try {
      const result = await verifyOTP(email, finalCode);
      if (result.success) {
        toast.success('Phone verified! Please log in to continue.', { style: { background: '#333', color: '#fff', borderRadius: '8px' }});
        navigate(ROUTES.LOGIN, { replace: true });
      } else {
        toast.error(result.message || 'Invalid code. Please try again.');
        setCode('');
      }
    } catch {
      toast.error('Verification failed. Please try again.');
      setCode('');
    } finally {
      setIsVerifying(false);
    }
  };

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (code.length === 6) {
      submitCode(code);
    }
  }, [code]);

  const handleResend = async () => {
    if (!canResend) return;
    setCanResend(false);
    setResendTimer(60);
    timerRef.current = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); setCanResend(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    try {
      const res = await fetch('/api/v1/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.success) toast.success('A new code has been sent!');
      else toast.error(data.message || 'Could not resend code');
    } catch {
      toast.error('Failed to resend code. Try again.');
    }
  };

  const formatTimer = (seconds) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="min-h-screen bg-white p-6 flex flex-col pt-4">
      <div className="flex items-center mb-8">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-900 hover:bg-gray-100 rounded-full transition-colors">
          <WIcon name="chevron-left" size={24} />
        </button>
      </div>

      <div className="flex flex-col items-center text-center">
        <div className={`w-20 h-20 bg-[#4A5568] rounded-[24px] flex items-center justify-center mb-6 text-white shadow-lg transition-opacity ${isVerifying ? 'opacity-60 animate-pulse' : ''}`}>
          <WIcon name={isVerifying ? 'loader-2' : 'lock'} size={32} className={isVerifying ? 'animate-spin' : ''} />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          {isVerifying ? 'Verifying...' : 'Verify Your Phone'}
        </h1>
        <p className="text-gray-500 text-sm mb-1">Enter the 6-digit code sent to</p>
        <p className="text-gray-900 font-bold text-sm mb-10">{phone || email}</p>

        {/* OTP Digit Display */}
        <div className="flex gap-2 justify-center mb-8 w-full max-w-sm mx-auto">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div
              key={index}
              className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                code.length === index ? 'border-[#4A5568] shadow-sm scale-105' :
                code.length > index ? 'border-gray-400 text-gray-900' : 'border-gray-200 text-gray-300'
              }`}
            >
              {code[index] ? '•' : ''}
            </div>
          ))}
        </div>

        {/* Resend */}
        <div className="mb-4">
          {canResend ? (
            <button onClick={handleResend} className="text-[#4A5568] font-bold text-sm hover:underline py-2">
              Resend Code
            </button>
          ) : (
            <p className="text-gray-400 text-sm">
              Resend code in <span className="font-bold text-gray-900">{formatTimer(resendTimer)}</span>
            </p>
          )}
        </div>
      </div>

      {/* Numpad */}
      <div className="mt-auto mb-8 bg-gray-50 rounded-[32px] p-6 shadow-sm border border-gray-100">
        <div className="grid grid-cols-3 gap-y-6 gap-x-8 max-w-xs mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              disabled={isVerifying}
              className="text-3xl font-medium text-gray-900 py-1 hover:bg-gray-200 rounded-2xl transition-colors flex flex-col items-center active:scale-95 disabled:opacity-40"
            >
              <span>{num}</span>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-1">
                {num === 2 ? 'ABC' : num === 3 ? 'DEF' : num === 4 ? 'GHI' : num === 5 ? 'JKL' : num === 6 ? 'MNO' : num === 7 ? 'PQRS' : num === 8 ? 'TUV' : num === 9 ? 'WXYZ' : ' '}
              </span>
            </button>
          ))}
          <div />
          <button onClick={() => handleKeyPress(0)} disabled={isVerifying} className="text-3xl font-medium text-gray-900 py-1 hover:bg-gray-200 rounded-2xl transition-colors active:scale-95 flex items-center justify-center disabled:opacity-40">0</button>
          <button onClick={handleBackspace} disabled={isVerifying} className="flex items-center justify-center text-gray-900 hover:bg-gray-200 rounded-2xl transition-colors active:scale-95 disabled:opacity-40">
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
export default OTPVerification;
