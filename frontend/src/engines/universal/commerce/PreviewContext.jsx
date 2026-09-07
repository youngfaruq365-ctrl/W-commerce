import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';

const PreviewContext = createContext(null);

// DEMO fallback if the API fails or store is empty
const DEMO_PRODUCTS = Array(12).fill(null).map((_, i) => ({
  id: `prod-${i}`,
  name: `Product ${i + 1}`,
  price: 100.00,
  originalPrice: 150.00,
  image: `https://picsum.photos/seed/prod-${i}/600/600`,
  images: Array(4).fill(null).map((_, j) => `https://picsum.photos/seed/prod-${i}-${j}/600/600`),
  rating: 4.5,
  reviews: 120,
  badge: i === 0 ? 'New' : i === 3 ? 'Sale' : i === 7 ? 'Popular' : null,
  colors: ['#000', '#fff', '#c9a96e', '#6366f1'],
  sizes: ['XS', 'S', 'M', 'L', 'XL'],
  inStock: i !== 5,
  description: 'Premium quality product with exceptional craftsmanship and modern design.'
}));

export const PreviewContextProvider = ({ children, store }) => {
  const [activePage, setActivePage]       = useState(store?.pages?.[0] || 'home');
  const [cart, setCart]                   = useState([]);
  const [wishlist, setWishlist]           = useState([]);
  const [activeProduct, setActiveProduct] = useState(null);
  const [isCartOpen, setIsCartOpen]       = useState(false);
  const [isSearchOpen, setIsSearchOpen]   = useState(false);
  const [checkoutStep, setCheckoutStep]   = useState(0);
  const [bookings, setBookings]           = useState([]);
  const [orders, setOrders]               = useState([]);
  const [checkoutState, setCheckoutState] = useState({ email: '', shipping: {}, payment: null });
  const [celebration, setCelebration]     = useState(null);
  const [orderComplete, setOrderComplete] = useState(null); // Will hold the completed order object
  const [user, setUser]                   = useState(null); // mock auth
  
  // Real Store Products State
  const [products, setProducts]       = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // Fetch real products when store changes
  useEffect(() => {
    if (!store?.id) {
      setProducts(DEMO_PRODUCTS);
      setIsLoadingProducts(false);
      return;
    }

    let isMounted = true;
    setIsLoadingProducts(true);

    axios.get(`/api/v1/products?storeId=${store.id}&limit=50`)
      .then(res => {
        if (!isMounted) return;
        const apiProducts = res.data.products;
        
        if (!apiProducts || apiProducts.length === 0) {
          setProducts(DEMO_PRODUCTS); // fallback if empty
          setIsLoadingProducts(false);
          return;
        }

        // Map backend product model to frontend UI format
        const mappedProducts = apiProducts.map((p, i) => {
          const defaultImage = p.images?.length > 0 ? p.images[0].url : `https://picsum.photos/seed/${p.id}/600/600`;
          const allImages = p.images?.length > 0 ? p.images.map(img => img.url) : Array(4).fill(null).map((_, j) => `https://picsum.photos/seed/${p.id}-${j}/600/600`);
          
          return {
            id: p.id,
            name: p.title,
            price: p.isFlashSale && p.flashPrice ? Number(p.flashPrice) : Number(p.price),
            originalPrice: p.isFlashSale && p.flashPrice ? Number(p.price) : Number(p.price) * 1.2, // mock original if not provided
            image: defaultImage,
            images: allImages,
            rating: p.rating || '4.0',
            reviews: p.reviewCount || 0,
            badge: p.isFlashSale ? 'Sale' : i === 0 ? 'New' : null,
            colors: ['#000', '#fff', '#c9a96e', '#6366f1'], // mocked for now until variations added
            sizes: ['XS', 'S', 'M', 'L', 'XL'], // mocked
            inStock: p.stock > 0,
            description: p.description || 'Premium quality product.',
            sellerId: p.storeId,
          };
        });

        setProducts(mappedProducts);
      })
      .catch(err => {
        console.error('Failed to fetch store products:', err);
        if (isMounted) setProducts(DEMO_PRODUCTS);
      })
      .finally(() => {
        if (isMounted) setIsLoadingProducts(false);
      });

    return () => { isMounted = false; };
  }, [store?.id]);

  // Cart actions
  const addToCart = useCallback((product, qty = 1) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + qty } : i);
      return [...prev, { ...product, qty }];
    });
    setCelebration({ type: 'ADD_TO_CART', product });
    setIsCartOpen(true);
    setTimeout(() => setCelebration(null), 3000);
  }, []);

  const removeFromCart = useCallback((productId) => {
    setCart(prev => prev.filter(i => i.id !== productId));
  }, []);

  const updateQty = useCallback((productId, qty) => {
    if (qty <= 0) return removeFromCart(productId);
    setCart(prev => prev.map(i => i.id === productId ? { ...i, qty } : i));
  }, [removeFromCart]);

  const addToWishlist = useCallback((product) => {
    setWishlist(prev => {
      const exists = prev.find(i => i.id === product.id);
      if (exists) return prev.filter(i => i.id !== product.id);
      setCelebration({ type: 'WISHLIST_SUCCESS', product });
      setTimeout(() => setCelebration(null), 2500);
      return [...prev, product];
    });
  }, []);

  const placeOrder = useCallback(() => {
    const orderId = `WCOM-${Date.now().toString(36).toUpperCase()}`;
    const newOrder = {
      id: orderId,
      date: new Date().toISOString(),
      items: [...cart],
      total: cart.reduce((sum, i) => sum + i.price * i.qty, 0),
      shipping: checkoutState.shipping,
      status: 'Processing'
    };
    
    setOrders(prev => [newOrder, ...prev]);
    setOrderComplete(newOrder);
    setCart([]); // Clear cart
    setCelebration({ type: 'ORDER_SUCCESS', orderId });
  }, [cart, checkoutState]);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const addBooking = useCallback((booking) => {
    setBookings(prev => [...prev, booking]);
    setCelebration({ type: 'BOOKING_SUCCESS', booking });
    setTimeout(() => setCelebration(null), 3000);
  }, []);

  const login = useCallback(() => {
    setUser({ name: 'Demo User', email: 'demo@example.com' });
    setCelebration({ type: 'LOGIN_SUCCESS', message: 'Signed in successfully' });
    setTimeout(() => setCelebration(null), 2500);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  // Reset entire demo
  const resetDemo = useCallback(() => {
    setCart([]);
    setWishlist([]);
    setActiveProduct(null);
    setIsCartOpen(false);
    setCheckoutStep(0);
    setCheckoutState({ email: '', shipping: {}, payment: null });
    setBookings([]);
    setOrders([]);
    setCelebration(null);
    setOrderComplete(null);
    setUser(null);
    setActivePage(store?.pages?.[0] || 'home');
  }, [store]);

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);

  return (
    <PreviewContext.Provider value={{
      // State
      activePage, setActivePage,
      cart, cartCount, cartTotal,
      wishlist,
      activeProduct, setActiveProduct,
      isCartOpen, setIsCartOpen,
      isSearchOpen, setIsSearchOpen,
      checkoutStep, setCheckoutStep,
      checkoutState, setCheckoutState,
      bookings,
      orders,
      celebration,
      orderComplete, setOrderComplete,
      // Products
      products,
      isLoadingProducts,
      // Actions
      addToCart, removeFromCart, updateQty, clearCart,
      addToWishlist,
      placeOrder,
      addBooking,
      login, logout,
      resetDemo,
      // Store
      store, user
    }}>
      {children}
    </PreviewContext.Provider>
  );
};

export const usePreview = () => {
  const ctx = useContext(PreviewContext);
  if (!ctx) throw new Error('usePreview must be used inside PreviewContextProvider');
  return ctx;
};
