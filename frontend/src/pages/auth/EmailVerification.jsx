import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { WIcon } from '../../components/visual/WIcon';
import EmailVerifyIcon from '../../assets/images/auth/email_verify.png';

const EmailVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';
  const [isResending, setIsResending] = useState(false);

  const handleResend = async () => {
    if (!email) return toast.error('No email address provided.');
    setIsResending(true);
    try {
      const res = await fetch('/api/v1/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Verification email sent!');
      } else {
        toast.error(data.message || 'Failed to resend email');
      }
    } catch (err) {
      toast.error('Failed to resend email');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-6 flex flex-col pt-4">
      <div className="flex items-center mb-8">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-900 hover:bg-gray-100 rounded-full transition-colors">
          <WIcon name="chevron-left" size={24} />
        </button>
      </div>

      <div className="flex flex-col items-center text-center flex-1 justify-center -mt-20">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Verify Your Email</h1>
        <p className="text-gray-500 text-sm mb-12">We've sent a verification link to<br/><span className="text-gray-900 font-bold">{email || 'your email address'}</span></p>

        <div className="relative mb-12">
          {/* Subtle background circles for 3D depth effect */}
          <div className="absolute inset-0 bg-gray-100 rounded-full blur-3xl opacity-50 scale-150"></div>
          <img src={EmailVerifyIcon} alt="Email Verification" className="w-48 h-48 object-contain relative z-10 drop-shadow-xl animate-[bounce_3s_ease-in-out_infinite]" />
        </div>

        <p className="text-gray-500 text-sm max-w-[250px] mx-auto leading-relaxed mb-8">
          Please check your inbox and click the link to verify your email.
        </p>

        <button 
          onClick={handleResend}
          disabled={isResending}
          className="text-gray-900 font-bold text-sm hover:underline py-2 disabled:opacity-50"
        >
          {isResending ? 'Sending...' : 'Resend email'}
        </button>
      </div>
    </div>
  );
};
export default EmailVerification;
