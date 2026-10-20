import React, { useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { ROUTES } from '../../constants/routes';
import './AuthPage.css';

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

const ResetPassword = () => {
  const navigate       = useNavigate();
  const location       = useLocation();
  const [searchParams] = useSearchParams();

  const emailFromState = location.state?.email || searchParams.get('email') || '';

  const [email, setEmail]                   = useState(emailFromState);
  const [code, setCode]                     = useState(searchParams.get('code') || '');
  const [password, setPassword]             = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]     = useState(false);
  const [showConfirm, setShowConfirm]       = useState(false);
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const { resetPassword } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email?.trim())            return toast.error('Please enter your email address');
    if (!code.trim())              return toast.error('Please enter the 6-digit reset code');
    if (!password)                 return toast.error('Please enter a new password');
    if (password.length < 6)       return toast.error('Password must be at least 6 characters');
    if (password !== confirmPassword) return toast.error('Passwords do not match');

    setIsSubmitting(true);
    const result = await resetPassword(email.trim(), code.trim(), password);
    setIsSubmitting(false);

    if (result.success) {
      toast.success('Password reset successfully! Please log in.');
      navigate(ROUTES.LOGIN, { replace: true });
    } else {
      toast.error(result.message || 'Failed to reset password. Check your code and try again.');
    }
  };

  return (
    <main className="page">

      {/* Decorative shapes */}
      <div className="shape shape-1" />
      <div className="shape shape-2" />
      <div className="shape shape-3" />
      <div className="shape shape-4" />

      <div className="auth-wrapper" style={{ maxWidth: '430px' }}>
        <div
          className="auth-panel"
          style={{ position: 'relative', transform: 'none', backfaceVisibility: 'unset', WebkitBackfaceVisibility: 'unset', minHeight: 'unset', padding: '42px' }}
        >

          {/* Back button */}
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="switch-circle"
            style={{ position: 'absolute', top: '24px', left: '24px', fontSize: '18px', width: '40px', height: '40px' }}
            aria-label="Go back"
          >
            ←
          </button>

          {/* Icon */}
          <div className="logo" style={{ marginTop: '16px' }}>🔒</div>

          <h1 className="title">Reset Password</h1>
          <p className="subtitle">
            Enter the 6-digit code sent to your email and choose a new password.
          </p>

          <form onSubmit={handleSubmit} style={{ marginTop: '28px' }}>

            {/* Show email field only if not pre-filled */}
            {!emailFromState && (
              <div className="form-group">
                <input
                  className="input"
                  type="email"
                  id="resetEmail"
                  placeholder="Your Email Address"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            )}

            {/* 6-digit code */}
            <div className="form-group">
              <input
                className="input"
                type="text"
                id="resetCode"
                placeholder="6-Digit Reset Code"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                style={{ textAlign: 'center', letterSpacing: '0.3em', fontWeight: 700, fontFamily: 'monospace' }}
              />
            </div>

            {/* New password */}
            <div className="form-group password-wrapper">
              <input
                className="input"
                type={showPassword ? 'text' : 'password'}
                id="newPassword"
                placeholder="New Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(p => !p)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>

            {/* Confirm password */}
            <div className="form-group password-wrapper">
              <input
                className="input"
                type={showConfirm ? 'text' : 'password'}
                id="confirmNewPassword"
                placeholder="Confirm New Password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirm(p => !p)}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                <EyeIcon open={showConfirm} />
              </button>
            </div>

            <button
              type="submit"
              className="main-btn"
              id="resetSubmitBtn"
              disabled={isSubmitting}
              style={{ marginTop: '8px' }}
            >
              {isSubmitting ? 'Resetting…' : 'Reset Password'}
            </button>
          </form>

          <div className="secure-text" style={{ marginTop: '28px' }}>
            🔐 Your information is securely protected
          </div>

        </div>
      </div>

    </main>
  );
};

export default ResetPassword;
