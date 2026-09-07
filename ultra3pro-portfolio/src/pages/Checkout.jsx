import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { usePaystackPayment } from 'react-paystack';
import { CreditCard, MapPin, User, Mail, ShieldCheck } from 'lucide-react';

export default function Checkout({ cart, clearCart, currentUser, addOrder }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    address: currentUser?.address || '',
  });

  const total = cart.reduce((sum, item) => {
    const priceStr = String(item.price || '15000').replace(/,/g, '');
    return sum + (parseFloat(priceStr) || 0);
  }, 0);

  // Paystack configuration (using a placeholder test key)
  const config = {
    reference: (new Date()).getTime().toString(),
    email: formData.email || 'guest@example.com',
    amount: total * 100, // Paystack amount is in kobo
    publicKey: 'pk_test_e6a6e87b7a6fc216e5792da8d5e1cfb439de40c1', // Placeholder test key
  };

  const initializePayment = usePaystackPayment(config);

  const onSuccess = (reference) => {
    // Payment complete! Save the order
    const order = {
      id: reference.reference || config.reference,
      date: new Date().toISOString(),
      total: total.toLocaleString(),
      items: [...cart],
      method: 'Paystack'
    };
    
    addOrder(order);
    clearCart();
    
    navigate('/success', { state: { reference: reference.reference || config.reference } });
  };

  const onClose = () => {
    console.log('Payment modal closed');
  };

  const handleCheckout = (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert("Your cart is empty!");
      return;
    }
    
    // Trigger Paystack
    initializePayment(onSuccess, onClose);
  };

  if (cart.length === 0) {
    return (
      <div className="app-container" style={{ textAlign: 'center', padding: '4rem 0' }}>
        <h2>Your cart is empty.</h2>
        <button className="btn btn-primary" onClick={() => navigate('/products')} style={{ marginTop: '1rem' }}>Browse Books</button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="app-container" 
      style={{ paddingTop: '2rem', paddingBottom: '4rem' }}
    >
      <h1 style={{ marginBottom: '2rem' }}>Checkout</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2rem', alignItems: 'start' }}>
        
        {/* Shipping Form */}
        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Shipping Details</h3>
          <form id="checkout-form" onSubmit={handleCheckout}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input type="text" className="form-control" style={{ paddingLeft: '2.5rem' }} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input type="email" className="form-control" style={{ paddingLeft: '2.5rem' }} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Shipping Address</label>
              <div style={{ position: 'relative' }}>
                <MapPin size={18} style={{ position: 'absolute', top: '1rem', left: '1rem', color: 'var(--text-secondary)' }} />
                <textarea className="form-control" style={{ paddingLeft: '2.5rem', minHeight: '80px', resize: 'vertical' }} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required placeholder="123 Example Street, City, Country"></textarea>
              </div>
            </div>
          </form>
        </div>

        {/* Order Summary */}
        <div className="card" style={{ padding: '2rem', position: 'sticky', top: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Order Summary</h3>
          
          <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1rem' }}>
            {cart.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
                <img src={item.coverUrl} style={{ width: '50px', height: '70px', objectFit: 'cover', borderRadius: '4px' }} alt={item.title} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', fontSize: '0.875rem' }}>{item.title}</div>
                  <div style={{ color: 'var(--accent-gold)' }}>₦{item.price || '15,000'}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
              <span>₦{total.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Shipping</span>
              <span>Free</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 'bold', marginTop: '1rem' }}>
              <span>Total</span>
              <span style={{ color: 'var(--accent-gold)' }}>₦{total.toLocaleString()}</span>
            </div>
          </div>

          <button 
            type="submit" 
            form="checkout-form"
            className="btn btn-primary" 
            style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}
          >
            <CreditCard size={18} /> Pay with Paystack
          </button>
          
          <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
            <ShieldCheck size={14} /> Secure Payment Processing
          </div>
        </div>
      </div>
    </motion.div>
  );
}
