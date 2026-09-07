import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { ROUTES } from '../../constants/routes';
import { WIcon } from '../../components/visual/WIcon';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, loginWithFingerprint, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || null;

  const redirectAfterLogin = (user) => {
    const role = user?.role?.toUpperCase();
    if (!role || role === 'PENDING') return navigate(ROUTES.ROLE_SELECTION, { replace: true });
    
    if (from && from !== '/' && from !== '/feed') {
      return navigate(from, { replace: true });
    }
    
    if (role === 'SELLER') return navigate(ROUTES.SELLER_DASHBOARD, { replace: true });
    if (role === 'ADMIN') return navigate(ROUTES.ADMIN_DASHBOARD, { replace: true });
    if (role === 'COURIER') return navigate(ROUTES.COURIER_DASHBOARD, { replace: true });
    return navigate(ROUTES.BUYER_DASHBOARD, { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return setError('Please fill in all fields');
    
    setError('');
    const result = await login(email, password);
    if (result.success) {
      toast.success('Login successful!', { style: { background: '#333', color: '#fff', borderRadius: '8px' }});
      redirectAfterLogin(result.user);
    } else {
      const msg = result.message || 'Invalid credentials';
      setError(msg);
      toast.error(msg === 'Invalid credentials' ? 'User does not exist or password is incorrect' : msg, { style: { background: '#ef4444', color: '#fff', borderRadius: '8px' }});
    }
  };

  const handleFingerprint = async () => {
    if (!email) return setError('Enter email to use passkey');
    const result = await loginWithFingerprint(email);
    if (result.success) {
      toast.success('Login successful!');
      redirectAfterLogin(result.user);
    } else {
      setError(result.message || 'Passkey login failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex">
      {/* Left pane - Visual/Branding */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 relative items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950 opacity-90"></div>
        <div className="relative z-10 text-center text-white px-12">
          <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-8 border border-white/20 shadow-2xl">
            <span className="text-5xl font-bold tracking-tighter">W</span>
          </div>
          <h2 className="text-4xl font-bold tracking-tight mb-6">Welcome Back</h2>
          <p className="text-slate-300 text-lg max-w-md mx-auto leading-relaxed">
            Experience the premium standard of e-commerce. Seamlessly manage your orders and discover new possibilities.
          </p>
        </div>
      </div>

      {/* Right pane - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 sm:p-12 lg:p-24 bg-white">
        <div className="w-full max-w-md">
          
          <div className="mb-10 lg:hidden">
            <div className="w-16 h-16 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-3xl font-bold tracking-tighter text-white">W</span>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Log in</h1>
          <p className="text-slate-500 text-base mb-8">Enter your credentials to access your account</p>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-600 text-sm flex items-center gap-3 border border-red-100 transition-all">
              <WIcon name="alert-circle" size={18} />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2 group">
              <label className="block text-sm font-semibold text-slate-700 transition-colors group-focus-within:text-indigo-600">Email Address</label>
              <input 
                type="email" 
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full bg-white/60 backdrop-blur-xl border border-slate-200 text-slate-900 rounded-xl px-4 py-3.5 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 hover:border-slate-300 transition-all duration-300 shadow-sm"
              />
            </div>

            <div className="space-y-2 group">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-semibold text-slate-700 transition-colors group-focus-within:text-indigo-600">Password</label>
                <Link to="/auth/forgot-password" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors">Forgot password?</Link>
              </div>
              <input 
                type="password" 
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/60 backdrop-blur-xl border border-slate-200 text-slate-900 rounded-xl px-4 py-3.5 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 hover:border-slate-300 transition-all duration-300 shadow-sm"
              />
            </div>

            <button 
              type="submit" 
              disabled={isLoading} 
              className="w-full bg-gradient-to-r from-slate-900 to-slate-800 text-white font-semibold py-4 rounded-xl hover:from-black hover:to-slate-900 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/20 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
              {isLoading ? 'Authenticating...' : 'Sign In'}
            </button>
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

            <button 
              type="button" 
              onClick={handleFingerprint} 
              className="w-full bg-white border border-slate-200 text-slate-700 font-medium py-3.5 rounded-xl hover:bg-slate-50 flex items-center justify-center gap-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
            >
              <WIcon name="user-check" size={18} />
              Sign in with Passkey
            </button>
          </div>

          <div className="mt-10 text-center text-slate-600">
            Don't have an account?{' '}
            <Link to="/auth/signup" className="text-slate-900 font-semibold hover:underline transition-all">Create account</Link>
          </div>
          
        </div>
      </div>
    </div>
  );
};
export default Login;
