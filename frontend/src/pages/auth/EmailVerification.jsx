import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { WIcon } from '../../components/visual/WIcon';
import EmailVerifyIcon from '../../assets/images/auth/email_verify.png';
import { apiClient } from '../../utils/apiClient';
import './AuthPage.css';

const EmailVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [isResending, setIsResending] = useState(false);

  const handleResend = async () => {
    if (!email) return toast.error('Please enter an email address.');
    setIsResending(true);
    try {
      const res = await apiClient.post('/api/v1/auth/resend-verification', { email });
      if (res.data.success) {
        toast.success('Verification email sent!');
      } else {
        toast.error(res.data.message || 'Failed to resend email');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend email');
    } finally {
      setIsResending(false);
    }
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
                 ✉️
               </div>
            </div>

            <h1 className="title">Verify Your Email</h1>
            <p className="subtitle" style={{ marginBottom: '8px' }}>We've sent a verification link to</p>
            {location.state?.email ? (
              <p className="subtitle" style={{ fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '32px' }}>{email}</p>
            ) : (
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="Enter your email" 
                className="w-full max-w-[250px] p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-main)] mb-8 outline-none focus:border-[#0072ff]" 
              />
            )}

            <div className="relative mb-14 mt-4">
              <div className="absolute inset-0 bg-[#0072ff15] rounded-full blur-3xl opacity-50 scale-150"></div>
              <img src={EmailVerifyIcon} alt="Email Verification" className="w-40 h-40 object-contain relative z-10 drop-shadow-2xl animate-[bounce_3s_ease-in-out_infinite]" />
            </div>

            <p className="text-[#7b8491] text-sm max-w-[250px] mx-auto leading-relaxed mb-10 text-center">
              Please check your inbox and click the link to verify your email.
            </p>

            <button 
              onClick={handleResend}
              disabled={isResending}
              className="text-[#0072ff] font-bold text-sm hover:underline py-2 disabled:opacity-50"
            >
              {isResending ? 'Sending...' : 'Resend email'}
            </button>
            
          </section>
        </div>
      </div>
    </main>
  );
};
export default EmailVerification;
