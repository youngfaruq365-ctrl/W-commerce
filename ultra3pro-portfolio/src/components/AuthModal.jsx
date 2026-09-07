import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, ArrowRight } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    // Hybrid mock login: save user to local storage and log them in
    const user = {
      name: isLogin ? 'Guest User' : formData.name,
      email: formData.email
    };
    onLogin(user);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onClick={onClose}
      >
        <motion.div 
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="card"
          style={{ width: '100%', maxWidth: '400px', position: 'relative', padding: '2rem' }}
          onClick={e => e.stopPropagation()}
        >
          <button 
            onClick={onClose}
            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
          
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 style={{ marginBottom: '0.5rem' }}>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              {isLogin ? 'Enter your details to access your account' : 'Join to access premium books and features'}
            </p>
          </div>

          <div style={{ display: 'flex', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', padding: '0.25rem', marginBottom: '1.5rem' }}>
            <button 
              className={`btn ${isLogin ? 'btn-primary' : 'btn-secondary'}`} 
              style={{ flex: 1, border: 'none', background: isLogin ? 'var(--text-primary)' : 'transparent', color: isLogin ? 'var(--bg-main)' : 'var(--text-secondary)' }}
              onClick={() => setIsLogin(true)}
            >
              Sign In
            </button>
            <button 
              className={`btn ${!isLogin ? 'btn-primary' : 'btn-secondary'}`} 
              style={{ flex: 1, border: 'none', background: !isLogin ? 'var(--text-primary)' : 'transparent', color: !isLogin ? 'var(--bg-main)' : 'var(--text-secondary)' }}
              onClick={() => setIsLogin(false)}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {!isLogin && (
              <div className="form-group" style={{ margin: 0 }}>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input type="text" className="form-control" placeholder="Full Name" style={{ paddingLeft: '2.5rem' }} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required={!isLogin} />
                </div>
              </div>
            )}
            <div className="form-group" style={{ margin: 0 }}>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input type="email" className="form-control" placeholder="Email Address" style={{ paddingLeft: '2.5rem' }} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
              </div>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input type="password" className="form-control" placeholder="Password" style={{ paddingLeft: '2.5rem' }} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />
              </div>
            </div>

            {isLogin && (
              <div style={{ textAlign: 'right' }}>
                <a href="#" style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textDecoration: 'none' }}>Forgot password?</a>
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
              {isLogin ? 'Sign In' : 'Create Account'} <ArrowRight size={16} />
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
