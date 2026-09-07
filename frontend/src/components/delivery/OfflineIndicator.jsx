import React from 'react';
import { WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const OfflineIndicator = ({ isOffline }) => {
    return (
        <AnimatePresence>
            {isOffline && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="fixed top-0 left-0 w-full z-50 bg-red-600 shadow-lg"
                >
                    <div className="flex items-center justify-center p-2 text-white text-xs font-semibold uppercase tracking-widest">
                        <WifiOff size={14} className="mr-2" />
                        No Connection - Working Offline
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
