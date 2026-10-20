import React, { useState, useEffect, useRef } from 'react';
import { Check, Loader2, X, Star, TrendingUp, BarChart2, Zap, Shield, ShoppingBag, Layout, Activity } from 'lucide-react';
import { apiClient as axios } from '@/utils/apiClient';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { celebrate } from '../visual/CelebrationController';
import { PlanBook } from './PlanBook';

const SubscriptionPlans = () => {
  const [loading, setLoading] = useState(true);
  const [subscribingId, setSubscribingId] = useState(null);
  const [dbPlans, setDbPlans] = useState([]);
  const [isBookClosed, setIsBookClosed] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const currentTier = user?.subscriptionTier?.toUpperCase() || 'FREE';
  // Normalize tier for comparison with plan names
  const planTier = currentTier === 'FREE' || currentTier === 'NONE' ? 'BASIC' : currentTier;

  // Human-readable display of current tier
  const tierDisplayName = {
    'FREE': 'Basic', 'NONE': 'Basic', 'BASIC': 'Basic',
    'PRO': 'Pro', 'ULTRA': 'Ultra', 'PREMIUM': 'Premium', 'TRIAL': 'Trial'
  }[currentTier] || currentTier;
  const verifiedRef = useRef(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await axios.get('/api/v1/seller-plans');
        if (res.data.success && res.data.plans?.length > 0) {
          setDbPlans(res.data.plans);
        }
      } catch (error) {
        // Error handled silently
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference') || params.get('trxref') || params.get('rc_redirect');
    
    if (reference && verifiedRef.current !== reference) {
      verifiedRef.current = reference;
      const verifyPayment = async (attempts = 0) => {
        const loadingToast = toast.loading('Verifying your payment...');
        try {
          const verifyRef = reference === 'true' ? 'revenuecat' : reference;
          const res = await axios.get('/api/v1/seller-plans/verify-payment/' + verifyRef);
          toast.dismiss(loadingToast);
          if (res.data.success) {
            const upgradedTier = res.data.planTier || 'new plan';
            // Force fresh user data from server
            await useAuthStore.getState().checkAuth();
            celebrate('major');
            toast.success(`🎉 Upgraded to ${upgradedTier} successfully!`, { duration: 4000 });
            setIsBookClosed(true);
            // Replace URL to remove reference params, then reload to reflect new tier
            navigate('/seller/subscription', { replace: true });
          } else {
            toast.error('Payment could not be verified. Please contact support.');
            navigate('/seller/subscription', { replace: true });
          }
        } catch (error) {
          toast.dismiss(loadingToast);
          if (reference === 'true' && attempts < 2) {
            // RevenueCat Web Billing takes a moment to sync, retry
            setTimeout(() => verifyPayment(attempts + 1), 2000);
            return;
          }
          toast.error(error.response?.data?.message || 'Payment verification failed. Please try again.');
          navigate('/seller/subscription', { replace: true });
        }
      };

      if (reference === 'true') {
        setTimeout(() => verifyPayment(0), 1500);
      } else {
        verifyPayment(0);
      }
    }
  }, [navigate]);

  const handleSubscribe = async (planName, planId) => {
    if (planTier === planName.toUpperCase()) {
      toast('You are already on this plan!', { icon: 'ℹ️' });
      return;
    }
    
    setSubscribingId(planId || planName);
    const loadingToast = toast.loading(`Assigning ${planName} plan...`);
    try {
      // Direct upgrade endpoint assigns plan immediately in DB without requiring any payment
      const res = await axios.post('/api/v1/seller-plans/direct-upgrade', { planName });
      toast.dismiss(loadingToast);
      if (res.data?.success) {
        // Refresh user state immediately from backend
        await useAuthStore.getState().checkAuth();
        celebrate('major');
        toast.success(`🎉 You are now on the ${planName} plan!`, { duration: 4000 });
        setIsBookClosed(true);
        // Automatically reopen after brief celebration animation so user can explore
        setTimeout(() => {
          setIsBookClosed(false);
        }, 3500);
      } else {
        toast.error(res.data?.message || 'Failed to assign plan');
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(error.response?.data?.message || 'Failed to assign plan');
    } finally {
      setSubscribingId(null);
    }
  };

  const defaultPlans = [
    {
      name: 'Basic',
      subtitle: 'Perfect for getting started',
      price: 0,
      displayPrice: '₦0',
      features: ['Create your store', 'Add up to 10 products', 'Receive and manage orders', 'Basic analytics', 'Standard support'],
      buttonText: 'Continue Basic',
      cardStyle: 'bg-white/10 backdrop-blur-[24px] border-white/10 text-white shadow-[0_0_5px_#ffffff]',
      buttonStyle: 'bg-white/5 border border-white/10 text-white hover:bg-white/10',
    },
    {
      name: 'Pro',
      subtitle: 'For growing businesses',
      price: 1500,
      displayPrice: '₦1,500',
      features: ['Unlimited products', 'Advanced analytics', 'Flash sales & promotions', 'Custom store branding', 'Priority support'],
      buttonText: 'Start Pro Plan',
      cardStyle: 'bg-white/10 backdrop-blur-[24px] border-white/30 text-white shadow-[0_0_10px_#ffffff] scale-[1.02] relative z-10',
      buttonStyle: 'bg-white text-black hover:bg-gray-200 shadow-[0_0_5px_#ffffff]',
    },
    {
      name: 'Premium',
      subtitle: 'For growing businesses & enterprises',
      price: 3500,
      displayPrice: '₦3,500',
      features: ['Unlimited products', 'Advanced analytics', 'Flash sales & promotions', 'Custom store branding', 'AI product recommendations', 'Premium portfolio & design', 'Dedicated account manager', 'Priority support'],
      buttonText: 'Start Premium Plan',
      cardStyle: 'bg-white/10 backdrop-blur-[24px] border-white/30 text-white shadow-[0_0_10px_#ffffff] scale-[1.02] relative z-10',
      buttonStyle: 'bg-white text-black hover:bg-gray-200 shadow-[0_0_5px_#ffffff]',
      isPopular: true,
    }
  ];

  const plansToDisplay = defaultPlans.map(dp => {
    const dbMatch = dbPlans.find(db => db?.name?.toLowerCase() === dp.name.toLowerCase());
    const isCurrentPlan = planTier === dp.name.toUpperCase();
    const rawPrice = dbMatch?.monthlyPriceGong != null ? Number(dbMatch.monthlyPriceGong) : dp.price;
    const formattedPrice = rawPrice === 0 ? '₦0' : `₦${rawPrice.toLocaleString()}`;
    
    return {
      ...dp,
      id: dbMatch?.id || dp.name,
      displayPrice: formattedPrice,
      buttonText: isCurrentPlan ? 'Current Plan' : dp.buttonText,
    };
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white py-12 px-4 md:px-8 font-sans overflow-x-hidden relative">
      {/* Background gradients */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
      </div>

      <div className="max-w-6xl mx-auto relative z-10 space-y-8">
        
        {/* Header Section */}
        <div className="bg-white/10 backdrop-blur-[24px] rounded-3xl p-8 border border-white/10 shadow-[0_0_5px_#ffffff] flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative overflow-hidden">
          <div className="max-w-xl z-10">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 mb-6 text-[10px] font-bold tracking-wider text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              PAYSTACK SECURED
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight leading-tight">Choose Your<br/>Subscription Plan</h1>
            <p className="text-gray-400 text-sm md:text-base max-w-sm">Unlock premium features and take your W-Commerce experience to the next level.</p>
          </div>

          <div className="flex gap-4 md:gap-6 flex-wrap z-10">
            {[
              { icon: TrendingUp, label: 'More Products & Sales' },
              { icon: BarChart2, label: 'Advanced Analytics' },
              { icon: Zap, label: 'AI Tools & Automation' },
              { icon: Shield, label: 'Priority Support' },
            ].map((feat, i) => (
              <div key={i} className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <feat.icon className="w-5 h-5 text-gray-300" />
                </div>
                <span className="text-[10px] text-gray-400 text-center font-medium max-w-[70px] leading-tight">{feat.label}</span>
              </div>
            ))}
          </div>

          <Star className="absolute right-[-20px] top-[-20px] w-64 h-64 text-white/5 rotate-12 blur-sm pointer-events-none" strokeWidth={1} />
        </div>

        {/* Pricing Cards - Replaced by PlanBook */}
        <div style={{ padding: '2rem 0' }}>
          <PlanBook 
            plans={plansToDisplay} 
            currentTier={planTier}
            onSubscribe={handleSubscribe}
            subscribingId={subscribingId}
            isClosed={isBookClosed}
            isManualMode={isManualMode}
            onOpenManual={() => { setIsBookClosed(false); setIsManualMode(true); }}
            onCloseManual={() => { setIsBookClosed(false); setIsManualMode(false); }}
            onReopenBook={() => { setIsBookClosed(false); setIsManualMode(false); }}
          />
        </div>

        {/* Current Plan & Manage Section */}
        <div className="bg-white/10 backdrop-blur-[24px] shadow-[0_0_5px_#ffffff] border border-white/10 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5 w-full md:w-auto">
            <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.1)]">
              <Star className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium mb-1">Your Current Plan</p>
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-bold">{tierDisplayName}</h3>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Active
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-2">You're on the {tierDisplayName} plan. {planTier === 'PREMIUM' ? 'You have our best plan!' : 'Upgrade to unlock more features and grow your business faster.'}</p>
            </div>
          </div>
          <div className="w-full md:w-[280px] bg-white/5 rounded-2xl p-5 border border-white/10">
            <h4 className="text-sm font-bold mb-2">Manage Subscription</h4>
            <p className="text-xs text-gray-400 mb-4">View your billing details, change plan or cancel anytime.</p>
            <button className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-colors">
              Manage Plan
            </button>
          </div>
        </div>

        {/* Feature Comparison Table */}
        <div className="bg-white/10 backdrop-blur-[24px] shadow-[0_0_5px_#ffffff] border border-white/10 rounded-3xl p-6 md:p-8 overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr className="border-b border-white/10">
                <th className="pb-4 text-sm font-medium text-gray-400 w-[40%]">Feature Comparison</th>
                <th className="pb-4 text-sm font-medium text-gray-400 w-[20%] text-center">Basic</th>
                <th className="pb-4 text-sm font-medium text-gray-400 w-[20%] text-center">Pro</th>
                <th className="pb-4 text-sm font-medium text-gray-400 w-[20%] text-center">Premium</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-300">
              {[
                { name: 'Storefront & Products', icon: ShoppingBag, basic: '10 products', pro: 'Unlimited', premium: 'Unlimited' },
                { name: 'Advanced Analytics', icon: Activity, basic: 'Basic', pro: 'Advanced', premium: 'Full AI + Insights' },
                { name: 'Flash Sales & Promotions', icon: Zap, basic: false, pro: true, premium: true },
                { name: 'AI Tools', icon: TrendingUp, basic: false, pro: false, premium: true },
                { name: 'Priority Support', icon: Shield, basic: 'Basic', pro: 'Premium', premium: 'VIP' },
                { name: 'Custom Branding', icon: Layout, basic: false, pro: true, premium: true },
              ].map((row, i) => (
                <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                  <td className="py-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                      <row.icon className="w-4 h-4 text-gray-400" />
                    </div>
                    <span className="font-medium">{row.name}</span>
                  </td>
                  <td className="py-4 text-center">
                    {typeof row.basic === 'boolean' ? (row.basic ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-gray-600 mx-auto" />) : <span className="text-gray-400">{row.basic}</span>}
                  </td>
                  <td className="py-4 text-center">
                    {typeof row.pro === 'boolean' ? (row.pro ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-gray-600 mx-auto" />) : <span className={row.pro === 'Unlimited' ? 'text-emerald-500' : 'text-gray-300'}>{row.pro}</span>}
                  </td>
                  <td className="py-4 text-center">
                    {typeof row.premium === 'boolean' ? (row.premium ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-gray-600 mx-auto" />) : <span className="text-gray-300">{row.premium}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-4 text-xs text-gray-500 pt-4 pb-8">
          <span className="flex items-center gap-1.5">
            Powered by <span className="font-bold text-gray-400 tracking-wide">RevenueCat</span>
          </span>
          <span>•</span>
          <span>Secure • Simple • Reliable</span>
        </div>

      </div>
    </div>
  );
};

export default SubscriptionPlans;
