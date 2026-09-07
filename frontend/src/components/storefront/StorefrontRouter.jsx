import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useCartStore } from '../../store/cartStore';
import { Loader2 } from 'lucide-react';

// Import all portfolio versions
import FreePortfolio from '../../pages/portfolios/FreePortfolio';
import PremiumPortfolio from '../../pages/portfolios/PremiumPortfolio';
import ProPortfolio from '../../pages/portfolios/ProPortfolio';
import ProUltraPortfolio from '../../pages/portfolios/ProUltraPortfolio';
import Ultra1ProPortfolio from '../../pages/portfolios/Ultra1ProPortfolio';
import Ultra2ProPortfolio from '../../pages/portfolios/Ultra2ProPortfolio';
import UltraPortfolio from '../../pages/portfolios/UltraPortfolio';

const StorefrontRouter = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [store, setStore] = useState(null);
    const [loading, setLoading] = useState(true);
    const { addToCart } = useCartStore();

    const [isFollowing, setIsFollowing] = useState(false);
    const [followersCount, setFollowersCount] = useState(0);

    useEffect(() => {
        if (!slug || slug === 'null' || slug === 'undefined') {
            setLoading(false);
            return;
        }
        
        const fetchStore = async () => {
            try {
                // Determine token to pass if buyer is logged in
                const tokenString = localStorage.getItem('auth-storage');
                let token = null;
                if (tokenString) {
                    try {
                        const parsed = JSON.parse(tokenString);
                        token = parsed.state?.token;
                    } catch(e) {}
                }
                const headers = token ? { Authorization: `Bearer ${token}` } : {};
                
                const res = await axios.get(`/api/v1/stores/by-slug/${slug}`, { headers });
                if (res.data.success) {
                    const payload = res.data.data;
                    if (payload && payload.store) {
                        const mergedStoreData = {
                            ...payload.store,
                            logoUrl: payload.store.logoUrl || payload.store.logo,
                            bannerUrl: payload.store.bannerUrl || payload.store.banner,
                            seller: payload.seller,
                            metrics: payload.metrics,
                            products: payload.products || [],
                            posts: payload.posts || [],
                            portfolio: payload.portfolio
                        };
                        setStore(mergedStoreData);
                        setIsFollowing(payload.isFollowing || false);
                        setFollowersCount(payload.metrics?.followers || 0);
                    }
                }
            } catch (err) {
            } finally {
                setLoading(false);
            }
        };

        fetchStore();
    }, [slug]);

    const handleFollow = async () => {
        if (!store?.store?.id && !store?.id) return;
        const storeId = store?.store?.id || store?.id;
        
        const tokenString = localStorage.getItem('auth-storage');
        let token = null;
        if (tokenString) {
            try {
                const parsed = JSON.parse(tokenString);
                token = parsed.state?.token;
            } catch(e) {}
        }
        
        if (!token) {
            const toast = (await import('react-hot-toast')).default;
            toast.error("Please login to follow stores");
            return;
        }

        try {
            const res = await axios.post(`/api/v1/store/${storeId}/follow`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                const newIsFollowing = res.data.isFollowing;
                setIsFollowing(newIsFollowing);
                setFollowersCount(prev => newIsFollowing ? prev + 1 : Math.max(0, prev - 1));
            }
        } catch (error) {
            const toast = (await import('react-hot-toast')).default;
            toast.error(error.response?.data?.message || "Failed to follow store");
        }
    };

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

    // Safely parse brandConfig
    let brandConfig = {};
    if (store.brandConfig) {
        try {
            brandConfig = typeof store.brandConfig === 'string' ? JSON.parse(store.brandConfig) : store.brandConfig;
        } catch(e) {
        }
    }
    
    // Choose portfolio based on tier or default to ProUltra
    const tier = store.subscriptionTier?.toLowerCase() || 'ultra';
    
    const props = {
        store, 
        brandConfig, 
        handleAddToCart: async (e, productId) => {
            if (e && e.preventDefault) e.preventDefault();
            if (e && e.stopPropagation) e.stopPropagation();
            const id = typeof e === 'string' ? e : productId;
            if (id) {
                const toast = (await import('react-hot-toast')).default;
                try {
                    await addToCart(id, 1);
                    toast.success("Added to cart");
                } catch (err) {
                    toast.error("Failed to add to cart");
                }
            }
        },
        handleFollow,
        isFollowing,
        followersCount
    };

    switch(tier) {
        case 'free': return <FreePortfolio {...props} />;
        case 'premium': return <PremiumPortfolio {...props} />;
        case 'pro': return <ProPortfolio {...props} />;
        case 'ultra': return <UltraPortfolio {...props} />;
        case 'pro ultra':
        case 'proultra': return <ProUltraPortfolio {...props} />;
        case 'ultra1pro': return <Ultra1ProPortfolio {...props} />;
        case 'ultra2pro': return <Ultra2ProPortfolio {...props} />;
        default: return <FreePortfolio {...props} />;
    }
};

export default StorefrontRouter;
