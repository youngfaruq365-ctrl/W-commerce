import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useCartStore } from '../store/cartStore';
import { Loader2 } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import StoreBannerEngine from '../components/storefront/StoreBannerEngine';
import LayoutEngine from '../components/storefront/LayoutEngine';

const Storefront = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [store, setStore] = useState(null);
    const [loading, setLoading] = useState(true);
    const { addToCart } = useCartStore();
    const [wishlist, setWishlist] = useState([]);

    const toggleWishlist = (product) => {
        setWishlist(prev => {
            if (prev.find(p => p.id === product.id)) {
                return prev.filter(p => p.id !== product.id);
            }
            return [...prev, product];
        });
    };

    useEffect(() => {
        if (!slug || slug === 'null' || slug === 'undefined') {
            setLoading(false);
            return;
        }
        
        const fetchStore = async () => {
            try {
                const res = await axios.get(`/api/v1/stores/by-slug/${slug}`);
                if (res.data.success) {
                    const payload = res.data.data;
                    if (payload && payload.store) {
                        const mergedStoreData = {
                            ...payload.store,
                            seller: payload.seller,
                            metrics: payload.metrics,
                            products: payload.products || [],
                            posts: payload.posts || [],
                            portfolio: payload.portfolio
                        };
                        setStore(mergedStoreData);
                    }
                }
            } catch (err) {
                // console.error("Storefront Error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStore();
    }, [slug]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
                <Loader2 className="animate-spin mb-4" size={48} />
                <p className="text-gray-400">Loading store experience...</p>
            </div>
        );
    }
    
    if (!store) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white px-4 text-center">
                <div className="w-24 h-24 bg-gray-900 rounded-full flex items-center justify-center mb-6">
                    <span className="text-4xl">🏪</span>
                </div>
                <h2 className="text-3xl font-bold mb-2">Store Not Found</h2>
                <p className="text-gray-400 mb-8 max-w-md">The store you are looking for doesn't exist, is currently inactive, or the link is broken.</p>
                <button 
                    onClick={() => navigate('/')} 
                    className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors"
                >
                    Return to Marketplace
                </button>
            </div>
        );
    }

    let brandConfig = {};
    if (store.brandConfig) {
        try {
            brandConfig = typeof store.brandConfig === 'string' ? JSON.parse(store.brandConfig) : store.brandConfig;
        } catch(e) {
            // console.error("Failed to parse brandConfig", e);
        }
    }

    const { 
        primaryColor = '#10b981', 
        secondaryColor = '#f1f5f9', 
        fontFamily = 'Inter, sans-serif',
        bannerTemplate = {
            style: 'slant',
            bgImage: store.bannerUrl || 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80',
            title: store.storeName || 'Welcome to Our Store',
            subtitle: store.description || 'Discover our latest premium collection',
            overlayColor: 'rgba(15, 23, 42, 0.5)',
            themeColor: '#ffffff'
        },
        layouts = [
            { type: 'premium-coverflow', title: 'Trending Products' },
            { type: 'luxury-bento', title: 'Featured Highlights' }
        ],
        animationConfig = {}
    } = brandConfig;

    const { scrollY } = useScroll();
    const bannerY = useTransform(scrollY, [0, 500], [0, 150]);

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="min-h-screen w-full flex flex-col overflow-x-hidden transition-colors duration-500"
            style={{ 
                backgroundColor: 'var(--bg-primary)', 
                color: 'var(--text-main)', 
                '--accent-gold': primaryColor, 
                '--bg-card': secondaryColor,
                '--text-primary': 'var(--text-main)',
                '--text-secondary': 'var(--text-muted)',
                fontFamily 
            }}
        >
            <motion.div style={{ y: bannerY }}>
                <StoreBannerEngine template={bannerTemplate} />
            </motion.div>

            <motion.div 
                initial="hidden"
                animate="visible"
                variants={{
                    hidden: { opacity: 0 },
                    visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
                }}
                className="max-w-7xl mx-auto px-4 sm:px-6 w-full pb-24 relative z-10"
            >
                {layouts.map((section, idx) => (
                    <motion.div 
                        key={idx}
                        variants={{
                            hidden: { opacity: 0, y: 30 },
                            visible: { opacity: 1, y: 0, transition: { type: 'spring', damping: 20 } }
                        }}
                    >
                        <LayoutEngine 
                            section={section} 
                            products={store.products} 
                            addToCart={addToCart} 
                            wishlist={wishlist}
                            toggleWishlist={toggleWishlist}
                            animationConfig={animationConfig}
                        />
                    </motion.div>
                ))}
            </motion.div>
        </motion.div>
    );
};

export default Storefront;
