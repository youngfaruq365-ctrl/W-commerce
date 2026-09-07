import React, { useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { WIcon } from '../../components/visual/WIcon';

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const emailFromState = location.state?.email || '';
  const tokenFromUrl = searchParams.get('token') || '';

  const [email, setEmail] = useState(emailFromState);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { resetPassword } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) return toast.error('Please enter the 6-digit reset code', { style: { background: '#333', color: '#fff', borderRadius: '8px' }});
    if (!password) return toast.error('Please enter a new password', { style: { background: '#333', color: '#fff', borderRadius: '8px' }});
    if (password.length < 6) return toast.error('Password must be at least 6 characters', { style: { background: '#333', color: '#fff', borderRadius: '8px' }});
    if (password !== confirmPassword) return toast.error('Passwords do not match', { style: { background: '#333', color: '#fff', borderRadius: '8px' }});

    setIsSubmitting(true);
    const result = await resetPassword(email, code.trim(), password);
    setIsSubmitting(false);

    if (result.success) {
      toast.success('Password reset successfully! Please log in.', { style: { background: '#333', color: '#fff', borderRadius: '8px' }});
      navigate('/auth/login', { replace: true });
    } else {
      toast.error(result.message || 'Failed to reset password. Check your code and try again.', { style: { background: '#333', color: '#fff', borderRadius: '8px' }});
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
          <div className="w-20 h-20 bg-slate-900 rounded-2xl flex items-center justify-center mb-6 text-white shadow-xl shadow-slate-900/20 relative transform hover:scale-105 transition-transform duration-300">
            <WIcon name="lock" size={32} />
            <div className="absolute -bottom-2 -right-2 bg-white rounded-xl p-1.5 shadow-md border border-slate-100">
               <WIcon name="check" size={14} className="text-slate-900 font-bold" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">Reset Password</h1>
          <p className="text-slate-500 text-base leading-relaxed">
            Enter the 6-digit code sent to your email and choose a new password.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {!emailFromState && (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <WIcon name="mail" size={18} />
              </div>
              <input
                type="email"
                placeholder="Your Email Address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-white/50 border border-slate-200 text-slate-900 rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all placeholder:text-slate-400 font-medium"
              />
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <WIcon name="key-round" size={18} />
            </div>
            <input
              type="text"
              placeholder="6-Digit Reset Code"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-white/50 border border-slate-200 text-slate-900 rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all placeholder:text-slate-400 tracking-[0.2em] font-mono text-center font-bold"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <WIcon name="lock" size={18} />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="New Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-white/50 border border-slate-200 text-slate-900 rounded-xl pl-11 pr-11 py-3.5 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all placeholder:text-slate-400 font-medium"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer text-slate-400 hover:text-slate-600 transition-colors">
              <WIcon name={showPassword ? 'eye-off' : 'eye'} size={18} />
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <WIcon name="lock" size={18} />
            </div>
            <input
              type={showConfirm ? 'text' : 'password'}
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full bg-white/50 border border-slate-200 text-slate-900 rounded-xl pl-11 pr-11 py-3.5 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all placeholder:text-slate-400 font-medium"
            />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer text-slate-400 hover:text-slate-600 transition-colors">
              <WIcon name={showConfirm ? 'eye-off' : 'eye'} size={18} />
            </button>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-slate-900 text-white font-semibold py-4 rounded-xl hover:bg-slate-800 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
              {isSubmitting ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default ResetPassword;
