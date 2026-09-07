import React from 'react';
import { Star, Navigation } from 'lucide-react';
import { motion } from 'framer-motion';

export const CourierCard = ({ courier, onAssign, distance, matchScore }) => {
    if (!courier) return null;

    const isOnline = courier.status === 'ONLINE';

    return (
        <div className="rounded-xl border border-slate-800 p-4 bg-slate-900/50 backdrop-blur-sm flex flex-col justify-between hover:border-slate-700 transition-colors">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 overflow-hidden flex items-center justify-center text-slate-400 font-bold">
                            {courier.user?.fullName?.charAt(0) || 'C'}
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${isOnline ? 'bg-green-500' : 'bg-slate-500'}`}></div>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold text-sm">{courier.user?.fullName || 'Courier Name'}</h4>
                        <div className="flex items-center text-xs text-amber-400 mt-0.5">
                            <Star size={12} className="fill-amber-400 mr-1" />
                            {courier.rating?.toFixed(1) || '5.0'} 
                            <span className="text-slate-500 ml-1">({courier.totalDeliveries || 0} trips)</span>
                        </div>
                    </div>
                </div>
                
                {matchScore && (
                    <div className="bg-green-500/10 text-green-400 px-2 py-1 rounded text-xs font-bold font-mono border border-green-500/20">
                        {matchScore}% Match
                    </div>
                )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 mb-4">
                <div className="bg-slate-950 rounded p-2 text-center">
                    <div className="text-xs text-slate-500 mb-1">Vehicle</div>
                    <div className="text-slate-300 text-xs font-medium uppercase tracking-wider">{courier.activeVehicle?.type || 'MOTORCYCLE'}</div>
                </div>
                <div className="bg-slate-950 rounded p-2 text-center">
                    <div className="text-xs text-slate-500 mb-1">Distance</div>
                    <div className="text-slate-300 text-xs font-medium">{distance || '2.4 km'}</div>
                </div>
            </div>

            {onAssign && (
                <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={!isOnline}
                    onClick={() => onAssign(courier)}
                    className={`w-full py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                        isOnline 
                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                >
                    <Navigation size={16} />
                    {isOnline ? `Assign ${courier.user?.fullName?.split(' ')[0] || 'Courier'}` : 'Offline'}
                </motion.button>
            )}
        </div>
    );
};
