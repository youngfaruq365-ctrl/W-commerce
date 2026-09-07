import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { WIcon } from '../../components/visual/WIcon';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const { forgotPassword } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return toast.error('Please enter your email address', { style: { background: '#333', color: '#fff', borderRadius: '8px' }});

    setIsSubmitting(true);
    const result = await forgotPassword(email.trim());
    setIsSubmitting(false);

    if (result.success) {
      setSent(true);
      toast.success('Password reset code sent! Check your email.', { style: { background: '#333', color: '#fff', borderRadius: '8px' }});
      setTimeout(() => navigate('/auth/reset-password', { state: { email } }), 1500);
    } else {
      toast.error(result.message || 'Failed to send reset code', { style: { background: '#333', color: '#fff', borderRadius: '8px' }});
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200"></div>
      
      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl p-10 rounded-[2rem] shadow-2xl relative z-10 border border-white/40">
        <button onClick={() => navigate(-1)} className="absolute top-8 left-8 p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all">
          <WIcon name="chevron-left" size={24} />
        </button>

        <div className="flex flex-col items-center text-center mb-10 mt-6">
          <div className="w-20 h-20 bg-slate-900 rounded-2xl flex items-center justify-center mb-6 text-white shadow-xl shadow-slate-900/20 transform -rotate-6 hover:rotate-0 transition-transform duration-300">
            <WIcon name="unlock" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">Forgot Password?</h1>
          <p className="text-slate-500 text-base leading-relaxed">
            Enter your email address and we'll send you a 6-digit code to reset your password.
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <WIcon name="mail" size={18} />
            </div>
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={sent}
              className="w-full bg-white/50 border border-slate-200 text-slate-900 rounded-xl pl-11 pr-4 py-4 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all placeholder:text-slate-400 font-medium disabled:opacity-60"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting || sent}
            className="w-full bg-slate-900 text-white font-semibold py-4 rounded-xl hover:bg-slate-800 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
            {isSubmitting ? 'Sending...' : sent ? 'Code Sent ✓' : 'Send Reset Code'}
          </button>
        </form>
      </div>
    </div>
  );
};
export default ForgotPassword;
