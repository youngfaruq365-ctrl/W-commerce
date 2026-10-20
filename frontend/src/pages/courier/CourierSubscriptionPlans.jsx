import React, { useState, useEffect } from 'react';
import { Check, Loader2, Star } from 'lucide-react';
import { apiClient as axios } from '@/utils/apiClient';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { celebrate } from '../../components/visual/CelebrationController';
import rcLogo from '../../assets/rc-logo.png';

const CourierSubscriptionPlans = () => {
  const [loading, setLoading] = useState(false);
  const [subscribingId, setSubscribingId] = useState(null);
  
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const currentTier = user?.subscriptionTier?.toUpperCase() || 'FREE';

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference') || params.get('trxref') || params.get('rc_redirect');
    
    if (reference) {
      const verifyPayment = async () => {
        try {
          const verifyRef = reference === 'true' ? 'revenuecat' : reference;
          const res = await axios.get('/api/v1/courier-plans/verify-payment/' + verifyRef);
          if (res.data.success) {
            celebrate('major');
            toast.success('Subscription upgraded successfully!');
            await useAuthStore.getState().checkAuth(); // Refresh user state
            navigate('/courier/subscription', { replace: true });
          }
        } catch (error) {
          toast.error(error.response?.data?.message || 'Payment verification failed');
          navigate('/courier/subscription', { replace: true });
        }
      };
      verifyPayment();
    }
  }, [navigate]);

  const handleSubscribe = async (planName, planId) => {
    if (currentTier === planName.toUpperCase() || currentTier === 'COURIER_PRO') {
      toast('You are already on this plan!', { icon: 'ℹ️' });
      return;
    }
    
    setSubscribingId(planId || planName);
    try {
      const res = await axios.post('/api/v1/courier-plans/initiate-payment', { 
        planName,
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

  const defaultPlans = [
    {
      name: 'Free',
      subtitle: 'Basic dispatch access',
      price: 0,
      displayPrice: '₦0',
      features: ['Access public delivery queue', 'Standard routing', 'Standard earnings rate', 'Basic support'],
      buttonText: 'Continue Free',
      cardStyle: 'bg-white/5 border-white/10 text-white',
      buttonStyle: 'bg-white/5 border border-white/10 text-white hover:bg-white/10',
    },
    {
      name: 'Courier Pro',
      subtitle: 'Maximize your earnings',
      price: 4500, 
      displayPrice: '₦4,500',
      features: ['Priority dispatch matching', 'Advanced route optimization', 'Higher earnings rate (0% commission)', 'Premium support', 'Auto-accept filters'],
      buttonText: 'Upgrade to Pro',
      cardStyle: 'bg-white/10 border-white/30 text-white shadow-[0_0_30px_rgba(255,255,255,0.1)] scale-[1.02] relative z-10',
      buttonStyle: 'bg-white text-black hover:bg-gray-200 shadow-[0_0_15px_rgba(255,255,255,0.5)]',
      isPopular: true,
    }
  ];

  const plansToDisplay = defaultPlans.map(dp => {
    const isCurrentPlan = 
        (dp.name === 'Free' && currentTier !== 'COURIER_PRO') || 
        (dp.name === 'Courier Pro' && currentTier === 'COURIER_PRO');
    
    return {
      ...dp,
      id: dp.name,
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
        <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-8 border border-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative overflow-hidden">
          <div className="max-w-xl z-10">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-3 py-1 mb-6 text-[10px] font-bold tracking-wider text-gray-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              COURIER SUBSCRIPTION
            </div>
            
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight leading-tight">Upgrade Your<br/>Delivery Game</h1>
            <p className="text-gray-400 text-lg leading-relaxed max-w-md">
              Unlock priority dispatch, smart routing, and keep 100% of your earnings with the Pro plan for just $3/month.
            </p>
          </div>
          
          <div className="w-full md:w-auto z-10">
            <div className="bg-black/50 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Star size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-bold mb-1">Current Tier</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                      {currentTier === 'COURIER_PRO' ? 'PRO' : 'FREE'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Secured by Paystack</span>
                <span className="text-xs text-emerald-400 font-bold">💳 Instant Payment</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 items-center justify-center max-w-4xl mx-auto pt-8">
          {plansToDisplay.map((plan, index) => {
            const isCurrentPlan = 
                (plan.name === 'Free' && currentTier !== 'COURIER_PRO') || 
                (plan.name === 'Courier Pro' && currentTier === 'COURIER_PRO');
                
            return (
              <div 
                key={index}
                className={`rounded-3xl p-8 border backdrop-blur-xl transition-all duration-300 ${plan.cardStyle}`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-1 rounded-full text-xs font-bold tracking-wider uppercase shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                    Most Popular
                  </div>
                )}
                
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-gray-400 text-sm mb-6 h-10">{plan.subtitle}</p>
                
                <div className="mb-8">
                  <span className="text-4xl font-black">{plan.displayPrice}</span>
                  <span className="text-gray-400">/month</span>
                </div>
                
                <button
                  disabled={isCurrentPlan || subscribingId === plan.id}
                  onClick={() => handleSubscribe(plan.name, plan.id)}
                  className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${plan.buttonStyle} ${isCurrentPlan ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'}`}
                >
                  {subscribingId === plan.id ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                  ) : (
                    plan.buttonText
                  )}
                </button>
                
                <div className="mt-8 space-y-4">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="mt-0.5 bg-white/10 rounded-full p-1 text-emerald-400">
                        <Check size={12} strokeWidth={3} />
                      </div>
                      <span className="text-sm text-gray-300 leading-tight">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default CourierSubscriptionPlans;
