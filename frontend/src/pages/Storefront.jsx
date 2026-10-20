import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../utils/apiClient';
import { useCartStore } from '../store/cartStore';
import { Loader2 } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import StoreBannerEngine from '../components/storefront/StoreBannerEngine';
import LayoutEngine from '../components/storefront/LayoutEngine';
import { PLACEHOLDER_BANNER } from '@/constants/placeholders';
import { ErrorState } from '../components/shared/ErrorState';

const Storefront = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [store, setStore] = useState(null);
    const [loading, setLoading] = useState(true);
    const { addToCart, cartItems } = useCartStore();
    const [wishlist, setWishlist] = useState([]);
    const [activeTab, setActiveTab] = useState('Home');
    const { scrollY } = useScroll();
    const bannerY = useTransform(scrollY, [0, 500], [0, 150]);

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
                const res = await apiClient.get(`/api/v1/stores/by-slug/${slug}`);
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
            <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg-primary)] px-4">
                <ErrorState 
                    variant="notFound"
                    title="Store Not Found"
                    message="The store you are looking for doesn't exist, is currently inactive, or the link is broken."
                    showHome
                />
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
    
    let portfolioConfig = {};
    if (store.portfolioConfig) {
        try {
            portfolioConfig = typeof store.portfolioConfig === 'string' ? JSON.parse(store.portfolioConfig) : store.portfolioConfig;
        } catch(e) {}
    }
    const storeConfig = portfolioConfig?.storeConfig || {};
    const productLayout = storeConfig.productLayout;

    let { 
        primaryColor = '#10b981', 
        secondaryColor = '#f1f5f9', 
        fontFamily = 'Inter, sans-serif',
        bannerTemplate = {
            style: 'slant',
            bgImage: store.bannerUrl || PLACEHOLDER_BANNER,
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

    if (productLayout) {
        layouts = [{ type: productLayout, title: 'Trending Products' }];
    }

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

            {/* TAB NAVIGATION */}
            <div className="w-full border-b border-white/10 bg-black/20 backdrop-blur-md sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 overflow-x-auto hide-scrollbar">
                    <div className="flex items-center gap-8 py-4">
                        {['Home', 'Products', 'Collections', 'Reviews', 'About Store'].map(tab => (
                            <button 
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`text-sm font-bold whitespace-nowrap transition-colors ${
                                    activeTab === tab ? 'text-blue-400' : 'text-white/70 hover:text-white'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <motion.div 
                initial="hidden"
                animate="visible"
                variants={{
                    hidden: { opacity: 0 },
                    visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
                }}
                className="max-w-7xl mx-auto px-4 sm:px-6 w-full pb-24 relative z-10"
            >
                {activeTab === 'Home' && layouts.map((section, idx) => (
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
                            storeConfig={storeConfig}
                        />
                    </motion.div>
                ))}

                {activeTab === 'Products' && (
                    <motion.div 
                        variants={{
                            hidden: { opacity: 0, y: 30 },
                            visible: { opacity: 1, y: 0, transition: { type: 'spring', damping: 20 } }
                        }}
                        className="mt-8"
                    >
                        <LayoutEngine 
                            section={{ type: productLayout || 'luxury-bento', title: 'All Products' }} 
                            products={store.products} 
                            addToCart={addToCart} 
                            wishlist={wishlist}
                            toggleWishlist={toggleWishlist}
                            animationConfig={animationConfig}
                            storeConfig={storeConfig}
                        />
                    </motion.div>
                )}

                {activeTab === 'Collections' && (
                    <motion.div className="mt-16 bg-white/5 backdrop-blur-md rounded-3xl p-16 border border-white/10 shadow-xl text-center">
                        <h3 className="text-2xl font-bold mb-4 text-white">Collections</h3>
                        <p className="text-gray-400">Curated collections coming soon to {store.storeName}.</p>
                    </motion.div>
                )}

                {/* About Section */}
                {activeTab === 'About Store' && brandConfig.aboutConfig && (
                    <motion.div className="mt-16 bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10 shadow-xl">
                        <h3 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">About Our Store</h3>
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                    <h4 className="text-xl font-bold mb-6 text-white">Delivery Route / Location Map</h4>
                                    <div className="flex flex-col gap-0 font-mono text-sm pl-4">
                                        {brandConfig.aboutConfig.locationDescription.split(/[-]+/).map((loc, i, arr) => {
                                            const isFirst = i === 0;
                                            const isLast = i === arr.length - 1;
                                            
                                            let icon = '⚪';
                                            let color = 'text-gray-400';
                                            
                                            if (isFirst) {
                                                icon = '🔵';
                                                color = 'text-blue-400 font-bold';
                                            } else if (isLast) {
                                                icon = '🔴';
                                                color = 'text-red-400 font-bold';
                                            } else if (i === 1) {
                                                icon = '🟠'; // Just highlighting the second step like the example
                                                color = 'text-orange-400 font-bold';
                                            }

                                            return (
                                                <div key={i} className="flex flex-col items-start relative">
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-lg w-6 text-center">{icon}</span>
                                                        <span className={color}>{loc.trim()}</span>
                                                    </div>
                                                    {!isLast && (
                                                        <div className="flex flex-col justify-center items-center w-6 h-8 ml-0">
                                                            <div className="w-0.5 h-full bg-white/20" style={{ borderLeft: '2px dotted rgba(255,255,255,0.3)' }}></div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                    <h4 className="text-xl font-bold mb-2">Refund Policy</h4>
                                    <p className="text-white/70 whitespace-pre-wrap">{brandConfig.aboutConfig.refundPolicy}</p>
                                </div>
                                <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                    <h4 className="text-xl font-bold mb-2">Return Policy</h4>
                                    <p className="text-white/70 whitespace-pre-wrap">{brandConfig.aboutConfig.returnPolicy}</p>
                                </div>
                                <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                    <h4 className="text-xl font-bold mb-2">Store Standing</h4>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-white/70 text-sm">Account Penalty Rate</span>
                                        <span className={`font-bold ${store.banningRate >= 50 ? 'text-red-400' : store.banningRate > 0 ? 'text-orange-400' : 'text-green-400'}`}>{store.banningRate || 0}%</span>
                                    </div>
                                    <div className="w-full bg-black/40 rounded-full h-2">
                                        <div className={`h-2 rounded-full ${store.banningRate >= 50 ? 'bg-red-500' : store.banningRate > 0 ? 'bg-orange-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, store.banningRate || 0)}%` }}></div>
                                    </div>
                                    <p className="text-xs text-white/40 mt-2">Maximum allowed penalty is 100%.</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'About Store' && !brandConfig.aboutConfig && (
                    <motion.div className="mt-16 bg-white/5 backdrop-blur-md rounded-3xl p-16 border border-white/10 shadow-xl text-center">
                        <h3 className="text-2xl font-bold mb-4 text-black">About {store.storeName}</h3>
                        <p className="text-gray-400">Welcome to our store. We provide premium products with excellent service.</p>
                    </motion.div>
                )}

                {/* Reviews Section */}
                {activeTab === 'Reviews' && brandConfig.reviewsConfig?.showReviews && (
                    <motion.div className="mt-16 bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10 shadow-xl text-center">
                        <h3 className="text-3xl font-bold mb-8 bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">Customer Reviews</h3>
                        <div className={`grid gap-6 ${brandConfig.reviewsConfig.layout === 'Grid' ? 'md:grid-cols-3' : 'md:grid-cols-1 max-w-2xl mx-auto'}`}>
                            {/* Dummy Reviews for Demo */}
                            {[1, 2, 3].map(r => (
                                <div key={r} className={`p-6 rounded-2xl ${brandConfig.reviewsConfig.style === 'Minimal' ? 'border-b border-white/10 text-left' : 'bg-white/5 border border-white/10 shadow-lg text-left'}`}>
                                    <div className="flex text-yellow-400 mb-2">{'★'.repeat(5)}</div>
                                    <p className="text-white/80 italic">"Amazing products and lightning fast delivery! Highly recommended seller."</p>
                                    <span className="text-xs text-white/50 block mt-4">- Verified Buyer</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
                
                {activeTab === 'Reviews' && !brandConfig.reviewsConfig?.showReviews && (
                    <motion.div className="mt-16 bg-white/5 backdrop-blur-md rounded-3xl p-16 border border-white/10 shadow-xl text-center">
                        <h3 className="text-2xl font-bold mb-4 text-white">Customer Reviews</h3>
                        <p className="text-gray-400">No reviews yet. Be the first to review!</p>
                    </motion.div>
                )}
            </motion.div>

            {/* Personal Store Cart Floating Action */}
            {(() => {
                // Calculate personal cart items and total for THIS specific seller
                const personalCartItems = cartItems.filter(item => item.sellerId === store.seller.id);
                const personalCartTotal = personalCartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                const personalCartCount = personalCartItems.reduce((sum, item) => sum + item.quantity, 0);

                if (personalCartCount === 0) return null;

                return (
                    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
                        <button 
                            onClick={() => navigate(`/cart?sellerId=${store.seller.id}`)}
                            className="flex items-center gap-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-4 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:scale-105 transition-transform border border-blue-400/30"
                        >
                            <div className="relative">
                                <span className="text-2xl">🛍️</span>
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-indigo-700">
                                    {personalCartCount}
                                </span>
                            </div>
                            <div className="flex flex-col text-left border-l border-white/20 pl-4">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Checkout {store.storeName}</span>
                                <span className="font-black text-lg">₦{personalCartTotal.toLocaleString()}</span>
                            </div>
                        </button>
                    </div>
                );
            })()}
        </motion.div>
    );
};

export default Storefront;
