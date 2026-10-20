import React, { useState, useEffect } from 'react';
import { useDeliveryStore } from '../../store/deliveryStore';
import { useTrackingStore } from '../../store/trackingStore';
import { geolocationService } from '../../services/realtime/geolocationService';
import { apiClient as axios } from '@/utils/apiClient';
import { MapView } from '../../maps/MapView';
import DeliveryTimeline from '../../components/delivery/DeliveryTimeline';
import ProofVerification from '../../components/delivery/ProofVerification';
import QRScanner from '../../components/delivery/QRScanner';
import { MapPin, Navigation, Phone, CheckCircle2, Loader2, ShieldAlert, AlertTriangle, MessageCircle, X, Send, ChevronRight, Package, Map } from 'lucide-react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

const SwipeButton = ({ onSwipe, label, colorClass = "from-emerald-500 to-teal-500", disabled = false, disabledLabel = "" }) => {
    const controls = useAnimation();
    const [loading, setLoading] = useState(false);

    const handleDragEnd = async (e, info) => {
        if (disabled) {
            controls.start({ x: 0 });
            return;
        }
        if (info.offset.x > 180 && info.velocity.x > 100) {
            setLoading(true);
            try {
                const success = await onSwipe();
                if (!success) {
                    controls.start({ x: 0 });
                }
            } catch {
                controls.start({ x: 0 });
            }
            setLoading(false);
        } else {
            controls.start({ x: 0 });
        }
    };

    return (
        <div className={`relative w-full h-16 ${disabled ? 'opacity-50 grayscale' : ''} bg-white/5 border border-white/10 rounded-full overflow-hidden flex items-center p-1.5 transition-all duration-300 group shadow-lg backdrop-blur-md`}>
            {/* Glowing track background when active */}
            {!disabled && (
                <div className={`absolute inset-0 opacity-10 bg-gradient-to-r ${colorClass} blur-xl transition-opacity group-hover:opacity-20`} />
            )}
            
            <span className={`absolute w-full text-center font-bold tracking-widest uppercase text-sm pointer-events-none pl-14 z-10 ${disabled ? 'text-white/40' : 'text-white drop-shadow-md'}`}>
                {loading ? 'Processing...' : (disabled && disabledLabel ? disabledLabel : label)}
            </span>
            
            <motion.div
                drag={(!loading && !disabled) ? "x" : false}
                dragConstraints={{ left: 0, right: window.innerWidth - 32 - 48 - 12 }} 
                dragElastic={0.05}
                animate={controls}
                onDragEnd={handleDragEnd}
                whileTap={{ scale: disabled ? 1 : 0.95 }}
                className={`w-12 h-12 ${disabled ? 'bg-white/10 text-white/50 border border-white/10' : `bg-gradient-to-r ${colorClass} text-white shadow-lg shadow-emerald-500/30`} rounded-full flex items-center justify-center z-20 cursor-grab active:cursor-grabbing transition-colors duration-300 relative shrink-0`}
            >
                {loading ? <Loader2 className="animate-spin text-white w-5 h-5" /> : (disabled ? <ShieldAlert className="w-5 h-5" /> : <ChevronRight className="w-6 h-6 drop-shadow-md" />)}
            </motion.div>
        </div>
    );
};

