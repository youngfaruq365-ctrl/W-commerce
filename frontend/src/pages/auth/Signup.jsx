import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { ROUTES } from '../../constants/routes';
import { WIcon } from '../../components/visual/WIcon';

const Signup = () => {
  const [formData, setFormData] = useState({ fullName: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [role, setRole] = useState('BUYER');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState('');
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.phone || !formData.password || !formData.confirmPassword) {
      return setError('Please fill all fields');
    }
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }
    if (!termsAccepted) {
      return setError('You must accept the Terms of Service');
    }

    const result = await register({ ...formData, role });
    if (result.success) {
      navigate(ROUTES.VERIFY_OTP, { state: { phone: formData.phone, email: formData.email } });
    } else {
      setError(result.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex">
      {/* Left pane - Visual/Branding */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 relative items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950 opacity-90"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10 text-center text-white px-12">
          <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-8 border border-white/20 shadow-2xl">
            <span className="text-5xl font-bold tracking-tighter">W</span>
          </div>
          <h2 className="text-4xl font-bold tracking-tight mb-6">Join the Future</h2>
          <p className="text-slate-300 text-lg max-w-md mx-auto leading-relaxed">
            Create an account to unlock premium features and start your journey with W-Commerce today.
          </p>
        </div>
      </div>

      {/* Right pane - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 sm:p-12 lg:p-16 bg-white overflow-y-auto">
        <div className="w-full max-w-md my-auto">
          
          <button onClick={() => navigate(-1)} className="mb-8 p-2 -ml-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all w-fit">
            <WIcon name="chevron-left" size={24} />
          </button>

          <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Create Account</h1>
          <p className="text-slate-500 text-base mb-8">Join W-Commerce today</p>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-600 text-sm flex items-center gap-3 border border-red-100 transition-all">
              <WIcon name="alert-circle" size={18} />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Role Selection */}
            <div className="flex gap-4 mb-2">
              <button 
                type="button" 
                onClick={() => setRole('BUYER')}
                className={`flex-1 py-3.5 rounded-xl border flex items-center justify-center gap-2 transition-all duration-300 font-medium ${role === 'BUYER' ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
              >
                <WIcon name="shopping-bag" size={18} />
                Buyer
              </button>
              <button 
                type="button" 
                onClick={() => setRole('SELLER')}
                className={`flex-1 py-3.5 rounded-xl border flex items-center justify-center gap-2 transition-all duration-300 font-medium ${role === 'SELLER' ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
              >
                <WIcon name="store" size={18} />
                Seller
              </button>
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                <WIcon name="user" size={18} />
              </div>
              <input 
                type="text" 
                placeholder="Full Name" 
                value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})}
                className="w-full bg-white/60 backdrop-blur-xl border border-slate-200 text-slate-900 rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 hover:border-slate-300 transition-all duration-300 placeholder:text-slate-400 font-medium shadow-sm"
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                <WIcon name="mail" size={18} />
              </div>
              <input 
                type="email" 
                placeholder="Email Address" 
                value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full bg-white/60 backdrop-blur-xl border border-slate-200 text-slate-900 rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 hover:border-slate-300 transition-all duration-300 placeholder:text-slate-400 font-medium shadow-sm"
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                <WIcon name="phone" size={18} />
              </div>
              <input 
                type="tel" 
                placeholder="Phone Number" 
                value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full bg-white/60 backdrop-blur-xl border border-slate-200 text-slate-900 rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 hover:border-slate-300 transition-all duration-300 placeholder:text-slate-400 font-medium shadow-sm"
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                <WIcon name="lock" size={18} />
              </div>
              <input 
                type="password" 
                placeholder="Password" 
                value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                className="w-full bg-white/60 backdrop-blur-xl border border-slate-200 text-slate-900 rounded-xl pl-12 pr-11 py-3.5 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 hover:border-slate-300 transition-all duration-300 placeholder:text-slate-400 font-medium shadow-sm"
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                <WIcon name="lock" size={18} />
              </div>
              <input 
                type="password" 
                placeholder="Confirm Password" 
                value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                className="w-full bg-white/60 backdrop-blur-xl border border-slate-200 text-slate-900 rounded-xl pl-12 pr-11 py-3.5 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 hover:border-slate-300 transition-all duration-300 placeholder:text-slate-400 font-medium shadow-sm"
              />
            </div>

            <div className="flex items-start gap-3 py-2">
              <button type="button" onClick={() => setTermsAccepted(!termsAccepted)} className={`w-5 h-5 mt-0.5 rounded flex items-center justify-center shrink-0 border transition-all duration-200 ${termsAccepted ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300 hover:border-indigo-400'}`}>
                {termsAccepted && <WIcon name="check" size={14} className="text-white" />}
              </button>
              <p className="text-sm text-slate-500 leading-relaxed">
                I agree to the <span className="text-slate-900 font-semibold cursor-pointer hover:text-indigo-600 transition-colors">Terms of Service</span> and <span className="text-slate-900 font-semibold cursor-pointer hover:text-indigo-600 transition-colors">Privacy Policy</span>
              </p>
            </div>

            <div className="pt-2">
              <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-slate-900 to-slate-800 text-white font-semibold py-4 rounded-xl hover:from-black hover:to-slate-900 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/20 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2">
                {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                {isLoading ? 'Creating Account...' : 'Sign Up'}
              </button>
            </div>
          </form>

          <div className="mt-8 flex items-center gap-4">
            <div className="h-px bg-slate-200 flex-1"></div>
            <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">or continue with</span>
            <div className="h-px bg-slate-200 flex-1"></div>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <a 
              href={import.meta.env.DEV ? "http://127.0.0.1:5000/api/v1/auth/google" : "/api/v1/auth/google"} 
              className="w-full bg-white border border-slate-200 text-slate-700 font-medium py-3.5 rounded-xl hover:bg-slate-50 flex items-center justify-center gap-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </a>
          </div>

          <div className="mt-10 text-center text-slate-600">
            <span className="text-sm">Already have an account? </span>
            <Link to="/auth/login" className="text-slate-900 font-semibold hover:underline transition-all">Log in</Link>
          </div>
          
        </div>
      </div>
    </div>
  );
};
export default Signup;
