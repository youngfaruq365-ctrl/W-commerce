import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAnimationLevel } from '../../context/AnimationContext';
import { fadeUp, pulse } from '../../utils/motionPresets';
import { Loader2, AlertCircle, CheckCircle2, SearchX, WifiOff, Wrench } from 'lucide-react';

/**
 * WLoadingManager - Global State Manager
 * 
 * Props:
 * status: 'idle' | 'loading' | 'success' | 'error' | 'empty' | 'offline' | 'maintenance'
 * message: Optional text to display
 * onRetry: Optional callback for error/offline states
 * children: The actual content to render when 'idle' or 'success'
 */
const WLoadingManager = ({ 
  status = 'idle', 
  message, 
  onRetry, 
  children,
  loadingComponent, // Optional custom skeleton
  emptyComponent    // Optional custom empty state
}) => {
  const { getVariant } = useAnimationLevel();

  return (
    <AnimatePresence mode="wait">
      {status === 'loading' && (
        <motion.div
          key="loading"
          {...getVariant(fadeUp)}
          className="flex flex-col items-center justify-center p-8 w-full h-full min-h-[200px]"
        >
          {loadingComponent || (
            <motion.div {...getVariant(pulse)} className="flex flex-col items-center">
              <Loader2 className="w-10 h-10 text-[var(--accent-gray)] animate-spin mb-4" />
              <p className="text-[var(--text-muted)] font-medium">
                {message || 'Please wait...'}
              </p>
            </motion.div>
          )}
        </motion.div>
      )}

      {status === 'error' && (
        <motion.div
          key="error"
          {...getVariant(fadeUp)}
          className="flex flex-col items-center justify-center p-8 w-full h-full min-h-[200px] text-center"
        >
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">Something went wrong</h3>
          <p className="text-[var(--text-muted)] mb-6 max-w-sm">
            {message || 'We encountered an error processing your request.'}
          </p>
          {onRetry && (
            <button 
              onClick={onRetry}
              className="px-6 py-2 bg-[var(--accent-gray)] text-black font-bold rounded-lg hover:opacity-90 transition-opacity"
            >
              Try Again
            </button>
          )}
        </motion.div>
      )}

      {status === 'empty' && (
        <motion.div
          key="empty"
          {...getVariant(fadeUp)}
          className="flex flex-col items-center justify-center p-8 w-full h-full min-h-[200px] text-center"
        >
          {emptyComponent || (
            <>
              <div className="w-20 h-20 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center mb-4">
                <SearchX className="w-10 h-10 text-[var(--text-muted)]" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">Nothing found</h3>
              <p className="text-[var(--text-muted)] max-w-sm">
                {message || 'There is no data to display here yet.'}
              </p>
            </>
          )}
        </motion.div>
      )}

      {status === 'offline' && (
        <motion.div
          key="offline"
          {...getVariant(fadeUp)}
          className="flex flex-col items-center justify-center p-8 w-full h-full min-h-[200px] text-center"
        >
          <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mb-4">
            <WifiOff className="w-8 h-8 text-orange-500" />
          </div>
          <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">No Internet Connection</h3>
          <p className="text-[var(--text-muted)] mb-6 max-w-sm">
            {message || 'Please check your network and try again.'}
          </p>
          {onRetry && (
            <button 
              onClick={onRetry}
              className="px-6 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-main)] font-bold rounded-lg hover:border-[var(--accent-gray)] transition-colors"
            >
              Retry Connection
            </button>
          )}
        </motion.div>
      )}

      {status === 'maintenance' && (
        <motion.div
          key="maintenance"
          {...getVariant(fadeUp)}
          className="flex flex-col items-center justify-center p-8 w-full h-full min-h-[200px] text-center"
        >
          <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
            <Wrench className="w-8 h-8 text-blue-500" />
          </div>
          <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">System Maintenance</h3>
          <p className="text-[var(--text-muted)] max-w-sm">
            {message || 'We are currently upgrading our systems. Please check back later.'}
          </p>
        </motion.div>
      )}

      {(status === 'idle' || status === 'success') && (
        <motion.div
          key="content"
          {...getVariant(fadeUp)}
          className="w-full h-full"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WLoadingManager;
