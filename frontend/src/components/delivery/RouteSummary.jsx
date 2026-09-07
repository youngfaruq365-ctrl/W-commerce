import React from 'react';

export const RouteSummary = ({ pickup, dropoff, distance, duration }) => {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 w-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-slate-300 font-semibold text-sm uppercase tracking-wider">Route Summary</h3>
                <div className="text-right">
                    <div className="text-white font-bold">{distance || '0 km'}</div>
                    <div className="text-slate-500 text-xs">{duration || '0 min'} ETA</div>
                </div>
            </div>

            <div className="relative pl-6 space-y-4">
                {/* Vertical connecting line */}
                <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-slate-800 rounded-full" />
                
                {/* Pickup */}
                <div className="relative">
                    <div className="absolute -left-[22px] top-1 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-slate-900" />
                    <p className="text-xs text-blue-400 font-medium mb-0.5 uppercase tracking-wider">Pickup</p>
                    <p className="text-sm text-slate-300 line-clamp-1">{pickup || 'Unknown Address'}</p>
                </div>

                {/* Dropoff */}
                <div className="relative">
                    <div className="absolute -left-[22px] top-1 w-3 h-3 rounded-full bg-green-500 ring-4 ring-slate-900" />
                    <p className="text-xs text-green-400 font-medium mb-0.5 uppercase tracking-wider">Dropoff</p>
                    <p className="text-sm text-slate-300 line-clamp-1">{dropoff || 'Unknown Address'}</p>
                </div>
            </div>
        </div>
    );
};
