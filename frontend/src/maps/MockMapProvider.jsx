import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * A mock interactive map for Phase 2 development.
 * Simulates courier movement and renders route markers without consuming API credits.
 */
export const MockMapProvider = ({ children, activeRoute, couriers }) => {
    // Simulate some pulsing markers or simulated movement here visually
    return (
        <div className="relative w-full h-full bg-slate-900 overflow-hidden border border-slate-800 rounded-lg flex items-center justify-center">
            {/* Background grid to simulate a map surface */}
            <div 
                className="absolute inset-0 opacity-20 pointer-events-none" 
                style={{
                    backgroundImage: 'radial-gradient(#334155 2px, transparent 2px)',
                    backgroundSize: '30px 30px'
                }}
            />
            
            <div className="relative z-10 text-slate-500 font-medium tracking-widest text-sm uppercase">
                Mock Map Region
            </div>

            {/* Render Courier Markers */}
            {couriers?.map((courier, idx) => (
                <motion.div
                    key={courier.id || idx}
                    className="absolute w-6 h-6 bg-green-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-xs"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, x: courier.lat ? (courier.lng * 100) : 0, y: courier.lat ? (courier.lat * 100) : 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                    🛵
                </motion.div>
            ))}

            {/* Render Active Route Path (Mocked as an SVG line) */}
            {activeRoute && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <motion.path
                        d="M 100 100 C 200 100, 300 300, 400 200" // Hardcoded curved path for visual effect
                        stroke="#3b82f6"
                        strokeWidth="4"
                        fill="transparent"
                        strokeDasharray="8 8"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 2 }}
                    />
                </svg>
            )}

            {/* Children might be custom overlays, zoom controls, etc. */}
            <div className="absolute inset-0 z-20 pointer-events-none">
                {children}
            </div>
        </div>
    );
};
