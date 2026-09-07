import React from 'react';
import { useMap } from './MapProvider';
import { MockMapProvider } from './MockMapProvider';
import { LeafletMapProvider } from './LeafletMapProvider';

/**
 * Universal MapView component.
 * Uses the MapContext to determine which underlying provider to render.
 */
export const MapView = ({ activeRoute, couriers, children, className = '' }) => {
    const { provider } = useMap();

    // Transform generic props to Leaflet markers
    const markers = [];
    
    // Add couriers
    if (couriers) {
        couriers.forEach(c => {
            if (c.lat && c.lng) {
                markers.push({
                    id: c.id,
                    lat: c.lat,
                    lng: c.lng,
                    type: 'COURIER',
                    status: c.gpsStatus || 'ACTIVE',
                    popup: `<strong>${c.name}</strong><br/>Status: ${c.gpsStatus || 'ACTIVE'}`
                });
            }
        });
    }

    // Add active route waypoints (pickup/dropoff)
    if (activeRoute) {
        if (activeRoute.pickupLat && activeRoute.pickupLng) {
            markers.push({
                id: 'pickup',
                lat: activeRoute.pickupLat,
                lng: activeRoute.pickupLng,
                type: 'PICKUP',
                popup: `<strong>Pickup</strong><br/>${activeRoute.pickupAddress || ''}`
            });
        }
        if (activeRoute.dropoffLat && activeRoute.dropoffLng) {
            markers.push({
                id: 'dropoff',
                lat: activeRoute.dropoffLat,
                lng: activeRoute.dropoffLng,
                type: 'DROPOFF',
                popup: `<strong>Destination</strong><br/>${activeRoute.dropoffAddress || ''}`
            });
        }
    }

    return (
        <div className={`w-full h-full relative ${className}`}>
            {provider === 'mock' && (
                <MockMapProvider activeRoute={activeRoute} couriers={couriers}>
                    {children}
                </MockMapProvider>
            )}
            
            {provider === 'leaflet' && (
                <LeafletMapProvider markers={markers}>
                    {children}
                </LeafletMapProvider>
            )}
            
            {/* 
               Future implementations:
               {provider === 'mapbox' && <MapboxProvider ... />}
               {provider === 'google' && <GoogleMapsProvider ... />}
            */}
        </div>
    );
};
