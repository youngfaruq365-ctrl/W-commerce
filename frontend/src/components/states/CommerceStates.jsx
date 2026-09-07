import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SVGAnimator from '../animations/SVGAnimator';
import { Package, Truck, Home, Lock, Unlock, RefreshCw } from 'lucide-react';
import { useAnimationLevel } from '../../context/AnimationContext';

export const GenericCommerceState = ({ icon: Icon, title, description, color = "text-[var(--text-main)]", isProcessing = false }) => {
  const { getVariant } = useAnimationLevel();
  
  return (
    <motion.div initial="initial" animate="animate" exit="exit" className="flex flex-col items-center justify-center p-8 w-full min-h-[300px] text-center">
      <div className={`w-24 h-24 rounded-full bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] flex items-center justify-center mb-6 relative overflow-hidden`}>
        {isProcessing && (
          <motion.div 
            className="absolute inset-0 border-4 border-t-[var(--accent-gray)] rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
        )}
        <SVGAnimator strokeColor="currentColor" className={color}>
          <Icon className="w-10 h-10" />
        </SVGAnimator>
      </div>
      <h3 className="text-2xl font-bold text-[var(--text-main)] mb-2">{title}</h3>
      <p className="text-[var(--text-muted)] max-w-sm mb-6">{description}</p>
    </motion.div>
  );
};

export const PendingPaymentState = () => (
  <GenericCommerceState
    icon={RefreshCw}
    title="Awaiting Payment"
    description="Your order is confirmed, but we are still waiting for the payment to clear."
    isProcessing={true}
  />
);

export const PackingState = () => (
  <GenericCommerceState
    icon={Package}
    title="Packing Your Order"
    description="The seller is preparing your items for shipment."
    isProcessing={true}
  />
);

export const ShippedState = () => (
  <GenericCommerceState
    icon={Truck}
    color="text-blue-500"
    title="Order Shipped"
    description="Your package is on its way to the delivery address."
  />
);

export const OutForDeliveryState = () => (
  <GenericCommerceState
    icon={Truck}
    color="text-yellow-500"
    title="Out For Delivery"
    description="Your package is out for delivery today!"
    isProcessing={true}
  />
);

export const DeliveredState = () => (
  <GenericCommerceState
    icon={Home}
    color="text-green-500"
    title="Package Delivered"
    description="Your package has been successfully delivered."
  />
);

export const EscrowLockedState = () => (
  <GenericCommerceState
    icon={Lock}
    color="text-orange-500"
    title="Funds in Escrow"
    description="Your payment is securely held in escrow until you confirm delivery."
  />
);

export const EscrowReleasedState = () => (
  <GenericCommerceState
    icon={Unlock}
    color="text-green-500"
    title="Funds Released"
    description="Delivery confirmed. Payment has been released to the seller."
  />
);
