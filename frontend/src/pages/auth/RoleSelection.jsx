import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { ROUTES } from '../../constants/routes';
import { WIcon } from '../../components/visual/WIcon';
import { apiClient as axios } from '../../utils/apiClient';
import { motion, AnimatePresence } from 'framer-motion';

const RoleSelection = () => {
  const [role, setRole] = useState(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role && user.role !== 'PENDING') {
      if (user.role === 'ADMIN') navigate(ROUTES.ADMIN_DASHBOARD);
      else if (user.role === 'SELLER') navigate(ROUTES.SELLER_DASHBOARD);
      else if (user.role === 'COURIER') navigate(ROUTES.COURIER_DASHBOARD);
      else navigate(ROUTES.BUYER_DASHBOARD);
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!role) {
      setError('Please select a role to continue.');
      return;
    }
    setError('');
    setIsSubmitting(true);

    try {
      const response = await axios.post('/api/v1/auth/set-role', { role });
      if (response.data.success) {
        if (response.data.token) localStorage.setItem('token', response.data.token);
        setUser(response.data.user);
        if (response.data.user.role === 'SELLER') {
          window.location.href = ROUTES.SELLER_DASHBOARD;
        } else if (response.data.user.role === 'COURIER') {
          window.location.href = ROUTES.COURIER_DASHBOARD;
        } else {
          window.location.href = ROUTES.BUYER_DASHBOARD;
        }
      } else {
        setError(response.data.message || 'Failed to set role.');
        setIsSubmitting(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to set role. Please try again.');
      setIsSubmitting(false);
    }
  };

  const OptionCard = ({ type, icon, title, description }) => {
    const isSelected = role === type;
    
    return (
      <motion.button
        type="button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          setRole(type);
          setError('');
        }}
        className={`relative w-full text-left p-6 rounded-2xl flex items-start gap-4 transition-all duration-300 overflow-hidden ${
          isSelected 
            ? 'bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-2 border-indigo-500'
            : 'bg-white/5 border-2 border-white/10 hover:border-white/30 hover:bg-white/10'
        }`}
      >
        {/* Glow effect when selected */}
        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10"
            />
          )}
        </AnimatePresence>

        <div className={`flex items-center justify-center w-12 h-12 rounded-xl shrink-0 z-10 ${
          isSelected ? 'bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.5)]' : 'bg-white/10 text-gray-300'
        }`}>
          <WIcon name={icon} size={24} />
        </div>
        
        <div className="z-10">
          <h3 className={`font-semibold text-lg mb-1 ${isSelected ? 'text-white' : 'text-gray-200'}`}>
            {title}
          </h3>
          <p className={`text-sm leading-relaxed ${isSelected ? 'text-indigo-200' : 'text-gray-400'}`}>
            {description}
          </p>
        </div>

        {/* Checkmark indicator */}
        <div className={`absolute top-6 right-6 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
          isSelected ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-gray-500/50'
        }`}>
          {isSelected && <WIcon name="check" size={14} />}
        </div>
      </motion.button>
    );
  };

  return (
    <div className="min-h-screen bg-[#0F172A] relative flex items-center justify-center p-4 overflow-hidden">
      {/* Glowing background elements (Removed per request) */}
      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[500px] relative z-10"
      >
        <div className="bg-[#1E293B]/80 backdrop-blur-2xl border border-white/10 p-8 sm:p-10 rounded-[2rem] shadow-2xl">
          
          <div className="text-center mb-8">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
              className="w-16 h-16 mx-auto bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mb-6 shadow-xl"
            >
              <WIcon name="globe" size={32} className="text-white" />
            </motion.div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">Choose Your Path</h1>
            <p className="text-gray-400">
              You're signed in to GLOBAL-X. Please specify how you intend to use the platform to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            <OptionCard 
              type="BUYER"
              icon="shopping-bag"
              title="I am a Buyer"
              description="Discover unique products from around the world and shop securely."
            />
            
            <OptionCard 
              type="SELLER"
              icon="store"
              title="I am a Seller"
              description="Set up your global storefront and reach millions of customers."
            />

            <OptionCard 
              type="COURIER"
              icon="truck"
              title="I am a Courier"
              description="Join our global fleet and deliver orders to customers worldwide."
            />

            <AnimatePresence mode="popLayout">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm flex items-start gap-3 mt-6"
                >
                  <WIcon name="alert-circle" size={18} className="shrink-0 mt-0.5" />
                  <p>{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div 
              className="pt-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <button 
                type="submit" 
                disabled={isSubmitting || !role} 
                className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all duration-300 ${
                  isSubmitting || !role
                    ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                    : 'bg-white text-gray-900 hover:bg-gray-100 shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(255,255,255,0.3)]'
                }`}
              >
                {isSubmitting ? (
                  <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Continue to Dashboard
                    <WIcon name="arrow-right" size={20} />
                  </>
                )}
              </button>
            </motion.div>
            
          </form>
        </div>
        
        {/* Footer info */}
        <p className="text-center text-gray-500 text-xs mt-6 px-4">
          By continuing, you agree to GLOBAL-X's Privacy Policy and Terms of Service.
        </p>
      </motion.div>
    </div>
  );
};

export default RoleSelection;
