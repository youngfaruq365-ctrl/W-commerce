import { PLACEHOLDER_IMAGE } from '@/constants/placeholders';
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiClient as axios } from '@/utils/apiClient';
import DOMPurify from 'dompurify';
import { Settings, Package, CheckCircle2, Ruler, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { useAuthStore } from '../store/authStore';
import BanningRateCard from '../components/storefront/BanningRateCard';
import { useCartStore } from '../store/cartStore';
import { celebrate } from '../components/visual/CelebrationController';
import ProductPacking from '../components/ProductPacking';
import AdSenseComponent from '../components/ads/AdSenseComponent';
import AdRewardModal from '../components/ads/AdRewardModal';
import ShippingTransit from '../components/ShippingTransit';
import { WSkeleton } from '../components/motion/WSkeleton';
import { WImageLoader } from '../components/motion/WImageLoader';
import { motion, AnimatePresence } from 'framer-motion';
import { ErrorState } from '../components/shared/ErrorState';

const resolveImageUrl = (imgObj) => {
  if (!imgObj) return '';
  const rawUrl = typeof imgObj === 'string' ? imgObj : imgObj.url;
  if (!rawUrl) return '';
  if (rawUrl.startsWith('http')) return rawUrl;
  let cleanUrl = rawUrl.replace(/\\/g, '/');
  if (cleanUrl.startsWith('uploads/')) cleanUrl = '/' + cleanUrl;
  else if (!cleanUrl.startsWith('/')) cleanUrl = '/uploads/' + cleanUrl;
  return cleanUrl;
};






const ProductDetails = () => {

  const { id } = useParams();

  const navigate = useNavigate();

  const { addToCart } = useCartStore();

  const [product, setProduct] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [showCartModal, setShowCartModal] = useState(false);
  const [showBanRatingModal, setShowBanRatingModal] = useState(false);

  const [showShippingModal, setShowShippingModal] = useState(false);

  const [showConfigDrawer, setShowConfigDrawer] = useState(false);

  const [showSizingModal, setShowSizingModal] = useState(false);

  const [recommendedProducts, setRecommendedProducts] = useState([]);

  const [reviews, setReviews] = useState([]);

  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });

  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const [reviewError, setReviewError] = useState(null);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const [zoomState, setZoomState] = useState({ isZoomed: false, x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomState({ isZoomed: true, x, y });
  };

  const handleMouseLeave = () => {
    setZoomState({ isZoomed: false, x: 0, y: 0 });
  };

  const [isHovered, setIsHovered] = useState(false);
  const { user } = useAuthStore();
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isThumbnailsExpanded, setIsThumbnailsExpanded] = useState(false);



  // Derived urgency count from product ID (deterministic, not random)

  const [cartCount, setCartCount] = useState(0);

  const [timeLeft, setTimeLeft] = useState(3600);

  const [priceHistory, setPriceHistory] = useState([]);
  
  const [adStatus, setAdStatus] = useState(null);
  const [showAdModal, setShowAdModal] = useState(false);



  const [config, setConfig] = useState({

    urgencyEnabled: true,

    socialProofEnabled: true,

    bundleRule: 'None'

  });



  const isSeller = Boolean(
    user && product && (
      user.id === product.store?.sellerId || 
      user._id === product.store?.sellerId ||
      user.id === product.store?.seller ||
      user._id === product.store?.seller ||
      user.role === 'ADMIN'
    )
  );



  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchProduct = async () => {

      try {

        setLoading(true);

        const res = await axios.get(`/api/v1/products/${id}`);

        if (res.data.success) {

          setProduct(res.data.product);

          setConfig({

            urgencyEnabled: res.data.product.isUrgencyBannerVisible ?? true,

            socialProofEnabled: res.data.product.socialProofEnabled ?? true,

            bundleRule: res.data.product.bundleRule || 'None',

          });



          // Deterministic cart count derived from product ID (not random)

          let hash = 0;

          const idStr = res.data.product.id || '';

          for (let i = 0; i < idStr.length; i++) hash = idStr.charCodeAt(i) + ((hash << 5) - hash);

          setCartCount(Math.abs(hash % 45) + 5);



          // Fetch recommended products from the same store

          try {

            const recRes = await axios.get(`/api/v1/products?limit=4&storeId=${res.data.product.storeId}`);

            if (recRes.data.success) {

              setRecommendedProducts(recRes.data.products.filter(p => p.id !== res.data.product.id));

            }

          } catch (err) { /* console.error('Error fetching recommendations', err); */ }



          // Real price history from DB — omit section if no data

          if (res.data.product.priceHistory && res.data.product.priceHistory.length > 0) {

            setPriceHistory(res.data.product.priceHistory.map(ph => ({

              date: new Date(ph.recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),

              price: ph.price,

            })));

          } else {

            setPriceHistory([]);

          }



          // Fetch real reviews from API

          try {

            const revRes = await axios.get(`/api/v1/reviews/product/${id}`);

            if (revRes.data.success && revRes.data.reviews) {

              setReviews(revRes.data.reviews);

            } else {

              setReviews([]);

            }

          } catch (err) {

            // console.error('Error fetching reviews', err);

            setReviews([]);

          }

        } else {

          setError('Failed to load product');

        }

        setLoading(false);

      } catch (err) {
        const status = err?.response?.status;
        if (status === 404) {
          setError({ variant: 'notFound', message: 'This product may have been removed or no longer exists.' });
        } else if (status === 401 || status === 403) {
          setError({ variant: 'unauthorized', message: 'You need to be logged in to view this product.' });
        } else {
          setError({ variant: 'serverError', message: 'Could not load product. Please try again.' });
        }
        setLoading(false);
      }

    };

    fetchProduct();


    const interval = setInterval(() => {
      setTimeLeft(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    let interval;
    if (adStatus && !adStatus.isCompleted && adStatus.nextClaimAvailableAt) {
      const checkTimer = () => {
        const now = new Date();
        const availableAt = new Date(adStatus.nextClaimAvailableAt);
        if (now >= availableAt && !adStatus.canClaimNext) {
          setAdStatus(prev => ({ ...prev, canClaimNext: true }));
          clearInterval(interval);
        }
      };
      checkTimer();
      interval = setInterval(checkTimer, 10000);
    }
    return () => clearInterval(interval);
  }, [adStatus]);

  useEffect(() => {
    const fetchAdStatus = async () => {
      if (!user) return;
      try {
        const res = await axios.get(`/api/v1/ads/discount/status/${id}`, { withCredentials: true });
        if (res.data.success && res.data.data) {
          setAdStatus(res.data.data);
        }
      } catch (err) {
        // Ignore
      }
    };
    fetchAdStatus();
  }, [id, user]);

  const handleAddToCart = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    try {
      await addToCart(id, 1);
      celebrate('standard', e);
      setShowCartModal(true);
    } catch (err) {
      // console.error(err);
      window.__gxAlert?.(err.response?.data?.message || err.message || 'Failed to add to cart') ?? console.warn(err.response?.data?.message || err.message || 'Failed to add to cart');
    }
  };

  const handleWishlist = async () => {
    try {
      await axios.post(`/api/v1/wishlist/${id}`);
      window.__gxAlert?.('Added to wishlist!', 'success') ?? console.warn('Added to wishlist!', 'success');

    } catch (err) {

      // console.error('Failed to add to wishlist', err);

      window.__gxAlert?.(err.response?.data?.message || 'Please log in to add to wishlist.') ?? console.warn(err.response?.data?.message || 'Please log in to add to wishlist.');

    }

  };



  const handleReviewSubmit = async (e) => {

    e.preventDefault();

    if (!user) return setReviewError('Please log in to leave a review.');

    setReviewSubmitting(true);

    setReviewError(null);

    try {

      const res = await axios.post('/api/v1/reviews', {

        productId: id,

        rating: reviewForm.rating,

        comment: reviewForm.comment

      });

      if (res.data.success) {

        setReviews([res.data.review, ...reviews]);

        setReviewForm({ rating: 5, comment: '' });

        window.__gxAlert?.('Review submitted successfully!', 'success') ?? console.warn('Review submitted successfully!', 'success');

      }

    } catch (err) {

      setReviewError(err.response?.data?.message || 'Failed to submit review. You may need to purchase this item first.');

    } finally {

      setReviewSubmitting(false);

    }

  };



  const saveConfig = async () => {

    try {

      await axios.put(`/api/v1/products/${id}/config`, config);

      setShowConfigDrawer(false);

    } catch (err) {

      // console.error('Failed to save config', err);

    }

  };



  const formatTime = (seconds) => {

    const h = Math.floor(seconds / 3600);

    const m = Math.floor((seconds % 3600) / 60);

    const s = seconds % 60;

    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

  };



  if (loading) {

    return (

      <div className="min-h-screen pt-24 pb-12 px-6 max-w-6xl mx-auto flex flex-col md:flex-row gap-12">

         <WSkeleton className="w-full md:w-1/2 aspect-square rounded-xl" />

         <div className="w-full md:w-1/2 space-y-6">

            <WSkeleton className="h-8 w-1/4 rounded" />

            <WSkeleton className="h-12 w-3/4 rounded" />

            <WSkeleton className="h-16 w-1/3 rounded" />

            <WSkeleton className="h-32 w-full rounded" />

            <WSkeleton className="h-16 w-full rounded mt-12" />

         </div>

      </div>

    );

  }



  if (error || !product) {

    const errVariant = (error && typeof error === 'object') ? error.variant : 'notFound';
    const errMsg = (error && typeof error === 'object') ? error.message : "The product you're looking for may have been removed or doesn't exist.";
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <ErrorState
            variant={errVariant}
            title={errVariant === 'notFound' ? 'Product not found' : 'Could not load product'}
            message={errMsg}
            showHome
          />
        </div>
      </div>
    );
  }

  const activeDeal = (product?.flashDeals && product.flashDeals.length > 0) ? product.flashDeals[0] : null;
  const discountPct = activeDeal ? Number(activeDeal.discount || 0) : (Number(product?.discountPercentage) || 0);
  const basePrice = Number(product?.price || 0);
  const hasDiscount = discountPct > 0 || (product?.flashPrice && Number(product.flashPrice) < basePrice);
  const currentPrice = discountPct > 0 
    ? Number((basePrice * (1 - discountPct / 100)).toFixed(2)) 
    : (product?.flashPrice && Number(product.flashPrice) < basePrice ? Number(product.flashPrice) : basePrice);

  return (

    <div className="min-h-screen text-[var(--text-main)] pt-24 pb-12 px-6">







      {/* Add to Cart Premium Modal */}

      <ProductPacking

        trigger={showCartModal}

        onComplete={() => {

          setShowCartModal(false);

          setShowShippingModal(true);

        }}

        image={product?.images?.[0]?.url ? (product.images[0].url.startsWith('http') || product.images[0].url.startsWith('/') ? product.images[0].url : `/${product.images[0].url}`) : null}

      />



      {/* Shipping Transit Modal */}

      <ShippingTransit

        trigger={showShippingModal}

        product={product}

        onComplete={() => setShowShippingModal(false)}

      />



      <div className="max-w-6xl mx-auto relative">





        {/* Social Proof Banner */}

         {config.socialProofEnabled && (

         <div className="mb-6 bg-[var(--bg-secondary)] border border-gray-500/30 rounded-lg p-3 flex items-center gap-4 animate-pulse">

            <div className="icon-3d-glass-box w-10 h-10 shrink-0"><span className="text-xl emoji-icon">🔥</span></div>

            <span className="font-bold text-sm tracking-wider">High Demand: <span className="text-gray-500">{cartCount} people</span> have this in their cart right now.</span>

         </div>

         )}



        {/* Breadcrumbs */}

        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-6 font-medium whitespace-nowrap overflow-x-auto scrollbar-hide">

          <Link to="/" className="hover:text-[var(--text-main)] transition-colors">Home</Link>

          <span>›</span>

          <Link to={`/category/${product.category}`} className="hover:text-[var(--text-main)] transition-colors capitalize">{product.category?.replace(/_/g, ' ') || 'Shop'}</Link>

          {product.subCategory && (

            <>

              <span>›</span>

              <span className="text-[var(--text-main)] capitalize">{product.subCategory.replace(/_/g, ' ')}</span>

            </>

          )}

          {!product.subCategory && (

            <>

              <span>›</span>

              <span className="text-[var(--text-main)] truncate max-w-[200px]">{product.title}</span>

            </>

          )}

        </div>



        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {/* Left Column: Images + Reviews */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, staggerChildren: 0.1 }}
            className="flex flex-col"
          >

          {/* Images Gallery */}

          <div className="flex flex-col">
            <div className="flex flex-col md:flex-row gap-4 h-auto md:h-[500px]">

              {/* Thumbnails Vertical Gallery (Left on Desktop, Bottom on Mobile) */}
              {product.images && product.images.length > 0 && (
                <div className="flex md:flex-col gap-4 overflow-x-auto md:overflow-x-hidden md:overflow-y-auto pr-2 scrollbar-hide w-full md:w-20 order-2 md:order-1">
                  {product.images.map((img, idx) => (
                    <div
                      key={img.id || idx}
                      onClick={() => {
                        setSelectedImageIndex(idx);
                        // Sync scroll for the top carousel
                        const container = document.querySelector('.snap-mandatory');
                        if (container) {
                          container.scrollTo({ left: idx * container.clientWidth, behavior: 'smooth' });
                        }
                      }}
                      className={`w-16 h-16 md:w-20 md:h-20 flex-shrink-0 overflow-hidden cursor-pointer border-2 transition-all ${selectedImageIndex === idx ? 'border-black' : 'border-transparent hover:border-gray-400'}`}
                    >
                      <WImageLoader
                        src={img.url.startsWith('http') || img.url.startsWith('/') ? img.url : `/${img.url}`}
                        alt={`Thumbnail ${idx + 1}`}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Main Image (Right on Desktop, Top on Mobile) */}
              <div className="w-full md:flex-1 overflow-hidden bg-white flex items-center justify-center relative order-1 md:order-2 h-[300px] md:h-full shrink-0 md:shrink-1">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedImageIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="w-full h-full"
                  >
                    {product.images && product.images.length > 0 ? (
                      <div 
                        className="w-full h-full cursor-crosshair overflow-hidden relative"
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                      >
                        <div
                          className={`w-full h-full transition-transform duration-200 ease-out ${zoomState.isZoomed ? 'scale-[2.5]' : 'scale-100'}`}
                          style={zoomState.isZoomed ? { transformOrigin: `${zoomState.x}% ${zoomState.y}%` } : {}}
                        >
                          <WImageLoader
                            src={product.images[selectedImageIndex].url.startsWith('http') || product.images[selectedImageIndex].url.startsWith('/') 
                                  ? product.images[selectedImageIndex].url 
                                  : `/${product.images[selectedImageIndex].url}`}
                            alt={product.title}
                            objectFit="object-contain"
                            className="w-full h-full"
                            controls={true}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                        <Package size={48} className="mb-2 opacity-50" />
                        <span>No Image Available</span>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

            </div>
          </div>

          {/* Review Summary (below images) */}
          <div className="mt-6">
            <div className="flex items-center gap-3 text-lg md:text-xl text-black">
              <span className="font-semibold">{reviews.length} reviews</span>
              <span className="text-gray-300 font-light">|</span>
              <span className="font-semibold flex items-center gap-1">
                {product.rating ? Number(product.rating).toFixed(1) : '0.0'} 
                <span className="text-black ml-1 text-sm md:text-base">★★★★★</span>
              </span>
            </div>
            <div className="mt-3 bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 inline-flex items-center gap-2 font-medium text-sm">
              <CheckCircle2 size={16} className="text-green-600" /> All reviews are from verified purchases
            </div>
          </div>
          </motion.div>

        {/* Details Column */}


          {/* Details */}

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col"
          >

            <div className="mb-6">

              <h1 className="text-3xl md:text-4xl font-extrabold leading-tight mb-2">{product.title}</h1>

              <div className="flex items-center gap-4 mb-4 text-sm font-bold">
                 <span className="text-[var(--text-muted)] border-[var(--border-color)]">Origin: {product.originHub || 'Global Hub'}</span>

                 <div className="text-xs text-[var(--text-muted)] font-bold flex items-center gap-1 uppercase tracking-widest mt-1">
                    <span className="emoji-icon">🛡️</span> Verified Vault
                 </div>
              </div>

              {product.store && (
                 <div className="mb-6 rounded-xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-tertiary)] hover:border-[var(--accent-gray)] transition-all relative">
                    <div 
                       className="cursor-pointer" 
                       onClick={() => navigate(`/store/${product.store.portfolioSlug || product.store.id}`)}
                    >
                       {product.store.bannerUrl && (
                           <div className="h-24 w-full bg-gray-200">
                              <img src={product.store.bannerUrl} alt="Store Banner" className="w-full h-full object-cover" />
                           </div>
                       )}
                       <div className={`p-4 flex flex-wrap items-center justify-between gap-3 ${product.store.bannerUrl ? 'mt-[-24px] relative z-10' : ''}`}>
                          <div className="flex items-center gap-3">
                             <div className="w-12 h-12 bg-white border border-[var(--border-color)] rounded-full flex items-center justify-center font-extrabold text-[var(--accent-gray)] text-xl uppercase shadow-[0_0_10px_var(--accent-gray-dim)] flex-shrink-0">
                                {product.store.storeName?.[0] || 'V'}
                             </div>
                             <div>
                                <div className="font-bold text-lg hover:text-[var(--accent-gray)] transition-colors bg-white/80 dark:bg-black/80 px-2 py-1 rounded inline-block">
                                   {product.store.storeName}
                                </div>
                                <div className="text-xs text-[var(--text-muted)] mt-0.5 px-2 flex items-center gap-1 font-medium">
                                   <span>Visit Storefront</span> &rarr;
                                </div>
                             </div>
                          </div>

                          {/* Banning Rate Quick Badge */}
                          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                             <button 
                                type="button"
                                onClick={() => setShowBanRatingModal(true)}
                                title="Click to view store suspension risk"
                                className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                                (product.store.banningRate || 0) >= 70 
                                   ? 'bg-red-500/10 text-red-600 border-red-500/30 hover:bg-red-500/20'
                                   : (product.store.banningRate || 0) >= 30
                                   ? 'bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20'
                                   : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20'
                             }`}>
                                <AlertTriangle className={`w-3.5 h-3.5 ${
                                   (product.store.banningRate || 0) >= 70 ? 'text-red-500' : (product.store.banningRate || 0) >= 30 ? 'text-amber-500' : 'text-emerald-500'
                                }`} />
                                <span>{Math.round(product.store.banningRate || 0)}% Banning Rate</span>
                             </button>
                          </div>
                       </div>
                    </div>
                 </div>
              )}
            </div>

              {product.isAdBoosted && (!adStatus || !adStatus.isCompleted) && (
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded p-4 text-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="font-bold text-blue-700 block mb-1">Unlock Discount 🎁</span>
                    <span className="text-blue-600 block">Watch an ad to get up to 5% off! (Current discount: {adStatus?.currentDiscountPct || 0}%)</span>
                    {adStatus?.currentDiscountPct > 0 && !adStatus?.canClaimNext && adStatus?.nextClaimAvailableAt && (
                       <span className="text-xs text-blue-500 font-medium block mt-1">Next claim available at {new Date(adStatus.nextClaimAvailableAt).toLocaleTimeString()}</span>
                    )}
                  </div>
                  <button 
                    onClick={() => setShowAdModal(true)}
                    disabled={adStatus?.currentDiscountPct > 0 && !adStatus?.canClaimNext}
                    className={`px-4 py-2 rounded text-white font-bold transition-opacity whitespace-nowrap ${adStatus?.currentDiscountPct > 0 && !adStatus?.canClaimNext ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                  >
                    {!adStatus || adStatus.currentDiscountPct === 0 ? 'Claim 2% Off' : (adStatus.currentDiscountPct === 2 ? 'Claim next 2%' : 'Claim last 1%')}
                  </button>
                </div>
              )}
              {product.isAdBoosted && adStatus?.isCompleted && (
                <div className="mb-6 bg-green-50 border border-green-200 rounded p-4 text-sm flex items-center">
                  <span className="text-xl mr-2">✅</span>
                  <span className="font-bold text-green-700">You unlocked the maximum 5% ad discount!</span>
                </div>
              )}
              <div className="flex items-end gap-4 mb-6 flex-wrap">
                <span className="text-4xl font-extrabold text-black"> ₦{currentPrice.toFixed(2)}</span>
                {hasDiscount && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl text-[var(--text-muted)] line-through"> ₦{basePrice.toFixed(2)}</span>
                    <span className="bg-red-500/10 text-red-600 border border-red-500/20 text-xs font-black uppercase px-2 py-0.5 rounded">
                      🔥 {discountPct > 0 ? `${discountPct}% OFF` : 'DEAL'}
                    </span>
                  </div>
                )}
              </div>



              {/* Urgency Progress Bar */}

              {config.urgencyEnabled && (

              <div className="mb-6">

                 <div className="flex justify-between text-xs font-bold mb-2">

                    <span className="text-gray-500 uppercase tracking-wider">Only {product.stock} items left!</span>

                    <span className="flex items-center gap-1 text-[var(--accent-gray)]"><span className="emoji-icon">⏰</span> {formatTime(timeLeft)} remaining</span>

                 </div>

                 <div className="w-full bg-[var(--bg-tertiary)] h-2 rounded-full overflow-hidden">

                    <div className="bg-gradient-to-r from-gray-500 to-gray-600 h-full w-1/4"></div>

                 </div>

              </div>

              )}



              {/* Bundle Deal */}

              {config.bundleRule && config.bundleRule !== 'None' && (

              <div className="mb-8 border border-[var(--accent-gray)] bg-[var(--accent-gray-dim)] rounded-lg p-4 relative overflow-hidden">

                 <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--accent-gray)] rounded-full blur-[40px] opacity-20"></div>

                 <h4 className="font-bold text-[var(--accent-gray)] flex items-center gap-2 mb-2"><span className="emoji-icon">⚡</span> Bundle & Save</h4>

                 <div className="flex gap-2">

                    <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  className="flex-1 border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--accent-gray)] p-2 rounded text-center transition-colors">

                       <span className="block font-bold">Buy 2</span>

                       <span className="text-xs text-[var(--text-muted)]">Save 10%</span>

                    </button>

                    <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  className="flex-1 border border-[var(--accent-gray)] bg-[var(--bg-primary)] p-2 rounded text-center shadow-[0_0_10px_var(--accent-gray-dim)] z-10">

                       <span className="block font-bold text-[var(--accent-gray)]">Buy 3+</span>

                       <span className="text-xs text-[var(--text-muted)]">Save 25%</span>

                    </button>

                 </div>

              </div>

              )}



              {/* Product Specifications (Dropdown / Expandable) */}
              <div className="mb-8 border border-[var(--border-color)] bg-[var(--bg-secondary)] rounded-lg overflow-hidden">
                <details className="group">
                  <summary className="flex justify-between items-center font-bold cursor-pointer list-none p-4 hover:bg-[var(--bg-tertiary)] transition-colors">
                    <span className="flex items-center gap-2"><span className="emoji-icon">📋</span> Product Specifications</span>
                    <span className="transition group-open:rotate-180">
                      <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                    </span>
                  </summary>
                  <div className="text-[var(--text-muted)] text-sm p-4 border-t border-[var(--border-color)] bg-white/50">
                    <ul className="space-y-3">
                      {product.options && product.options.length > 0 ? (
                        product.options.map((opt, i) => (
                          <li key={i} className="flex flex-col sm:flex-row sm:items-center">
                            <span className="text-gray-700 w-1/3">{opt.name}:</span>
                            <span className="text-black">{opt.value}</span>
                          </li>
                        ))
                      ) : (
                        <>
                          <li className="flex items-center justify-between"><span className="text-gray-700">Category:</span> <span className="text-black">{product.category}</span></li>
                          <li className="flex items-center justify-between"><span className="text-gray-700">Item ID:</span> <span className="text-black flex items-center gap-2">{product.id.substring(0,8).toUpperCase()} <button onClick={() => {navigator.clipboard.writeText(product.id.substring(0,8).toUpperCase()); toast('Copied!', { icon: '🚀' })}} className="border border-gray-600 rounded px-2 py-0.5 text-xs hover:bg-gray-100">Copy</button></span></li>
                          <li className="flex items-center justify-between"><span className="text-gray-700">Stock:</span> <span className="text-black">{product.stock} units</span></li>
                          <li className="flex items-center justify-between"><span className="text-gray-700">Origin Hub:</span> <span className="text-black">{product.originHub || 'Global'}</span></li>
                        </>
                      )}
                    </ul>
                  </div>
                </details>
              </div>

              {/* Description - Temu Style Expandable */}
              <div className="mb-8 border border-[var(--border-color)] bg-[var(--bg-secondary)] rounded-lg overflow-hidden relative">
                <div className="flex items-center gap-2 font-bold p-4 border-b border-[var(--border-color)]">
                  <span className="emoji-icon">📝</span> Product Description
                </div>
                <div 
                  className={`text-[var(--text-muted)] text-sm leading-relaxed p-4 bg-white/50 prose prose-invert overflow-hidden transition-all duration-500 ${isDescriptionExpanded ? 'max-h-[5000px]' : 'max-h-[300px]'}`} 
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.description || '') }} 
                />
                
                {!isDescriptionExpanded && (
                  <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[var(--bg-secondary)] to-transparent flex items-end justify-center pb-2 pointer-events-none">
                    <button 
                      onClick={() => setIsDescriptionExpanded(true)}
                      className="pointer-events-auto flex items-center gap-1 text-black bg-white dark:bg-[#151515] dark:text-white border border-gray-300 dark:border-gray-700 font-bold text-sm px-5 py-2 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm"
                    >
                      See more
                      <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="M6 9l6 6 6-6"></path></svg>
                    </button>
                  </div>
                )}
                {isDescriptionExpanded && (
                  <div className="flex justify-center p-4 border-t border-[var(--border-color)]">
                    <button 
                      onClick={() => setIsDescriptionExpanded(false)}
                      className="flex items-center gap-1 text-[var(--text-muted)] font-medium hover:text-[var(--text-main)] transition-colors"
                    >
                      See less
                      <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="M18 15l-6-6-6 6"></path></svg>
                    </button>
                  </div>
                )}
              </div>

            <div className="mt-auto space-y-4 md:static sticky bottom-0 left-0 right-0 p-4 md:p-0 bg-[var(--bg-primary)] md:bg-transparent z-40 border-t md:border-none border-[var(--border-color)]">
              <motion.button 
                whileHover={{ scale: product.stock <= 0 ? 1 : 1.02 }} 
                whileTap={{ scale: product.stock <= 0 ? 1 : 0.95 }}
                onClick={product.stock <= 0 ? null : handleAddToCart} 
                className={`w-full font-extrabold py-5 rounded-lg flex items-center justify-center gap-3 transition-opacity text-lg tracking-wide ${
                  product.stock <= 0 
                    ? 'bg-gray-400 text-white cursor-not-allowed opacity-70 border border-gray-400' 
                    : 'neu-button-primary'
                }`}
              >
                {product.stock <= 0 ? (
                  'Sold Out'
                ) : (
                  <><span className="text-2xl emoji-icon drop-shadow-[0_0_10px_rgba(0,0,0,0.2)]">📦</span> Secure with Escrow</>
                )}
              </motion.button>

                <div className="flex gap-4">
                  <button onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: product?.title,
                        url: window.location.href
                      }).catch(console.error);
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                      toast('Link copied to clipboard!');
                    }
                  }} className="flex-1 neu-button py-4 font-bold rounded flex items-center justify-center gap-2 text-sm">
                    <span className="text-xl emoji-icon">📤</span> Share
                  </button>
                  <button onClick={handleWishlist} className="flex-1 neu-button py-4 font-bold rounded flex items-center justify-center gap-2 text-sm">
                    <span className="text-xl emoji-icon">❤️</span> Wishlist
                  </button>
                  <button onClick={() => setIsReportModalOpen(true)} className="flex-1 neu-button py-4 font-bold rounded flex items-center justify-center gap-2 text-red-500 text-sm">
                    <span className="text-xl emoji-icon">🚩</span> Report
                  </button>
                </div>
                <a href={`https://wa.me/${product?.store?.user?.phone || product?.store?.phone || ''}?text=${encodeURIComponent(`Hello! I saw ${product?.title || product?.name} on your W-Commerce store. Is it still available?`)}`} target="_blank" rel="noreferrer" className="flex-1 neu-button text-[#25D366] py-4 font-bold rounded flex items-center justify-center gap-2 hover:scale-105 mt-4">
                  <span className="text-xl emoji-icon">💬</span> Negotiate on WhatsApp
                </a>

              {/* Action Buttons: WhatsApp / Call / Size Guide */}

              <div className="flex flex-col sm:flex-row gap-4 mt-4">

                {product.store && (() => {

                  try {

                    const storeConfig = product.store.portfolioConfig ? JSON.parse(product.store.portfolioConfig) : {};

                    const buttons = [];

                    if (storeConfig.whatsappEnabled && storeConfig.whatsappNumber) {

                      buttons.push(

                        <a key="wa" href={`https://wa.me/${storeConfig.whatsappNumber}?text=Hi, I am interested in ${product.title}`} target="_blank" rel="noreferrer" className="flex-1 bg-gray-600 hover:bg-gray-500 text-black font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors">

                          <span className="text-xl emoji-icon">💬</span> WhatsApp

                        </a>

                      );

                    }

                    if (storeConfig.callNowEnabled && storeConfig.contactNumber) {

                      buttons.push(

                        <a key="call" href={`tel:${storeConfig.contactNumber}`} className="flex-1 bg-blue-600 hover:bg-blue-500 text-black font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors">

                          <span className="text-xl emoji-icon">📞</span> Call Now

                        </a>

                      );

                    }

                    return buttons;

                  } catch (e) { return null; }

                })()}

                <button onClick={() => setShowSizingModal(true)} className="flex-1 premium-glass border border-[var(--border-color)] py-3 font-bold rounded-lg flex items-center justify-center gap-3 hover:bg-[var(--bg-tertiary)] transition-colors">

                  <div className="icon-3d-glass-box w-8 h-8"><span className="text-base emoji-icon">📏</span></div> Size Guide

                </button>

              </div>

            </div>
          </motion.div>
        </div>



        {/* Price History Chart - Progressive Disclosure */}
        <div className="mt-16 border border-[var(--border-color)] bg-[var(--bg-secondary)] rounded-xl overflow-hidden">
          <details className="group">
            <summary className="flex justify-between items-center font-bold cursor-pointer list-none p-6 hover:bg-[var(--bg-tertiary)] transition-colors">
              <span className="flex items-center gap-3"><div className="icon-3d-glass-box w-10 h-10"><span className="text-xl emoji-icon">📉</span></div> Price History (Deep Analytics)</span>
              <span className="flex items-center gap-4">
                <span className="text-sm bg-gray-400/10 text-gray-400 px-3 py-1 rounded-full font-bold">30-Day Low!</span>
                <span className="transition group-open:rotate-180">
                  <svg fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                </span>
              </span>
            </summary>
            <div className="p-8 border-t border-[var(--border-color)] bg-white/50">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={priceHistory} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <Line type="monotone" dataKey="price" stroke="var(--accent-gray)" strokeWidth={3} dot={{ r: 5, fill: 'var(--accent-gray)' }} />
                    <CartesianGrid stroke="#333" strokeDasharray="5 5" vertical={false} />
                    <XAxis dataKey="date" stroke="#888" tick={{fill: '#888'}} />
                    <YAxis stroke="#888" tick={{fill: '#888'}} tickFormatter={(value) => `₦${value}`} domain={['dataMin - 10', 'dataMax + 10']} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                      itemStyle={{ color: 'var(--accent-gray)', fontWeight: 'bold' }}
                      formatter={(value) => [`₦${value}`, 'Price']}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-sm text-[var(--text-muted)] mt-4 text-center">This product's price has dropped by 18% over the last 30 days. Now is the best time to buy.</p>
            </div>
          </details>
        </div>



        {/* Store Trust & Banning Rate Section (Positioned at Bottom of Product Details) */}
        {product.store && (
          <div className="mt-12 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row items-stretch gap-6">
              <div className="w-full lg:w-96 shrink-0">
                <BanningRateCard banningRate={product.store.banningRate || 0} />
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <h3 className="text-xl font-bold">Seller Trust & Protection Guarantee</h3>
                  </div>
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
                    Transparency first. We monitor {product.store.storeName}&apos;s fulfillment speed and penalty rates in real time. Your payment is held securely in platform escrow until you confirm delivery.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-[var(--border-color)]">
                  <button 
                    onClick={() => navigate(`/store/${product.store.portfolioSlug || product.store.id}`)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-black transition-colors"
                  >
                    Visit {product.store.storeName}&apos;s Storefront &rarr;
                  </button>
                  <span className="text-xs text-[var(--text-muted)]">
                    Protected by Buyer Escrow Guarantee
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Product Reviews Section */}

        {product.store && product.store.showAdsOnStorefront && ( <div className="mt-8 mb-8 text-center p-4 bg-gray-100 rounded"> <span className="text-xs text-gray-500 mb-2 block">Advertisement</span> <AdSenseComponent adSlot="9876543210" /> </div> )} <div id="reviews-section" className="mt-16 bg-white border border-[var(--border-color)] rounded-xl p-8">

          <h2 className="text-2xl font-extrabold mb-6 flex items-center gap-4"><div className="icon-3d-glass-box w-12 h-12"><span className="text-2xl emoji-icon">⭐</span></div> Customer Reviews</h2>



          {/* Write a Review Form */}

          <div className="modal-3d-glass rounded-xl p-6 mb-8">

            <h3 className="font-bold text-lg mb-4">Write a Review</h3>

            {reviewError && (

              <div className="bg-gray-500/20 border border-gray-500/50 text-gray-400 p-3 rounded mb-4 text-sm">

                {reviewError}

              </div>

            )}

            <form onSubmit={handleReviewSubmit} className="space-y-4">

              <div>

                <label className="block text-sm text-[var(--text-muted)] mb-2">Rating</label>

                <div className="flex gap-2">

                  {[1, 2, 3, 4, 5].map((star) => (

                    <button

                      key={star}

                      type="button"

                      onClick={() => setReviewForm({ ...reviewForm, rating: star })}

                      className={`text-2xl transition-transform hover:scale-110 ${reviewForm.rating >= star ? 'drop-shadow-[0_0_8px_rgba(255,215,0,0.8)] grayscale-0' : 'opacity-30 grayscale'}`}

                    >

                      ⭐

                    </button>

                  ))}

                </div>

              </div>

              <div>

                <label className="block text-sm text-[var(--text-muted)] mb-2">Comment</label>

                <textarea

                  value={reviewForm.comment}

                  onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}

                  placeholder="Share your experience with this product..."

                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg p-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gray)] transition-colors h-24 resize-none"

                  required

                />

              </div>

              <button

                type="submit"

                disabled={reviewSubmitting}

                className="bg-[var(--accent-gray)] text-black font-bold py-3 px-8 rounded hover:opacity-90 transition-opacity disabled:opacity-50"

              >

                {reviewSubmitting ? 'Submitting...' : 'Submit Review'}

              </button>

            </form>

          </div>



          {reviews.length > 0 ? (

            <div className="space-y-6">

              {reviews.map((review, idx) => (

                <div key={idx} className="border-b border-[var(--border-color)] pb-6 last:border-0 last:pb-0">

                  <div className="flex items-center gap-2 mb-2">

                    <div className="flex gap-1 text-sm">

                      {[...Array(5)].map((_, i) => (

                        <span key={i} className={i < review.rating ? 'drop-shadow-[0_0_5px_rgba(255,215,0,0.8)]' : 'opacity-30 grayscale'}>⭐</span>

                      ))}

                    </div>

                    <span className="font-bold">{review.author || (review.user && review.user.fullName) || 'Anonymous'}</span>

                    <span className="text-xs text-[var(--text-muted)] ml-auto">{review.date || (review.createdAt && new Date(review.createdAt).toLocaleDateString()) || ''}</span>

                  </div>

                  <p className="text-[var(--text-muted)] text-sm">{review.text || review.comment}</p>

                </div>

              ))}

            </div>

          ) : (

            <p className="text-[var(--text-muted)]">No reviews yet for this product.</p>

          )}

        </div>



        {/* Product Thumbnails Grid - Temu Style */}
        <div className="mt-8 relative max-w-[1200px] mx-auto">
          <div className={`overflow-hidden transition-all duration-500 flex flex-wrap justify-center gap-6 px-4 ${isThumbnailsExpanded ? 'max-h-[5000px]' : 'max-h-[350px] md:max-h-[450px]'}`}>
            {product.images && product.images.length > 0 && (
              product.images.map((img, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`w-[320px] h-[320px] md:w-[400px] md:h-[400px] flex-shrink-0 overflow-hidden rounded-2xl border-2 transition-all cursor-pointer bg-gray-50 ${selectedImageIndex === idx ? 'border-black shadow-xl scale-[1.02] z-10' : 'border-transparent hover:border-gray-300 opacity-95 hover:opacity-100'}`}
                >
                  <WImageLoader
                    src={img.url.startsWith('http') || img.url.startsWith('/') ? img.url : `/${img.url}`}
                    alt={`${product.title} - image ${idx + 1}`}
                    objectFit="cover"
                    className="w-full h-full"
                  />
                </div>
              ))
            )}
          </div>
          
          {!isThumbnailsExpanded && product.images?.length > 4 && (
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[var(--bg-primary)] to-transparent flex items-end justify-center pb-1 pointer-events-none">
              <button 
                onClick={() => setIsThumbnailsExpanded(true)}
                className="pointer-events-auto flex items-center gap-1 text-black bg-white dark:bg-[#151515] dark:text-white border border-gray-300 dark:border-gray-700 font-bold text-xs px-4 py-1.5 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm"
              >
                See more
                <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14"><path d="M6 9l6 6 6-6"></path></svg>
              </button>
            </div>
          )}
          {isThumbnailsExpanded && product.images?.length > 4 && (
            <div className="flex justify-center mt-4 border-t border-[var(--border-color)] pt-4">
              <button 
                onClick={() => setIsThumbnailsExpanded(false)}
                className="flex items-center gap-1 text-[var(--text-muted)] text-sm font-medium hover:text-[var(--text-main)] transition-colors"
              >
                See less
                <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14"><path d="M18 15l-6-6-6 6"></path></svg>
              </button>
            </div>
          )}
        </div>



        {/* Recommended Products Section */}

        {recommendedProducts.length > 0 && (

          <div className="mt-16">

            <h2 className="text-2xl font-extrabold mb-6">More from {product.store?.storeName || 'this seller'}</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">

              {recommendedProducts.map((rec) => (

                <Link to={`/product/${rec.id}`} key={rec.id} className="bg-white border border-[var(--border-color)] rounded-xl p-4 hover:border-[var(--accent-gray)] transition-colors group">

                  <div className="aspect-square bg-[var(--bg-tertiary)] rounded-lg mb-4 overflow-hidden relative">

                    <img

                      src={rec.images?.[0]?.url ? (rec.images[0].url.startsWith('http') || rec.images[0].url.startsWith('/') ? rec.images[0].url : `/${rec.images[0].url}`) : PLACEHOLDER_IMAGE}

                      alt={rec.title}

                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"

                    />

                  </div>

                  <h3 className="font-bold text-sm truncate">{rec.title}</h3>

                  <div className="flex justify-between items-center mt-2">

                    <span className="text-[var(--accent-gray)] font-bold text-lg"> ₦{Number(rec.price || 0).toFixed(2)}</span>

                    <span className="text-xs text-[var(--text-muted)] flex items-center gap-1"><span className="drop-shadow-[0_0_3px_rgba(255,215,0,0.8)]">⭐</span> {rec.rating || '0.0'}</span>

                  </div>

                </Link>

              ))}

            </div>

          </div>

        )}



      </div>



      {/* Sizing Modal */}
      <AnimatePresence>
      {showSizingModal && (
        <motion.div key="sizing-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="modal-3d-glass rounded-xl max-w-2xl w-full p-6 relative"
          >
            <button onClick={() => setShowSizingModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-black">✕</button>

            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><Ruler className="text-[var(--accent-gray)]"/> Size Guide & Comparison</h2>

            <div className="overflow-x-auto">

              <table className="w-full text-left border-collapse">

                <thead>

                  <tr className="border-b border-[var(--border-color)]">

                    <th className="py-3 px-4 text-[var(--text-muted)] font-medium">Size</th>

                    <th className="py-3 px-4 text-[var(--text-muted)] font-medium">Chest (inches)</th>

                    <th className="py-3 px-4 text-[var(--text-muted)] font-medium">Waist (inches)</th>

                    <th className="py-3 px-4 text-[var(--text-muted)] font-medium">Length (inches)</th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-[var(--border-color)]">

                  <tr className="hover:bg-[var(--bg-tertiary)] transition-colors">

                    <td className="py-3 px-4 font-bold">Small (S)</td>

                    <td className="py-3 px-4 text-[var(--text-muted)]">34 - 36</td>

                    <td className="py-3 px-4 text-[var(--text-muted)]">28 - 30</td>

                    <td className="py-3 px-4 text-[var(--text-muted)]">27</td>

                  </tr>

                  <tr className="hover:bg-[var(--bg-tertiary)] transition-colors">

                    <td className="py-3 px-4 font-bold">Medium (M)</td>

                    <td className="py-3 px-4 text-[var(--text-muted)]">38 - 40</td>

                    <td className="py-3 px-4 text-[var(--text-muted)]">32 - 34</td>

                    <td className="py-3 px-4 text-[var(--text-muted)]">28</td>

                  </tr>

                  <tr className="hover:bg-[var(--bg-tertiary)] transition-colors">

                    <td className="py-3 px-4 font-bold">Large (L)</td>

                    <td className="py-3 px-4 text-[var(--text-muted)]">42 - 44</td>

                    <td className="py-3 px-4 text-[var(--text-muted)]">36 - 38</td>

                    <td className="py-3 px-4 text-[var(--text-muted)]">29</td>

                  </tr>

                  <tr className="hover:bg-[var(--bg-tertiary)] transition-colors">

                    <td className="py-3 px-4 font-bold">X-Large (XL)</td>

                    <td className="py-3 px-4 text-[var(--text-muted)]">46 - 48</td>

                    <td className="py-3 px-4 text-[var(--text-muted)]">40 - 42</td>

                    <td className="py-3 px-4 text-[var(--text-muted)]">30</td>

                  </tr>

                </tbody>

              </table>

            </div>

            <div className="mt-6 bg-[var(--bg-tertiary)] p-4 rounded-lg flex items-center gap-3">

              <CheckCircle2 className="text-gray-500" />

              <p className="text-sm text-[var(--text-muted)]">Measurements may vary by 1-2 inches. If you are between sizes, we recommend sizing up for a relaxed fit.</p>

            </div>

          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-primary)] p-6 rounded-xl max-w-md w-full shadow-2xl border border-[var(--border-color)] relative">
            <button onClick={() => { setIsReportModalOpen(false); setReportSuccess(false); setReportReason(''); }} className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-white transition-colors">
              ✕
            </button>
            
            {!reportSuccess ? (
              <>
                <h3 className="text-2xl font-black mb-2 text-red-500">Report Product</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-6">
                  <strong>Reporting Policy:</strong> We take fraudulent, counterfeit, and inappropriate items seriously. All reports are strictly confidential and manually reviewed by our trust and safety team within 24 hours. False reports may result in account suspension.
                </p>
                
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-bold mb-2">Why are you reporting this product?</label>
                    <select 
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-3 text-white focus:border-red-500 transition-colors"
                    >
                      <option value="">Select a reason</option>
                      <option value="counterfeit">Counterfeit or Fake Item</option>
                      <option value="inappropriate">Inappropriate or Offensive Content</option>
                      <option value="scam">Suspected Scam or Fraud</option>
                      <option value="prohibited">Prohibited Item</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <button 
                  onClick={async () => {
                    if(reportReason) {
                      try {
                        await axios.post(`/api/v1/products/${product.id}/report`, { reason: reportReason });
                        setReportSuccess(true);
                      } catch (error) {
                        toast.error('Failed to submit report');
                      }
                    }
                  }}
                  disabled={!reportReason}
                  className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-colors"
                >
                  Submit Report
                </button>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-2xl font-black mb-2 text-green-500">Report Submitted</h3>
                <p className="text-[var(--text-secondary)] mb-6">Thank you for helping keep W-Commerce safe. Our team will review this listing shortly.</p>
                <button 
                  onClick={() => { setIsReportModalOpen(false); setReportSuccess(false); setReportReason(''); }}
                  className="w-full bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-black font-bold py-3 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Ad Reward Modal */}
      {showAdModal && (
        <AdRewardModal
          isOpen={showAdModal}
          onClose={() => setShowAdModal(false)}
          productId={product.id}
          currentStage={adStatus?.currentStage || 0}
          onSuccess={(newStatus) => {
            setAdStatus(newStatus);
          }}
        />
      )}

      {/* Ban Rating Bottom Modal / Sheet */}
      <AnimatePresence>
        {showBanRatingModal && product.store && (
          <div 
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setShowBanRatingModal(false)}
          >
            <motion.div 
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full sm:max-w-lg bg-zinc-950 border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag Handle indicator on mobile */}
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-4 sm:hidden" />

              <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-bold text-white">{product.store.storeName} - Risk Assessment</h3>
                </div>
                <button 
                  onClick={() => setShowBanRatingModal(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-sm transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>

              <BanningRateCard banningRate={product.store.banningRate || 0} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProductDetails;
