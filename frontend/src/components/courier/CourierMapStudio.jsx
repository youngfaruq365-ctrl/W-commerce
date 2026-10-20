import React, { useState, useEffect } from 'react';
import { apiClient as axios } from '@/utils/apiClient';
import { Search, Navigation, User, MapPin, Map, Navigation2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiClient as api } from '../../utils/apiClient';
import { GoogleMapProvider } from '../../maps/GoogleMapProvider';
import { PolylineF } from '@react-google-maps/api';

const CourierMapStudio = () => {
    const [identifier, setIdentifier] = useState('');
    const [assignment, setAssignment] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // Default location (e.g. Lagos)
    const [courierLoc, setCourierLoc] = useState({ lat: 6.5244, lng: 3.3792 });

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!identifier.trim()) return;
        
        setLoading(true);
        try {
            const res = await api.get(`/api/v1/courier/assignment/${identifier.trim()}`);
            if (res.data.success && res.data.assignment) {
                setAssignment(res.data.assignment);
                toast.success('Route loaded!');
            } else {
                toast.error('Assignment not found.');
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to load map data.');
        } finally {
            setLoading(false);
        }
    };

    const updateCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setCourierLoc({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                    toast.success('Location updated!');
                },
                (error) => {
                    toast.error('Could not get GPS location.');
                },
                { enableHighAccuracy: true }
            );
        } else {
            toast.error('Geolocation is not supported by this browser.');
        }
    };

    // Prepare route lines
    const waypoints = assignment?.stops || assignment?.waypoints || [];
    const reachedWaypoints = waypoints.filter(wp => wp.status === 'REACHED').map(wp => ({ lat: wp.lat, lng: wp.lng }));
    const pendingWaypoints = waypoints.filter(wp => wp.status === 'PENDING').map(wp => ({ lat: wp.lat, lng: wp.lng }));
    
    // Connect the last reached to the first pending to make the line continuous
    const transitionLine = (reachedWaypoints.length > 0 && pendingWaypoints.length > 0) 
        ? [reachedWaypoints[reachedWaypoints.length - 1], pendingWaypoints[0]] 
        : [];

    const mapMarkers = waypoints.map((wp, i) => {
        let type = 'WAYPOINT';
        if (i === 0) type = 'PICKUP';
        else if (i === waypoints.length - 1) type = 'DROPOFF';
        return {
            id: wp.id,
            lat: wp.lat,
            lng: wp.lng,
            type: type,
            popup: `<div style="font-weight:bold">${wp.name}</div>`
        };
    });
    
    if (courierLoc) {
        mapMarkers.push({
            id: 'courier-loc',
            lat: courierLoc.lat,
            lng: courierLoc.lng,
            type: 'COURIER',
            status: 'ACTIVE',
            popup: `<div style="font-weight:bold">You are here</div>`
        });
    }

    return (
        <div className="flex flex-col lg:flex-row h-screen max-h-screen overflow-hidden bg-[var(--bg-primary)]">
            {/* Sidebar / Info Panel */}
            <div className="w-full lg:w-96 bg-[var(--bg-secondary)] border-r border-white/5 flex flex-col z-20 shadow-2xl relative">
                
                {/* Search Header */}
                <div className="p-6 border-b border-white/5">
                    <h2 className="text-xl font-black flex items-center gap-2 mb-4 text-white">
                        <Map size={24} className="text-blue-500" />
                        W-Map Engine
                    </h2>
                    
                    <form onSubmit={handleSearch} className="relative">
                        <input
                            type="text"
                            placeholder="Buyer ID, Seller ID, or Order ID"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            className="w-full bg-[var(--bg-tertiary)] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                        />
                        <Search size={16} className="absolute left-3 top-3.5 text-gray-500" />
                        <button type="submit" className="absolute right-2 top-2 bg-blue-600 text-white p-1.5 rounded-lg hover:bg-blue-500 transition-colors">
                            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Navigation2 size={16} />}
                        </button>
                    </form>
                </div>

                {/* Assignment Details */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                    {!assignment ? (
                        <div className="text-center text-gray-500 mt-10">
                            <MapPin size={40} className="mx-auto mb-4 opacity-50" />
                            <p>Enter an ID above to load a delivery route.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            
                            {/* Order Info */}
                            <div className="bg-[var(--bg-tertiary)] p-4 rounded-xl border border-white/5">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-white text-sm">Order #{assignment.orderId.substring(0, 8).toUpperCase()}</h3>
                                    <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-1 rounded-full uppercase font-bold tracking-wider">
                                        {assignment.status.replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-400 space-y-1">
                                    <p>Distance: <span className="text-white font-medium">{assignment.estimatedDistance || '?'} km</span></p>
                                    <p>ETA: <span className="text-white font-medium">{assignment.estimatedDuration || '?'} mins</span></p>
                                </div>
                            </div>

                            {/* Human Instructions */}
                            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                                
                                {/* Pickup */}
                                <div className="relative flex items-start gap-4">
                                    <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center shrink-0 z-10 shadow-[0_0_10px_rgba(249,115,22,0.3)]">
                                        <div className="w-2 h-2 bg-white rounded-full" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white">Pickup</h4>
                                        <p className="text-xs text-gray-400">{assignment.pickupLocation?.name || 'Seller Location'}</p>
                                        {assignment.pickupInstruction && (
                                            <div className="mt-2 p-2 bg-orange-500/10 border border-orange-500/20 rounded-lg text-xs text-orange-200">
                                                <span className="font-bold opacity-75">Instruction:</span> {assignment.pickupInstruction}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Intermediate waypoints */}
                                {waypoints.filter(w => w.sequence > 1 && w.sequence < waypoints.length).map(wp => (
                                    <div key={wp.id} className="relative flex items-start gap-4">
                                        <div className="w-5 h-5 rounded-full bg-[var(--bg-tertiary)] border border-white/20 flex items-center justify-center shrink-0 z-10">
                                            <div className={`w-1.5 h-1.5 rounded-full ${wp.status === 'REACHED' ? 'bg-blue-400' : 'bg-gray-600'}`} />
                                        </div>
                                        <div className="mt-0.5">
                                            <p className={`text-xs ${wp.status === 'REACHED' ? 'text-gray-300' : 'text-gray-500'}`}>{wp.name}</p>
                                        </div>
                                    </div>
                                ))}

                                {/* Dropoff */}
                                <div className="relative flex items-start gap-4">
                                    <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shrink-0 z-10 shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                                        <div className="w-2 h-2 bg-white rounded-full" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white">Dropoff</h4>
                                        <p className="text-xs text-gray-400">{assignment.dropoffLocation?.name || 'Buyer Location'}</p>
                                        {assignment.dropoffInstruction && (
                                            <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-200">
                                                <span className="font-bold opacity-75">Instruction:</span> {assignment.dropoffInstruction}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-6 border-t border-white/5 bg-[var(--bg-secondary)]">
                    <button 
                        onClick={updateCurrentLocation}
                        className="w-full flex items-center justify-center gap-2 bg-[var(--bg-tertiary)] hover:bg-white/5 text-white py-3 rounded-xl text-sm font-bold transition-colors border border-white/10"
                    >
                        <MapPin size={16} /> Sync My Location
                    </button>
                </div>
            </div>

            {/* Map Area */}
            <div className="flex-1 relative z-10">
                <GoogleMapProvider center={courierLoc} markers={mapMarkers}>
                    {reachedWaypoints.length > 1 && (
                        <PolylineF path={reachedWaypoints} options={{ strokeColor: '#3b82f6', strokeWeight: 4, strokeOpacity: 0.8 }} />
                    )}
                    
                    {transitionLine.length === 2 && (
                        <PolylineF path={transitionLine} options={{ strokeColor: '#3b82f6', strokeWeight: 4, strokeOpacity: 0.8 }} /> 
                    )}

                    {pendingWaypoints.length > 1 && (
                        <PolylineF path={pendingWaypoints} options={{ strokeColor: '#94a3b8', strokeWeight: 4, strokeOpacity: 0.4 }} />
                    )}
                </GoogleMapProvider>
            </div>
        </div>
    );
};

export default CourierMapStudio;
