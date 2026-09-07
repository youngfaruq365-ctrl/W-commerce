import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, ExternalLink } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const PromoOverlay = () => {
  const [deal, setDeal] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Don't show on seller dashboard or auth pages
    if (location.pathname.includes('/seller') || location.pathname.includes('/login') || location.pathname.includes('/register')) {
      return;
    }

    const dismissed = sessionStorage.getItem('promo_overlay_dismissed');
    if (dismissed === 'true') return;

    const fetchPromos = async () => {
      try {
        const response = await axios.get('/api/v1/flash-deals/active');
        if (response.data.success && response.data.flashDeals?.length > 0) {
          // Filter deals with banners
          const withBanners = response.data.flashDeals.filter(d => d.bannerImage);
          if (withBanners.length > 0) {
            // Pick a random one
            const randomDeal = withBanners[Math.floor(Math.random() * withBanners.length)];
            setDeal(randomDeal);
            // Delay appearance slightly for a better UX
            setTimeout(() => {
              setIsVisible(true);
            }, 3000);
          }
        }
      } catch (err) {
        console.error('Failed to fetch promo overlay', err);
      }
    };

    fetchPromos();
  }, [location.pathname]);

  const handleClose = (e) => {
    e.stopPropagation();
    setIsVisible(false);
    sessionStorage.setItem('promo_overlay_dismissed', 'true');
  };

  const handleClick = () => {
    if (deal?.productId) {
      navigate(`/product/${deal.productId}`);
      setIsVisible(false);
      sessionStorage.setItem('promo_overlay_dismissed', 'true');
    }
  };

  return (
    <AnimatePresence>
      {isVisible && deal && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          className="fixed bottom-6 left-6 z-[100] w-80 md:w-96 rounded-2xl shadow-2xl overflow-hidden cursor-pointer group"
          onClick={handleClick}
        >
          <div className="relative w-full h-40 md:h-48 bg-gray-900">
            {deal.bannerImage ? (
              <img src={deal.bannerImage} alt={deal.promoTitle || "Promotion"} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#00b873] to-[#005a38] flex items-center justify-center">
                <span className="text-white font-bold text-xl">{deal.promoTitle || 'Special Offer'}</span>
              </div>
            )}
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
            
            <button 
              onClick={handleClose}
              className="absolute top-2 right-2 p-1.5 bg-black/40 hover:bg-black/60 rounded-full text-white backdrop-blur-md transition-colors"
            >
              <X size={16} />
            </button>

            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
              <div>
                <span className="inline-block px-2 py-1 bg-red-500 text-white text-xs font-bold rounded mb-2">
                  {deal.discount}% OFF
                </span>
                <h3 className="text-white font-bold text-lg leading-tight line-clamp-1">{deal.promoTitle || deal.product?.title || 'Flash Deal'}</h3>
              </div>
              <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center group-hover:scale-110 transition-transform">
                <ExternalLink size={16} />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PromoOverlay;
