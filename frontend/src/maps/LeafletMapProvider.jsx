import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons missing in Leaflet + Webpack/Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Icons
export const createCourierIcon = (status = 'ACTIVE') => {
    let color = '#22c55e'; // green
    if (status === 'STALE') color = '#eab308'; // yellow
    if (status === 'OFFLINE' || status === 'UNKNOWN') color = '#94a3b8'; // slate

    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="32" height="32" stroke="white" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path stroke="white" stroke-width="2" d="M12 8v4l3 3"/>
        </svg>
    `;
    return L.divIcon({
        className: 'custom-courier-icon',
        html: svg,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    });
};

export const createWaypointIcon = (type = 'PICKUP') => {
    const color = type === 'PICKUP' ? '#3b82f6' : '#ef4444'; // blue or red
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="32" height="32" stroke="white" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3" fill="white"></circle>
        </svg>
    `;
    return L.divIcon({
        className: 'custom-waypoint-icon',
        html: svg,
        iconSize: [32, 32],
        iconAnchor: [16, 32] // Pointing down
    });
};

// Component to dynamically fit bounds
const MapBoundsFitter = ({ markers }) => {
    const map = useMap();
    useEffect(() => {
        if (markers && markers.length > 0) {
            const lats = markers.map(m => m.lat).filter(Boolean);
            const lngs = markers.map(m => m.lng).filter(Boolean);
            if (lats.length > 0) {
                const bounds = [
                    [Math.min(...lats), Math.min(...lngs)],
                    [Math.max(...lats), Math.max(...lngs)]
                ];
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
            }
        }
    }, [map, markers]);
    return null;
};

export const LeafletMapProvider = ({ markers = [], center = [9.0820, 8.6753], zoom = 6, children }) => {
    return (
        <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }} zoomControl={false}>
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            />
            {markers.map((marker, idx) => (
                <Marker 
                    key={marker.id || idx} 
                    position={[marker.lat, marker.lng]}
                    icon={marker.type === 'COURIER' ? createCourierIcon(marker.status) : createWaypointIcon(marker.type)}
                >
                    {marker.popup && (
                        <Popup>
                            <div className="font-sans">
                                {marker.popup}
                            </div>
                        </Popup>
                    )}
                </Marker>
            ))}
            <MapBoundsFitter markers={markers} />
            {children}
        </MapContainer>
    );
};
