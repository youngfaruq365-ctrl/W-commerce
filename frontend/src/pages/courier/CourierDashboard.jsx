import React, { useEffect } from 'react';
import { useCourierStore } from '../../store/courierStore';
import { useTrackingStore } from '../../store/trackingStore';
import { useOfferStore } from '../../store/offerStore';
import { geolocationService } from '../../services/realtime/geolocationService';
import { realtimeClient } from '../../services/realtime/socketClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Power, TrendingUp, Navigation, Loader2, MapPin, Package, Clock, X, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const CourierDashboard = () => {
    const { profile, availability, setAvailability, earnings, fetchProfile, fetchEarnings, profileLoading } = useCourierStore();
    const { gpsStatus } = useTrackingStore();
    const { currentOffer, timeRemaining, setOffer, acceptOffer, rejectOffer } = useOfferStore();
    const navigate = useNavigate();
    const isOnline = availability === 'ONLINE';

    useEffect(() => {
        fetchProfile();
        fetchEarnings();
    }, [fetchProfile, fetchEarnings]);

    useEffect(() => {
        const setupPush = async () => {
            if ('serviceWorker' in navigator && 'PushManager' in window) {
                try {
                    const permission = await Notification.requestPermission();
                    if (permission === 'granted') {
                        const swRegistration = await navigator.serviceWorker.register('/sw.js');
                        const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
                        const urlBase64ToUint8Array = (base64String) => {
                            const padding = '='.repeat((4 - base64String.length % 4) % 4);
                            const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
                            const rawData = window.atob(base64);
                            const outputArray = new Uint8Array(rawData.length);
                            for (let i = 0; i < rawData.length; ++i) {
                                outputArray[i] = rawData.charCodeAt(i);
                            }
                            return outputArray;
                        };
                        const subscription = await swRegistration.pushManager.subscribe({
                            userVisibleOnly: true,
                            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
                        });
                        try {
                            await api.post('/api/v1/user/subscribe-push', subscription);
                        } catch {
                            console.warn('Failed to subscribe to push');
                        }
                    }
                } catch (error) {
                    // console.error('Push setup failed:', error);
                }
            }
        };
        setupPush();
    }, []);

    useEffect(() => {
        const handleOffer = (offer) => {
            // console.log("Received offer:", offer);
            setOffer(offer);
        };
        realtimeClient.on('delivery:offer', handleOffer);
        return () => realtimeClient.off('delivery:offer', handleOffer);
    }, [setOffer]);

    const toggleStatus = async () => {
        const newStatus = isOnline ? 'OFFLINE' : 'ONLINE';
        try {
            await setAvailability(newStatus);
            
            if (newStatus === 'ONLINE') {
                geolocationService.startTracking();
            } else {
                geolocationService.stopTracking();
            }
        } catch (error) {
            toast.error('Failed to update availability. Please try again.');
            await fetchProfile(); // Sync local state back with server
        }
    };

    if (profileLoading && !profile) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[50vh]">
                <Loader2 className="animate-spin text-green-500" size={40} />
            </div>
        );
    }

    return (
        <div className="p-4 space-y-6 bg-[var(--bg-primary)] min-h-screen">
            <header className="pt-6 pb-2">
                <h1 className="text-3xl font-black tracking-tight text-[var(--text-main)]">Hello, {profile?.user?.fullName?.split(' ')[0] || 'Courier'}</h1>
                <p className="text-[var(--text-muted)] text-sm mt-1">Ready to ride today?</p>
            </header>

            {/* Huge Status Toggle */}
            <motion.div 
                whileTap={{ scale: 0.95 }}
                onClick={toggleStatus}
                className={`relative overflow-hidden rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer shadow-2xl transition-all duration-500 ${
                    isOnline 
                    ? 'bg-gradient-to-br from-green-600 to-emerald-800 shadow-green-500/30' 
                    : 'bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-sm'
                }`}
            >
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-all duration-500 ${
                    isOnline ? 'bg-white/20 text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                }`}>
                    <Power size={40} />
                </div>
                <h2 className={`text-2xl font-bold tracking-widest uppercase ${isOnline ? 'text-white' : 'text-[var(--text-muted)]'}`}>
                    {isOnline ? 'You are Online' : 'Go Online'}
                </h2>
                
                {/* Geolocation Status UI */}
                {isOnline ? (
                    <div className="mt-4 text-center">
                        {gpsStatus === 'ACTIVE' && (
                            <span className="inline-flex items-center text-xs font-semibold px-3 py-1 bg-green-500/20 text-green-100 rounded-full backdrop-blur-md border border-green-500/30">
                                <span className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse"></span>
                                GPS ACTIVE
                            </span>
                        )}
                        {gpsStatus === 'POOR_SIGNAL' && (
                            <span className="inline-flex items-center text-xs font-semibold px-3 py-1 bg-yellow-500/20 text-yellow-100 rounded-full backdrop-blur-md border border-yellow-500/30">
                                ⚠ POOR GPS SIGNAL
                            </span>
                        )}
                        {gpsStatus === 'LOST_SIGNAL' && (
                            <span className="inline-flex items-center text-xs font-semibold px-3 py-1 bg-red-500/20 text-red-100 rounded-full backdrop-blur-md border border-red-500/30">
                                ⚠ GPS SIGNAL LOST
                            </span>
                        )}
                        {gpsStatus === 'DENIED' && (
                            <span className="inline-flex items-center text-xs font-semibold px-3 py-1 bg-red-500/20 text-red-100 rounded-full backdrop-blur-md border border-red-500/30">
                                ⚠ LOCATION PERMISSION DENIED
                            </span>
                        )}
                        {(gpsStatus === 'CONNECTING' || gpsStatus === 'OFFLINE') && (
                            <span className="inline-flex items-center text-xs font-semibold px-3 py-1 bg-white/10 text-white/70 rounded-full backdrop-blur-md border border-white/20">
                                <Loader2 size={12} className="mr-2 animate-spin" />
                                CONNECTING GPS...
                            </span>
                        )}
                    </div>
                ) : (
                    <p className="mt-2 text-sm text-center text-[var(--text-muted)]">
                        Tap to start receiving orders
                    </p>
                )}
                
                {isOnline && (
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none mix-blend-overlay"></div>
                )}
            </motion.div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
                <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl p-5 shadow-lg relative overflow-hidden"
                >
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-green-500/10 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Today's Pay</span>
                        <div className="p-2 bg-green-500/10 text-green-500 rounded-lg"><TrendingUp size={16} /></div>
                    </div>
                    <div className="text-3xl font-black text-[var(--text-main)] font-mono tracking-tight">₦{earnings.today || '0'}</div>
                </motion.div>
                <motion.div 
                    whileHover={{ scale: 1.02 }}
                    onClick={() => navigate('/courier/active')}
                    className="bg-gradient-to-br from-blue-600 to-indigo-700 border border-blue-500/50 rounded-3xl p-5 cursor-pointer shadow-lg shadow-blue-900/20 relative overflow-hidden text-white"
                >
                    <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-100">Active</span>
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md"><Navigation size={16} /></div>
                    </div>
                    <div className="text-lg font-bold leading-tight mt-1">Tap to view<br/>delivery</div>
                </motion.div>
            </div>

            {/* Offer Modal */}
            <AnimatePresence>
                {currentOffer && (
                    <motion.div 
                        initial={{ opacity: 0, y: '100%' }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: '100%' }}
                        className="fixed inset-x-0 bottom-0 z-50 p-4 pb-8"
                    >
                        <div className="bg-[var(--bg-secondary)] rounded-3xl shadow-2xl border border-[var(--border-color)] overflow-hidden">
                            {/* Progress bar for timer */}
                            <div className="h-2 bg-[var(--bg-tertiary)] w-full">
                                <motion.div 
                                    className={`h-full ${timeRemaining < 15 ? 'bg-red-500' : 'bg-green-500'}`}
                                    initial={{ width: '100%' }}
                                    animate={{ width: `${(timeRemaining / 60) * 100}%` }}
                                    transition={{ duration: 1, ease: "linear" }}
                                />
                            </div>
                            
                            <div className="p-6 text-center space-y-4">
                                <div className="mx-auto w-16 h-16 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mb-2">
                                    <Package size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-[var(--text-main)]">New Delivery Offer</h3>
                                
                                <div className="flex items-center justify-center text-[var(--text-muted)]">
                                    <Clock size={16} className="mr-2" />
                                    <span className="font-mono text-xl">{timeRemaining}s</span>
                                </div>

                                <div className="bg-[var(--bg-tertiary)] rounded-2xl p-4 flex flex-col gap-2 text-sm text-[var(--text-muted)]">
                                    {currentOffer.assignment?.stops?.map((stop, i) => (
                                        <div key={i} className="flex items-center gap-3 text-left">
                                            <MapPin size={16} className={stop.type === 'PICKUP' ? 'text-blue-400' : 'text-green-400'} />
                                            <span className="truncate flex-1">{stop.address || `Stop ${i+1}`}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-2 gap-4 mt-6">
                                    <button 
                                        onClick={() => rejectOffer(currentOffer.id)}
                                        className="py-4 rounded-xl font-bold uppercase tracking-wider bg-[var(--bg-tertiary)] text-[var(--text-main)] border border-[var(--border-color)] flex items-center justify-center gap-2 hover:bg-[var(--bg-secondary)]"
                                    >
                                        <X size={20} /> Reject
                                    </button>
                                    <button 
                                        onClick={async () => {
                                            try {
                                                await acceptOffer(currentOffer.id);
                                                navigate('/courier/active');
                                            } catch (error) {
                                                toast.error("Failed to accept offer");
                                            }
                                        }}
                                        className="py-4 rounded-xl font-bold uppercase tracking-wider bg-green-600 text-white flex items-center justify-center gap-2"
                                    >
                                        <Check size={20} /> Accept
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CourierDashboard;
