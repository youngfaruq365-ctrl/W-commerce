import React, { useState } from 'react';
import { Lock } from 'lucide-react';

export default function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simple mock authentication for demonstration
    if (password === 'admin123') {
      onLogin(true);
      setError('');
    } else {
      setError('Incorrect password. Try admin123');
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '50%', marginBottom: '1rem' }}>
            <Lock size={32} color="var(--accent-primary)" />
          </div>
          <h2 className="text-gradient" style={{ fontSize: '1.75rem' }}>Secure Access</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Enter password to access the seller dashboard</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password..."
              required
            />
          </div>
          
          {error && <p style={{ color: 'var(--accent-secondary)', fontSize: '0.875rem', marginBottom: '1rem', textAlign: 'center' }}>{error}</p>}
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Unlock Dashboard
          </button>
        </form>
      </div>
    </div>
  );
}
