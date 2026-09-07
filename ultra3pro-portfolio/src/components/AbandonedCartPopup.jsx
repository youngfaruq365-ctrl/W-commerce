import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function AbandonedCartPopup({ cart }) {
  const [show, setShow] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Only arm the popup if there's something in the cart
    if (cart.length === 0) return;
    
    // Check if we already showed it this session
    if (sessionStorage.getItem('abandoned_cart_shown')) return;

    const handleMouseLeave = (e) => {
      // Trigger if mouse leaves top of document (exit intent)
      if (e.clientY <= 0) {
        setShow(true);
        sessionStorage.setItem('abandoned_cart_shown', 'true');
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [cart.length]);

  if (!show || cart.length === 0) return null;

  const item = cart[cart.length - 1]; // Show the last added item

  return (
    <AnimatePresence>
      {show && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{ 
              background: '#fff', 
              color: '#000', 
              borderRadius: '16px', 
              display: 'flex', 
              maxWidth: '650px',
              width: '90%',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
          >
            {/* Left Image Section */}
            <div style={{ 
              width: '45%', 
              position: 'relative',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: '2rem',
              overflow: 'hidden'
            }}>
              {/* Blurred background using the same image */}
              <div style={{
                position: 'absolute',
                top: -20, left: -20, right: -20, bottom: -20,
                backgroundImage: `url(${item.coverUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(20px)',
                opacity: 0.8,
                zIndex: 0
              }}></div>
              
              <img 
                src={item.coverUrl} 
                alt={item.title} 
                style={{ 
                  width: '100%', 
                  height: 'auto', 
                  objectFit: 'cover', 
                  borderRadius: '8px', 
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                  zIndex: 1,
                  transform: 'rotate(-5deg) scale(1.05)'
                }} 
              />
            </div>

            {/* Right Content Section */}
            <div style={{ width: '55%', padding: '3rem 2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative' }}>
              <button 
                onClick={() => setShow(false)}
                style={{ position: 'absolute', top: '15px', right: '20px', background: 'none', border: 'none', fontSize: '2rem', cursor: 'pointer', color: '#999', lineHeight: 1 }}
                title="Close"
              >
                &times;
              </button>
              
              <h2 style={{ fontSize: '2.5rem', fontWeight: '900', lineHeight: '1.1', marginBottom: '1rem', color: '#000', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                Left something<br/>behind?
              </h2>
              <p style={{ fontSize: '1.1rem', color: '#555', marginBottom: '2.5rem', fontWeight: '500' }}>
                Your cart is waiting for you.
              </p>
              
              <button 
                onClick={() => { setShow(false); navigate('/checkout'); }}
                style={{ 
                  background: '#000', 
                  color: '#fff', 
                  border: 'none', 
                  padding: '1.25rem', 
                  borderRadius: '12px', 
                  fontWeight: '800', 
                  fontSize: '1rem', 
                  cursor: 'pointer',
                  width: '100%',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  transition: 'transform 0.2s, background 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#333'; e.currentTarget.style.transform = 'scale(1.02)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = '#000'; e.currentTarget.style.transform = 'scale(1)'; }}
              >
                Return to Cart
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
