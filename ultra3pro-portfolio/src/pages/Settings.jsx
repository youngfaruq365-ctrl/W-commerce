import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, User, MapPin, Mail, Bell, Store, Image as ImageIcon } from 'lucide-react';

export default function Settings({ currentUser, onUpdateUser, storeProfile, setStoreProfile }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    notifications: true,
    storeName: '',
    storeLogoLetter: '',
    storeBannerUrl: ''
  });
  
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name || '',
        email: currentUser.email || '',
        address: currentUser.address || '',
        notifications: currentUser.notifications !== false,
        storeName: storeProfile?.name || '',
        storeLogoLetter: storeProfile?.logoLetter || '',
        storeBannerUrl: storeProfile?.bannerUrl || ''
      });
    }
  }, [currentUser, storeProfile]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdateUser({ ...currentUser, ...formData });
    setStoreProfile({
      name: formData.storeName,
      logoLetter: formData.storeLogoLetter,
      bannerUrl: formData.storeBannerUrl
    });
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  if (!currentUser) {
    return (
      <div className="app-container" style={{ textAlign: 'center', padding: '4rem 0' }}>
        <h2>Please sign in to view your settings.</h2>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="app-container" 
      style={{ paddingTop: '2rem', paddingBottom: '4rem', maxWidth: '800px' }}
    >
      <h1 style={{ marginBottom: '2rem' }}>Profile Settings</h1>
      
      <div className="card" style={{ padding: '2rem' }}>
        <form onSubmit={handleSubmit}>
          <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Personal Information</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
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
          </div>

          <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginTop: '2rem' }}>Shipping Details</h3>
          
          <div className="form-group">
            <label className="form-label">Default Shipping Address</label>
            <div style={{ position: 'relative' }}>
              <MapPin size={18} style={{ position: 'absolute', top: '1rem', left: '1rem', color: 'var(--text-secondary)' }} />
              <textarea className="form-control" style={{ paddingLeft: '2.5rem', minHeight: '80px', resize: 'vertical' }} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="123 Example Street, City, Country"></textarea>
            </div>
          </div>

          <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginTop: '2rem' }}>Store Profile Settings</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Store Name</label>
              <div style={{ position: 'relative' }}>
                <Store size={18} style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input type="text" className="form-control" style={{ paddingLeft: '2.5rem' }} value={formData.storeName} onChange={e => setFormData({...formData, storeName: e.target.value})} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Store Logo (2 Letters Max)</label>
              <div style={{ position: 'relative' }}>
                <ImageIcon size={18} style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input type="text" className="form-control" style={{ paddingLeft: '2.5rem' }} maxLength={2} value={formData.storeLogoLetter} onChange={e => setFormData({...formData, storeLogoLetter: e.target.value})} required />
              </div>
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Store Banner Image URL</label>
            <div style={{ position: 'relative' }}>
              <ImageIcon size={18} style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input type="url" className="form-control" style={{ paddingLeft: '2.5rem' }} value={formData.storeBannerUrl} onChange={e => setFormData({...formData, storeBannerUrl: e.target.value})} placeholder="https://images.unsplash.com/photo-..." required />
            </div>
          </div>

          <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginTop: '2rem' }}>Preferences</h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ width: '40px', height: '24px', background: formData.notifications ? 'var(--accent-gold)' : 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '12px', position: 'relative', cursor: 'pointer', transition: 'all 0.3s' }} onClick={() => setFormData({...formData, notifications: !formData.notifications})}>
              <div style={{ width: '18px', height: '18px', background: formData.notifications ? '#000' : 'var(--text-secondary)', borderRadius: '50%', position: 'absolute', top: '2px', left: formData.notifications ? '18px' : '2px', transition: 'all 0.3s' }} />
            </div>
            <div>
              <div style={{ fontWeight: 'bold' }}>Email Notifications</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Receive updates on orders and new book releases.</div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Save size={18} /> Save Changes
          </button>
        </form>
      </div>
      
      {showToast && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: '#fff', color: '#000', padding: '1rem 1.5rem', borderRadius: '8px', fontWeight: 'bold', zIndex: 100 }}>
          Settings updated successfully!
        </div>
      )}
    </motion.div>
  );
}
