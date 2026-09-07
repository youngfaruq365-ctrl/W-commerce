import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, User, MessageCircle, X, Trash2 } from 'lucide-react';
import Home from './pages/Home';
import Products from './pages/Products';
import About from './pages/About';
import SellerDashboard from './components/seller-dashboard';
import Login from './components/login';
import AuthModal from './components/AuthModal';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import Settings from './pages/Settings';
import Success from './pages/Success';
import AbandonedCartPopup from './components/AbandonedCartPopup';

// Mock initial data
const initialBooks = [
  {
    id: '1',
    title: 'Clean Code',
    description: 'A Handbook of Agile Software Craftsmanship by Robert C. Martin.',
    coverUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800',
    link: '#',
    price: '25,000',
    rating: '4.9'
  },
  {
    id: '2',
    title: 'The Pragmatic Programmer',
    description: 'Your journey to mastery by Andrew Hunt and David Thomas.',
    coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800',
    link: '#',
    price: '28,500',
    rating: '4.8'
  },
  {
    id: '3',
    title: "Don't Make Me Think",
    description: 'A Common Sense Approach to Web Usability by Steve Krug.',
    coverUrl: 'https://images.unsplash.com/photo-1587440871875-191322ee64b0?auto=format&fit=crop&q=80&w=800',
    link: '#',
    price: '18,000',
    rating: '4.7'
  },
  {
    id: '4',
    title: 'JavaScript: The Good Parts',
    description: 'Unearthing the Excellence in JavaScript by Douglas Crockford.',
    coverUrl: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?auto=format&fit=crop&q=80&w=800',
    link: '#',
    price: '15,000',
    rating: '4.6'
  },
  {
    id: '5',
    title: 'Design Patterns',
    description: 'Elements of Reusable Object-Oriented Software by the Gang of Four.',
    coverUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&q=80&w=800',
    link: '#',
    price: '32,000',
    rating: '4.9'
  },
  {
    id: '6',
    title: 'Refactoring',
    description: 'Improving the Design of Existing Code by Martin Fowler.',
    coverUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800',
    link: '#',
    price: '29,500',
    rating: '4.8'
  },
  {
    id: '7',
    title: 'Atomic Habits',
    description: 'An Easy & Proven Way to Build Good Habits & Break Bad Ones.',
    coverUrl: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?auto=format&fit=crop&q=80&w=800',
    link: '#',
    price: '12,000',
    rating: '4.9'
  },
  {
    id: '8',
    title: 'Deep Work',
    description: 'Rules for Focused Success in a Distracted World by Cal Newport.',
    coverUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=800',
    link: '#',
    price: '14,000',
    rating: '4.7'
  },
  {
    id: '9',
    title: 'Hooked',
    description: 'How to Build Habit-Forming Products by Nir Eyal.',
    coverUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=800',
    link: '#',
    price: '16,000',
    rating: '4.5'
  },
  {
    id: '10',
    title: 'The Design of Everyday Things',
    description: 'The ultimate guide to human-centered design by Don Norman.',
    coverUrl: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=800',
    link: '#',
    price: '19,000',
    rating: '4.8'
  },
  {
    id: '11',
    title: 'Sprint',
    description: 'How to Solve Big Problems and Test New Ideas in Just Five Days.',
    coverUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=800',
    link: '#',
    price: '17,500',
    rating: '4.6'
  },
  {
    id: '12',
    title: 'Zero to One',
    description: 'Notes on Startups, or How to Build the Future by Peter Thiel.',
    coverUrl: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=800',
    link: '#',
    price: '13,000',
    rating: '4.7'
  }
];

