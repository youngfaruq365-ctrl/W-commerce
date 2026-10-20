import React, { useEffect, useState } from 'react';
import { useDeliveryStore } from '../../store/deliveryStore';
import { useCourierStore } from '../../store/courierStore';
import { useNavigate } from 'react-router-dom';
import { apiClient as axios } from '@/utils/apiClient';
import { Package, MapPin, Navigation, DollarSign, Clock, CheckCircle, Loader2, RefreshCw, Truck, ArrowRight, ShieldAlert, Zap, X, Map } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { GoogleMapProvider } from '../../maps/GoogleMapProvider';
import { PolylineF } from '@react-google-maps/api';

const DeliveryQueue = () => {
    const { queue, limitReached, fetchQueue, queueLoading, queueError, setActiveDelivery } = useDeliveryStore();
    const { availability } = useCourierStore();
    const isOnline = availability === 'ONLINE';
    const navigate = useNavigate();
    const [acceptingId, setAcceptingId] = useState(null);
    const [acceptError, setAcceptError] = useState(null);
    const [negotiateId, setNegotiateId] = useState(null);
    const [negotiatedFee, setNegotiatedFee] = useState('');
    const [isNegotiating, setIsNegotiating] = useState(false);
    
    // Map states
    const [mapAssignment, setMapAssignment] = useState(null);
    const [courierLoc, setCourierLoc] = useState({ lat: 6.5244, lng: 3.3792 });
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchingMap, setIsSearchingMap] = useState(false);

    const handleSearchArea = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setIsSearchingMap(true);
        try {
            if (!window.google || !window.google.maps) {
                throw new Error('Google Maps API not loaded yet. Please wait.');
            }
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ address: searchQuery }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    const location = results[0].geometry.location;
                    setCourierLoc({ lat: location.lat(), lng: location.lng() });
                    setSearchQuery('');
                } else {
                    toast.error("Location not found");
                }
                setIsSearchingMap(false);
            });
        } catch (err) {
            console.error('Search area error:', err);
            toast.error("Error searching area: " + (err.message || 'Unknown error'));
            setIsSearchingMap(false);
        }
    };

    useEffect(() => {
        fetchQueue(true);
    }, []);

    const handleAccept = async (assignment) => {
        setAcceptingId(assignment.id);
        setAcceptError(null);
        try {
            const res = await axios.post(`/api/v1/delivery/${assignment.id}/accept`, {}, { withCredentials: true });
            if (res.data.success) {
                setActiveDelivery(res.data.data || assignment);
                await fetchQueue(true);
                navigate('/courier/active');
            }
        } catch (err) {
            setAcceptError(err?.response?.data?.message || 'Failed to accept delivery. Please try again.');
        } finally {
            setAcceptingId(null);
        }
    };

    const handleNegotiate = async (assignmentId) => {
        if (!negotiatedFee) return;
        setIsNegotiating(true);
        setAcceptError(null);
        try {
            const res = await axios.post(`/api/v1/delivery/${assignmentId}/negotiate`, {
                proposedFee: Number(negotiatedFee)
            }, { withCredentials: true });
            if (res.data.success) {
                setNegotiateId(null);
                setNegotiatedFee('');
                toast.success('Counter-offer sent successfully!');
                await fetchQueue(true);
            }
        } catch (err) {
            setAcceptError(err?.response?.data?.message || 'Failed to submit counter offer.');
        } finally {
            setIsNegotiating(false);
        }
    };

    const handleOpenMap = (assignment) => {
        setMapAssignment(assignment);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setCourierLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => toast.error('Could not get your location')
            );
        }
    };

    return (
        <div className="p-4 space-y-6 min-h-screen bg-[var(--bg-primary)] relative overflow-hidden pb-24">
            {/* Ambient Background (Removed) */}

            <header className="pt-6 pb-4 border-b border-white/5 mb-6 flex items-center justify-between sticky top-0 bg-[var(--bg-primary)]/70 backdrop-blur-3xl z-20">
                <div>
                    <h1 className="text-3xl font-black text-[var(--text-main)] flex items-center gap-3 tracking-tighter">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                            <Truck size={20} className="text-white" />
                        </div>
                        Queue
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1 font-bold tracking-wide">
                        {queueLoading ? 'Scanning...' : `${queue?.length || 0} Assignments Available`}
                    </p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => fetchQueue(true)}
                    disabled={queueLoading}
                    className="flex items-center justify-center w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/10 shadow-sm"
                >
                    <RefreshCw size={18} className={`text-[var(--text-main)] ${queueLoading ? 'animate-spin' : ''}`} />
                </motion.button>
            </header>

            {acceptError && (
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-2xl p-4 text-sm font-bold shadow-lg shadow-rose-500/10 flex items-center gap-3"
                >
                    <ShieldAlert size={20} />
                    {acceptError}
                </motion.div>
            )}

            {queueLoading ? (
                <div className="space-y-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="rounded-3xl border border-white/5 bg-white/5 p-6 animate-pulse backdrop-blur-md">
                            <div className="flex justify-between mb-4">
                                <div className="h-6 bg-white/10 rounded-md w-1/3"></div>
                                <div className="h-6 bg-white/10 rounded-full w-20"></div>
                            </div>
                            <div className="space-y-3">
                                <div className="h-4 bg-white/10 rounded-md w-3/4"></div>
                                <div className="h-4 bg-white/10 rounded-md w-2/3"></div>
                            </div>
                            <div className="mt-6 h-14 bg-white/10 rounded-2xl"></div>
                        </div>
                    ))}
                </div>
            ) : queueError ? (
                <div className="flex flex-col items-center justify-center py-32 text-center relative z-10">
                    <div className="w-24 h-24 bg-rose-500/10 rounded-3xl flex items-center justify-center mb-6 shadow-inner border border-rose-500/20">
                        <ShieldAlert size={40} className="text-rose-500" />
                    </div>
                    <p className="text-[var(--text-muted)] mb-4 font-bold tracking-wide">Failed to sync network</p>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => fetchQueue(true)}
                        className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-black tracking-widest uppercase transition-colors border border-white/10"
                    >
                        Retry Connection
                    </motion.button>
                </div>
            ) : limitReached ? (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-20 text-center px-4 relative z-10 bg-gradient-to-b from-amber-500/5 to-transparent rounded-[3rem] border border-amber-500/10"
                >
                    <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-amber-600 rounded-[2rem] flex items-center justify-center mb-8 shadow-[0_20px_50px_-10px_rgba(245,158,11,0.5)] rotate-12">
                        <Package size={40} className="text-white -rotate-12" />
                    </div>
                    <h2 className="text-3xl font-black text-[var(--text-main)] mb-3 tracking-tight">Weekly Limit Reached</h2>
                    <p className="text-[var(--text-muted)] max-w-sm mx-auto mb-10 font-medium">
                        You've completed your 1 basic delivery this week. Unlock unlimited earning potential with Courier Pro.
                    </p>
                    <motion.button 
                        whileHover={{ scale: 1.05, y: -5 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate('/courier/subscription')}
                        className="w-full bg-gradient-to-r from-emerald-400 to-teal-500 text-white px-8 py-5 rounded-[1.5rem] font-black tracking-widest uppercase shadow-[0_20px_40px_-15px_rgba(16,185,129,0.6)] flex items-center justify-center gap-2"
                    >
                        <Zap size={20} /> Get Pro for ₦1000
                    </motion.button>
                </motion.div>
            ) : !isOnline ? (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-32 px-6 text-center relative z-10"
                >
                    <div className="w-24 h-24 bg-[var(--bg-secondary)] rounded-[2rem] flex items-center justify-center mb-6 shadow-inner border border-white/5">
                        <Zap className="text-gray-400" size={40} />
                    </div>
                    <h3 className="text-2xl font-black text-[var(--text-muted)] mb-3 tracking-tight">You're Offline</h3>
                    <p className="text-[var(--text-muted)] max-w-[280px] font-medium leading-relaxed">
                        Go online in your dashboard to view and accept nearby delivery requests.
                    </p>
                    <button 
                        onClick={() => navigate('/courier')}
                        className="mt-8 bg-[var(--text-main)] text-[var(--bg-primary)] px-8 py-3 rounded-2xl font-bold shadow-sm hover:scale-105 transition-transform"
                    >
                        Go to Dashboard
                    </button>
                </motion.div>
            ) : !queue?.length ? (
                <div className="flex flex-col items-center justify-center py-32 text-[var(--text-muted)] opacity-70 relative z-10">
                    <motion.div 
                        animate={{ y: [0, -10, 0] }}
                        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                        className="w-24 h-24 bg-white/5 backdrop-blur-xl rounded-[2rem] flex items-center justify-center mb-6 border border-white/10 shadow-xl"
                    >
                        <Package size={40} className="text-white/30" />
                    </motion.div>
                    <p className="font-black tracking-wide text-lg text-[var(--text-main)]">Queue is empty</p>
                    <p className="text-sm mt-2 font-medium tracking-wide">Waiting for new freight requests...</p>
                </div>
            ) : (
                <AnimatePresence>
                    <div className="space-y-6 relative z-10">
                        {queue.map((assignment, idx) => {
                            const order = assignment.order || {};
                            
                            let pricing = {};
                            try { pricing = JSON.parse(assignment.pricingSnapshot || "{}"); } catch (e) {}
                            
                            const fee = parseFloat(assignment.customerDeliveryFee || order.shippingCost || 0);
                            const payout = pricing.deliverRate || (fee * 0.8).toFixed(2);
                            const isAccepting = acceptingId === assignment.id;
                            
                            const pickupLocation = pricing.pickupLocation || order.store?.storeName || order.storeName || 'Seller Location';
                            const dropoffAddress = order.shippingAddress || 'Customer Address';
                            const requestTime = pricing.pickupTime ? new Date(pricing.pickupTime) : new Date(assignment.createdAt);

                            return (
                                <motion.div
                                    key={assignment.id}
                                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                    transition={{ delay: idx * 0.1, type: "spring", damping: 20 }}
                                    className="neu-card rounded-[2rem] p-6 relative overflow-hidden group"
                                >

                                    {/* Header */}
                                    <div className="flex justify-between items-start mb-6 relative z-10">
                                        <div>
                                            <h3 className="text-[var(--text-main)] font-black text-lg tracking-tight flex items-center gap-2">
                                                {order.orderType === 'FREIGHT' ? '🚚 Freight' : `Order #${order.id?.substring(0, 6)}`}
                                            </h3>
                                            <p className="text-xs text-[var(--text-muted)] mt-1 font-bold tracking-wide flex items-center gap-1.5">
                                                <Clock size={12} className="text-emerald-500" />
                                                {requestTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className="bg-emerald-500/10 text-emerald-500 font-black px-3 py-1.5 rounded-xl border border-emerald-500/20 text-xs tracking-widest shadow-inner inline-block mb-1">
                                                Payout: ₦{payout}
                                            </div>
                                            <div className="text-[10px] text-[var(--text-muted)] font-bold opacity-70">
                                                Fee: ₦{fee}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Locations */}
                                    <div className="relative pl-6 space-y-6 mb-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-white/10 z-10">
                                        <div className="relative group/address cursor-pointer" onClick={() => toast(pickupLocation, { icon: '📍' })}>
                                            <div className="absolute -left-6 top-0 w-6 h-6 bg-[var(--bg-primary)] rounded-full border-2 border-blue-500 flex items-center justify-center z-10 shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                                                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-blue-400 uppercase font-black tracking-widest mb-1">Pickup</p>
                                                <p className="text-[var(--text-main)] text-sm font-bold">
                                                    {pickupLocation}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="relative group/address cursor-pointer" onClick={() => toast(dropoffAddress, { icon: '📍' })}>
                                            <div className="absolute -left-6 top-0 w-6 h-6 bg-[var(--bg-primary)] rounded-full border-2 border-emerald-500 flex items-center justify-center z-10 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                                                <MapPin size={10} className="text-emerald-500" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-emerald-400 uppercase font-black tracking-widest mb-1">Dropoff</p>
                                                <p className="text-[var(--text-main)] text-sm font-bold">
                                                    {dropoffAddress}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-3 relative z-10">
                                        {negotiateId === assignment.id ? (
                                            <div className="flex-1 flex gap-2 w-full">
                                                <input 
                                                    type="number"
                                                    value={negotiatedFee}
                                                    onChange={e => setNegotiatedFee(e.target.value)}
                                                    placeholder="Offer amount..."
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-[var(--text-main)] focus:outline-none focus:border-amber-500 font-bold"
                                                />
                                                <button 
                                                    onClick={() => handleNegotiate(assignment.id)}
                                                    disabled={isNegotiating || !negotiatedFee}
                                                    className="bg-amber-500 hover:bg-amber-600 text-white px-4 rounded-xl flex items-center justify-center transition-colors shadow-lg shadow-amber-500/20"
                                                >
                                                    {isNegotiating ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={20} />}
                                                </button>
                                                <button 
                                                    onClick={() => setNegotiateId(null)}
                                                    className="bg-white/10 hover:bg-white/20 text-white px-4 rounded-xl flex items-center justify-center transition-colors border border-white/10"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <button 
                                                    onClick={() => handleOpenMap(assignment)}
                                                    className="flex-1 py-4 rounded-2xl font-black tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center justify-center gap-2 hover:bg-blue-500/20 transition-colors"
                                                >
                                                    <Map size={18} /> Map
                                                </button>
                                                <button 
                                                    onClick={() => setNegotiateId(assignment.id)}
                                                    className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest bg-white/5 text-[var(--text-main)] border border-white/10 flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
                                                >
                                                    Offer
                                                </button>
                                                <motion.button 
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => handleAccept(assignment)}
                                                    disabled={isAccepting}
                                                    className="flex-[2] py-4 rounded-2xl font-black uppercase tracking-widest bg-gradient-to-r from-emerald-500 to-teal-600 text-white flex items-center justify-center gap-2 shadow-[0_15px_30px_-10px_rgba(16,185,129,0.5)] border border-emerald-400/30"
                                                >
                                                    {isAccepting ? <Loader2 size={20} className="animate-spin" /> : 'Accept Delivery'}
                                                </motion.button>
                                            </>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </AnimatePresence>
            )}

            {/* Map Modal */}
            <AnimatePresence>
                {mapAssignment && (
                    <motion.div 
                        initial={{ opacity: 0, y: 50 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: 50 }} 
                        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    >
                        <div className="w-full max-w-2xl bg-[#0a0a0a] rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative h-[80vh] flex flex-col">
                            <div className="flex justify-between items-center p-4 border-b border-black/10 dark:border-white/10 bg-[var(--bg-secondary)]">
                                <h3 className="text-[var(--text-main)] font-bold flex items-center gap-2"><Map size={20} className="text-blue-500" /> Visual Delivery Route</h3>
                                <button onClick={() => setMapAssignment(null)} className="p-2 bg-[var(--accent-gray-dim)] hover:bg-black/10 dark:hover:bg-white/20 rounded-full transition-colors text-[var(--text-main)]">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-3 bg-[var(--bg-secondary)] border-b border-black/10 dark:border-white/10">
                                <form onSubmit={handleSearchArea} className="flex rounded-xl overflow-hidden border border-black/10 dark:border-white/10 shadow-sm">
                                    <input 
                                        type="text" 
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        placeholder="Search map area..." 
                                        className="w-full px-4 py-2 text-sm outline-none bg-[var(--bg-primary)] text-[var(--text-main)] font-bold"
                                    />
                                    <button type="submit" disabled={isSearchingMap} className="bg-blue-500 hover:bg-blue-600 transition-colors text-white px-6 py-2 text-sm font-bold tracking-wider">
                                        {isSearchingMap ? '...' : 'Search'}
                                    </button>
                                </form>
                            </div>

                            <div className="flex-1 relative">
                                {(() => {
                                    let waypoints = mapAssignment.waypoints || [];
                                    if (waypoints.length === 0) {
                                        if (mapAssignment.pickupLat && mapAssignment.pickupLng) {
                                            waypoints.push({ name: 'Pickup', lat: mapAssignment.pickupLat, lng: mapAssignment.pickupLng, type: 'PICKUP' });
                                        }
                                        if (mapAssignment.dropoffLat && mapAssignment.dropoffLng) {
                                            waypoints.push({ name: 'Dropoff', lat: mapAssignment.dropoffLat, lng: mapAssignment.dropoffLng, type: 'DROPOFF' });
                                        }
                                    }

                                    const allPositions = [{ lat: courierLoc.lat, lng: courierLoc.lng }, ...waypoints.map(w => ({ lat: w.lat, lng: w.lng }))];

                                    const mapMarkers = [
                                        { lat: courierLoc.lat, lng: courierLoc.lng, type: 'COURIER', popup: `<div style="font-weight:bold">You are here</div>` },
                                        ...waypoints.map((wp, i) => {
                                            let type = wp.type || 'WAYPOINT';
                                            if (!wp.type && i === 0) type = 'PICKUP';
                                            else if (!wp.type && i === waypoints.length - 1) type = 'DROPOFF';
                                            
                                            return {
                                                id: wp.id || `wp-${i}`,
                                                lat: wp.lat,
                                                lng: wp.lng,
                                                type: type,
                                                popup: `<div style="font-weight:bold">${wp.name}</div>`
                                            };
                                        })
                                    ];

                                    return (
                                        <div className="absolute inset-0">
                                            <GoogleMapProvider center={courierLoc} markers={mapMarkers}>
                                                {allPositions.length > 1 && <PolylineF path={allPositions} options={{ strokeColor: '#3b82f6', strokeWeight: 4, strokeOpacity: 0.8 }} />}
                                            </GoogleMapProvider>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DeliveryQueue;
