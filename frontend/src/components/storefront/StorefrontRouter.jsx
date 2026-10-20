import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../utils/apiClient';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { Loader2 } from 'lucide-react';
import { showInterstitialAd } from '../../services/adMobService';

import UnifiedPortfolio from '../../pages/portfolios/UnifiedPortfolio';

const StorefrontRouter = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [store, setStore] = useState(null);
    const [loading, setLoading] = useState(true);
    const { addToCart } = useCartStore();
    const { user, isAuthenticated } = useAuthStore();

    const [isFollowing, setIsFollowing] = useState(false);
    const [followersCount, setFollowersCount] = useState(0);

    const isOwner = Boolean(
        user?.id && (
            user.id === store?.sellerId ||
            user.id === store?.seller?.id ||
            user.id === store?.store?.sellerId
        )
    );

    useEffect(() => {
        window.scrollTo(0, 0);
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
                            logoUrl: payload.store.logoUrl || payload.store.logo,
                            bannerUrl: payload.store.bannerUrl || payload.store.banner,
                            seller: payload.seller,
                            metrics: payload.metrics,
                            products: payload.products || [],
                            posts: payload.posts || [],
                            portfolio: payload.portfolio,
                            brandConfig: payload.brandConfig
                        };
                        setStore(mergedStoreData);
                        setIsFollowing(payload.isFollowing || false);
                        setFollowersCount(payload.metrics?.followers || 0);

                        // Trigger Ad if seller is on Free tier
                        const tier = payload.store?.sellerTier?.toUpperCase() || payload.seller?.subscriptionTier?.toUpperCase() || payload.store?.subscriptionTier?.toUpperCase() || 'FREE';
                        if (tier === 'FREE' || tier === 'BASIC' || tier === 'STANDARD') {
                            showInterstitialAd().catch(e => console.warn('Ad error:', e));
                        }
                    }
                }
            } catch (err) {
                console.error("Store fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStore();
    }, [slug]);

    const handleFollow = async () => {
        if (!store?.store?.id && !store?.id) return;
        const storeId = store?.store?.id || store?.id;
        
        if (!isAuthenticated) {
            const toast = (await import('react-hot-toast')).default;
            toast.error("Please login to follow stores");
            return;
        }

        if (isOwner) {
            const toast = (await import('react-hot-toast')).default;
            toast("This is your store! Opening seller dashboard...", { icon: '🏪' });
            navigate('/seller/dashboard');
            return;
        }

        try {
            const res = await apiClient.post(`/api/v1/stores/${storeId}/follow`, {});
            if (res.data.success) {
                const newIsFollowing = res.data.isFollowing;
                setIsFollowing(newIsFollowing);
                setFollowersCount(prev => newIsFollowing ? prev + 1 : Math.max(0, prev - 1));
                const toast = (await import('react-hot-toast')).default;
                toast.success(newIsFollowing ? "Followed store!" : "Unfollowed store");
            }
        } catch (error) {
            const toast = (await import('react-hot-toast')).default;
            const message = error.response?.data?.message || error.response?.data?.error || error.message || "Failed to follow store";
            toast.error(message);
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
    
    // Extract tier override from URL path if present (e.g., /store/slug/ultra)
    const currentPath = window.location.pathname.toLowerCase();
    let overrideTier = null;
    if (currentPath.endsWith('/free')) overrideTier = 'free';
    else if (currentPath.endsWith('/premium')) overrideTier = 'premium';
    else if (currentPath.endsWith('/pro')) overrideTier = 'pro';
    else if (currentPath.endsWith('/ultra')) overrideTier = 'ultra';
    
    // Choose portfolio based on URL override, tier, or default to premium
    const tier = overrideTier || store.subscriptionTier?.toLowerCase() || 'premium';
    
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
        followersCount,
        isOwner,
        onManageStore: () => navigate('/seller/dashboard')
    };

    return <UnifiedPortfolio {...props} tier={tier} />;
};

export default StorefrontRouter;