function Navigation({ cart, removeFromCart, currentUser, setCurrentUser }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showCart, setShowCart] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const handleProfileClick = () => {
    setShowMessages(false);
    setShowCart(false);
    if (!currentUser) {
      setShowAuthModal(true);
    } else {
      setShowProfile(!showProfile);
    }
  };

  return (
    <>
      <nav className="navbar">
        <div className="app-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0 1.5rem', margin: 0 }}>
          <Link to="/" className="nav-brand">
            ALEX'S-STORE
          </Link>
          <div className="nav-links">
            <Link to="/" className={location.pathname === '/' ? 'active' : ''}>Home</Link>
            <Link to="/products" className={location.pathname === '/products' ? 'active' : ''}>Products</Link>
            <Link to="/about" className={location.pathname === '/about' ? 'active' : ''}>About</Link>
            <Link to="/dashboard" className={location.pathname === '/dashboard' ? 'active' : ''}>
              <LayoutDashboard size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} />
              Dashboard
            </Link>
          </div>
          <div className="nav-actions">
            <div style={{ position: 'relative' }}>
              <button className="icon-btn" onClick={() => {setShowMessages(!showMessages); setShowProfile(false); setShowCart(false);}} title="Messages">
                <MessageCircle size={20} />
                <span style={{ position: 'absolute', top: -5, right: -8, background: 'var(--accent-gold)', color: '#000', fontSize: '10px', fontWeight: 'bold', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
              </button>
              
              {showMessages && (
                <div className="card" style={{ position: 'absolute', top: '100%', right: 0, marginTop: '1rem', width: '300px', zIndex: 50, padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-main)' }}>
                    <h4 style={{ margin: 0 }}>Messages</h4>
                  </div>
                  <div style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--text-primary)', color: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>AB</div>
                      <div>
                        <h5 style={{ margin: 0 }}>Alex's Bookstore</h5>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Welcome to our premium store!</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <button className="icon-btn" onClick={handleProfileClick} title="Profile">
                <User size={20} color={currentUser ? 'var(--accent-gold)' : 'currentColor'} />
              </button>
              
              {showProfile && currentUser && (
                <div className="card" style={{ position: 'absolute', top: '100%', right: 0, marginTop: '1rem', width: '200px', zIndex: 50, padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-main)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                     <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold' }}>
                       {currentUser.name.charAt(0).toUpperCase()}
                     </div>
                     <div style={{ overflow: 'hidden' }}>
                       <h5 style={{ margin: 0, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{currentUser.name}</h5>
                       <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{currentUser.email}</p>
                     </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <button onClick={() => { setShowProfile(false); navigate('/orders'); }} style={{ background: 'none', border: 'none', padding: '1rem', color: 'var(--text-primary)', textAlign: 'left', cursor: 'pointer', borderBottom: '1px solid var(--border-color)' }}>My Orders</button>
                    <button onClick={() => { setShowProfile(false); navigate('/settings'); }} style={{ background: 'none', border: 'none', padding: '1rem', color: 'var(--text-primary)', textAlign: 'left', cursor: 'pointer', borderBottom: '1px solid var(--border-color)' }}>Settings</button>
                    <button onClick={() => { setShowProfile(false); setCurrentUser(null); }} style={{ background: 'none', border: 'none', padding: '1rem', color: '#ef4444', textAlign: 'left', cursor: 'pointer' }}>Sign Out</button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <button className="icon-btn" style={{ position: 'relative' }} onClick={() => {setShowCart(!showCart); setShowMessages(false); setShowProfile(false);}} title="Cart">
                <ShoppingCart size={20} />
                <span style={{ position: 'absolute', top: -5, right: -8, background: 'var(--accent-gold)', color: '#000', fontSize: '10px', fontWeight: 'bold', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{cart.length}</span>
              </button>
              
              {showCart && (
                <div className="card" style={{ position: 'absolute', top: '100%', right: 0, marginTop: '1rem', width: '320px', zIndex: 50, padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0 }}>Shopping Cart ({cart.length})</h4>
                    <X size={16} style={{ cursor: 'pointer' }} onClick={() => setShowCart(false)} />
                  </div>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {cart.length === 0 ? (
                      <p style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', margin: 0 }}>Your cart is empty.</p>
                    ) : (
                      cart.map((item, idx) => (
                        <div key={idx} style={{ padding: '1rem', display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', alignItems: 'center' }}>
                          <img src={item.coverUrl} style={{ width: '40px', height: '55px', objectFit: 'cover', borderRadius: '4px' }} alt={item.title} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h5 style={{ margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</h5>
                            <p style={{ margin: 0, color: 'var(--accent-gold)', fontSize: '0.875rem' }}>₦{item.price}</p>
                          </div>
                          <button onClick={() => removeFromCart(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16}/></button>
                        </div>
                      ))
                    )}
                  </div>
                  {cart.length > 0 && (
                    <div style={{ padding: '1rem', background: 'var(--bg-main)' }}>
                      <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => { setShowCart(false); navigate('/checkout'); }}>Proceed to Checkout</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      
      {/* Overlay to close dropdowns */}
      {(showCart || showMessages || showProfile) && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }} 
          onClick={() => { setShowCart(false); setShowMessages(false); setShowProfile(false); }}
        />
      )}
      
      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onLogin={setCurrentUser} />
    </>
  );
}

function ProtectedDashboard({ books, setBooks }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const auth = sessionStorage.getItem('bookfolio-auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (status) => {
    setIsAuthenticated(status);
    if (status) {
      sessionStorage.setItem('bookfolio-auth', 'true');
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app-container" style={{ paddingTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Dashboard Settings</h2>
        <button 
          onClick={() => {
            handleLogin(false);
            sessionStorage.removeItem('bookfolio-auth');
          }} 
          className="btn btn-secondary"
          style={{ padding: '0.4rem 1rem' }}
        >
          Logout
        </button>
      </div>
      <SellerDashboard books={books} setBooks={setBooks} />
    </div>
  );
}

export default function App() {
  const [books, setBooks] = useState([]);
  const [cart, setCart] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [storeProfile, setStoreProfile] = useState({
    name: "ALEX'S BOOKSTORE",
    logoLetter: "AB",
    bannerUrl: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80&w=1200"
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('bookfolio-books-v3');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        if (parsed.length <= 2) {
          setBooks(initialBooks);
        } else {
          setBooks(parsed);
        }
      } catch (e) { setBooks(initialBooks); }
    } else {
      setBooks(initialBooks);
    }
    
    const savedCart = localStorage.getItem('bookfolio-cart');
    if (savedCart) { try { setCart(JSON.parse(savedCart)); } catch (e) {} }
    
    const savedUser = localStorage.getItem('bookfolio-user');
    if (savedUser) { try { setCurrentUser(JSON.parse(savedUser)); } catch (e) {} }
    
    const savedOrders = localStorage.getItem('bookfolio-orders');
    if (savedOrders) { try { setOrders(JSON.parse(savedOrders)); } catch (e) {} }
    
    const savedStore = localStorage.getItem('bookfolio-store');
    if (savedStore) { try { setStoreProfile(JSON.parse(savedStore)); } catch (e) {} }
    
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('bookfolio-books-v3', JSON.stringify(books));
      localStorage.setItem('bookfolio-cart', JSON.stringify(cart));
      localStorage.setItem('bookfolio-user', JSON.stringify(currentUser));
      localStorage.setItem('bookfolio-orders', JSON.stringify(orders));
      localStorage.setItem('bookfolio-store', JSON.stringify(storeProfile));
    }
  }, [books, cart, currentUser, orders, storeProfile, isLoaded]);

  const addToCart = (book) => { setCart(prev => [...prev, book]); };
  const removeFromCart = (index) => { setCart(prev => prev.filter((_, i) => i !== index)); };
  const clearCart = () => { setCart([]); };
  const addOrder = (order) => { setOrders(prev => [order, ...prev]); };

  if (!isLoaded) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;

  return (
    <Router>
      <Navigation cart={cart} removeFromCart={removeFromCart} currentUser={currentUser} setCurrentUser={setCurrentUser} />
      <main>
        <Routes>
          <Route path="/" element={<Home books={books} addToCart={addToCart} storeProfile={storeProfile} />} />
          <Route path="/products" element={<Products books={books} addToCart={addToCart} />} />
          <Route path="/about" element={<About />} />
          <Route path="/checkout" element={<Checkout cart={cart} clearCart={clearCart} currentUser={currentUser} addOrder={addOrder} />} />
          <Route path="/success" element={<Success />} />
          <Route path="/orders" element={<Orders orders={orders} currentUser={currentUser} />} />
          <Route path="/settings" element={<Settings currentUser={currentUser} onUpdateUser={setCurrentUser} storeProfile={storeProfile} setStoreProfile={setStoreProfile} />} />
          <Route path="/dashboard" element={<ProtectedDashboard books={books} setBooks={setBooks} />} />
        </Routes>
      </main>
      
      <AbandonedCartPopup cart={cart} />
      
      <footer style={{ borderTop: '1px solid var(--border-color)', padding: '2rem 0', marginTop: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div className="app-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 0 }}>
          <p>© {new Date().getFullYear()} Alex's Bookstore. All rights reserved.</p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Privacy Policy</Link>
            <Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Terms of Service</Link>
          </div>
        </div>
      </footer>
    </Router>
  );
}
