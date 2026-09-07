import React from 'react';
import { DeliveryStatus } from './DeliveryStatus';
import { MapPin, Navigation, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export const DeliveryCard = ({ assignment, onClick, highlighted }) => {
    if (!assignment) return null;

    // assignment.order might have totalAmount, shippingCost
    const order = assignment.order || {};
    
    return (
        <motion.div 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={`cursor-pointer rounded-xl border p-4 glass-panel transition-colors ${
                highlighted ? 'border-green-500/50 ring-1 ring-green-500/50' : 'border-[var(--border-color)] hover:border-[var(--text-muted)]'
            }`}
        >
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="text-[var(--text-main)] font-bold text-lg leading-tight">Order #{order.id?.substring(0,6) || '8294'}</h3>
                    <p className="text-[var(--text-muted)] text-xs mt-1 flex items-center">
                        <Clock size={12} className="mr-1" />
                        ETA: {assignment.estimatedDuration || 15} mins
                    </p>
                </div>
                <DeliveryStatus status={assignment.status} />
            </div>

            <div className="space-y-3 mt-4">
                {/* Pickup */}
                <div className="flex items-start">
                    <div className="mt-1 bg-blue-500/20 p-1.5 rounded-full mr-3 text-blue-400">
                        <MapPin size={14} />
                    </div>
                    <div>
                        <p className="text-xs text-[var(--text-muted)] uppercase font-bold tracking-wider">Pickup</p>
                        <p className="text-[var(--text-main)] text-sm">{assignment.pickupAddress || 'Central Store, Wuse 2'}</p>
                    </div>
                </div>

                {/* Dropoff */}
                <div className="flex items-start">
                    <div className="mt-1 bg-green-500/20 p-1.5 rounded-full mr-3 text-green-600 dark:text-green-400">
                        <Navigation size={14} />
                    </div>
                    <div>
                        <p className="text-xs text-[var(--text-muted)] uppercase font-bold tracking-wider">Dropoff</p>
                        <p className="text-[var(--text-main)] text-sm">{assignment.dropoffAddress || '14 Ademola Adetokunbo, Garki'}</p>
                    </div>
                </div>
            </div>

            {/* Footer metrics */}
            <div className="mt-4 pt-4 border-t border-[var(--border-color)] flex justify-between items-center text-sm">
                <span className="text-[var(--text-muted)]">Dist: <span className="text-[var(--text-main)] font-medium">{assignment.estimatedDistance || '4.2'} km</span></span>
                <span className="text-[var(--text-muted)]">Fee: <span className="text-green-600 dark:text-green-400 font-bold font-mono">₦{order.shippingCost || '1,500'}</span></span>
            </div>
        </motion.div>
    );
};
