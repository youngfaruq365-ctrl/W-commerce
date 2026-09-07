import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import SVGAnimator from '../animations/SVGAnimator';
import { XCircle, AlertTriangle, WifiOff, ServerCrash, ShieldAlert } from 'lucide-react';
import { useSound } from '../../utils/soundManager';

export const GenericErrorState = ({ icon: Icon = XCircle, title, description, onAction, actionLabel = "Try Again" }) => {
  const { playSound } = useSound();
  
  useEffect(() => {
    playSound('error');
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-8 w-full min-h-[300px] text-center">
      <div className={`w-24 h-24 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-6`}>
        <SVGAnimator strokeColor="currentColor" className="text-red-500">
          <Icon className="w-12 h-12" />
        </SVGAnimator>
      </div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <h3 className="text-2xl font-bold text-[var(--text-main)] mb-2">{title}</h3>
        <p className="text-[var(--text-muted)] max-w-sm mb-6">{description}</p>
        {onAction && (
          <button 
            onClick={onAction}
            className="px-8 py-3 bg-red-500/10 text-red-500 border border-red-500/20 font-bold rounded-xl hover:bg-red-500/20 transition-colors"
          >
            {actionLabel}
          </button>
        )}
      </motion.div>
    </div>
  );
};

export const PaymentFailedState = ({ onAction }) => (
  <GenericErrorState
    title="Payment Failed"
    description="We were unable to process your payment. Please check your details and try another payment method."
    onAction={onAction}
  />
);

export const NetworkErrorState = ({ onAction }) => (
  <GenericErrorState
    icon={WifiOff}
    title="Network Connection Lost"
    description="Please check your internet connection and try again."
    onAction={onAction}
    actionLabel="Retry Connection"
  />
);

export const ServerErrorState = ({ onAction }) => (
  <GenericErrorState
    icon={ServerCrash}
    title="Server Error"
    description="We're experiencing technical difficulties on our end. Our team has been notified."
    onAction={onAction}
  />
);

export const AuthenticationErrorState = ({ onAction }) => (
  <GenericErrorState
    icon={ShieldAlert}
    title="Authentication Required"
    description="Your session has expired or you do not have permission to access this resource."
    actionLabel="Log In Again"
    onAction={onAction}
  />
);

export const ValidationErrorState = ({ onAction }) => (
  <GenericErrorState
    icon={AlertTriangle}
    title="Validation Error"
    description="Some of the information provided is incorrect. Please review your input and try again."
    onAction={onAction}
    actionLabel="Edit Details"
  />
);

export const NotFoundErrorState = ({ onAction, actionLabel = "Go Back Home" }) => (
  <GenericErrorState
    icon={XCircle}
    title="404 - Not Found"
    description="The page or resource you are looking for does not exist or has been moved."
    onAction={onAction}
    actionLabel={actionLabel}
  />
);
