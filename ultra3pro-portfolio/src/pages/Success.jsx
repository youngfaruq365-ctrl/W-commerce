import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { CheckCircle, Package, ArrowRight } from 'lucide-react';

export default function Success() {
  const navigate = useNavigate();
  const location = useLocation();
  const { width, height } = useWindowSize();
  const [showConfetti, setShowConfetti] = useState(true);

  // Stop confetti after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const reference = location.state?.reference || 'N/A';

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: 'calc(100vh - 200px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      {showConfetti && <Confetti width={width} height={height} recycle={false} numberOfPieces={500} gravity={0.15} />}
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", bounce: 0.5 }}
        className="card"
        style={{ maxWidth: '500px', width: '100%', textAlign: 'center', padding: '3rem 2rem', zIndex: 10, background: 'var(--bg-main)', border: '1px solid var(--accent-gold)' }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", bounce: 0.5 }}
        >
          <CheckCircle size={80} color="var(--accent-gold)" style={{ margin: '0 auto 1.5rem' }} />
        </motion.div>
        
        <h1 style={{ marginBottom: '1rem', color: 'var(--accent-gold)' }}>Payment Successful!</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1.1rem' }}>
          Thank you for your purchase. Your order has been confirmed and is being processed.
        </p>

        <div style={{ background: '#111', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Reference Number:</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{reference}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
            <span style={{ color: '#4ade80', fontWeight: 'bold' }}>PAID</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
          <button 
            onClick={() => navigate('/orders')} 
            className="btn btn-primary" 
            style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '1rem' }}
          >
            <Package size={20} /> View Order History
          </button>
          
          <button 
            onClick={() => navigate('/products')} 
            className="btn btn-secondary" 
            style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '1rem' }}
          >
            Continue Shopping <ArrowRight size={20} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
