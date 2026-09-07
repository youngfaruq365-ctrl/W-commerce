import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePreview } from '../commerce/PreviewContext';
import { CheckCircle, ShoppingBag, Sparkles } from 'lucide-react';

const ParticlesBurst = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {Array(12).fill(null).map((_, i) => (
      <motion.div key={i} className="absolute w-2 h-2 rounded-full bg-[var(--s-primary,#000)]"
        style={{ left: '50%', top: '50%' }}
        initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
        animate={{ scale: [0, 1, 0], x: Math.cos((i / 12) * Math.PI * 2) * 80, y: Math.sin((i / 12) * Math.PI * 2) * 80, opacity: [1, 1, 0] }}
        transition={{ duration: 0.8, delay: i * 0.03 }} />
    ))}
  </div>
);

const ConfettiPieces = () => {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array(30).fill(null).map((_, i) => (
        <motion.div key={i} className="absolute w-2 h-2 rounded-sm"
          style={{ left: `${Math.random() * 100}%`, top: '-10px', backgroundColor: colors[i % colors.length] }}
          initial={{ y: 0, rotate: 0, opacity: 1 }}
          animate={{ y: '110vh', rotate: Math.random() * 720 - 360, opacity: [1, 1, 0] }}
          transition={{ duration: Math.random() * 2 + 1.5, delay: Math.random() * 0.5, ease: 'easeIn' }} />
      ))}
    </div>
  );
};

const SubtleSuccess = ({ event }) => (
  <motion.div initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }}
    className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-2xl px-5 py-4 shadow-xl z-[200] flex items-center gap-3">
    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center"><CheckCircle size={16} className="text-green-600" /></div>
    <div>
      <div className="font-bold text-sm">
        {event.type === 'ADD_TO_CART' ? `Added to cart!` : event.type === 'WISHLIST_SUCCESS' ? 'Added to wishlist' : 'Done!'}
      </div>
      {event.product && <div className="text-xs text-gray-500 truncate max-w-[160px]">{event.product.name}</div>}
    </div>
  </motion.div>
);

const ConfettiSuccess = ({ event }) => (
  <>
    <ConfettiPieces />
    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white border border-gray-100 rounded-2xl px-6 py-5 shadow-2xl z-[200] flex items-center gap-4">
      <div className="text-3xl">🎉</div>
      <div>
        <div className="font-black text-lg">
          {event.type === 'ORDER_SUCCESS' ? 'Order placed!' : 'Added to cart!'}
        </div>
        <div className="text-sm text-gray-500">Great choice! Your cart is updated.</div>
      </div>
    </motion.div>
  </>
);

const BrandedSuccess = ({ event }) => (
  <>
    <ConfettiPieces />
    <ParticlesBurst />
    <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 60 }}
      transition={{ type: 'spring', damping: 20 }}
      className="fixed inset-x-4 bottom-6 md:inset-auto md:bottom-8 md:left-1/2 md:-translate-x-1/2 md:w-[440px] bg-[var(--s-primary,#000)] text-[var(--s-bg,#fff)] rounded-3xl px-8 py-6 shadow-2xl z-[200]">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center"><Sparkles size={20} /></div>
        <div>
          <div className="font-black text-xl">
            {event.type === 'ORDER_SUCCESS' ? 'Order Confirmed!' : event.type === 'BOOKING_SUCCESS' ? 'Booking Confirmed!' : 'Done!'}
          </div>
          <div className="text-sm opacity-80">Your experience just got better.</div>
        </div>
      </div>
    </motion.div>
  </>
);

const CinematicSuccess = ({ event }) => (
  <>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 z-[199] backdrop-blur-md" />
    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }}
      transition={{ type: 'spring', damping: 20 }}
      className="fixed inset-0 flex items-center justify-center z-[200] pointer-events-none">
      <div className="text-center text-white">
        <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 1.2, 1] }} transition={{ delay: 0.2, duration: 0.5 }}
          className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-white" />
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="text-4xl font-black mb-3">
          {event.type === 'ORDER_SUCCESS' ? 'Order Complete' : event.type === 'BOOKING_SUCCESS' ? 'Booking Confirmed' : 'Success'}
        </motion.h2>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          className="opacity-60 text-lg">Thank you for your experience with us.</motion.p>
      </div>
    </motion.div>
  </>
);

const CELEBRATION_MAP = {
  subtle:         SubtleSuccess,
  confetti:       ConfettiSuccess,
  'confetti-card': ConfettiSuccess,
  branded:        BrandedSuccess,
  cinematic:      CinematicSuccess,
};

export const CelebrationEngine = ({ celebrationStyle = 'subtle' }) => {
  const { celebration } = usePreview();
  const Component = CELEBRATION_MAP[celebrationStyle] || SubtleSuccess;
  return (
    <AnimatePresence>
      {celebration && <Component key={celebration.type + Date.now()} event={celebration} />}
    </AnimatePresence>
  );
};
