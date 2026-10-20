import React, { useEffect, useState } from 'react';
import { useMap } from './MapProvider';
import { MockMapProvider } from './MockMapProvider';
import { GoogleMapProvider } from './GoogleMapProvider';

/**
 * Universal MapView component.
 * Now supports routeFrom/routeTo for drawing a real OSRM route polyline.
 */
export const MapView = ({ activeRoute, couriers, children, className = '' }) => {
    const { provider } = useMap();
    const [eta, setEta] = useState(null);

    const markers = [];

    if (couriers) {
        couriers.forEach(c => {
            if (c.lat && c.lng) {
                markers.push({
                    id: c.id,
                    lat: c.lat,
                    lng: c.lng,
                    type: 'COURIER',
                    status: c.gpsStatus || 'ACTIVE',
                    popup: `<strong>${c.name || 'You'}</strong><br/>Status: ${c.gpsStatus || 'Active'}`
                });
            }
        });
    }

    let routeFrom = null;
    let routeTo = null;

    if (activeRoute) {
        if (activeRoute.pickupLat && activeRoute.pickupLng) {
            routeFrom = { lat: activeRoute.pickupLat, lng: activeRoute.pickupLng };
            markers.push({
                id: 'pickup',
                lat: activeRoute.pickupLat,
                lng: activeRoute.pickupLng,
                type: 'PICKUP',
                popup: `<strong>📦 Pickup</strong><br/>${activeRoute.pickupAddress || ''}`
            });
        }
        if (activeRoute.dropoffLat && activeRoute.dropoffLng) {
            routeTo = { lat: activeRoute.dropoffLat, lng: activeRoute.dropoffLng };
            markers.push({
                id: 'dropoff',
                lat: activeRoute.dropoffLat,
                lng: activeRoute.dropoffLng,
                type: 'DROPOFF',
                popup: `<strong>🏁 Dropoff</strong><br/>${activeRoute.dropoffAddress || ''}`
            });
        }
    }

    // Fetch live ETA from OSRM whenever pickup/dropoff are known
    // (Removed in favor of Google Maps Directions)

    return (
        <div className={`w-full h-full relative ${className}`}>
            {provider === 'mock' && (
                <MockMapProvider activeRoute={activeRoute} couriers={couriers}>
                    {children}
                </MockMapProvider>
            )}

            {provider === 'google' && (
                <GoogleMapProvider 
                    markers={markers} 
                    routeFrom={routeFrom} 
                    routeTo={routeTo}
                    onRouteCalculated={(calc) => {
                        setEta({
                            km: (calc.distance / 1000).toFixed(1),
                            min: Math.round(calc.duration / 60)
                        });
                    }}
                >
                    {children}
                </GoogleMapProvider>
            )}

            {/* Live ETA pill overlaid on map */}
            {eta && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[500] pointer-events-none">
                    <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-white/30 dark:border-white/10 rounded-full px-5 py-2 shadow-xl flex items-center gap-3 text-sm font-semibold text-gray-800 dark:text-gray-100">
                        <span className="text-blue-500">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M12 2L19.09 6.5V17.5L12 22L4.91 17.5V6.5L12 2Z"/>
                                <path d="M12 6v6l4 2"/>
                            </svg>
                        </span>
                        <span>{eta.km} km</span>
                        <span className="opacity-30">·</span>
                        <span>ETA {eta.min} min</span>
                    </div>
                </div>
            )}
        </div>
    );
};
