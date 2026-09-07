import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import SVGAnimator from '../animations/SVGAnimator';
import { CheckCircle2, ShieldCheck, Gift, UploadCloud } from 'lucide-react';
import { useSound } from '../../utils/soundManager';

export const GenericSuccessState = ({ icon: Icon = CheckCircle2, title, description, color = "text-green-500", onAction, actionLabel }) => {
  const { playSound } = useSound();
  
  useEffect(() => {
    playSound('success');
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-8 w-full min-h-[300px] text-center">
      <div className={`w-24 h-24 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-6`}>
        <SVGAnimator strokeColor="currentColor" className={color}>
          <Icon className="w-12 h-12" />
        </SVGAnimator>
      </div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <h3 className="text-2xl font-bold text-[var(--text-main)] mb-2">{title}</h3>
        <p className="text-[var(--text-muted)] max-w-sm mb-6">{description}</p>
        {actionLabel && onAction && (
          <button 
            onClick={onAction}
            className="px-8 py-3 bg-[var(--accent-gray)] text-black font-bold rounded-xl hover:opacity-90 transition-opacity"
          >
            {actionLabel}
          </button>
        )}
      </motion.div>
    </div>
  );
};

export const PaymentSuccessState = ({ amount, onAction }) => (
  <GenericSuccessState
    title="Payment Successful!"
    description={`Your payment ${amount ? `of ${amount}` : ''} has been processed successfully. Thank you for your purchase.`}
    actionLabel="View Receipt"
    onAction={onAction}
  />
);

export const OrderCompletedState = ({ orderId, onAction }) => (
  <GenericSuccessState
    title="Order Completed!"
    description={`Your order ${orderId ? `#${orderId}` : ''} has been successfully placed and is now being processed.`}
    actionLabel="Track Order"
    onAction={onAction}
  />
);

export const VerificationApprovedState = ({ onAction }) => (
  <GenericSuccessState
    icon={ShieldCheck}
    title="Verification Approved!"
    description="Your identity has been verified successfully. You now have full access to all features."
    actionLabel="Continue"
    onAction={onAction}
  />
);

export const RewardEarnedState = ({ onAction }) => (
  <GenericSuccessState
    icon={Gift}
    color="text-yellow-500"
    title="Reward Unlocked!"
    description="Congratulations! You have earned a new reward for your recent activity."
    actionLabel="View Rewards"
    onAction={onAction}
  />
);

export const ProductUploadedState = ({ onAction }) => (
  <GenericSuccessState
    icon={UploadCloud}
    title="Product Uploaded!"
    description="Your product has been successfully published to the marketplace and is now live."
    actionLabel="View Product"
    onAction={onAction}
  />
);