const ActiveDelivery = () => {
    // Hooks and State
    const { activeDelivery, activeList, isPro, updateDeliveryStatus, fetchActiveDelivery } = useDeliveryStore();
    const { courierLocations, gpsStatus } = useTrackingStore();
    const [proofModalOpen, setProofModalOpen] = useState(false);
    const [deliveryPin, setDeliveryPin] = useState('');
    const [packingConfirmationCode, setPackingConfirmationCode] = useState('');
    const [chatModalOpen, setChatModalOpen] = useState(false);
    const [chatMessage, setChatMessage] = useState('');
    const [chatSending, setChatSending] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [selectedDeliveryId, setSelectedDeliveryId] = useState(null);
    const [incidentModalOpen, setIncidentModalOpen] = useState(false);
    const [incidentType, setIncidentType] = useState('CUSTOMER_UNAVAILABLE');
    const [incidentDescription, setIncidentDescription] = useState('');
    const [incidentBlocks, setIncidentBlocks] = useState(true);
    const [incidentSubmitting, setIncidentSubmitting] = useState(false);

    useEffect(() => {
        fetchActiveDelivery(true);
    }, [fetchActiveDelivery]);

    const selectedActiveDelivery = (isPro && selectedDeliveryId)
        ? (activeList.find(a => a.id === selectedDeliveryId) || activeDelivery)
        : activeDelivery;

    const delivery = (selectedActiveDelivery && selectedActiveDelivery.id)
        ? selectedActiveDelivery
        : (activeDelivery && activeDelivery.id)
            ? activeDelivery
            : null;

    const handleSendChat = async () => {
        if (!chatMessage.trim() || !delivery) return;
        setChatSending(true);
        try {
            const recipientId = delivery.buyerId || delivery.order?.buyerId || delivery.customerId;
            if (recipientId) {
                await axios.post('/api/v1/messages/send', {
                    recipientId,
                    content: `[Delivery #${String(delivery.id).substring(0, 8)}] ${chatMessage}`
                });
            } else {
                await axios.post(`/api/v1/delivery/${delivery.id}/report-incident`, {
                    type: 'COURIER_NOTE',
                    description: chatMessage,
                    blocksDelivery: false
                });
            }
            toast.success("Message sent!");
            setChatMessage('');
            setChatModalOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to send message");
        } finally {
            setChatSending(false);
        }
    };

    const handleStatusAdvance = async () => {
        const flow = [
            'ASSIGNED', 'COURIER_ACCEPTED', 'EN_ROUTE_TO_PICKUP', 
            'ARRIVED_AT_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 
            'ARRIVED_AT_DESTINATION', 'DELIVERY_VERIFICATION', 'DELIVERED'
        ];
        const currentIndex = flow.indexOf(delivery.status);
        if (currentIndex < flow.length - 1) {
            const nextStatus = flow[currentIndex + 1];
            const loc = courierLocations['self'] || {};
            try {
                await updateDeliveryStatus(delivery.id, nextStatus, {
                    lat: loc.lat || 0,
                    lng: loc.lng || 0,
                    accuracy: loc.accuracy || 0
                });
                return true;
            } catch (error) {
                return false;
            }
        }
        return false;
    };

    const handleEmergencyBlock = () => {
        setIncidentModalOpen(true);
    };

    const handleSubmitIncident = async () => {
        if (!incidentDescription.trim()) return toast.error("Please provide a description");
        setIncidentSubmitting(true);
        try {
            await axios.post(`/api/v1/delivery/${delivery.id}/report-incident`, {
                type: incidentType,
                description: incidentDescription,
                blocksDelivery: incidentBlocks
            });
            toast.success("Incident reported to admin");
            setIncidentModalOpen(false);
            setIncidentDescription('');
            if (incidentBlocks) {
                fetchActiveDelivery(true);
            }
        } catch (error) {
            toast.error("Failed to submit report");
        }
        setIncidentSubmitting(false);
    };

    const calculateGeofence = () => {
        const loc = courierLocations['self'];
        if (!loc || !loc.lat) return { allowed: true, message: 'GPS Required', distance: Infinity };
        
        let targetLat, targetLng;
        if (delivery.status === 'EN_ROUTE_TO_PICKUP') {
            targetLat = delivery.pickupLat;
            targetLng = delivery.pickupLng;
        } else if (delivery.status === 'IN_TRANSIT') {
            targetLat = delivery.dropoffLat;
            targetLng = delivery.dropoffLng;
        }
        
        if (!targetLat || !targetLng) return { allowed: true, message: '', distance: 0 };

        const dist = geolocationService.calculateDistanceMeters(loc.lat, loc.lng, targetLat, targetLng);
        const isDev = import.meta.env.DEV;
        
        if (!isDev && (gpsStatus === 'POOR_SIGNAL' || (loc.accuracy && loc.accuracy > 100))) {
            return { allowed: false, message: 'Poor GPS Signal', distance: dist };
        }
        if (!isDev && dist > 500) {
            return { allowed: false, message: `TOO FAR (${Math.round(dist)}m)`, distance: dist };
        }
        if (!isDev && dist > 100) {
            return { allowed: false, message: `APPROACHING (${Math.round(dist)}m)`, distance: dist };
        }
        return { allowed: true, message: isDev ? `DEV READY (${Math.round(dist)}m)` : `READY (${Math.round(dist)}m)`, distance: dist };
    };

    const renderActionArea = () => {
        const geofence = calculateGeofence();
        
        switch (delivery.status) {
            case 'ASSIGNED':
                return <SwipeButton onSwipe={handleStatusAdvance} label="Swipe to Accept" colorClass="from-blue-500 to-indigo-500" />;
            case 'COURIER_ACCEPTED':
            case 'EN_ROUTE_TO_PICKUP':
                return (
                    <SwipeButton 
                        onSwipe={handleStatusAdvance} 
                        label={geofence.allowed ? "Arrived at Pickup" : geofence.message}
                        disabled={!geofence.allowed}
                        disabledLabel={`TOO FAR (${Math.round(geofence.distance)}m)`}
                        colorClass={geofence.distance <= 500 && geofence.distance > 100 ? "from-amber-400 to-orange-500" : "from-emerald-400 to-teal-500"}
                    />
                );
            case 'ARRIVED_AT_PICKUP':
                return (
                    <div className="flex flex-col gap-3">
                        {showScanner ? (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="flex flex-col gap-3"
                            >
                                <div className="rounded-2xl overflow-hidden border border-white/20 shadow-lg bg-black">
                                    <QRScanner 
                                        onScanSuccess={async (decodedText) => {
                                            toast.success("Scanned! Processing...");
                                            setPackingConfirmationCode(decodedText);
                                            try {
                                                await axios.post(`/api/v1/delivery/${delivery.id}/verify-pickup`, { qrCode: decodedText });
                                                toast.success('Pickup verified! Delivery is now in transit.');
                                                fetchActiveDelivery(true);
                                            } catch (error) {
                                                toast.error(error.response?.data?.message || "Invalid QR Code!");
                                            } finally {
                                                setTimeout(() => setShowScanner(false), 500);
                                            }
                                        }}
                                        onScanError={() => {}}
                                    />
                                </div>
                                <button 
                                    onClick={() => setShowScanner(false)}
                                    className="w-full bg-white/10 text-white font-bold tracking-widest uppercase py-3.5 rounded-2xl transition-colors hover:bg-white/20 backdrop-blur-md"
                                >
                                    Cancel Scan
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col gap-3"
                            >
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="Packing Code" 
                                        className="flex-1 bg-black/40 border border-white/10 font-bold tracking-widest py-3.5 px-4 rounded-xl text-center text-lg text-white focus:outline-none focus:border-indigo-500 placeholder:text-white/30 backdrop-blur-md transition-all"
                                        value={packingConfirmationCode}
                                        onChange={(e) => setPackingConfirmationCode(e.target.value)}
                                    />
                                    <button 
                                        onClick={async () => {
                                            if (!packingConfirmationCode) {
                                                toast.error("Please enter a code");
                                                return;
                                            }
                                            toast.loading("Verifying...", { id: 'verify' });
                                            try {
                                                await axios.post(`/api/v1/delivery/${delivery.id}/verify-pickup`, { qrCode: packingConfirmationCode });
                                                toast.success('Pickup verified!', { id: 'verify' });
                                                fetchActiveDelivery(true);
                                            } catch (error) {
                                                toast.error(error.response?.data?.message || "Invalid Code!", { id: 'verify' });
                                            }
                                        }}
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase tracking-wider px-6 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                                    >
                                        Verify
                                    </button>
                                </div>
                                <div className="relative flex items-center justify-center my-1">
                                    <div className="absolute border-t border-white/10 w-full"></div>
                                    <span className="relative bg-[#121212] px-3 text-xs font-bold text-white/40 uppercase tracking-widest">OR</span>
                                </div>
                                <button 
                                    onClick={() => setShowScanner(true)}
                                    className="w-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold uppercase tracking-widest py-3.5 rounded-xl transition-all hover:bg-emerald-500/30 flex items-center justify-center gap-2"
                                >
                                    <Package size={18} />
                                    Scan QR Code
                                </button>
                            </motion.div>
                        )}
                    </div>
                );
            case 'PICKED_UP':
            case 'IN_TRANSIT':
                return (
                    <SwipeButton 
                        onSwipe={handleStatusAdvance} 
                        label={geofence.allowed ? "Arrived at Dropoff" : geofence.message}
                        disabled={!geofence.allowed}
                        disabledLabel={`TOO FAR (${Math.round(geofence.distance)}m)`}
                        colorClass={geofence.distance <= 500 && geofence.distance > 100 ? "from-amber-400 to-orange-500" : "from-blue-500 to-indigo-500"}
                    />
                );
            case 'ARRIVED_AT_DESTINATION':
                return (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col gap-3"
                    >
                        <input 
                            type="text" 
                            placeholder="Enter 4-Digit PIN" 
                            className="w-full bg-black/40 border border-white/10 font-bold tracking-[0.5em] py-4 px-6 rounded-2xl text-center text-2xl text-white focus:outline-none focus:border-indigo-500 placeholder:text-white/20 placeholder:tracking-widest placeholder:text-lg backdrop-blur-md transition-all"
                            value={deliveryPin}
                            onChange={(e) => setDeliveryPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            maxLength={4}
                        />
                        <button 
                            onClick={async () => {
                                if (deliveryPin.length !== 4) {
                                    toast.error("Enter a 4-digit PIN");
                                    return;
                                }
                                toast.loading("Verifying...", { id: 'pin-verify' });
                                try {
                                    await axios.post(`/api/v1/delivery/${delivery.id}/verify-dropoff`, { pin: deliveryPin });
                                    toast.dismiss('pin-verify');
                                    setProofModalOpen(true);
                                } catch (error) {
                                    toast.error(error.response?.data?.message || "Invalid PIN", { id: 'pin-verify' });
                                }
                            }}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold uppercase tracking-widest py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/25"
                        >
                            Verify Delivery
                        </button>
                    </motion.div>
                );
            case 'DELIVERY_VERIFICATION':
                return null;
            case 'DELIVERED':
                return (
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold tracking-widest uppercase py-4 rounded-2xl text-lg text-center flex items-center justify-center shadow-inner"
                    >
                        <CheckCircle2 className="mr-2" size={24} /> Complete
                    </motion.div>
                );
            default:
                return null;
        }
    };

    if (!delivery) {
        return (
            <div className="flex flex-col items-center justify-center h-[100dvh] bg-[#121212] text-white p-6 text-center font-sans">
                <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 text-white/60">
                    <Package size={36} />
                </div>
                <h2 className="text-2xl font-black tracking-tight mb-2">No Active Delivery</h2>
                <p className="text-white/60 text-sm max-w-sm mb-8">
                    You do not have an active delivery right now. Head to your Courier Dashboard to accept available delivery offers.
                </p>
                <a
                    href="/courier/dashboard"
                    className="px-6 py-3.5 rounded-2xl bg-white text-black font-bold text-sm uppercase tracking-wider hover:bg-gray-200 transition-colors"
                >
                    Back to Courier Dashboard
                </a>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[100dvh] relative bg-[#121212] overflow-hidden font-sans">
            
            {/* Top Bar - Completely redesigned as a floating island */}
            <div className="absolute top-0 left-0 w-full z-40 p-4 pointer-events-none flex flex-col gap-3 mt-4">
                <div className="bg-[#1a1a1a]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-4 flex flex-col gap-4 pointer-events-auto shadow-2xl">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-500/20 border border-indigo-500/30 rounded-xl flex items-center justify-center text-indigo-400">
                                <Package size={20} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs text-white/50 font-bold tracking-widest uppercase">Delivery</span>
                                <span className="font-black text-white text-lg tracking-wide">#{String(delivery.id).split('-')[0]}</span>
                            </div>
                        </div>
                        
                        <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border ${
                            gpsStatus === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            gpsStatus === 'POOR_SIGNAL' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            gpsStatus === 'CONNECTING' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                            <span className={`w-2 h-2 rounded-full ${
                                gpsStatus === 'ACTIVE' ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_currentColor]' :
                                gpsStatus === 'POOR_SIGNAL' ? 'bg-amber-400 animate-pulse' :
                                gpsStatus === 'CONNECTING' ? 'bg-blue-400 animate-pulse' :
                                'bg-red-400'
                            }`} />
                            {gpsStatus === 'ACTIVE' ? 'GPS ON' : gpsStatus === 'POOR_SIGNAL' ? 'WEAK GPS' : gpsStatus === 'CONNECTING' ? 'SYNCING' : 'GPS OFF'}
                        </div>
                    </div>
                    
                    {/* Modern thin timeline indicator */}
                    <div className="px-1">
                        <DeliveryTimeline status={delivery.status} currentStatus={delivery.status} className="w-full" />
                    </div>
                </div>

                {/* PRO Multi-Delivery Switcher */}
                {isPro && activeList.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pointer-events-auto">
                        {activeList.map((a, i) => {
                            const isSelected = (selectedDeliveryId || activeDelivery?.id) === a.id;
                            return (
                                <button
                                    key={a.id}
                                    onClick={() => setSelectedDeliveryId(a.id)}
                                    className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold tracking-widest uppercase border transition-all ${
                                        isSelected
                                            ? 'bg-white text-black border-transparent shadow-lg'
                                            : 'bg-[#1a1a1a]/80 text-white/60 border-white/10 backdrop-blur-md hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    #{i + 1}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Map Area - NO MORE DARK VIGNETTES */}
            <div className="absolute inset-0 z-10 bg-[#121212]">
                <MapView
                    activeRoute={delivery}
                    couriers={
                        courierLocations['self']?.lat
                            ? [{ ...courierLocations['self'], id: 'self', name: 'You' }]
                            : [] 
                    }
                />
            </div>

            {/* Bottom Sheet Action Area */}
            <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="absolute bottom-0 left-0 w-full bg-[#121212]/95 backdrop-blur-2xl border-t border-white/10 rounded-t-[2.5rem] p-5 pb-24 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-30"
            >
                {/* Pull indicator */}
                <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6"></div>

                <div className="flex items-start justify-between mb-6">
                    <div className="flex-1 pr-4">
                        <p className="text-xs text-white/50 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                            {['ASSIGNED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP'].includes(delivery.status) 
                                ? <><Navigation size={12} className="text-indigo-400" /> Navigate to Pickup</> 
                                : <><MapPin size={12} className="text-emerald-400" /> Navigate to Dropoff</>}
                        </p>
                        <h2 className="text-xl font-black text-white leading-tight">
                            {['ASSIGNED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP'].includes(delivery.status) 
                                ? delivery.pickupAddress 
                                : delivery.dropoffAddress}
                        </h2>
                    </div>
                    
                    <div className="flex gap-2 shrink-0">
                        <button 
                            onClick={() => setChatModalOpen(true)}
                            className="w-12 h-12 bg-white/5 hover:bg-white/10 text-white rounded-full flex items-center justify-center border border-white/10 transition-colors shadow-lg"
                        >
                            <MessageCircle size={20} />
                        </button>
                        <button 
                            onClick={async () => {
                                try {
                                    const res = await axios.post(`/api/v1/delivery/${delivery.id}/call`);
                                    if (res.data.success) toast.success(`Calling via mask: ${res.data.proxyNumber}`);
                                    else toast.error(res.data.message || 'Call failed');
                                } catch (e) {
                                    toast.error('Failed to initiate call');
                                }
                            }}
                            className="w-12 h-12 bg-white/5 hover:bg-white/10 text-white rounded-full flex items-center justify-center border border-white/10 transition-colors shadow-lg"
                        >
                            <Phone size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    {renderActionArea()}
                    
                    {delivery.status !== 'DELIVERED' && delivery.status !== 'DELIVERY_VERIFICATION' && (
                        <button 
                            onClick={handleEmergencyBlock}
                            className="w-full text-white/40 hover:text-rose-400 font-bold tracking-widest uppercase py-3 text-xs flex items-center justify-center transition-colors"
                        >
                            <AlertTriangle className="mr-1.5" size={14} />
                            Report Issue / Blocked
                        </button>
                    )}
                </div>
            </motion.div>

            {/* Chat Modal */}
            <AnimatePresence>
                {chatModalOpen && (
                    <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            className="bg-[#1a1a1a] border border-white/10 w-full max-w-md rounded-3xl p-6 shadow-2xl flex flex-col"
                        >
                            <div className="flex justify-between items-center mb-5">
                                <h3 className="text-white font-black text-xl">Message Customer</h3>
                                <button onClick={() => setChatModalOpen(false)} className="text-white/40 hover:text-white bg-white/5 p-2 rounded-full transition-colors">
                                    <X size={18} />
                                </button>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 mb-5">
                                {["I am outside", "5 mins away", "Please call me", "Stuck in traffic"].map((msg, i) => (
                                    <button 
                                        key={i}
                                        onClick={() => setChatMessage(msg)} 
                                        className="px-4 py-2 bg-white/5 border border-white/10 text-white/80 font-semibold rounded-full text-sm hover:bg-white/10 hover:text-white transition-colors"
                                    >
                                        {msg}
                                    </button>
                                ))}
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <input 
                                    type="text"
                                    value={chatMessage}
                                    onChange={(e) => setChatMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1 bg-black/40 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-indigo-500 placeholder:text-white/30 transition-all"
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                                />
                                <button 
                                    onClick={handleSendChat}
                                    disabled={chatSending || !chatMessage.trim()}
                                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white w-12 h-12 flex items-center justify-center rounded-xl transition-all"
                                >
                                    {chatSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Incident Modal */}
            <AnimatePresence>
                {incidentModalOpen && (
                    <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            className="bg-[#1a1a1a] border border-white/10 w-full max-w-md rounded-3xl p-6 shadow-2xl flex flex-col"
                        >
                            <div className="flex justify-between items-center mb-5">
                                <h3 className="text-white font-black text-xl">Report Incident to Admin</h3>
                                <button onClick={() => setIncidentModalOpen(false)} className="text-white/40 hover:text-white bg-white/5 p-2 rounded-full transition-colors">
                                    <X size={18} />
                                </button>
                            </div>
                            
                            <select 
                                value={incidentType}
                                onChange={(e) => setIncidentType(e.target.value)}
                                className="w-full bg-[#111] border border-white/10 text-white font-bold p-4 rounded-2xl outline-none focus:border-rose-500/50 mb-4"
                            >
                                <option value="CUSTOMER_UNAVAILABLE">Customer Unavailable</option>
                                <option value="DAMAGED_PARCEL">Damaged Parcel</option>
                                <option value="VEHICLE_BREAKDOWN">Vehicle Breakdown</option>
                                <option value="WEATHER">Weather Delay</option>
                                <option value="OTHER">Other Emergency</option>
                            </select>

                            <textarea
                                value={incidentDescription}
                                onChange={(e) => setIncidentDescription(e.target.value)}
                                placeholder="Describe the issue in detail..."
                                className="w-full h-32 bg-[#111] border border-white/10 text-white font-bold p-4 rounded-2xl outline-none focus:border-rose-500/50 mb-4 resize-none"
                            />

                            <label className="flex items-center gap-3 text-white/70 mb-5 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={incidentBlocks}
                                    onChange={(e) => setIncidentBlocks(e.target.checked)}
                                    className="w-5 h-5 accent-rose-500 rounded"
                                />
                                <span className="text-sm font-semibold">This issue blocks the delivery</span>
                            </label>

                            <button 
                                onClick={handleSubmitIncident}
                                disabled={incidentSubmitting}
                                className="w-full bg-rose-500 hover:bg-rose-400 text-white font-bold py-4 rounded-2xl shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                {incidentSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                                Submit Report
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ProofVerification 
                isOpen={proofModalOpen} 
                onClose={() => setProofModalOpen(false)}
                onVerify={async (proof) => {
                    try {
                        await updateDeliveryStatus(delivery.id, 'DELIVERED', { proof, deliveryPin });
                    } catch (error) {
                        toast.error("Failed to complete delivery");
                    }
                }}
            />
        </div>
    );
};

export default ActiveDelivery;
