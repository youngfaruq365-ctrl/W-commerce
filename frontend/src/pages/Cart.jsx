import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Trash2, ShieldCheck, ArrowRight, ShoppingBag, MapPin, CreditCard, CheckCircle2, Clock, Printer, Zap, X, Wallet, Truck, ChevronDown, Bookmark, WifiOff } from 'lucide-react';
import { apiClient as axios } from '@/utils/apiClient';
import { useCartStore } from '../store/cartStore';
import { useBuyerStore } from '../store/buyerStore';
import { celebrate } from '../components/visual/CelebrationController';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { ErrorState } from '../components/shared/ErrorState';
import { WImageLoader } from '../components/motion/WImageLoader';
import { useOffline } from '../offline/useOffline';

const Cart = () => {
  const { isOnline, pendingCount } = useOffline();
  const { cartItems, fetchCart, removeFromCart, updateQuantity, checkout, clearCheckoutItems, verifyCartPrices, isLoading: loading } = useCartStore();
  const { profile, fetchProfile, addToWishlist } = useBuyerStore();
  const { user } = useAuthStore();
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [priceChanges, setPriceChanges] = useState([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900); // 15 mins
  const [selectedShipping, setSelectedShipping] = useState('hub');
  const [selectedAddress, setSelectedAddress] = useState(null); // index into profile.addresses
  const [selectedPayment, setSelectedPayment] = useState('paystack');
  const [walletBalance, setWalletBalance] = useState(null);
  const [orderReceipt, setOrderReceipt] = useState(null);
  const [gamificationReward, setGamificationReward] = useState(null);
  const [checkoutError, setCheckoutError] = useState(null);
  
  const location = useLocation();
  const navigate = useNavigate();

  // Direct Payment Proof Modal States
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [proofSellerBank, setProofSellerBank] = useState(null);
  const [proofSellerName, setProofSellerName] = useState(null);
  const [proofOrderId, setProofOrderId] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [proofTransactionRef, setProofTransactionRef] = useState('');
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [proofDeliveryAddress, setProofDeliveryAddress] = useState('');
  const [proofUploadSuccess, setProofUploadSuccess] = useState(false);
  const [finalReceipt, setFinalReceipt] = useState(null);
  
  // Promo Code States
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoDiscountAmount, setPromoDiscountAmount] = useState(0);
  const [availablePromos, setAvailablePromos] = useState([]);

  useEffect(() => {
    if (cartItems.length > 0) {
      const sellerIds = [...new Set(cartItems.map(i => i.sellerId).filter(Boolean))];
      Promise.all(sellerIds.map(id => axios.get(`/api/v1/promo/public/${id}`)))
        .then(responses => {
          const promos = responses.flatMap(r => r.data.data || []);
          setAvailablePromos(promos);
        })
        .catch(err => console.error('Failed to fetch store promos', err));
    } else {
      setAvailablePromos([]);
    }
  }, [cartItems]);

  // Auto-apply AI Negotiated Promo Code from URL or PayAI handover
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const promoFromUrl = searchParams.get('promo');
    const promoFromStorage = sessionStorage.getItem('auto_apply_promo');
    const codeToApply = promoFromUrl || promoFromStorage;

    if (codeToApply && cartItems.length > 0 && !appliedPromo) {
      const cleanCode = codeToApply.trim().toUpperCase();
      setPromoCodeInput(cleanCode);
      axios.post('/api/v1/promo/validate', {
        code: cleanCode,
        productIds: cartItems.map(i => i.productId || i.id),
        orderTotal: cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0)
      }).then(res => {
        if (res.data.success && (res.data.promoCode || res.data.data)) {
          const promoObj = res.data.promoCode || res.data.data;
          setAppliedPromo(promoObj);
          sessionStorage.removeItem('auto_apply_promo');
          toast.success(`🎉 AI Negotiated Deal Code "${promoObj.code}" applied!`, { icon: '🏷️' });
        }
      }).catch(err => {
        console.warn('Auto promo validation notice:', err.message);
      });
    }
  }, [location.search, cartItems, appliedPromo]);

  const [adSessions, setAdSessions] = useState([]);
  useEffect(() => {
    if (cartItems.length > 0 && profile) {
      axios.get('/api/v1/ads/discount/my-sessions', { withCredentials: true })
        .then(res => {
          if (res.data.success) {
            setAdSessions(res.data.data);
          }
        })
        .catch(err => console.error('Failed to fetch ad sessions', err));
    }
  }, [cartItems.length, profile]);

  const handledSuccess = React.useRef(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const reference = searchParams.get('reference');
    if (reference || handledSuccess.current) {
      setTimeout(() => {
        fetchCart();
      }, 4000);
    } else {
      fetchCart();
    }
    
    if (fetchProfile) fetchProfile();
    // Fetch wallet balance so buyer can see it during checkout
    axios.get('/api/v1/wallet/summary')
      .then(r => setWalletBalance(r.data.summary?.balance ?? r.data.data?.balance ?? r.data.wallet?.balance ?? null))
      .catch(() => {});
    const reward = sessionStorage.getItem('gamificationReward');
    if (reward) setGamificationReward(reward);
    const timer = setInterval(() => {
      setTimeLeft(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, [fetchCart, fetchProfile]);

  useEffect(() => {
    // If we navigated here from PortfolioCartModal with quickCheckoutSeller
    if (location.state?.quickCheckoutSeller && cartItems.length > 0) {
      const seller = location.state.quickCheckoutSeller;
      // Clear the state so it doesn't re-trigger on refresh
      navigate('/cart', { replace: true, state: {} });
      // Small delay to ensure state and context are loaded
      setTimeout(() => {
        handleDirectCheckout(seller);
      }, 500);
    }
  }, [location.state, cartItems.length, navigate]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    if (reference && !handledSuccess.current) {
      handledSuccess.current = true;
      if (reference === 'success') {
        // Fallback
        setFinalReceipt({ subtotal, gamificationDiscountAmount, shipping, total, promoDiscount: calculatedPromoDiscount, adDiscountAmount: calculatedAdDiscount });
        setCheckoutStep(4);
        celebrate();
        sessionStorage.removeItem('pending_checkout');
        useCartStore.setState({ cartItems: [] });
        fetchCart(); // re-sync with backend to confirm empty
        navigate('/cart', { replace: true });
      } else {
        // Verify payment with backend
        axios.get(`/api/v1/payment/verify/${reference}`).then((res) => {
           if (res.data.success) {
              // Support both V2 response ({ status }) and legacy response ({ data: { status } })
              const paymentStatus = res.data.status || res.data.data?.status;
              if (paymentStatus !== 'success') {
                  sessionStorage.removeItem('pending_checkout');
                  toast.error("Your payment is currently processing or unconfirmed.");
                  fetchCart();
                  navigate('/cart', { replace: true });
                  return;
              }

              sessionStorage.removeItem('pending_checkout');
              const fetchedOrder = res.data.order;
              const fetchedReceipt = res.data.receipt;

              if (fetchedReceipt) {
                  const rShipping = Number(fetchedReceipt.shipping || 0);
                  const rTotal = Number(fetchedReceipt.total || 0);
                  const rSubtotal = Number(fetchedReceipt.subtotal) > 0
                      ? Number(fetchedReceipt.subtotal)
                      : Math.max(0, rTotal - rShipping);
                  setFinalReceipt({
                      subtotal: rSubtotal,
                      gamificationDiscountAmount: gamificationDiscountAmount,
                      shipping: rShipping,
                      total: rTotal,
                      promoDiscount: calculatedPromoDiscount,
                      adDiscountAmount: calculatedAdDiscount
                  });
              } else if (fetchedOrder) {
                  const fetchedTotal = Number(fetchedOrder.totalAmount || fetchedOrder.grandTotal || fetchedOrder.total || 0);
                  const fetchedShipping = Number(fetchedOrder.shippingCost || fetchedOrder.shippingFee || fetchedOrder.shipping || 0);
                  const itemsSubtotal = (fetchedOrder.items || []).reduce(
                      (acc, it) => acc + Number(it.priceAtTime || it.price || 0) * Number(it.quantity || 1), 0
                  );
                  const fetchedSubtotal = itemsSubtotal > 0
                      ? itemsSubtotal
                      : (subtotal > 0 ? subtotal : Math.max(0, fetchedTotal - fetchedShipping));
                  setFinalReceipt({ 
                      subtotal: fetchedSubtotal, 
                      gamificationDiscountAmount: gamificationDiscountAmount, 
                      shipping: fetchedShipping, 
                      total: fetchedTotal, 
                      promoDiscount: calculatedPromoDiscount,
                      adDiscountAmount: calculatedAdDiscount 
                  });
              } else {
                  setFinalReceipt({ subtotal, gamificationDiscountAmount, shipping, total, promoDiscount: calculatedPromoDiscount, adDiscountAmount: calculatedAdDiscount });
              }
              setOrderReceipt({ id: reference.replace('GX-', '') }); // Display order ref
              setCheckoutStep(4);
              celebrate();
              // Clear local state immediately, then sync with server
              useCartStore.setState({ cartItems: [] });
              fetchCart(); // re-sync with backend (server already cleared cart in finalizeOrder)
              navigate('/cart', { replace: true });
           } else {
              // Payment was abandoned, cancelled or failed - stock has been restored
              sessionStorage.removeItem('pending_checkout');
              fetchCart();
              toast.error(res.data.message || "Payment was cancelled. Your cart and product stock have been restored.");
              navigate('/cart', { replace: true });
           }
        }).catch((err) => {
           console.error("Verification error:", err);
           sessionStorage.removeItem('pending_checkout');
           fetchCart();
           toast.error("Payment could not be completed. Stock has been restored.");
           navigate('/cart', { replace: true });
        });
      }
    } else if (!reference) {
      // User returned to /cart without query parameters after initiating a checkout (e.g. closed Paystack popup/tab or clicked back)
      const pendingStr = sessionStorage.getItem('pending_checkout');
      if (pendingStr) {
        try {
          const pending = JSON.parse(pendingStr);
          sessionStorage.removeItem('pending_checkout');
          if (pending?.orderId || pending?.reference) {
            axios.post('/api/v1/payment/cancel-pending', {
              orderId: pending.orderId,
              reference: pending.reference
            }).then(() => {
              fetchCart();
              toast('Checkout was cancelled. Your cart items and stock have been restored.', { icon: 'ℹ️' });
            }).catch(() => {
              fetchCart();
            });
          }
        } catch (e) {
          sessionStorage.removeItem('pending_checkout');
        }
      }
    }
  }, [location.search, navigate, fetchCart]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getShippingAddress = () => {
    // Always return the buyer's real address. The backend uses 'isConsolidated' flag to know if it's hub pickup.
    const addresses = profile?.addresses || [];
    const addr = addresses[selectedAddress ?? 0];
    if (addr) {
      return {
        fullName: profile?.fullName || 'Buyer',
        street: addr.street,
        city: addr.city,
        state: addr.state,
        zipCode: addr.postalCode,
        country: addr.country,
        phone: profile?.phone || '000-0000'
      };
    }
    // Guest fallback
    return {
      fullName: 'Guest User',
      street: '123 Guest St',
      city: 'Guest City',
      state: 'Guest State',
      zipCode: '00000',
      country: 'NG',
      phone: '000-0000'
    };
  };

  const handleDirectCheckout = async (sellerName) => {
    if (!profile?.addresses?.length) {
      toast.error('Please add a delivery address in your profile before checking out.');
      return;
    }
    
    try {
      setProofSellerName(sellerName);
      
      const items = cartItems.filter(i => i.seller === sellerName).map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        variants: item.variants
      }));
      
      const res = await axios.get(`/api/v1/stores/bank-details/${encodeURIComponent(sellerName)}`);
      const bankDetails = res.data.bankDetails;
      
      setSelectedPayment('direct_bank');
      
      // Calculate totals for receipt
      const mSub = items.reduce((acc, i) => {
        const cartItem = cartItems.find(c => c.productId === i.productId);
        return acc + (cartItem ? cartItem.price * i.quantity : 0);
      }, 0);
      const mShip = items.reduce((acc, i) => {
        const cartItem = cartItems.find(c => c.productId === i.productId);
        return acc + (cartItem ? (cartItem.directShippingRate || 0) * i.quantity : 0);
      }, 0);
      let mDisc = 0;
      if (gamificationReward) {
          const rew = parseReward(gamificationReward);
          if (rew && typeof rew === 'object' && rew.seller && rew.seller === sellerName) {
              mDisc = applyDiscount(rew.value || rew.discount, mSub);
          } else if (!rew?.seller) {
              mDisc = applyDiscount(gamificationReward, mSub);
          }
      }
      let mPromoDisc = 0;
      if (appliedPromo) {
         let pSub = mSub;
         if (appliedPromo.productId) {
            const matchingItems = items.filter(i => String(i.productId) === String(appliedPromo.productId));
            const cItems = cartItems.filter(c => matchingItems.some(mi => mi.productId === c.productId));
            pSub = cItems.reduce((acc, ci) => acc + (ci.price * ci.quantity), 0);
         }
         if (appliedPromo.discountType === 'PERCENTAGE') {
            mPromoDisc = pSub * (Number(appliedPromo.discountValue) / 100);
         } else {
            mPromoDisc = Math.min(Number(appliedPromo.discountValue), pSub);
         }
      }
      const mItemsTotalAfterDiscounts = Math.max(0, mSub - mDisc - mPromoDisc);
      const proofTotal = mItemsTotalAfterDiscounts + mShip;
      let mAdDisc = 0; // Initialize to 0

      setFinalReceipt({ subtotal: mSub, gamificationDiscountAmount: mDisc, shipping: mShip, total: proofTotal, promoDiscount: mPromoDisc, adDiscountAmount: mAdDisc });
      
      // Open Premium Green Modal with Seller Bank Details
      setProofSellerBank(bankDetails);
      setProofOrderId(null); // We will create it on upload
      setIsProofModalOpen(true);
      
    } catch (err) {
      toast.error('Failed to get bank details: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleApplyPromoCode = async () => {
    if (!promoCodeInput.trim()) return;
    try {
      const cleanCode = promoCodeInput.trim().toUpperCase();
      const res = await axios.post('/api/v1/promo/validate', {
        code: cleanCode,
        productIds: cartItems.map(i => i.productId || i.id),
        orderTotal: cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0)
      });
      if (res.data.success) {
        const promoObj = res.data.promoCode || res.data.data;
        setAppliedPromo(promoObj);
        toast.success(`Promo code "${promoObj.code}" applied successfully!`, { icon: '🎉' });
      }
    } catch (err) {
      toast.error('Failed to apply promo code: ' + (err.response?.data?.message || err.message));
      setAppliedPromo(null);
    }
  };


  const handleUploadProof = async () => {
    if (!proofFile || !proofTransactionRef) {
      return window.__gxAlert?.('Please provide both the payment receipt and the transaction reference.') ?? console.warn('Please provide both the payment receipt and the transaction reference.');
    }
    if (!proofDeliveryAddress.trim()) {
      return window.__gxAlert?.('Please provide a delivery or pickup address.') ?? console.warn('Please provide a delivery or pickup address.');
    }
    try {
      setIsUploadingProof(true);
      
      // Multi-step Loading Animation
      setLoadingStep(1); // Calculating Total Price...
      await new Promise(r => setTimeout(r, 1000));
      
      // 1. Create the order FIRST
      const items = cartItems.filter(i => i.seller === proofSellerName).map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        variants: item.variants
      }));
      
      const res = await axios.post('/api/v1/checkout', {
        isConsolidated: false,
        paymentMethod: 'direct_bank',
        items,
        fromCart: false,
        clearCart: true,
        addressData: getShippingAddress(),
        gamificationReward: gamificationReward,
        promoCode: appliedPromo?.code
      });
      const orderId = res.data.marketplaceOrder.id;
      setProofOrderId(orderId);
      
      setLoadingStep(2); // Checking Proof...
      await new Promise(r => setTimeout(r, 1500));

      setLoadingStep(3); // Finalizing Payment...
      
      // 2. Upload the proof
      const formData = new FormData();
      formData.append('orderId', orderId);
      formData.append('proof', proofFile);
      formData.append('transactionRef', proofTransactionRef);
      formData.append('bankName', proofSellerBank?.bankName || 'Direct Bank');
      formData.append('accountNumber', proofSellerBank?.accountNumber || '');
      formData.append('deliveryAddress', proofDeliveryAddress);

      await axios.post(`/api/v1/checkout/${orderId}/upload-proof`, formData);
      setProofUploadSuccess(true);
      // Refresh cart from backend — checkout API cleared purchased items server-side
      fetchCart();
      
    } catch (err) {
      toast.error('Failed to upload proof or create order: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsUploadingProof(false);
      setLoadingStep(0);
    }
  };

  const handleCheckout = async () => {
    try {
      if (selectedPayment === 'direct_bank') {
         const isConsolidated = selectedShipping === 'hub';
         const verification = await verifyCartPrices();
         if (verification && verification.hasChanges) {
           setPriceChanges(verification.changes);
           setCheckoutStep(1);
           window.scrollTo({ top: 0, behavior: 'smooth' });
           return;
         }
         
         const items = cartItems.map(item => ({
           productId: item.productId,
           quantity: item.quantity,
           variants: item.variants
         }));

         const res = await axios.post('/api/v1/checkout', {
           isConsolidated,
           paymentMethod: 'direct_bank',
           items,
           fromCart: false,
           clearCart: true,
           addressData: getShippingAddress(),
           gamificationReward: gamificationReward,
           promoCode: appliedPromo?.code
         });
         const result = res.data;
         
         setFinalReceipt({ subtotal, gamificationDiscountAmount, shipping, total, promoDiscount: calculatedPromoDiscount, adDiscountAmount: calculatedAdDiscount });
         setProofOrderId(result.marketplaceOrder.id);
         setProofSellerBank(result.bankDetails);
         setIsProofModalOpen(true);
         return;
      }

      // Wallet balance check before sending request
      if (selectedPayment === 'wallet' && walletBalance !== null && walletBalance < total) {
        toast.error(`Insufficient wallet balance. You have ₦${Number(walletBalance).toFixed(2)} but need ₦${total.toFixed(2)}.`);
        return;
      }

      const verification = await verifyCartPrices();
      if (verification && verification.hasChanges) {
        setPriceChanges(verification.changes);
        setCheckoutStep(1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const isConsolidated = selectedShipping === 'hub';
      const result = await checkout({ 
        isConsolidated, 
        paymentMethod: selectedPayment,
        shippingAddress: getShippingAddress(),
        gamificationReward: gamificationReward,
        promoCode: appliedPromo?.code
      });
      
      if (result.authorization_url || result.payment_url || result.link) {
        if (result.orderId || result.reference) {
          sessionStorage.setItem('pending_checkout', JSON.stringify({
            orderId: result.orderId,
            reference: result.reference || result.paymentReference,
            timestamp: Date.now()
          }));
        }
        window.location.href = result.authorization_url || result.payment_url || result.link;
        return;
      }

      // Wallet / COD / direct — show receipt
      setFinalReceipt({ subtotal, gamificationDiscountAmount, shipping, total, promoDiscount: calculatedPromoDiscount, adDiscountAmount: calculatedAdDiscount });
      setOrderReceipt(result.order || result);
      fetchCart();
      celebrate('success');
      setCheckoutStep(4);
    } catch (err) {
      // console.error(err);
      const msg = err.response?.data?.message || err.message;
      setCheckoutError(msg);
    }
  };



  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  
  const parseReward = (r) => { try { return JSON.parse(r); } catch { return r; } };
  const applyDiscount = (val, amt) => {
      if (typeof val === 'string') {
          if (val.includes('%')) { const pct = parseFloat(val.replace('%', '')); if (!isNaN(pct)) return amt * (pct / 100); }
          else if (val.includes('₦')) { const num = parseFloat(val.replace('₦', '').replace(' OFF', '')); if (!isNaN(num)) return num; }
      }
      return 0;
  };

  let gamificationDiscountAmount = 0;
  if (gamificationReward) {
      const rew = parseReward(gamificationReward);
      if (rew && typeof rew === 'object' && rew.seller) {
          const sSub = cartItems.filter(i => i.seller === rew.seller).reduce((acc, item) => acc + (item.price * item.quantity), 0);
          gamificationDiscountAmount = applyDiscount(rew.value || rew.discount, sSub);
      } else {
          gamificationDiscountAmount = applyDiscount(gamificationReward, subtotal);
      }
  }

  let baseDirectShipping = 0;
  if (cartItems.length > 0) {
    baseDirectShipping = cartItems.reduce((acc, i) => acc + ((i.directShippingRate || 0) * i.quantity), 0);
  }
  
  // Calculate Promo Discount (supports product-scoped AI negotiation promos and store-wide promos)
  let calculatedPromoDiscount = 0;
  if (appliedPromo) {
     let promoSubtotal = subtotal;
     if (appliedPromo.productId) {
        const matchingItems = cartItems.filter(i => String(i.productId) === String(appliedPromo.productId) || String(i.id) === String(appliedPromo.productId));
        if (matchingItems.length > 0) {
           promoSubtotal = matchingItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        }
     }
     if (appliedPromo.discountType === 'PERCENTAGE') {
        calculatedPromoDiscount = promoSubtotal * (Number(appliedPromo.discountValue) / 100);
     } else {
        calculatedPromoDiscount = Math.min(Number(appliedPromo.discountValue), promoSubtotal);
     }
  }

  // Calculate Ad Discount
  let calculatedAdDiscount = 0;
  if (adSessions && adSessions.length > 0) {
      cartItems.forEach(item => {
          const session = adSessions.find(s => s.productId === item.id || s.productId === item.productId);
          if (session && session.currentDiscountPct > 0) {
              const itemTotal = item.price * item.quantity;
              calculatedAdDiscount += itemTotal * (session.currentDiscountPct / 100);
          }
      });
  }

  const shipping = selectedShipping === 'hub' ? 25.00 : baseDirectShipping;
  const itemsTotalAfterDiscounts = Math.max(0, subtotal - gamificationDiscountAmount - calculatedPromoDiscount - calculatedAdDiscount);
  const total = itemsTotalAfterDiscounts + shipping;

  let proofTotal = total;
  if (proofSellerName) {
      const mItems = cartItems.filter(i => i.seller === proofSellerName);
      const mSub = mItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      const mShip = mItems.reduce((acc, i) => acc + ((i.directShippingRate || 0) * i.quantity), 0);
      let mDisc = 0;
      if (gamificationReward) {
          const rew = parseReward(gamificationReward);
          if (rew && typeof rew === 'object' && rew.seller) {
              if (rew.seller === proofSellerName) mDisc = applyDiscount(rew.value || rew.discount, mSub);
          } else {
              mDisc = applyDiscount(gamificationReward, mSub);
          }
      }
      
      let mPromoDisc = 0;
      if (appliedPromo) {
         let pSub = mSub;
         if (appliedPromo.productId) {
            const matchingMItems = mItems.filter(i => String(i.productId) === String(appliedPromo.productId) || String(i.id) === String(appliedPromo.productId));
            pSub = matchingMItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
         }
         if (appliedPromo.discountType === 'PERCENTAGE') {
            mPromoDisc = pSub * (Number(appliedPromo.discountValue) / 100);
         } else {
            mPromoDisc = Math.min(Number(appliedPromo.discountValue), pSub);
         }
      }
      
      let mAdDisc = 0;
      if (adSessions && adSessions.length > 0) {
          mItems.forEach(item => {
              const session = adSessions.find(s => s.productId === item.id || s.productId === item.productId);
              if (session && session.currentDiscountPct > 0) {
                  const itemTotal = item.price * item.quantity;
                  mAdDisc += itemTotal * (session.currentDiscountPct / 100);
              }
          });
      }

      const mItemsTotalAfterDiscounts = Math.max(0, mSub - mDisc - mPromoDisc - mAdDisc);
      proofTotal = mItemsTotalAfterDiscounts + mShip;
  }

  const handlePrint = () => {
    window.print();
  };

  const StepIndicator = () => (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="flex items-center justify-between mb-12 max-w-3xl mx-auto relative"
    >
       <div className="absolute top-1/2 left-0 w-full h-1 bg-[var(--bg-tertiary)] -translate-y-1/2 z-0 rounded"></div>
       <motion.div 
         initial={{ width: 0 }}
         animate={{ width: `${(checkoutStep - 1) * 33.33}%` }}
         transition={{ duration: 0.8, ease: "easeInOut", delay: 0.2 }}
         className="absolute top-1/2 left-0 h-1 bg-[var(--accent-gray)] -translate-y-1/2 z-0 rounded" 
       />
       
       {[ {num:1, label:'Cart'}, {num:2, label:'Shipping'}, {num:3, label:'Payment'}, {num:4, label:'Done'} ].map((step, idx) => (
         <div key={step.num} className="relative z-10 flex flex-col items-center">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.4, delay: 0.3 + idx * 0.1, type: "spring" }}
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border-2 transition-colors duration-300 ${checkoutStep >= step.num ? 'bg-[var(--accent-gray)] border-[var(--accent-gray)] text-[var(--bg-primary)] shadow-[0_0_15px_var(--accent-gray-dim)]' : 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-muted)]'}`}
            >
               {checkoutStep > step.num ? (
                 <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }}>
                   <CheckCircle2 size={20} />
                 </motion.div>
               ) : step.num}
            </motion.div>
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.5 + idx * 0.1 }}
              className={`absolute top-12 text-xs font-bold uppercase tracking-wider whitespace-nowrap ${checkoutStep >= step.num ? 'text-black dark:text-white' : 'text-[var(--text-muted)]'}`}
            >
              {step.label}
            </motion.span>
         </div>
       ))}
    </motion.div>
  );

  return (
    <div className="min-h-screen text-[var(--text-main)] pt-24 pb-12 px-6">
      
      {/* Checkout Session Timer */}
      {checkoutStep > 1 && checkoutStep < 4 && (
        <div className="fixed top-16 left-0 w-full bg-[var(--accent-gray)] text-[var(--bg-primary)] z-30 flex items-center justify-center py-3 shadow-[0_0_20px_var(--accent-gray-dim)] font-bold">
           <span className="flex items-center gap-2 text-sm tracking-wider uppercase">
              <Zap size={18}/> Inventory Reserved for {formatTime(timeLeft)}
           </span>
        </div>
      )}

      <div className="max-w-6xl mx-auto mt-8">
        <StepIndicator />

        {/* Offline Saved Cart Banner */}
        {!isOnline && checkoutStep === 1 && (
          <div className="mb-8 p-5 bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl">
                <WifiOff size={22} className="animate-pulse" />
              </span>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-[var(--text-main)]">
                  Viewing Offline Saved Cart
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Items, prices, and quantities are saved locally on this device. When reconnected, changes will sync and checkout will be unlocked.
                </p>
              </div>
            </div>
            {pendingCount > 0 && (
              <span className="px-3 py-1 bg-amber-500/20 border border-amber-500/30 text-amber-700 dark:text-amber-300 rounded-full text-xs font-bold shrink-0">
                ⚡ {pendingCount} change{pendingCount > 1 ? 's' : ''} queued
              </span>
            )}
          </div>
        )}

        {/* Real-time Price Protection Banner */}
        {priceChanges.length > 0 && checkoutStep === 1 && (
          <div className="mb-8 p-6 bg-red-900/30 border border-red-500 rounded-xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-red-400 font-bold text-lg">⚠️ Your cart has changed.</span>
              <span className="text-gray-300">Review the updated details before proceeding.</span>
            </div>
            <ul className="space-y-3">
              {priceChanges.map((change, idx) => (
                <li key={idx} className="flex flex-col md:flex-row sm:items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-color)]">
                  <span className="font-bold">{change.title}</span>
                  <span className="text-red-400 text-sm mt-1 sm:mt-0">{change.message}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-4">
              <button 
                onClick={() => {
                  setPriceChanges([]);
                  fetchCart(); // Refresh to get the latest prices/stock
                }}
                className="bg-red-500 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-600 transition"
              >
                Accept Changes & Refresh Cart
              </button>
            </div>
          </div>
        )}

        {/* Auth Guard */}
        {!user ? (
          <div className="mt-8">
             <ErrorState 
                variant="unauthorized" 
                title="Login to view your cart" 
                message="You must be logged in to view your cart and checkout securely." 
                showHome 
             />
          </div>
        ) : checkoutStep === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8 sm:mt-16">
            <div className="lg:col-span-2 space-y-4">
              {cartItems.length === 0 ? (
                <div className="neu-card p-12 text-center">
                  <h3 className="text-2xl font-bold mb-4">Your Cart is Empty</h3>
                  <p className="text-[var(--text-muted)] mb-8">You haven't added any products to your cart yet.</p>
                </div>
              ) : Object.entries(cartItems.reduce((acc, item) => {
                if (!acc[item.seller]) acc[item.seller] = [];
                acc[item.seller].push(item);
                return acc;
              }, {})).map(([sellerName, items]) => (
                <div key={sellerName} className="mb-8 neu-card p-4">
                  <h4 className="text-lg font-bold mb-4 text-[var(--accent-gray)] border-b border-[var(--border-color)] pb-2 flex items-center justify-between">
                     <span>Seller: {sellerName}</span>
                     <div className="flex items-center gap-4">
                       <span className="text-sm font-bold text-[var(--text-main)] bg-[var(--bg-tertiary)] px-3 py-1 rounded">
                          Subtotal: ₦{items.reduce((sum, i) => sum + (i.price * i.quantity), 0).toFixed(2)}
                       </span>
                       <button onClick={() => handleDirectCheckout(sellerName)} className="neu-button-primary px-5 py-2 min-h-[44px] rounded font-bold text-sm flex items-center gap-2">
                          Pay Direct <ArrowRight size={14} />
                       </button>
                     </div>
                  </h4>
                  <div className="space-y-4 overflow-hidden">
                    <AnimatePresence>
                    {items.map(item => (
                      <motion.div 
                        key={item.id} 
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, x: -100 }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={{ left: 0.2, right: 0 }}
                        onDragEnd={(e, { offset }) => {
                          if (offset.x < -100) removeFromCart(item.productId);
                        }}
                        className="premium-glass p-4 flex flex-col md:flex-row gap-6 items-center sm:items-stretch rounded-xl border border-[var(--border-color)] hover:border-[var(--accent-gray)] transition-colors group cursor-grab active:cursor-grabbing"
                      >
                        <WImageLoader src={item.image} alt={item.title} className="w-24 h-24 rounded-lg bg-white filter group-hover:brightness-110 transition-all pointer-events-none" objectFit="object-contain" />
                        <div className="flex-1 flex flex-col justify-between w-full pointer-events-auto">
                          <div>
                            <div className="flex justify-between items-start">
                              <h3 className="font-bold text-lg line-clamp-1">{item.title}</h3>
                              <div className="flex gap-2">
                                <button 
                                  onClick={async () => {
                                    try { await addToWishlist(item.productId); } catch(err) { toast.error('Failed to add to wishlist'); }
                                    try { await removeFromCart(item.productId); } catch(err) { toast.error('Failed to remove from cart'); }
                                  }} 
                                  className="text-[var(--accent-gray)] hover:text-white transition-colors p-1"
                                  title="Save for Later"
                                >
                                  <Bookmark size={18} />
                                </button>
                                <button onClick={() => removeFromCart(item.productId)} className="text-[var(--text-muted)] hover:text-red-400 transition-colors p-1"><Trash2 size={18} /></button>
                              </div>
                            </div>
                            <p className="text-sm text-[var(--text-muted)]">Verified Seller: <span className="text-[var(--accent-gray)]">{item.seller}</span></p>
                          </div>
                          <div className="flex justify-between items-end mt-4">
                            <div className="flex items-center gap-3 bg-[var(--bg-tertiary)] rounded-lg p-1 border border-[var(--border-color)]">
                              <button onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variants)} disabled={item.quantity <= 1} className="w-12 h-12 rounded text-[var(--text-main)] hover:bg-[var(--bg-secondary)] disabled:opacity-50 flex items-center justify-center">-</button>
                              <span className="w-6 text-center font-bold text-[var(--text-main)]">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variants)} disabled={item.quantity >= (item.stock || 999)} className="w-12 h-12 rounded text-[var(--text-main)] hover:bg-[var(--bg-secondary)] disabled:opacity-50 flex items-center justify-center">+</button>
                            </div>
                            <div className="text-right">
                              {appliedPromo && (appliedPromo.productId === item.productId || appliedPromo.productId === item.id) && (
                                <div className="flex justify-end items-center gap-1.5 mb-1">
                                  <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-500/25 flex items-center gap-1">
                                    🏷️ AI Deal ({appliedPromo.code}): -{appliedPromo.discountType === 'PERCENTAGE' ? `${appliedPromo.discountValue}%` : `₦${appliedPromo.discountValue}`}
                                  </span>
                                </div>
                              )}
                              {item.discount > 0 && (
                                <div className="flex justify-end items-center gap-2 mb-1">
                                  <span className="bg-[#00b873]/10 text-[#00b873] px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-[#00b873]/20">-{item.discount}% OFF</span>
                                  <span className="text-[var(--text-muted)] text-sm line-through">₦{(item.originalPrice * item.quantity).toFixed(2)}</span>
                                </div>
                              )}
                              <div className="text-2xl font-extrabold text-[var(--text-main)]"> ₦{(item.price * item.quantity).toFixed(2)}</div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-1">
              <div className="premium-glass p-6 sticky top-32 rounded-xl border border-[var(--border-color)]">
                <h3 className="text-xl font-bold mb-6 border-b border-[var(--border-color)] pb-4 flex items-center justify-between">
                  Order Summary
                </h3>
                <div className="space-y-4 mb-6 text-[var(--text-muted)] text-sm">
                  <div className="flex justify-between"><span>Subtotal</span><span className="text-[var(--text-main)] font-bold"> ₦{subtotal.toFixed(2)}</span></div>
                  {gamificationDiscountAmount > 0 && (
                     <div className="flex justify-between text-gray-500"><span>Reward Applied</span><span className="font-bold">-₦{gamificationDiscountAmount.toFixed(2)}</span></div>
                  )}
                  {calculatedAdDiscount > 0 && (
                     <div className="flex justify-between text-blue-500"><span>Ad Boost Discount</span><span className="font-bold">-₦{calculatedAdDiscount.toFixed(2)}</span></div>
                  )}
                  {calculatedPromoDiscount > 0 && (
                     <div className="flex justify-between text-emerald-500 font-semibold">
                       <span>🏷️ Promo ({appliedPromo?.code})</span>
                       <span className="font-bold">-₦{calculatedPromoDiscount.toFixed(2)}</span>
                     </div>
                  )}
                  <div className="flex justify-between"><span>Estimated Shipping</span><span className="text-[var(--text-main)] font-bold">Calculated next step</span></div>
                </div>
                
                <div className="flex gap-2 mb-2">
                   {appliedPromo ? (
                       <div className="flex-1 bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 rounded-lg flex justify-between items-center text-[var(--text-main)]">
                           <div>
                               <div className="flex items-center gap-2">
                                 <span className="font-bold text-emerald-500">{appliedPromo.code}</span>
                                 <span className="text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">Applied</span>
                               </div>
                               {appliedPromo.productId && (
                                 <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">Exclusive AI Negotiated Discount on this item</p>
                               )}
                           </div>
                           <button onClick={() => { setAppliedPromo(null); setPromoCodeInput(''); }} className="text-[var(--text-muted)] hover:text-red-400 transition-colors">
                               <X size={16} />
                           </button>
                       </div>
                   ) : (
                       <>
                           <input 
                              type="text" 
                              placeholder="Promo Code" 
                              value={promoCodeInput}
                              onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                              className="flex-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] px-6 py-3 min-h-[44px] rounded-lg text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-gray)] transition-colors"
                           />
                           <button 
                              onClick={handleApplyPromoCode}
                              className="bg-[var(--bg-tertiary)] text-[var(--accent-gray)] border border-[var(--border-color)] px-4 rounded-lg font-bold hover:bg-[var(--accent-gray)]/10 transition-colors"
                           >
                              Apply
                           </button>
                       </>
                   )}
                </div>
                {availablePromos.length > 0 && !appliedPromo && (
                  <div className="mb-6">
                    <p className="text-xs text-[var(--text-muted)] mb-2">Available Promos for your cart:</p>
                    <div className="flex flex-wrap gap-2">
                      {availablePromos.map(promo => (
                        <button
                          key={promo.id}
                          onClick={() => setPromoCodeInput(promo.code)}
                          className="text-xs bg-[var(--bg-secondary)] border border-[var(--accent-gray)] text-[var(--accent-gray)] px-2 py-1 rounded hover:bg-[var(--accent-gray)] hover:text-[var(--bg-primary)] transition-colors"
                        >
                          {promo.code} ({promo.discountType === 'PERCENTAGE' ? `${promo.discountValue}% OFF` : `₦${promo.discountValue} OFF`})
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between items-center text-2xl font-extrabold mb-8 pt-4 border-t border-[var(--border-color)]">
                  <span>Total</span>
                  <span className="text-[var(--accent-gray)]"> ₦{Math.max(0, subtotal - gamificationDiscountAmount - calculatedPromoDiscount - calculatedAdDiscount).toFixed(2)}</span>
                </div>
                
                <div className="md:static sticky bottom-0 left-0 right-0 p-4 md:p-0 bg-[var(--bg-primary)] md:bg-transparent z-40 border-t md:border-none border-[var(--border-color)]">
                  <button 
                    onClick={async () => {
                      if (!isOnline) {
                        toast.error('You are offline. Connect to the internet to verify inventory and proceed with checkout.');
                        return;
                      }
                      setIsVerifying(true);
                      try {
                        const verification = await verifyCartPrices();
                        setIsVerifying(false);
                        if (verification.hasChanges) {
                          setPriceChanges(verification.changes);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        } else {
                          setPriceChanges([]);
                          setCheckoutStep(2);
                        }
                      } catch (err) {
                        setIsVerifying(false);
                      }
                    }}
                    disabled={isVerifying || !isOnline}
                    className="bg-[var(--accent-gray)] text-[var(--bg-primary)] w-full py-4 text-lg font-bold flex items-center justify-center gap-2 md:mb-4 rounded-lg shadow-[0_0_15px_var(--accent-gray-dim)] hover:opacity-90 hover:scale-105 transition-all duration-300 disabled:opacity-50"
                  >
                    {!isOnline ? (
                      <>
                        <WifiOff size={20} /> Connect to Checkout
                      </>
                    ) : (
                      <>
                        {isVerifying ? 'Verifying Prices...' : 'Continue to Shipping'} <ArrowRight size={20} />
                      </>
                    )}
                  </button>
                </div>


                
                <div className="flex items-center justify-center gap-2 text-xs text-[var(--text-muted)] mt-6 p-3 bg-[var(--bg-tertiary)] rounded border border-[var(--border-color)]">
                  <ShieldCheck size={16} className="text-[var(--accent-gray)]" /> Fully protected by Escrow
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: SHIPPING */}
        {checkoutStep === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8 sm:mt-16">
             <div className="lg:col-span-2 space-y-6">
                <h2 className="text-2xl font-bold border-b border-[var(--border-color)] pb-4">Shipping Method</h2>
                
                <div 
                  onClick={() => setSelectedShipping('hub')}
                  className={`premium-glass p-6 rounded-xl border-2 cursor-pointer transition-all hover-3d ${selectedShipping === 'hub' ? 'border-[var(--accent-gray)] bg-[var(--accent-gray-dim)] shadow-[0_0_15px_var(--accent-gray-dim)]' : 'border-[var(--border-color)]'}`}
                >
                   <div className="flex justify-between items-start mb-2">
                     <div className="flex items-center gap-3">
                        <MapPin size={24} className={selectedShipping === 'hub' ? 'text-[var(--accent-gray)]' : 'text-[var(--text-muted)]'} />
                        <h3 className="font-bold text-xl">GlobalX Hub Consolidation</h3>
                     </div>
                     <span className="font-bold text-lg">₦25.00</span>
                   </div>
                   <p className="text-[var(--text-muted)] text-sm ml-9">Items are shipped to our Dubai hub, verified by our team, and consolidated into one premium package. Takes 5-7 days.</p>
                </div>

                <div 
                  onClick={() => setSelectedShipping('direct')}
                  className={`premium-glass p-6 rounded-xl border-2 cursor-pointer transition-all hover-3d ${selectedShipping === 'direct' ? 'border-[var(--accent-gray)] bg-[var(--accent-gray-dim)] shadow-[0_0_15px_var(--accent-gray-dim)]' : 'border-[var(--border-color)]'}`}
                >
                   <div className="flex justify-between items-start mb-2">
                     <div className="flex items-center gap-3">
                        <Zap size={24} className={selectedShipping === 'direct' ? 'text-[var(--accent-gray)]' : 'text-[var(--text-muted)]'} />
                        <h3 className="font-bold text-xl">Direct Express</h3>
                     </div>
                     <span className="font-bold text-lg">₦{baseDirectShipping.toFixed(2)}</span>
                   </div>
                   <p className="text-[var(--text-muted)] text-sm ml-9 mb-4">Items are shipped directly from sellers via DHL/FedEx. Takes 2-3 days.</p>
                   
                   {/* Per-seller breakdown */}
                   {selectedShipping === 'direct' && (
                     <div className="ml-9 p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-color)] space-y-2 mt-4">
                       <h4 className="text-xs font-bold uppercase text-[var(--text-muted)] mb-2">Shipping Breakdown by Seller</h4>
                       {Object.entries(cartItems.reduce((acc, item) => {
                         if (!acc[item.seller]) acc[item.seller] = 0;
                         acc[item.seller] += ((item.directShippingRate || 0) * item.quantity);
                         return acc;
                       }, {})).map(([seller, cost]) => (
                         <div key={seller} className="flex justify-between text-sm">
                           <span>{seller}</span>
                           <span className="font-bold text-[var(--text-main)]">₦{cost.toFixed(2)}</span>
                         </div>
                       ))}
                     </div>
                   )}
                </div>

                {/* Address Picker */}
                <div className="premium-glass p-5 rounded-xl border border-[var(--border-color)]">
                  <label className="block text-sm font-bold mb-3 flex items-center gap-2">
                    <MapPin size={16} className="text-[var(--accent-gray)]" /> Delivery Address
                  </label>
                  {profile?.addresses?.length > 0 ? (
                    <div className="relative">
                      <select
                        value={selectedAddress ?? 0}
                        onChange={e => setSelectedAddress(Number(e.target.value))}
                        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-[var(--accent-gray)] rounded-lg px-4 py-3 text-white font-bold appearance-none pr-10 outline-none transition-colors"
                      >
                        {profile.addresses.map((addr, i) => (
                          <option key={i} value={i}>
                            {addr.street}, {addr.city}, {addr.state}, {addr.country}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-4 text-[var(--text-muted)] pointer-events-none" />
                    </div>
                  ) : (
                    <div className="text-sm text-[var(--text-muted)] bg-[var(--bg-tertiary)] p-4 rounded-lg border border-[var(--border-color)] text-center">
                      <p className="mb-2">Using Guest Checkout Address.</p>
                      <Link to="/buyer/profile" className="text-[var(--accent-gray)] font-bold hover:underline">Log in to use saved addresses</Link>
                    </div>
                  )}
                </div>

                <button onClick={() => setCheckoutStep(1)} className="text-[var(--text-muted)] hover:text-white mt-8 inline-block">← Back to Cart</button>
             </div>

             <div className="lg:col-span-1">
              <div className="premium-glass p-6 sticky top-32 rounded-xl border border-[var(--border-color)]">
                <h3 className="text-xl font-bold mb-6 border-b border-[var(--border-color)] pb-4">Order Summary</h3>
                <div className="space-y-4 mb-6 text-[var(--text-muted)] text-sm">
                  <div className="flex justify-between"><span>Subtotal</span><span className="text-[var(--text-main)] font-bold"> ₦{subtotal.toFixed(2)}</span></div>
                  {gamificationDiscountAmount > 0 && (
                     <div className="flex justify-between text-gray-500"><span>Reward Applied</span><span className="font-bold">-₦{gamificationDiscountAmount.toFixed(2)}</span></div>
                  )}
                  {calculatedAdDiscount > 0 && (
                     <div className="flex justify-between text-blue-500"><span>Ad Boost Discount</span><span className="font-bold">-₦{calculatedAdDiscount.toFixed(2)}</span></div>
                  )}
                  {calculatedPromoDiscount > 0 && (
                     <div className="flex justify-between text-gray-500"><span>Promo Discount</span><span className="font-bold">-₦{calculatedPromoDiscount.toFixed(2)}</span></div>
                  )}
                  <div className="flex justify-between"><span>Shipping ({selectedShipping})</span><span className="text-[var(--text-main)] font-bold"> ₦{shipping.toFixed(2)}</span></div>
                </div>
                <div className="flex justify-between items-center text-2xl font-extrabold mb-8 pt-4 border-t border-[var(--border-color)]">
                  <span>Total</span>
                  <span className="text-[var(--accent-gray)]"> ₦{total.toFixed(2)}</span>
                </div>
                <div className="md:static sticky bottom-0 left-0 right-0 p-4 md:p-0 bg-[var(--bg-primary)] md:bg-transparent z-40 border-t md:border-none border-[var(--border-color)]">
                  <button onClick={() => {
                    setCheckoutStep(3);
                  }} className="bg-[var(--accent-gray)] text-[var(--bg-primary)] w-full py-4 text-lg font-bold flex items-center justify-center gap-2 rounded-lg shadow-[0_0_15px_var(--accent-gray-dim)] hover:opacity-90 hover:scale-105 transition-all duration-300">
                    Continue to Payment <ArrowRight size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: PAYMENT */}
        {checkoutStep === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8 sm:mt-16">
             <div className="lg:col-span-2 space-y-6">
                <h2 className="text-2xl font-bold border-b border-[var(--border-color)] pb-4">Secure Payment</h2>

                {/* ── Payment Method Cards ── */}
                <div className="space-y-4">
                  {[
                    {
                      id: 'wallet',
                      label: 'GlobalX Wallet',
                      desc: walletBalance !== null
                        ? `Instant payment from your wallet. Current balance: ₦${Number(walletBalance).toFixed(2)}`
                        : 'Instant payment from your GlobalX wallet balance.',
                      icon: <Wallet size={24} />,
                      badge: walletBalance !== null && walletBalance < total ? '⚠ Insufficient balance' : '🟢 Recommended',
                      badgeColor: walletBalance !== null && walletBalance < total ? 'text-yellow-400' : 'text-green-400',
                      priority: walletBalance !== null && walletBalance >= total ? 1 : 0
                    },
                    {
                      id: 'paystack',
                      label: 'Paystack',
                      desc: 'Pay securely via Paystack. Funds held in GlobalX Escrow until you confirm delivery.',
                      icon: <CreditCard size={24} />,
                      badge: 'Escrow Protected',
                      badgeColor: 'text-gray-400',
                      priority: 0
                    },
                    {
                      id: 'monnify',
                      label: 'Monnify',
                      desc: 'Pay via bank transfer or card through Monnify. Funds held in escrow.',
                      icon: <CreditCard size={24} />,
                      badge: 'Escrow Protected',
                      badgeColor: 'text-gray-400',
                      priority: 0
                    },


                    {
                      id: 'direct_bank',
                      label: 'Direct Bank Transfer',
                      desc: "Transfer directly to the seller's bank. No escrow protection — you upload proof after paying.",
                      icon: <CreditCard size={24} />,
                      badge: 'No Escrow',
                      badgeColor: 'text-gray-400',
                      priority: 0
                    },
                  ].sort((a, b) => b.priority - a.priority).map(method => (
                    <div
                      key={method.id}
                      onClick={() => setSelectedPayment(method.id)}
                      className={`premium-glass p-5 rounded-xl border-2 cursor-pointer transition-all hover-3d ${
                        selectedPayment === method.id
                          ? 'border-[var(--accent-gray)] bg-[var(--accent-gray-dim)]'
                          : 'border-[var(--border-color)]'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                          selectedPayment === method.id ? 'border-[var(--accent-gray)]' : 'border-[var(--text-muted)]'
                        }`}>
                          {selectedPayment === method.id && <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent-gray)]" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-bold text-base">{method.label}</h3>
                            <span className={`text-xs font-semibold ${method.badgeColor}`}>{method.badge}</span>
                          </div>
                          <p className="text-xs text-[var(--text-muted)] mt-1">{method.desc}</p>
                        </div>
                        <div className={selectedPayment === method.id ? 'text-[var(--accent-gray)]' : 'text-[var(--text-muted)]'}>
                          {method.icon}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-5 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-color)]">
                   <p className="text-xs text-[var(--text-muted)]">By clicking "Place Order" you agree to our Escrow Terms of Service. Funds held in escrow are released to the seller only after you confirm receipt.</p>
                </div>

                <button onClick={() => setCheckoutStep(2)} className="text-[var(--text-muted)] hover:text-white mt-4 inline-block">← Back to Shipping</button>
             </div>

             <div className="lg:col-span-1">
              <div className="premium-glass p-6 sticky top-32 rounded-xl border border-[var(--border-color)]">
                <h3 className="text-xl font-bold mb-6 border-b border-[var(--border-color)] pb-4">Order Summary</h3>

                {checkoutError && (
                  <div className="mb-6 p-4 premium-glass rounded-xl border border-red-500/50 bg-red-900/20">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-[var(--accent-gray)] flex items-center justify-center text-[var(--bg-primary)] shrink-0">
                        <Zap size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-red-400 mb-1">Transaction Declined</h4>
                        <p className="text-gray-300 text-sm mb-3">
                          "{checkoutError}"
                        </p>
                        {selectedPayment !== 'wallet' ? (
                          <>
                            <p className="text-gray-400 text-sm italic">
                              This typically happens due to insufficient funds or a daily bank limit. Would you like to try paying with your GlobalX Wallet instead?
                            </p>
                            <button 
                              onClick={() => {
                                setCheckoutError(null);
                                setSelectedPayment('wallet');
                              }}
                              className="mt-3 px-6 py-3 min-h-[44px] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm font-bold transition-all cursor-pointer"
                            >
                              Use Wallet
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-3 mt-3">
                            <button 
                              onClick={() => {
                                setCheckoutError(null);
                                navigate('/wallet');
                              }}
                              className="px-5 py-2.5 min-h-[40px] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm font-bold transition-all cursor-pointer"
                            >
                              View Wallet
                            </button>
                            <button 
                              onClick={() => setCheckoutError(null)}
                              className="px-4 py-2.5 min-h-[40px] text-gray-400 hover:text-white text-sm transition-all cursor-pointer"
                            >
                              Dismiss
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <div className="space-y-4 mb-6 text-[var(--text-muted)] text-sm">
                  <div className="flex justify-between"><span>Subtotal</span><span className="text-[var(--text-main)] font-bold"> ₦{subtotal.toFixed(2)}</span></div>
                  {gamificationDiscountAmount > 0 && (
                     <div className="flex justify-between text-gray-500"><span>Reward Applied</span><span className="font-bold">-₦{gamificationDiscountAmount.toFixed(2)}</span></div>
                  )}
                  {calculatedAdDiscount > 0 && (
                     <div className="flex justify-between text-blue-500"><span>Ad Boost Discount</span><span className="font-bold">-₦{calculatedAdDiscount.toFixed(2)}</span></div>
                  )}
                  {calculatedPromoDiscount > 0 && (
                     <div className="flex justify-between text-gray-500"><span>Promo Discount</span><span className="font-bold">-₦{calculatedPromoDiscount.toFixed(2)}</span></div>
                  )}
                  <div className="flex justify-between"><span>Shipping</span><span className="text-[var(--text-main)] font-bold"> ₦{shipping.toFixed(2)}</span></div>
                </div>
                <div className="flex justify-between items-center text-2xl font-extrabold mb-8 pt-4 border-t border-[var(--border-color)]">
                  <span>Total</span>
                  <span className="text-[var(--accent-gray)]"> ₦{total.toFixed(2)}</span>
                </div>
                <div className="md:static sticky bottom-0 left-0 right-0 p-4 md:p-0 bg-[var(--bg-primary)] md:bg-transparent z-40 border-t md:border-none border-[var(--border-color)]">
                  <button onClick={handleCheckout} disabled={loading} className="bg-[var(--accent-gray)] text-[var(--bg-primary)] w-full py-5 text-xl font-extrabold flex items-center justify-center gap-2 rounded-lg shadow-[0_0_15px_var(--accent-gray-dim)] hover:opacity-90 hover:scale-105 transition-all duration-300 uppercase tracking-widest disabled:opacity-50">
                    {loading ? 'Processing...' : 'Place Order'} <ShieldCheck size={24} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: DONE / RECEIPT */}
        {checkoutStep === 4 && (
          <div className="mt-8 sm:mt-16 flex flex-col items-center max-w-lg mx-auto text-center w-full">
            {/* Opay-style Success Header */}
            <div className="mb-8 flex flex-col items-center">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-xl ${selectedPayment === 'direct_bank' ? 'bg-amber-500 shadow-amber-500/30' : 'bg-emerald-500 shadow-emerald-500/30'}`}>
                 {selectedPayment === 'direct_bank' ? <Clock size={48} className="text-white" /> : <CheckCircle2 size={56} className="text-white" />}
              </div>
              <h1 className="text-3xl font-extrabold text-[var(--text-main)] mb-2">
                {selectedPayment === 'direct_bank' ? 'Payment Pending' : 'Payment Successful'}
              </h1>
              <p className="text-[var(--text-muted)] text-base">
                Order #{orderReceipt?.id?.substring(0,8)?.toUpperCase() || 'GX-8849'} {selectedPayment === 'direct_bank' ? 'is awaiting verification.' : 'has been secured in escrow.'}
              </p>
            </div>

            {/* Opay-style Large Amount */}
            <div className="mb-10">
              <span className="text-5xl font-black text-[var(--text-main)] tracking-tight">₦{(finalReceipt?.total || total).toFixed(2)}</span>
            </div>
            
            {/* Opay-style Receipt Card */}
            <div className="w-full bg-white dark:bg-[#151515] rounded-[2rem] p-8 shadow-2xl text-left mb-8 relative border border-gray-100 dark:border-white/5">
                <div className="absolute top-6 right-6 print:hidden">
                   <button onClick={handlePrint} className="text-gray-400 hover:text-emerald-500 transition-colors p-2 bg-gray-50 dark:bg-black/20 rounded-full">
                      <Printer size={20} />
                   </button>
                </div>
                
                <h3 className="text-gray-900 dark:text-white font-bold text-lg mb-8 uppercase tracking-widest text-center border-b border-gray-100 dark:border-white/5 pb-4">Transaction Details</h3>
                
                <div className="space-y-6 text-base">
                   <div className="flex justify-between items-center">
                     <span className="text-gray-500 dark:text-gray-400 font-medium">Date & Time</span>
                     <span className="text-gray-900 dark:text-white font-bold">{new Date().toLocaleString()}</span>
                   </div>
                   <div className="flex justify-between items-center">
                     <span className="text-gray-500 dark:text-gray-400 font-medium">Payment Method</span>
                     <span className="text-gray-900 dark:text-white font-bold capitalize">{selectedPayment.replace('_', ' ')}</span>
                   </div>
                   <div className="flex justify-between items-center">
                     <span className="text-gray-500 dark:text-gray-400 font-medium">Status</span>
                     <span className={selectedPayment === 'direct_bank' ? 'text-amber-500 font-bold bg-amber-500/10 px-3 py-1 rounded-full text-sm' : 'text-emerald-500 font-bold bg-emerald-500/10 px-3 py-1 rounded-full text-sm'}>
                        {selectedPayment === 'direct_bank' ? 'Pending' : 'Successful'}
                     </span>
                   </div>
                   <div className="flex justify-between items-center">
                     <span className="text-gray-500 dark:text-gray-400 font-medium">Reference</span>
                     <span className="text-gray-900 dark:text-white font-bold uppercase">{orderReceipt?.id?.substring(0,12) || 'TXN-GX-8849'}</span>
                   </div>
                </div>

                <div className="mt-8 pt-6 border-t border-dashed border-gray-200 dark:border-gray-800 space-y-4 text-base relative">
                   {/* Notch cutouts for receipt effect */}
                   <div className="absolute -top-3 -left-11 w-6 h-6 bg-[var(--bg-primary)] rounded-full"></div>
                   <div className="absolute -top-3 -right-11 w-6 h-6 bg-[var(--bg-primary)] rounded-full"></div>

                   <div className="flex justify-between items-center">
                     <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                     <span className="text-gray-900 dark:text-white font-semibold">₦{(finalReceipt?.subtotal || subtotal).toFixed(2)}</span>
                   </div>
                   {(finalReceipt?.gamificationDiscountAmount > 0 || gamificationDiscountAmount > 0) && (
                      <div className="flex justify-between items-center text-emerald-500">
                        <span>Reward Discount</span>
                        <span className="font-semibold">-₦{(finalReceipt?.gamificationDiscountAmount || gamificationDiscountAmount).toFixed(2)}</span>
                      </div>
                   )}
                   {(finalReceipt?.adDiscountAmount > 0 || calculatedAdDiscount > 0) && (
                      <div className="flex justify-between items-center text-blue-500">
                        <span>Ad Boost Discount</span>
                        <span className="font-semibold">-₦{(finalReceipt?.adDiscountAmount || calculatedAdDiscount).toFixed(2)}</span>
                      </div>
                   )}
                   {(finalReceipt?.promoDiscount > 0 || calculatedPromoDiscount > 0) && (
                      <div className="flex justify-between items-center text-emerald-500">
                        <span>Promo Code</span>
                        <span className="font-semibold">-₦{(finalReceipt?.promoDiscount || calculatedPromoDiscount).toFixed(2)}</span>
                      </div>
                   )}
                   <div className="flex justify-between items-center">
                     <span className="text-gray-500 dark:text-gray-400">Shipping Fee</span>
                     <span className="text-gray-900 dark:text-white font-semibold">₦{(finalReceipt?.shipping || shipping).toFixed(2)}</span>
                   </div>
                </div>
            </div>

            {selectedPayment === 'direct_bank' && orderReceipt?.seller?.store && (
                <div className="w-full bg-amber-50 dark:bg-amber-500/5 rounded-[2rem] p-8 border border-amber-500/20 text-left mb-8">
                   <h3 className="text-amber-600 dark:text-amber-500 font-bold mb-4 flex items-center gap-2 text-lg"><Clock size={20} /> Awaiting Transfer</h3>
                   <p className="text-amber-600/80 dark:text-amber-500/80 mb-6 leading-relaxed">Please transfer the exact amount to the bank details below. Upload your proof of payment in your Orders dashboard once completed.</p>
                   
                   <div className="bg-white dark:bg-black/20 rounded-2xl p-6 space-y-4 shadow-sm">
                      <div className="flex justify-between"><span className="text-[var(--text-muted)]">Bank Name</span><span className="font-bold text-[var(--text-main)] text-right">{orderReceipt.seller.store.bankName || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-[var(--text-muted)]">Account Number</span><span className="font-bold text-[var(--text-main)] text-right">{orderReceipt.seller.store.accountNumber || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-[var(--text-muted)]">Account Name</span><span className="font-bold text-[var(--text-main)] text-right">{orderReceipt.seller.store.accountName || 'N/A'}</span></div>
                   </div>
                </div>
             )}

             <div className="flex gap-4 w-full flex-col">
                <Link to="/buyer/dashboard" className={`w-full text-white font-bold py-4 rounded-2xl transition-all shadow-lg hover:-translate-y-1 ${selectedPayment === 'direct_bank' ? 'bg-amber-500 shadow-amber-500/20 hover:bg-amber-600' : 'bg-emerald-500 shadow-emerald-500/20 hover:bg-emerald-600'}`}>Track My Order</Link>
                <Link to="/shop" className="w-full bg-white dark:bg-[#151515] border border-gray-100 dark:border-white/5 text-[var(--text-main)] py-4 font-bold rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">Done</Link>
             </div>
          </div>
        )}
      </div>

      {/* Premium Green Modal for Direct Payment */}
      {/* Premium Red Modal for Direct Payment */}
      {isProofModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505]/80 backdrop-blur-sm p-4">
          <div className="premium-glass border-transparent rounded-2xl w-full max-w-md p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[var(--accent-gray)] to-gray-600"></div>
            
            <button 
              onClick={() => { setIsProofModalOpen(false); setProofUploadSuccess(false); }}
              className="absolute top-4 right-4 text-gray-400/60 hover:text-[var(--accent-gray)] transition"
            >
              <X size={20} />
            </button>

            {proofUploadSuccess ? (
              <div className="text-center py-8 relative z-10">
                <div className="w-20 h-20 bg-[var(--accent-gray-dim)] rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_var(--accent-gray-dim)]">
                  <CheckCircle2 size={40} className="text-[var(--accent-gray)]" />
                </div>
                <h2 className="text-3xl font-extrabold text-[var(--text-main)] mb-4">Payment Pending</h2>
                <p className="text-[var(--text-muted)] mb-8 leading-relaxed">
                  Your proof of payment has been uploaded successfully. The seller will review and verify your payment shortly to generate your receipt.
                </p>
                <button 
                  onClick={() => { setIsProofModalOpen(false); setCheckoutStep(4); setOrderReceipt({ id: proofOrderId, seller: { store: proofSellerBank } }); }}
                  className="w-full py-4 bg-[var(--accent-gray)] text-[var(--bg-primary)] font-bold text-lg rounded-xl hover:opacity-90 transition shadow-[0_0_20px_var(--accent-gray-dim)] hover-3d"
                >
                  Continue to Orders
                </button>
              </div>
            ) : (
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-[var(--accent-gray-dim)] rounded-lg">
                    <ShieldCheck size={28} className="text-[var(--accent-gray)]" />
                  </div>
                  <h2 className="text-2xl font-bold text-[var(--text-main)]">Direct Transfer Details</h2>
                </div>

                <div className="bg-[var(--bg-tertiary)] border border-[var(--accent-gray)] rounded-xl p-6 mb-6 font-mono text-[var(--text-main)]">
                  <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Amount to Pay</p>
                  <p className="text-2xl font-extrabold tracking-widest text-[var(--accent-gray)] mb-6"> ₦{proofTotal.toFixed(2)}</p>
                  
                  <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Bank Name</p>
                  <p className="text-lg font-bold mb-4">{proofSellerBank?.bankName || 'Not Provided'}</p>
                  
                  <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Account Number</p>
                  <p className="text-2xl font-extrabold tracking-widest text-[var(--accent-gray)] mb-4">{proofSellerBank?.accountNumber || 'N/A'}</p>
                  
                  <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Account Name</p>
                  <p className="text-lg font-bold">{proofSellerBank?.accountName || 'N/A'}</p>
                  
                  {proofSellerBank?.routingNumber && (
                    <>
                      <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-4 mb-1">Routing Number</p>
                      <p className="text-lg font-bold">{proofSellerBank.routingNumber}</p>
                    </>
                  )}
                </div>

                <div className="space-y-4 mb-8">
                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-2">Upload Payment Receipt</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => setProofFile(e.target.files[0])}
                      className="w-full bg-[var(--bg-tertiary)] border border-[var(--accent-gray)] rounded-lg p-3 text-[var(--text-main)] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[var(--accent-gray)] file:text-[var(--bg-primary)] hover:file:opacity-90"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-2">Transaction Reference / Memo</label>
                    <input 
                      type="text" 
                      value={proofTransactionRef}
                      onChange={(e) => setProofTransactionRef(e.target.value)}
                      placeholder="E.g., TRF-2026-XYZ"
                      className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-[var(--accent-gray)] outline-none rounded-lg p-4 text-[var(--text-main)] bg-[var(--bg-tertiary)] placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-2">Delivery / Pickup Address</label>
                    <textarea 
                      value={proofDeliveryAddress}
                      onChange={(e) => setProofDeliveryAddress(e.target.value)}
                      placeholder="Provide your exact delivery address, or specify your pickup location."
                      className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-[var(--accent-gray)] outline-none rounded-lg p-4 text-[var(--text-main)] bg-[var(--bg-tertiary)] placeholder-gray-500 resize-none h-24"
                    ></textarea>
                  </div>
                </div>

                <button 
                  onClick={handleUploadProof}
                  disabled={isUploadingProof || !proofFile || !proofTransactionRef || !proofDeliveryAddress}
                  className="w-full py-4 bg-[var(--accent-gray)] text-[var(--bg-primary)] font-bold text-lg rounded-xl hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_var(--accent-gray-dim)] hover-3d mb-4"
                >
                  Submit Payment Proof
                </button>

                {isUploadingProof && (
                  <div className="absolute inset-0 bg-[#050505]/80 backdrop-blur-md flex flex-col items-center justify-center z-50 rounded-2xl">
                    <div className="relative w-24 h-24 mb-6">
                      <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[var(--accent-gray)] border-r-[var(--accent-gray)] animate-spin"></div>
                      <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-white border-l-white animate-[spin_1.5s_linear_infinite_reverse]"></div>
                      <div className="absolute inset-0 flex items-center justify-center text-3xl drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] animate-bounce">
                        {loadingStep === 1 && '🧮'}
                        {loadingStep === 2 && '🔎'}
                        {loadingStep === 3 && '🚀'}
                      </div>
                    </div>
                    <div className="text-xl font-bold text-[var(--text-main)] mb-2">
                      {loadingStep === 1 && 'Calculating Total Price...'}
                      {loadingStep === 2 && 'Checking Proof...'}
                      {loadingStep === 3 && 'Finalizing Payment...'}
                    </div>
                    <div className="text-sm text-[var(--text-muted)] animate-pulse">
                      Please do not close this window
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}


    </div>
  );
};

export default Cart;
