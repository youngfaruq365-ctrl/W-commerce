import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF, DirectionsRenderer, PolylineF } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '100%'
};

// Map styling for a dark/premium theme
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#263c3f' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6b9a76' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#38414e' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#212a37' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9ca5b3' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#746855' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1f2835' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#f3d19c' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#2f3948' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#17263c' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#515c6d' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#17263c' }],
  },
];

export const GoogleMapProvider = ({
    markers = [],
    center = [9.0820, 8.6753],
    zoom = 13,
    routeFrom = null,
    routeTo = null,
    onMapClick = null,
    onRouteCalculated = null,
    children
}) => {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
    });

    const [map, setMap] = useState(null);
    const [directionsResponse, setDirectionsResponse] = useState(null);
    const [activeMarker, setActiveMarker] = useState(null);

    // Convert array center to object if necessary
    const mapCenter = Array.isArray(center) ? { lat: center[0], lng: center[1] } : center;

    const onLoad = useCallback(function callback(mapInstance) {
        setMap(mapInstance);
    }, []);

    const onUnmount = useCallback(function callback(mapInstance) {
        setMap(null);
    }, []);

    // Calculate Route
    useEffect(() => {
        if (!isLoaded || !routeFrom || !routeTo) {
            setDirectionsResponse(null);
            return;
        }

        const directionsService = new window.google.maps.DirectionsService();
        const origin = { lat: routeFrom.lat, lng: routeFrom.lng };
        const destination = { lat: routeTo.lat, lng: routeTo.lng };

        directionsService.route(
            {
                origin: origin,
                destination: destination,
                travelMode: window.google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
                if (status === window.google.maps.DirectionsStatus.OK) {
                    setDirectionsResponse(result);
                    if (onRouteCalculated) {
                        const route = result.routes[0];
                        if (route && route.legs && route.legs.length > 0) {
                            onRouteCalculated({
                                distance: route.legs[0].distance.value,
                                duration: route.legs[0].duration.value
                            });
                        }
                    }
                } else {
                    console.error(`error fetching directions ${result}`);
                }
            }
        );
    }, [isLoaded, routeFrom, routeTo]);

    // Fit Bounds to markers
    useEffect(() => {
        if (map && markers && markers.length > 1) {
            const bounds = new window.google.maps.LatLngBounds();
            markers.forEach(m => {
                if (m.lat && m.lng) {
                    bounds.extend({ lat: m.lat, lng: m.lng });
                }
            });
            map.fitBounds(bounds);
        }
    }, [map, markers]);

    if (!isLoaded) return <div className="w-full h-full bg-[#0a0a0a] flex items-center justify-center text-white">Loading Maps...</div>;

    return (
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={mapCenter}
            zoom={zoom}
            onLoad={onLoad}
            onUnmount={onUnmount}
            onClick={onMapClick}
            options={{
                styles: darkMapStyle,
                disableDefaultUI: true,
                zoomControl: true,
            }}
        >
            {/* Draw route from pickup to dropoff */}
            {directionsResponse && (
                <DirectionsRenderer 
                    directions={directionsResponse} 
                    options={{
                        suppressMarkers: true,
                        polylineOptions: {
                            strokeOpacity: 0,
                            icons: [{
                                icon: {
                                    path: window.google.maps.SymbolPath.CIRCLE,
                                    fillOpacity: 1,
                                    scale: 3,
                                    strokeColor: '#3b82f6',
                                    fillColor: '#3b82f6'
                                },
                                offset: '0',
                                repeat: '15px'
                            }]
                        }
                    }}
                />
            )}

            {/* Fallback dotted line if directions API fails */}
            {!directionsResponse && routeFrom && routeTo && (
                <PolylineF
                    path={[
                        { lat: routeFrom.lat, lng: routeFrom.lng },
                        { lat: routeTo.lat, lng: routeTo.lng }
                    ]}
                    options={{
                        strokeOpacity: 0,
                        icons: [{
                            icon: {
                                path: window.google.maps.SymbolPath.CIRCLE,
                                fillOpacity: 1,
                                scale: 3,
                                strokeColor: '#3b82f6',
                                fillColor: '#3b82f6'
                            },
                            offset: '0',
                            repeat: '15px'
                        }]
                    }}
                />
            )}

            {/* Custom Polylines (For Delivery Queue / Waypoints) */}
            {children}

            {/* Markers */}
            {markers.map((marker, idx) => {
                // Determine color based on marker type for basic SVG icon
                let iconColor = '#94a3b8'; // default
                if (marker.type === 'COURIER') iconColor = marker.status === 'ACTIVE' ? '#22c55e' : (marker.status === 'STALE' ? '#eab308' : '#94a3b8');
                else if (marker.type === 'PICKUP') iconColor = '#3b82f6';
                else if (marker.type === 'DROPOFF' || marker.type === 'DELIVERY') iconColor = '#ef4444';

                return (
                    <MarkerF
                        key={marker.id || idx}
                        position={{ lat: marker.lat, lng: marker.lng }}
                        onClick={() => setActiveMarker(marker.id || idx)}
                        icon={{
                            path: window.google.maps.SymbolPath.CIRCLE,
                            fillColor: iconColor,
                            fillOpacity: 1,
                            strokeWeight: 2,
                            strokeColor: '#ffffff',
                            scale: marker.type === 'COURIER' ? 10 : 8,
                        }}
                    >
                        {marker.popup && activeMarker === (marker.id || idx) && (
                            <InfoWindowF onCloseClick={() => setActiveMarker(null)}>
                                <div className="font-sans text-sm text-black" dangerouslySetInnerHTML={{ __html: marker.popup }} />
                            </InfoWindowF>
                        )}
                    </MarkerF>
                );
            })}

            {children}
        </GoogleMap>
    );
};
