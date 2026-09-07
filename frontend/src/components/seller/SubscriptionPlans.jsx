import React, { useState, useEffect } from 'react';
import { Check, Loader2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { celebrate } from '../visual/CelebrationController';

const SubscriptionPlans = () => {
  const [isYearly, setIsYearly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscribingId, setSubscribingId] = useState(null);
  const [dbPlans, setDbPlans] = useState([]);
  
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const currentTier = user?.subscriptionTier?.toUpperCase() || 'FREE';

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
    const reference = params.get('reference') || params.get('trxref');
    
    if (reference) {
      const verifyPayment = async () => {
        try {
          const res = await axios.get('/api/v1/seller-plans/verify-payment/' + reference);
          if (res.data.success) {
            celebrate('major');
            toast.success('Payment verified successfully!');
            await useAuthStore.getState().checkAuth(); // Refresh user state
            navigate('/seller/subscription', { replace: true });
          }
        } catch (error) {
          toast.error(error.response?.data?.message || 'Payment verification failed');
          navigate('/seller/subscription', { replace: true });
        }
      };
      verifyPayment();
    }
  }, [navigate]);

  const handleSubscribe = async (planName, planId) => {
    if (currentTier === planName.toUpperCase()) {
      toast('You are already on this plan!', { icon: 'ℹ️' });
      return;
    }
    
    setSubscribingId(planId || planName);
    try {
      const res = await axios.post('/api/v1/seller-plans/initiate-payment', { 
        planId, 
        planName,
        isYearly, 
        callback_url: window.location.href 
      });
      if (res.data.success && res.data.authorization_url) {
        window.location.href = res.data.authorization_url;
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to subscribe to plan');
    } finally {
      setSubscribingId(null);
    }
  };

  // Fallback plans if database is empty
  const defaultPlans = [
    {
      name: 'Free',
      price: 0,
      description: 'Strict limits for basic users',
      features: ['20 products (Strict limit)', 'No portfolio switching', 'Basic analytics', 'Standard store', 'Community support'],
      buttonText: 'Get Started',
      buttonStyle: 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600',
      cardStyle: 'card border-transparent bg-white/90 dark:bg-slate-800/50',
      isPopular: false,
    },
    {
      name: 'Pro',
      price: isYearly ? 10000 : 1500,
      priceSubtext: isYearly ? null : 'First month ₦1,500 (~$1), then ₦3,000 (~$2)/month',
      description: 'Everything you need to grow',
      features: ['Unlimited products', 'Portfolio choice switching', 'Access to all features', 'Advanced analytics', 'AI product tools', 'Priority support'],
      buttonText: 'Start Pro Trial',
      buttonStyle: 'bg-[#1976d2] text-white hover:bg-[#1565c0]',
      cardStyle: 'card border-2 border-[#1976d2] bg-white/90 dark:bg-slate-800/50',
      isPopular: true,
    }
  ];

  // Always show all 7 tiers. If DB has matching plans, enrich the defaults with DB data (id, description, features).
  const plansToDisplay = defaultPlans.map(dp => {
    const dbMatch = dbPlans.find(db => db.name.toLowerCase() === dp.name.toLowerCase());
    const isCurrentPlan = currentTier === dp.name.toUpperCase() || currentTier === dp.name.replace(/\s+/g, '').toUpperCase();
    
    return {
      ...dp,
      id: dbMatch?.id || dp.name,
      description: dbMatch?.description || dp.description,
      features: (dbMatch?.features && dbMatch.features.length > 0) ? dbMatch.features : dp.features,
      buttonText: isCurrentPlan ? 'Current Plan' : dp.buttonText,
    };
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1c] flex items-center justify-center transition-colors duration-300">
        <Loader2 className="w-10 h-10 text-slate-900 dark:text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1c] py-20 px-4 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-3 transition-colors">Choose the perfect plan</h1>
          <p className="text-slate-600 dark:text-slate-400 transition-colors">Upgrade anytime. Cancel anytime.</p>
          
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className={`text-sm font-medium transition-colors ${!isYearly ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Monthly</span>
            <button 
              onClick={() => setIsYearly(!isYearly)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isYearly ? 'bg-green-600' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isYearly ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className={`text-sm font-medium transition-colors ${isYearly ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Yearly (Save 20%)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 max-w-7xl mx-auto">
          {plansToDisplay.map((plan, index) => {
            const isCurrentPlan = currentTier === plan.name.toUpperCase();
            
            return (
              <div 
                key={index} 
                className={`rounded-2xl p-6 sm:p-8 flex flex-col relative ${plan.cardStyle}`}
              >
                {plan.isPopular && (
                  <div className="absolute top-4 right-4 bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                    MOST POPULAR
                  </div>
                )}
                {plan.isBest && (
                  <div className="absolute top-4 right-4 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                    BEST VALUE
                  </div>
                )}
                
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 transition-colors">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-slate-900 dark:text-white transition-colors">₦{plan.price.toLocaleString()}</span>
                    <span className="text-slate-500 dark:text-slate-400 font-medium text-sm transition-colors">/ {isYearly ? 'year' : 'month'}</span>
                  </div>
                  {plan.priceSubtext && <p className="text-sm font-bold text-[#e91e63] mt-2">{plan.priceSubtext}</p>}
                  <p className="text-slate-600 dark:text-slate-400 text-sm mt-4 transition-colors">{plan.description}</p>
                </div>

                <div className="flex-1 space-y-4 mb-8">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full bg-green-100 dark:bg-green-900/30 p-0.5">
                        <Check className="text-green-600 dark:text-green-400" size={14} strokeWidth={3} />
                      </div>
                      <span className="text-slate-700 dark:text-slate-300 text-sm transition-colors">{feature}</span>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => handleSubscribe(plan.name, plan.id)}
                  disabled={isCurrentPlan || subscribingId === (plan.id || plan.name)}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2
                    ${isCurrentPlan ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : plan.buttonStyle}
                    ${subscribingId === (plan.id || plan.name) ? 'opacity-75 cursor-wait' : ''}`}
                >
                  {subscribingId === (plan.id || plan.name) && <Loader2 size={16} className="animate-spin" />}
                  {isCurrentPlan ? 'Current Plan' : plan.buttonText}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-slate-500 dark:text-slate-400 text-sm mt-8 transition-colors">
          7-day free trial • No credit card required
        </p>
      </div>
    </div>
  );
};

export default SubscriptionPlans;
