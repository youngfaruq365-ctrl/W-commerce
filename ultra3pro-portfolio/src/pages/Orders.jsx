import React from 'react';
import { motion } from 'framer-motion';
import { Package, Calendar, CreditCard } from 'lucide-react';

export default function Orders({ orders, currentUser }) {
  if (!currentUser) {
    return (
      <div className="app-container" style={{ textAlign: 'center', padding: '4rem 0' }}>
        <h2>Please sign in to view your orders.</h2>
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
      <h1 style={{ marginBottom: '2rem' }}>Order History</h1>
      
      {(!orders || orders.length === 0) ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', borderStyle: 'dashed' }}>
          <Package size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <h3>No orders yet</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Looks like you haven't purchased anything yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {orders.map((order, index) => (
            <div key={index} className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Order #{order.id}</h3>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Calendar size={14} /> {new Date(order.date).toLocaleDateString()}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><CreditCard size={14} /> Paid via {order.method}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--accent-gold)' }}>₦{order.total}</div>
                  <div style={{ display: 'inline-block', background: 'rgba(74, 222, 128, 0.2)', color: '#4ade80', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', marginTop: '0.25rem' }}>SUCCESS</div>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {order.items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <img src={item.coverUrl} style={{ width: '40px', height: '55px', objectFit: 'cover', borderRadius: '4px' }} alt={item.title} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold' }}>{item.title}</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>₦{item.price}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
