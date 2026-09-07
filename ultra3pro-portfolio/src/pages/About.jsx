import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Users, ShieldCheck, MapPin, Building2, Shield, Lock } from 'lucide-react';

export default function About() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="app-container"
    >
      {/* About Hero */}
      <div style={{ height: '300px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(to right, rgba(0,0,0,0.9), rgba(0,0,0,0.4)), url("https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&q=80&w=1200") center/cover', display: 'flex', alignItems: 'center', padding: '0 3rem', marginTop: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>About Alex's Bookstore</h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '500px' }}>Premium Quality • Trust • Innovation. We are deeply committed to providing the best books and exceptional customer service.</p>
        </div>
      </div>

      {/* Top Stats Row */}
      <div className="stats-row" style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Clock size={24} style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }} />
          <div className="stat-value">2+</div>
          <div className="stat-label">Years in Business</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Users size={24} style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }} />
          <div className="stat-value">50K+</div>
          <div className="stat-label">Happy Customers</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <ShieldCheck size={24} style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }} />
          <div className="stat-value">100%</div>
          <div className="stat-label">Satisfaction</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <MapPin size={24} style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }} />
          <div className="stat-value">Nigeria</div>
          <div className="stat-label">Based in Lagos</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
        {/* Our Story */}
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Our Story</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.8 }}>
            Alex's Bookstore was founded with a simple mission: to bring premium quality books and knowledge closer to everyone in Nigeria. We believe in trust, quality, and long-term relationships with our readers.
            <br /><br />
            From best-selling fiction to industry-leading technical manuals, we carefully curate every item on our shelves to ensure our customers get nothing but the best.
          </p>
        </div>

        {/* Badges */}
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={20} /> Verified & Trusted
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <Building2 size={24} style={{ color: 'var(--text-secondary)' }} />
              <div>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>CAC Registered</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>BN 1234567890</p>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <Shield size={24} style={{ color: 'var(--text-secondary)' }} />
              <div>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>Verified Seller</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>M-Commerce Verified</p>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <Lock size={24} style={{ color: 'var(--text-secondary)' }} />
              <div>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>Secure Payments</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>PayStack Protected</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Stats */}
      <div className="stats-row" style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="stat-value">98%</div>
          <div className="stat-label">Positive Reviews</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="stat-value">2 mins</div>
          <div className="stat-label">Avg. Response</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="stat-value">24/7</div>
          <div className="stat-label">Customer Support</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="stat-value">7 Days</div>
          <div className="stat-label">Easy Returns</div>
        </div>
      </div>
    </motion.div>
  );
}
