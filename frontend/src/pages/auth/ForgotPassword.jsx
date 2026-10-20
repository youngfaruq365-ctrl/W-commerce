import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { ROUTES } from '../../constants/routes';
import './AuthPage.css';

const ForgotPassword = () => {
  const navigate   = useNavigate();
  const location   = useLocation();
  const [email, setEmail]             = useState(location.state?.email || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent]               = useState(false);
  const { forgotPassword } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return toast.error('Please enter your email address');

    setIsSubmitting(true);
    const result = await forgotPassword(email.trim());
    setIsSubmitting(false);

    if (result.success) {
      setSent(true);
      if (result._devCode) {
        toast.success(`[DEV] Reset code: ${result._devCode}`, { duration: 10000 });
      } else {
        toast.success('Password reset code sent! Check your email.');
      }
      setTimeout(() => navigate(ROUTES.RESET_PASSWORD, { state: { email: email.trim() } }), 1500);
    } else {
      toast.error(result.message || 'Failed to send reset code');
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
        <div className="auth-panel" style={{ position: 'relative', transform: 'none', backfaceVisibility: 'unset', WebkitBackfaceVisibility: 'unset', minHeight: 'unset', padding: '42px' }}>

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
          <div className="logo" style={{ marginTop: '16px' }}>🔑</div>

          <h1 className="title">Forgot Password?</h1>
          <p className="subtitle">
            Enter your email and we'll send you a 6-digit code to reset your password.
          </p>

          <form onSubmit={handleSubmit} style={{ marginTop: '28px' }}>
            <div className="form-group">
              <input
                className="input"
                type="email"
                id="forgotEmail"
                placeholder="Email Address"
                required
                value={email}
                disabled={sent}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="main-btn"
              id="forgotSubmitBtn"
              disabled={isSubmitting || sent}
              style={{ marginTop: '8px' }}
            >
              {isSubmitting ? 'Sending…' : sent ? '✓ Code Sent' : 'Send Reset Code'}
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

export default ForgotPassword;
