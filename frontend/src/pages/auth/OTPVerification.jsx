import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ROUTES } from '../../constants/routes';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../utils/apiClient';
import { WIcon } from '../../components/visual/WIcon';
import './AuthPage.css';

const OTPVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const phone = location.state?.phone || '';
  const email = location.state?.email || '';

  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const timerRef = useRef(null);

  const { verifyOTP } = useAuthStore();

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

  useEffect(() => {
    const onKeyDown = (e) => {
      if (isVerifying) return;
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [code, isVerifying]);

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
        toast.success('Account verified! Please log in to continue.', { style: { background: '#333', color: '#fff', borderRadius: '8px' }});
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
      const res = await apiClient.post('/api/v1/auth/resend-verification', { phone, email });
      if (res.data.success) {
        toast.success('Verification code resent successfully!');
        if (res.data._devCode) {
          toast.success(`[DEV] Your OTP code is: ${res.data._devCode}`, { duration: 10000 });
        }
      }
      else toast.error(res.data.message || 'Could not resend code');
    } catch(err) {
      toast.error(err.response?.data?.message || 'Failed to resend code. Try again.');
    }
  };

  const formatTimer = (seconds) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <main className="page" style={{ minHeight: '100%', padding: '100px 20px 40px', overflowY: 'auto' }}>
      {/* Decorative shapes */}
      <div className="shape shape-1" />
      <div className="shape shape-2" />
      <div className="shape shape-3" />
      <div className="shape shape-4" />

      <div className="auth-wrapper" style={{ marginTop: '30px', marginBottom: '30px' }}>
        <div className="auth-card">
          <section className="auth-panel login-panel flex flex-col items-center !pt-12 !pb-10">
            
            <div className="w-full relative flex justify-center items-center mb-10 mt-2">
               <button onClick={() => navigate(-1)} className="absolute left-0 p-2 text-[#7b8491] hover:text-[#0072ff] hover:bg-[#0072ff15] rounded-full transition-colors active:scale-95">
                 <WIcon name="chevron-left" size={24} />
               </button>
               <div className="logo !m-0 !w-16 !h-16 text-2xl flex items-center justify-center shrink-0">
                 <WIcon name={isVerifying ? 'loader-2' : 'lock'} size={26} className={isVerifying ? 'animate-spin' : ''} />
               </div>
            </div>

            <h1 className="title">
              {isVerifying ? 'Verifying...' : 'Verify Your Email'}
            </h1>
            <p className="subtitle" style={{ marginBottom: '8px' }}>Enter the 6-digit code sent to</p>
            <p className="subtitle" style={{ fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '16px' }}>{email || phone}</p>

            {/* OTP Digit Display */}
            <div className="flex gap-4 justify-center mb-12 w-full max-w-sm mx-auto mt-6">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <div
                  key={index}
                  className={`otp-digit w-[14%] aspect-square rounded-xl flex items-center justify-center text-xl sm:text-2xl font-bold transition-all ${
                    code.length === index ? 'active text-[#0072ff]' : code.length > index ? 'text-[var(--text-main)]' : 'text-gray-400 dark:text-gray-600'
                  }`}
                >
                  {code[index] ? '•' : ''}
                </div>
              ))}
            </div>

            {/* Resend */}
            <div className="my-6 w-full text-center">
              {canResend ? (
                <button onClick={handleResend} className="text-[#0072ff] font-bold text-base hover:underline py-3">
                  Resend Code
                </button>
              ) : (
                <p className="text-[#7b8491] text-base py-3">
                  Resend code in <span className="font-bold text-[var(--text-main)]">{formatTimer(resendTimer)}</span>
                </p>
              )}
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-y-6 gap-x-8 max-w-xs mx-auto w-full mt-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  onClick={() => handleKeyPress(num)}
                  disabled={isVerifying}
                  className="numpad-btn flex flex-col items-center justify-center w-full aspect-square rounded-[18px] text-2xl font-bold text-[var(--text-main)] disabled:opacity-40"
                >
                  <span>{num}</span>
                  <span className="text-[9px] text-[#7b8491] font-bold uppercase tracking-widest leading-none mt-1">
                    {num === 2 ? 'ABC' : num === 3 ? 'DEF' : num === 4 ? 'GHI' : num === 5 ? 'JKL' : num === 6 ? 'MNO' : num === 7 ? 'PQRS' : num === 8 ? 'TUV' : num === 9 ? 'WXYZ' : ' '}
                  </span>
                </button>
              ))}
              <div />
              <button onClick={() => handleKeyPress(0)} disabled={isVerifying} className="numpad-btn flex items-center justify-center w-full aspect-square rounded-[18px] text-2xl font-bold text-[var(--text-main)] disabled:opacity-40">0</button>
              <button onClick={handleBackspace} disabled={isVerifying} className="numpad-btn flex items-center justify-center w-full aspect-square rounded-[18px] text-[var(--text-main)] disabled:opacity-40">
                <svg width="24" height="20" viewBox="0 0 28 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                   <path d="M10 2L3 10L10 18H25C26.1046 18 27 17.1046 27 16V4C27 2.89543 26.1046 2 25 2H10Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                   <path d="M14 7L20 13M20 7L14 13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

          </section>
        </div>
      </div>
    </main>
  );
};
export default OTPVerification;
