import React from 'react';
import { ExternalLink, BookOpen } from 'lucide-react';

export default function BookCard({ book }) {
  return (
    <div className="card animate-fade-in">
      <div style={{ position: 'relative', width: '100%', paddingTop: '140%', marginBottom: '1.5rem', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        {book.coverUrl ? (
          <img 
            src={book.coverUrl} 
            alt={book.title}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)' }}>
            <BookOpen size={48} color="var(--text-secondary)" />
          </div>
        )}
      </div>
      
      <h3 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }} className="text-gradient">
        {book.title}
      </h3>
      
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {book.description}
      </p>
      
      <a 
        href={book.link} 
        target="_blank" 
        rel="noopener noreferrer"
        className="btn btn-primary"
        style={{ width: '100%', textDecoration: 'none' }}
      >
        <ExternalLink size={18} />
        Purchase Book
      </a>
    </div>
  );
}
