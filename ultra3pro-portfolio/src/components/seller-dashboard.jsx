import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Link as LinkIcon, Image as ImageIcon, Type, AlignLeft, Trash2, Tag, Star, BookOpen } from 'lucide-react';

export default function SellerDashboard({ books, setBooks }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    coverUrl: '',
    link: '',
    price: '',
    rating: ''
  });
  
  const [showToast, setShowToast] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newBook = {
      ...formData,
      id: Date.now().toString()
    };
    
    setBooks(prev => [newBook, ...prev]);
    setFormData({ title: '', description: '', coverUrl: '', link: '', price: '', rating: '' });
    
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };
  
  const handleDelete = (id) => {
    setBooks(prev => prev.filter(b => b.id !== id));
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="dashboard-layout" 
      style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', padding: '2rem 0' }}
    >
      {/* Form Section */}
      <div className="card" style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={24} /> Add New Book
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Book Title</label>
            <div style={{ position: 'relative' }}>
              <Type size={18} style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input type="text" name="title" value={formData.title} onChange={handleChange} className="form-control" style={{ paddingLeft: '2.5rem' }} placeholder="e.g. Advanced Agentic Coding" required />
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Price (₦)</label>
              <div style={{ position: 'relative' }}>
                <Tag size={18} style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input type="text" name="price" value={formData.price} onChange={handleChange} className="form-control" style={{ paddingLeft: '2.5rem' }} placeholder="15,000" required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Rating</label>
              <div style={{ position: 'relative' }}>
                <Star size={18} style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input type="number" step="0.1" max="5" name="rating" value={formData.rating} onChange={handleChange} className="form-control" style={{ paddingLeft: '2.5rem' }} placeholder="4.5" required />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Cover Image URL</label>
            <div style={{ position: 'relative' }}>
              <ImageIcon size={18} style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input type="url" name="coverUrl" value={formData.coverUrl} onChange={handleChange} className="form-control" style={{ paddingLeft: '2.5rem' }} placeholder="https://..." />
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Purchase / Reading Link</label>
            <div style={{ position: 'relative' }}>
              <LinkIcon size={18} style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input type="url" name="link" value={formData.link} onChange={handleChange} className="form-control" style={{ paddingLeft: '2.5rem' }} placeholder="https://..." required />
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Description</label>
            <div style={{ position: 'relative' }}>
              <AlignLeft size={18} style={{ position: 'absolute', top: '1rem', left: '1rem', color: 'var(--text-secondary)' }} />
              <textarea name="description" value={formData.description} onChange={handleChange} className="form-control" style={{ paddingLeft: '2.5rem', minHeight: '100px', resize: 'vertical' }} placeholder="Describe the book..." required></textarea>
            </div>
          </div>
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Post Book</button>
        </form>
      </div>
      
      {/* List Section */}
      <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Manage Books <span style={{ fontSize: '1rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>({books.length})</span>
        </h2>
        
        {books.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', borderStyle: 'dashed' }}>
            <BookOpen size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <h3>No books added yet</h3>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {books.map(book => (
              <div key={book.id} className="card" style={{ display: 'flex', gap: '1.5rem', padding: '1rem', alignItems: 'center' }}>
                <img src={book.coverUrl || 'https://via.placeholder.com/100'} alt={book.title} style={{ width: '60px', height: '80px', objectFit: 'cover', borderRadius: '4px' }} />
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{book.title}</h4>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0.25rem 0' }}>
                    <span>₦{book.price}</span>
                    <span>★ {book.rating}</span>
                  </div>
                  <a href={book.link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-primary)', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <LinkIcon size={14} /> View Link
                  </a>
                </div>
                
                <button onClick={() => handleDelete(book.id)} className="icon-btn" style={{ color: '#ef4444', padding: '0.5rem' }}>
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showToast && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: '#fff', color: '#000', padding: '1rem 1.5rem', borderRadius: '8px', fontWeight: 'bold', zIndex: 100 }}>
          Book successfully added!
        </div>
      )}
    </motion.div>
  );
}
