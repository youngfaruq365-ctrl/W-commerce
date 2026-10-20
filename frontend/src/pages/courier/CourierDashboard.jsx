import React, { useEffect } from 'react';
import { useCourierStore } from '../../store/courierStore';
import { useTrackingStore } from '../../store/trackingStore';
import { useOfferStore } from '../../store/offerStore';
import { useDeliveryStore } from '../../store/deliveryStore';
import { geolocationService } from '../../services/realtime/geolocationService';
import { realtimeClient } from '../../services/realtime/socketClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Power, TrendingUp, Navigation, Loader2, MapPin, Package, Clock, X, Check, Star, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import NotificationBell from '../../components/shared/NotificationBell';
import { PLACEHOLDER_MAP } from '@/constants/placeholders';

const CourierDashboard = () => {
    const { profile, availability, setAvailability, earnings, fetchProfile, fetchEarnings, profileLoading, dashboard, fetchDashboard } = useCourierStore();
    const { gpsStatus } = useTrackingStore();
    const { currentOffer, timeRemaining, setOffer, acceptOffer, rejectOffer } = useOfferStore();
    const { queue, fetchQueue } = useDeliveryStore();
    const navigate = useNavigate();
    const isOnline = availability === 'ONLINE';

    useEffect(() => {
        fetchProfile();
        fetchEarnings();
        fetchDashboard();
        fetchQueue();
    }, [fetchProfile, fetchEarnings, fetchDashboard, fetchQueue]);

    useEffect(() => {
        const setupPush = async () => {
            if ('serviceWorker' in navigator && 'PushManager' in window) {
                try {
                    const permission = await Notification.requestPermission();
                    if (permission === 'granted') {
                        const swRegistration = await navigator.serviceWorker.register('/sw.js');
                        const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
                        
                        if (!vapidPublicKey) {
                            console.warn('VITE_VAPID_PUBLIC_KEY is not set. Push notifications disabled.');
                            return;
                        }

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
                            console.log('Push subscription successful', subscription);
                        } catch {
                            console.warn('Failed to subscribe to push');
                        }
                    }
                } catch (error) { 
                    console.warn('Failed to setup push notifications:', error); 
                }
            }
        };
        setupPush();
    }, []);

    useEffect(() => {
        const handleOffer = (offer) => {
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
                fetchQueue(true);
            } else {
                geolocationService.stopTracking();
            }
        } catch (error) {
            toast.error('Failed to update availability. Please try again.');
            await fetchProfile();
        }
    };

    if (profileLoading && !profile) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[50vh]">
                <Loader2 className="animate-spin text-emerald-500" size={40} />
            </div>
        );
    }

    const isPro = profile?.user?.subscriptionTier === 'COURIER_PRO';

    return (
        <div className="w-full max-w-[1180px] mx-auto p-4 md:p-8 space-y-8 min-h-screen">
            {/* Header */}
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-[var(--text-main)] flex items-center gap-2">
                        Courier OS
                    </h1>
                    <p className="text-[var(--text-muted)] font-medium text-sm mt-1">
                        Welcome back, {profile?.user?.fullName?.split(' ')[0] || 'Rider'}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <NotificationBell />
                </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="neu-card p-6 flex flex-col items-center text-center justify-center relative overflow-hidden">
                    <h3 className="text-[11px] font-black tracking-widest uppercase text-[var(--text-muted)] mb-2">Today's Jobs</h3>
                    <p className="text-3xl font-black text-[var(--text-main)]">{(dashboard?.deliveriesCompleted || 0) + (dashboard?.pending?.length || 0)}</p>
                </div>
                
                <div className="neu-card p-6 flex flex-col items-center text-center justify-center">
                    <h3 className="text-[11px] font-black tracking-widest uppercase text-[var(--text-muted)] mb-2">Earnings</h3>
                    <p className="text-3xl font-black text-blue-600">&#8358;{(dashboard?.earningsToday || earnings.today || 0).toLocaleString()}</p>
                </div>

                <div className="neu-card p-6 flex flex-col items-center text-center justify-center">
                    <h3 className="text-[11px] font-black tracking-widest uppercase text-[var(--text-muted)] mb-2">Distance</h3>
                    <p className="text-3xl font-black text-purple-600">{Math.round((dashboard?.deliveriesCompleted || 0) * 3.75)} km</p>
                </div>

                <div 
                    onClick={toggleStatus}
                    className={`neu-card p-6 flex flex-col items-center text-center justify-center cursor-pointer transition-colors ${isOnline ? 'neu-card-pressed' : ''}`}
                >
                    <h3 className="text-[11px] font-black tracking-widest uppercase text-[var(--text-muted)] mb-2">Status</h3>
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></div>
                        <p className={`text-xl font-black ${isOnline ? 'text-emerald-500' : 'text-gray-500'}`}>
                            {isOnline ? 'Online' : 'Offline'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
               {/* Nearby delivery requests */}
               <div className="neu-panel p-6 flex flex-col h-[500px]">
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="text-xl font-black">Nearby Requests</h3>
                     <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> Live
                     </span>
                  </div>
                  <div className="flex-1 overflow-y-auto hide-scrollbar space-y-4 pr-2">
                     {/* If there is an offer, show it first */}
                     {currentOffer && (
                        <div className="p-4 rounded-xl border-2 border-emerald-500/50 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors">
                           <div className="flex justify-between items-start mb-2">
                              <div>
                                 <p className="font-bold text-lg text-emerald-600">New Delivery Offer</p>
                                 <p className="text-xs font-bold text-emerald-500/80 uppercase tracking-wider">{timeRemaining}s remaining</p>
                              </div>
                              <p className="font-black text-xl text-[var(--text-main)]">&#8358;{currentOffer.amount || '1,200'}</p>
                           </div>
                           <div className="space-y-2 mt-4 mb-4">
                               {currentOffer.assignment?.stops?.map((stop, i) => (
                                   <div key={i} className="flex items-center gap-3 text-sm">
                                       <div className={`w-2 h-2 rounded-full ${stop.type === 'PICKUP' ? 'bg-blue-500' : 'bg-rose-500'}`}></div>
                                       <span className="truncate flex-1 font-medium">{stop.address || `Stop ${i+1}`}</span>
                                   </div>
                               ))}
                           </div>
                           <div className="flex gap-2 mt-2">
                              <button onClick={() => acceptOffer(currentOffer.id)} className="flex-1 neu-button bg-emerald-500 !text-white !border-none text-sm py-2">Accept</button>
                              <button onClick={() => rejectOffer(currentOffer.id)} className="flex-1 neu-button text-sm py-2">Reject</button>
                           </div>
                        </div>
                     )}

                     {/* Actual requests from queue */}
                     {!isOnline ? (
                         <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)] opacity-70">
                             <Power size={32} className="mb-2 text-gray-400" />
                             <p className="font-bold text-sm">Go online to see nearby requests</p>
                         </div>
                     ) : queue.length === 0 ? (
                         <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)] opacity-70">
                             <Package size={32} className="mb-2 text-gray-400" />
                             <p className="font-bold text-sm">No nearby requests right now</p>
                         </div>
                     ) : (
                         queue.slice(0, 5).map(assignment => {
                            const order = assignment.order || {};
                            let pricing = {};
                            try { pricing = JSON.parse(assignment.pricingSnapshot || "{}"); } catch (e) {}
                            
                            const fee = parseFloat(assignment.customerDeliveryFee || order.shippingCost || 0);
                            const payout = pricing.deliverRate || (fee * 0.8).toFixed(2);
                            const pickupLocation = pricing.pickupLocation || order.store?.storeName || order.storeName || 'Seller Location';
                            const dropoffAddress = order.shippingAddress || 'Customer Address';

                            return (
                               <div key={assignment.id} className="flex flex-col p-4 rounded-xl hover:bg-[var(--bg-secondary)] transition-colors border border-[var(--border-color)]">
                                  <div className="flex justify-between items-start mb-2">
                                     <div>
                                        <p className="font-bold text-sm">{order.orderType === 'FREIGHT' ? 'Freight Delivery' : 'Package Delivery'}</p>
                                        <p className="text-xs text-[var(--text-muted)] mt-0.5">Order #{order.id?.substring(0, 6)}</p>
                                     </div>
                                     <p className="font-black text-sm">&#8358;{parseFloat(payout).toLocaleString()}</p>
                                  </div>
                                  <div className="mt-2 text-xs font-medium text-[var(--text-muted)] flex items-center gap-2">
                                     <MapPin size={12} className="text-blue-500 min-w-3" />
                                     <span className="truncate">{pickupLocation} &rarr; {dropoffAddress}</span>
                                  </div>
                               </div>
                            );
                         })
                     )}
                  </div>
               </div>

               {/* Live Route Map */}
               <div className="neu-panel p-6 flex flex-col h-[500px]">
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="text-xl font-black">Live Route</h3>
                     <button
                        className="text-xs font-bold text-blue-500 uppercase tracking-wider hover:underline"
                        onClick={() => navigate('/courier/map')}
                     >
                        Open Map
                     </button>
                  </div>

                  {/* overflow:clip lets child content be visually clipped without blocking pointer-events */}
                  <div
                     className="flex-1 rounded-xl relative border border-[var(--border-color)]"
                     style={{ overflow: 'clip' }}
                  >
                     {/* Background map image */}
                     <img
                        src={PLACEHOLDER_MAP}
                        alt="Map Route"
                        className="absolute inset-0 w-full h-full object-cover grayscale opacity-70"
                     />
                     {/* Dark overlay */}
                     <div className="absolute inset-0 bg-black/30" />

                     {/* SVG Route lines using viewBox so coordinates are percentage-based */}
                     <svg
                        className="absolute inset-0 w-full h-full pointer-events-none z-10"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                     >
                        {/* Ghost path */}
                        <path
                           d="M 12 80 Q 45 25 88 52"
                           stroke="rgba(255,255,255,0.15)"
                           strokeWidth="1.8"
                           strokeLinecap="round"
                           fill="none"
                           vectorEffect="non-scaling-stroke"
                        />
                        {/* Animated active route */}
                        <motion.path
                           d="M 12 80 Q 45 25 88 52"
                           stroke="#006cff"
                           strokeWidth="1.8"
                           strokeLinecap="round"
                           fill="none"
                           strokeDasharray="4 4"
                           vectorEffect="non-scaling-stroke"
                           animate={{ strokeDashoffset: [0, -8] }}
                           transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                        />
                     </svg>

                     {/* Pickup marker — bottom-left */}
                     <motion.div
                        className="absolute w-4 h-4 bg-white rounded-full z-20 cursor-pointer"
                        style={{ bottom: '18%', left: '10%' }}
                        whileHover={{ scale: 1.7, boxShadow: '0 0 18px rgba(255,255,255,0.95)' }}
                     >
                        <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-70" />
                     </motion.div>

                     {/* Dropoff marker — right side */}
                     <motion.div
                        className="absolute w-5 h-5 bg-emerald-400 border-2 border-white rounded-full z-20 cursor-pointer"
                        style={{ top: '40%', right: '10%' }}
                        whileHover={{ scale: 1.7, boxShadow: '0 0 18px rgba(52,211,153,0.95)' }}
                     />

                     {/* Floating navigation pin — clickable, navigates to full map */}
                     <motion.div
                        className="absolute z-30 cursor-pointer"
                        style={{ top: '38%', left: '44%', transform: 'translate(-50%, -50%)' }}
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        whileHover={{ scale: 1.12 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => navigate('/courier/map')}
                     >
                        <div className="relative">
                           <div className="absolute -inset-3 bg-blue-500/40 rounded-full blur-md animate-pulse" />
                           <div className="w-14 h-14 bg-black rounded-full shadow-2xl flex items-center justify-center border-4 border-white relative z-10 hover:border-blue-400 transition-colors">
                              <Navigation
                                 size={24}
                                 className="text-white fill-white"
                                 style={{ transform: 'rotate(45deg)' }}
                              />
                           </div>
                        </div>
                     </motion.div>

                     {/* Bottom CTA — also navigates to full map */}
                     <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20">
                        <button
                           onClick={() => navigate('/courier/map')}
                           className="bg-black/70 backdrop-blur-sm text-white text-xs font-bold px-4 py-1.5 rounded-full border border-white/20 hover:bg-blue-600 transition-colors whitespace-nowrap"
                        >
                           Open Full Map &rarr;
                        </button>
                     </div>
                  </div>
               </div>
            </div>
        </div>
    );
};

export default CourierDashboard;
