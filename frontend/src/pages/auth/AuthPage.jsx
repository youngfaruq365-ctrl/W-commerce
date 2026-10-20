import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { ROUTES } from '../../constants/routes';
import './AuthPage.css';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', flexShrink: 0 }}>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const EyeIcon = ({ open }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px' }}>
    {open ? (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </>
    ) : (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </>
    )}
  </svg>
);

const GOOGLE_URL = `${import.meta.env.VITE_API_URL || ''}/api/v1/auth/google`;

const AuthPage = ({ initialMode = 'login' }) => {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);

  // Signup state
  const [firstName, setFirstName]         = useState('');
  const [lastName, setLastName]           = useState('');
  const [signupEmail, setSignupEmail]     = useState('');
  const [phone, setPhone]                 = useState('');
  const [signupPassword, setSignupPassword]       = useState('');
  const [confirmPassword, setConfirmPassword]     = useState('');
  const [showSignupPass, setShowSignupPass]       = useState(false);
  const [showConfirmPass, setShowConfirmPass]     = useState(false);
  const [selectedRole, setSelectedRole]           = useState('BUYER');

  const { login, register, loginWithFingerprint, isLoading } = useAuthStore();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from?.pathname || null;

  useEffect(() => {
    setIsLogin(initialMode === 'login');
  }, [initialMode]);

  // Flip between login / signup
  const toggleMode = (e) => {
    e?.preventDefault();
    setIsLogin(prev => !prev);
  };

  // Redirect after successful login
  const redirectAfterLogin = (user) => {
    const role = user?.role?.toUpperCase();
    let target = ROUTES.BUYER_DASHBOARD;
    if (!role || role === 'PENDING') target = ROUTES.ROLE_SELECTION;
    else if (from && from !== '/' && from !== '/feed') target = from;
    else if (role === 'SELLER')  target = ROUTES.SELLER_DASHBOARD;
    else if (role === 'ADMIN')   target = ROUTES.ADMIN_DASHBOARD;
    else if (role === 'COURIER') target = ROUTES.COURIER_DASHBOARD;
    window.location.href = target;
  };

  // Login submit
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return toast.error('Please fill in all fields');
    const result = await login(loginEmail, loginPassword);
    if (result.success) {
      toast.success('Login successful!');
      redirectAfterLogin(result.user);
    } else {
      const msg = result.message || 'Invalid credentials';
      if (msg === 'Please verify your email before logging in.') {
        toast.error('Email not verified. Redirecting...');
        setTimeout(() => navigate(ROUTES.VERIFY_OTP, { state: { email: loginEmail } }), 1500);
      } else {
        toast.error(msg === 'Invalid credentials' ? 'User does not exist or password is incorrect' : msg);
      }
    }
  };

  // Signup submit
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (!firstName || !lastName || !signupEmail || !phone || !signupPassword || !confirmPassword) {
      return toast.error('Please fill all required fields');
    }
    if (signupPassword !== confirmPassword) return toast.error('Passwords do not match');

    const result = await register({
      fullName: `${firstName} ${lastName}`,
      email: signupEmail,
      phone,
      password: signupPassword,
      role: selectedRole,
    });

    if (result.success) {
      toast.success('Registration initiated. Please verify your OTP.');
      if (result._devCode) {
        toast.success(`[DEV] Your OTP code is: ${result._devCode}`, { duration: 10000 });
      }
      navigate(ROUTES.VERIFY_OTP, { state: { phone, email: signupEmail } });
    } else {
      const errorMsg = result.message || 'Registration failed';
      toast.error(errorMsg === 'User already exists' ? 'Account exists. Try logging in.' : errorMsg);
    }
  };

  // Passkey (WebAuthn)
  const handlePasskey = async () => {
    if (!loginEmail) return toast.error('Enter your email address first to use a Passkey.');
    const result = await loginWithFingerprint(loginEmail);
    if (result.success) {
      toast.success('Passkey login successful!');
      redirectAfterLogin(result.user);
    } else {
      toast.error(result.message || 'Passkey login failed');
    }
  };

  // Forgot password
  const handleForgotPassword = (e) => {
    e.preventDefault();
    navigate(ROUTES.FORGOT_PASSWORD, { state: { email: loginEmail || '' } });
  };

  return (
    <main className="page">

      {/* Decorative shapes */}
      <div className="shape shape-1" />
      <div className="shape shape-2" />
      <div className="shape shape-3" />
      <div className="shape shape-4" />

      <div className="auth-wrapper">
        <div className={`auth-card${isLogin ? '' : ' signup-active'}`} id="authCard">

          {/* ─────────────── LOGIN PANEL ─────────────── */}
          <section className="auth-panel login-panel">

            <div className="logo">🔒</div>
            <h1 className="title">Welcome Back</h1>
            <p className="subtitle">Login to continue your journey</p>

            <form id="loginForm" onSubmit={handleLoginSubmit}>

              <div className="form-group">
                <input
                  className="input"
                  type="email"
                  id="loginEmail"
                  placeholder="Email Address"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />
              </div>

              <div className="form-group password-wrapper">
                <input
                  className="input"
                  type={showLoginPass ? 'text' : 'password'}
                  id="loginPassword"
                  placeholder="Password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowLoginPass(p => !p)}
                  aria-label={showLoginPass ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon open={showLoginPass} />
                </button>
              </div>

              <div className="options">
                <label className="remember">
                  <input type="checkbox" id="remember" />
                  <span>Remember me</span>
                </label>
                <a href="#" className="forgot" onClick={handleForgotPassword}>
                  Forgot Password?
                </a>
              </div>

              <button type="submit" className="main-btn" id="loginButton" disabled={isLoading}>
                {isLoading ? 'Logging in…' : 'Login'}
              </button>
            </form>

            {/* Social / Passkey */}
            <div className="social-divider"><span>or continue with</span></div>

            <div className="social-buttons">
              <a href={GOOGLE_URL} className="social-btn google-btn" id="googleLoginBtn">
                <GoogleIcon />
                Google
              </a>
              <button type="button" className="social-btn passkey-btn" id="passkeyBtn" onClick={handlePasskey}>
                <span style={{ fontSize: '18px' }}>🔑</span>
                Passkey
              </button>
            </div>

            <div className="switch-area">
              <span>Don't have an account?</span>
              <button type="button" className="switch-circle" onClick={toggleMode} aria-label="Create account">
                +
              </button>
            </div>

            <div className="secure-text">🔐 Your information is securely protected</div>

          </section>

          {/* ─────────────── SIGNUP PANEL ─────────────── */}
          <section className="auth-panel signup-panel">

            <div className="logo">👤</div>
            <h1 className="title">Create Account</h1>
            <p className="subtitle">Start your journey with us</p>

            <form id="signupForm" onSubmit={handleSignupSubmit}>

              <div className="form-row">
                <div className="form-group">
                  <input
                    className="input"
                    type="text"
                    id="firstName"
                    placeholder="First Name"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <input
                    className="input"
                    type="text"
                    id="lastName"
                    placeholder="Last Name"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <input
                  className="input"
                  type="email"
                  id="signupEmail"
                  placeholder="Email Address"
                  required
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <input
                  className="input"
                  type="tel"
                  id="signupPhone"
                  placeholder="Phone Number"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="form-group password-wrapper">
                <input
                  className="input"
                  type={showSignupPass ? 'text' : 'password'}
                  id="signupPassword"
                  placeholder="Password"
                  required
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowSignupPass(p => !p)}
                  aria-label={showSignupPass ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon open={showSignupPass} />
                </button>
              </div>

              <div className="form-group password-wrapper">
                <input
                  className="input"
                  type={showConfirmPass ? 'text' : 'password'}
                  id="confirmPassword"
                  placeholder="Confirm Password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPass(p => !p)}
                  aria-label={showConfirmPass ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon open={showConfirmPass} />
                </button>
              </div>

              <button type="submit" className="main-btn" id="signupButton" disabled={isLoading}>
                {isLoading ? 'Creating Account…' : `Create Account as ${selectedRole.charAt(0) + selectedRole.slice(1).toLowerCase()}`}
              </button>
            </form>

            {/* Social */}
            <div className="social-divider"><span>or sign up with</span></div>

            {/* Role Selector with Gemini Glassmorphism Design */}
            <div className="role-selector-container">
              {[
                {
                  value: 'BUYER',
                  label: 'Buyer',
                  isSeller: false,
                  icon: (
                    <span style={{ fontSize: '20px', lineHeight: 1 }}>🛍️</span>
                  ),
                },
                {
                  value: 'SELLER',
                  label: 'Seller',
                  isSeller: true,
                  icon: (
                    /* Soft modern storefront/boutique icon */
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      style={{ width: '30px', height: '30px', display: 'block' }}
                    >
                      {/* Awning stripes */}
                      <path
                        d="M3 9.5L4.8 4.2C5.05 3.5 5.7 3 6.45 3H17.55C18.3 3 18.95 3.5 19.2 4.2L21 9.5"
                        stroke="#38bdf8"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M3 9.5C3 11.15 4.35 12.5 6 12.5C7.65 12.5 9 11.15 9 9.5C9 11.15 10.35 12.5 12 12.5C13.65 12.5 15 11.15 15 9.5C15 11.15 16.35 12.5 18 12.5C19.65 12.5 21 11.15 21 9.5"
                        fill="rgba(56, 189, 248, 0.18)"
                        stroke="#818cf8"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {/* Store body & door */}
                      <path
                        d="M4.5 12.5V19C4.5 20.1 5.4 21 6.5 21H17.5C18.6 21 19.5 20.1 19.5 19V12.5"
                        stroke="#c084fc"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <rect
                        x="9"
                        y="14.5"
                        width="6"
                        height="6.5"
                        rx="1.2"
                        stroke="#f472b6"
                        strokeWidth="1.6"
                        fill="rgba(244, 114, 182, 0.15)"
                      />
                    </svg>
                  ),
                },
                {
                  value: 'COURIER',
                  label: 'Courier',
                  isSeller: false,
                  icon: (
                    <span style={{ fontSize: '20px', lineHeight: 1 }}>🚴</span>
                  ),
                },
              ].map(({ value, label, isSeller, icon }) => {
                const isSelected = selectedRole === value;
                const roleClass = isSeller ? 'seller' : value === 'BUYER' ? 'buyer' : 'courier';
                const sizeClass = isSeller ? 'size-seller' : 'size-default';
                const stateClass = isSelected ? 'active' : 'inactive';

                return (
                  <div key={value} className={`role-item ${roleClass}`}>
                    <button
                      type="button"
                      onClick={() => setSelectedRole(value)}
                      aria-label={`Select ${label} role`}
                      className={`role-circle-btn ${sizeClass} ${stateClass}`}
                    >
                      <span className="role-inner-disc">
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            filter: isSelected ? 'drop-shadow(0 2px 6px rgba(155, 114, 207, 0.5))' : 'none',
                            transform: isSelected ? 'scale(1.06)' : 'scale(1)',
                            transition: 'transform 0.2s ease',
                          }}
                        >
                          {icon}
                        </span>
                      </span>
                    </button>
                    <span className={`role-label-text ${isSeller ? 'size-seller' : ''} ${isSelected ? 'active' : ''}`}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="social-buttons">
              <a href={`${GOOGLE_URL}?role=${selectedRole}`} className="social-btn google-btn" id="googleSignupBtn">
                <GoogleIcon />
                Google
              </a>
            </div>

            <div className="switch-area">
              <span>Already have an account?</span>
              <button type="button" className="switch-circle" onClick={toggleMode} aria-label="Back to login">
                ←
              </button>
            </div>

            <div className="secure-text">🔐 Your information is securely protected</div>

          </section>

        </div>
      </div>

      <div className="message" id="message" />

    </main>
  );
};

export default AuthPage;
