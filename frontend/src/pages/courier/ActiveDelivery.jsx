import React, { useState, useEffect } from 'react';
import { useDeliveryStore } from '../../store/deliveryStore';
import { useTrackingStore } from '../../store/trackingStore';
import { geolocationService } from '../../services/realtime/geolocationService';
import axios from 'axios';
import { MapView } from '../../maps/MapView';
import DeliveryTimeline from '../../components/delivery/DeliveryTimeline';
import ProofVerification from '../../components/delivery/ProofVerification';
import QRScanner from '../../components/delivery/QRScanner';
import { MapPin, Navigation, Phone, CheckCircle2, Loader2, ShieldAlert, AlertTriangle, MessageCircle, X, Send } from 'lucide-react';
import { motion, useAnimation } from 'framer-motion';
import { toast } from 'react-hot-toast';

const SwipeButton = ({ onSwipe, label, colorClass = "bg-green-500", disabled = false, disabledLabel = "" }) => {
    const controls = useAnimation();
    const [loading, setLoading] = useState(false);

    const handleDragEnd = async (e, info) => {
        if (disabled) {
            controls.start({ x: 0 });
            return;
        }
        // Require 60% distance AND velocity > 100, going right
        if (info.offset.x > 180 && info.velocity.x > 100) {
            setLoading(true);
            try {
                // assume onSwipe is async and returns success boolean
                const success = await onSwipe();
                if (!success) {
                    controls.start({ x: 0 }); // Snap back
                }
            } catch {
                controls.start({ x: 0 }); // Snap back
            }
            setLoading(false);
        } else {
            // Not enough distance/velocity, snap back
            controls.start({ x: 0 });
        }
    };

    return (
        <div className={`relative w-full h-20 ${disabled ? 'bg-[var(--bg-tertiary)]' : 'bg-[var(--bg-secondary)] border border-[var(--border-color)]'} rounded-full overflow-hidden flex items-center p-2 shadow-[inset_0_4px_4px_rgba(0,0,0,0.1)] transition-colors duration-300`}>
            <span className={`absolute w-full text-center font-bold tracking-widest uppercase text-sm pointer-events-none pl-12 ${disabled ? 'text-[var(--text-muted)] opacity-50' : 'text-[var(--text-main)]'}`}>
                {loading ? 'Processing...' : (disabled && disabledLabel ? disabledLabel : label)}
            </span>
            <motion.div
                drag={(!loading && !disabled) ? "x" : false}
                dragConstraints={{ left: 0, right: window.innerWidth - 64 - 32 - 16 }} 
                dragElastic={0.05}
                animate={controls}
                onDragEnd={handleDragEnd}
                whileTap={{ scale: disabled ? 1 : 0.95 }}
                className={`w-16 h-16 ${disabled ? 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-[var(--border-color)]' : colorClass + ' text-white'} rounded-full flex items-center justify-center z-10 shadow-lg cursor-grab active:cursor-grabbing transition-colors duration-300`}
            >
                {loading ? <Loader2 className="animate-spin text-slate-950" /> : (disabled ? <ShieldAlert size={20} /> : '→')}
            </motion.div>
        </div>
    );
};

const ActiveDelivery = () => {
    const { activeDelivery, updateDeliveryStatus } = useDeliveryStore();
    const { courierLocations, gpsStatus } = useTrackingStore();
    const [proofModalOpen, setProofModalOpen] = useState(false);
    const [deliveryPin, setDeliveryPin] = useState('');
    const [packingConfirmationCode, setPackingConfirmationCode] = useState('');
    const [chatModalOpen, setChatModalOpen] = useState(false);
    const [chatMessage, setChatMessage] = useState('');
    const [chatSending, setChatSending] = useState(false);
    const [showScanner, setShowScanner] = useState(false);

    const handleSendChat = async () => {
        if (!chatMessage.trim()) return;
        setChatSending(true);
        try {
            await axios.post(`/api/messages/send/delivery/${delivery.id}`, {
                text: chatMessage,
                recipient: delivery.customerPhone // use phone as recipient identifier
            });
            toast.success("Message sent to buyer!");
            setChatMessage('');
            setChatModalOpen(false);
        } catch (error) {
            toast.error("Failed to send message");
        } finally {
            setChatSending(false);
        }
    };

    // Mock an active delivery if none exists for development preview
    const delivery = (activeDelivery && activeDelivery.id) ? activeDelivery : {
        id: 'WC-82931',
        status: 'EN_ROUTE_TO_PICKUP',
        pickupAddress: 'Wuse 2 Central',
        pickupLat: 9.0765,
        pickupLng: 8.4732,
        dropoffAddress: 'Garki Area 1',
        dropoffLat: 9.0620,
        dropoffLng: 8.4800,
        customerPhone: '+234800000000',
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
            // Include lat, lng, and accuracy for geofence validation on backend
            const loc = courierLocations['self'] || {};
            try {
                await updateDeliveryStatus(delivery.id, nextStatus, {
                    lat: loc.lat || 0,
                    lng: loc.lng || 0,
                    accuracy: loc.accuracy || 0
                });
                return true;
            } catch (error) {
                // console.error("Failed to advance status", error);
                return false;
            }
        }
        return false;
    };

    const handleEmergencyBlock = async () => {
        const loc = courierLocations['self'] || {};
        try {
            await updateDeliveryStatus(delivery.id, 'BLOCKED_TRANSIT', {
                lat: loc.lat || 0,
                lng: loc.lng || 0,
                accuracy: loc.accuracy || 0,
                reason: 'Emergency / Transport union (agbero) issue'
            });
            toast.success("Status updated to BLOCKED_TRANSIT");
        } catch (error) {
            // console.error("Failed to update status to blocked", error);
            toast.error("Failed to update status");
        }
    };

    // Calculate geofence state
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
        
        if (!targetLat || !targetLng) return { allowed: true, message: '', distance: 0 }; // No geofence coordinates provided

        const dist = geolocationService.calculateDistanceMeters(loc.lat, loc.lng, targetLat, targetLng);
        
        if (gpsStatus === 'POOR_SIGNAL' || (loc.accuracy && loc.accuracy > 100)) {
            return { allowed: false, message: 'Poor GPS Signal', distance: dist };
        }
        if (dist > 500) {
            return { allowed: false, message: `TOO FAR (${Math.round(dist)}m)`, distance: dist };
        }
        if (dist > 100) {
            return { allowed: false, message: `APPROACHING (${Math.round(dist)}m)`, distance: dist };
        }
        return { allowed: true, message: `READY (${Math.round(dist)}m)`, distance: dist };
    };

    const renderActionArea = () => {
        const geofence = calculateGeofence();
        
        switch (delivery.status) {
            case 'ASSIGNED':
                return <SwipeButton onSwipe={handleStatusAdvance} label="Swipe to Accept" colorClass="bg-blue-500" />;
            case 'COURIER_ACCEPTED':
            case 'EN_ROUTE_TO_PICKUP':
                return (
                    <SwipeButton 
                        onSwipe={handleStatusAdvance} 
                        label={geofence.allowed ? "Arrived at Pickup" : geofence.message}
                        disabled={!geofence.allowed}
                        disabledLabel={`TOO FAR (${Math.round(geofence.distance)}m)`}
                        colorClass={geofence.distance <= 500 && geofence.distance > 100 ? "bg-yellow-500" : "bg-green-500"}
                    />
                );
            case 'ARRIVED_AT_PICKUP':
                return (
                    <div className="flex flex-col gap-3">
                        {showScanner ? (
                            <div className="flex flex-col gap-3">
                                <QRScanner 
                                    onScanSuccess={(decodedText) => {
                                        setShowScanner(false);
                                        setPackingConfirmationCode(decodedText);
                                        toast.success("QR Code scanned! Submitting...");
                                    }}
                                    onScanError={(error) => {
                                        // Optionally handle errors, but often it just logs unreadable frames
                                    }}
                                />
                                <button 
                                    onClick={() => setShowScanner(false)}
                                    className="w-full bg-[var(--bg-tertiary)] text-[var(--text-main)] font-bold py-3 rounded-2xl text-lg border border-[var(--border-color)]"
                                >
                                    Cancel Scan
                                </button>
                            </div>
                        ) : (
                            <>
                                <input 
                                    type="text" 
                                    placeholder="Enter Packing Code" 
                                    className="w-full bg-[var(--bg-tertiary)] text-[var(--text-main)] font-bold py-3 px-4 rounded-xl text-center text-lg border border-[var(--border-color)] focus:outline-none focus:border-green-500 placeholder:text-[var(--text-muted)]"
                                    value={packingConfirmationCode}
                                    onChange={(e) => setPackingConfirmationCode(e.target.value)}
                                />
                                <button 
                                    onClick={() => setShowScanner(true)}
                                    className="w-full bg-blue-500 text-white font-bold py-3 rounded-2xl text-lg shadow-[0_0_20px_rgba(59,130,246,0.3)] mb-2"
                                >
                                    Scan QR Code
                                </button>
                                <button 
                                    onClick={async () => {
                                        if (!packingConfirmationCode) {
                                            toast.error("Please scan a QR code or enter a code first");
                                            return;
                                        }
                                        try {
                                            await axios.post(`/api/v1/delivery/${delivery.id}/verify-pickup`, { qrCode: packingConfirmationCode });
                                            toast.success('Pickup verified! Delivery is now in transit.');
                                            // Refetch delivery state instead of full page reload
                                            if (typeof fetchDelivery === 'function') fetchDelivery();
                                            else setDeliveryStatus('IN_TRANSIT');
                                        } catch (error) {
                                            toast.error(error.response?.data?.message || "Invalid QR Code!");
                                        }
                                    }}
                                    className="w-full bg-green-500 text-white font-bold py-4 rounded-2xl text-lg shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                                >
                                    Verify Pickup (Submit Code)
                                </button>
                            </>
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
                        colorClass={geofence.distance <= 500 && geofence.distance > 100 ? "bg-yellow-500" : "bg-blue-500"}
                    />
                );
            case 'ARRIVED_AT_DESTINATION':
                return (
                    <div className="flex flex-col gap-3">
                        <input 
                            type="text" 
                            placeholder="Enter Delivery PIN" 
                            className="w-full bg-[var(--bg-tertiary)] text-[var(--text-main)] font-bold py-3 px-4 rounded-xl text-center text-lg border border-[var(--border-color)] focus:outline-none focus:border-green-500 placeholder:text-[var(--text-muted)]"
                            value={deliveryPin}
                            onChange={(e) => setDeliveryPin(e.target.value)}
                        />
                        <button 
                            onClick={async () => {
                                try {
                                    await axios.post(`/api/v1/delivery/${delivery.id}/verify-dropoff`, { pin: deliveryPin });
                                    setProofModalOpen(true);
                                } catch (error) {
                                    toast.error(error.response?.data?.message || "Invalid Delivery PIN!");
                                }
                            }}
                            className="w-full bg-green-500 text-white font-bold py-4 rounded-2xl text-lg shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                        >
                            Verify Delivery
                        </button>
                    </div>
                );
            case 'DELIVERY_VERIFICATION': // Transient state handled by modal
                return null;
            case 'DELIVERED':
                return (
                    <div className="w-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 font-bold py-4 rounded-2xl text-lg text-center flex items-center justify-center">
                        <CheckCircle2 className="mr-2" /> Delivery Complete!
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col h-full relative">
            {/* Top Bar */}
            <div className="absolute top-0 left-0 w-full z-20 p-4 bg-gradient-to-b from-[var(--bg-primary)] to-transparent pointer-events-none">
                <div className="bg-[var(--bg-secondary)]/80 backdrop-blur-md border border-[var(--border-color)] rounded-xl p-3 flex justify-between items-center pointer-events-auto shadow-sm">
                    <span className="font-mono font-bold text-[var(--text-main)] tracking-widest text-sm">#{delivery.id.split('-')[0]}</span>
                    <DeliveryTimeline currentStatus={delivery.status} className="w-48" />
                </div>
            </div>

            {/* Map Area */}
            <div className="flex-1 min-h-[50vh]">
                <MapView 
                    activeRoute={delivery} 
                    couriers={[courierLocations['self'] || { lat: delivery.pickupLat, lng: delivery.pickupLng, id: 'self' }]} 
                />
            </div>

            {/* Bottom Sheet Action Area */}
            <div className="bg-[var(--bg-secondary)] rounded-t-3xl border-t border-[var(--border-color)] p-6 shadow-[0_-20px_40px_var(--glass-shadow)] z-20">
                
                {/* Destination info based on state */}
                <div className="mb-6 flex items-start justify-between">
                    <div>
                        <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-widest mb-1">
                            {['ASSIGNED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP'].includes(delivery.status) 
                                ? 'Navigate to Pickup' 
                                : 'Navigate to Dropoff'}
                        </p>
                        <h2 className="text-xl font-bold text-[var(--text-main)] leading-tight">
                            {['ASSIGNED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP'].includes(delivery.status) 
                                ? delivery.pickupAddress 
                                : delivery.dropoffAddress}
                        </h2>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setChatModalOpen(true)}
                            className="w-12 h-12 bg-indigo-600/20 text-indigo-400 rounded-full flex items-center justify-center border border-indigo-500/30 shadow-[0_0_10px_rgba(79,70,229,0.2)]">
                            <MessageCircle size={20} />
                        </button>
                        <button 
                            onClick={async () => {
                                try {
                                    const res = await axios.post(`/api/v1/delivery/${delivery.id}/call`);
                                    if (res.data.success) toast.success(`Call masking active. Dialing: ${res.data.proxyNumber}`);
                                    else toast.error(res.data.message || 'Failed to initiate call');
                                } catch (e) {
                                    // console.error(e);
                                    toast.error('Failed to initiate call');
                                }
                            }}
                            className="w-12 h-12 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center border border-blue-500/30">
                            <Phone size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex items-center text-[var(--text-muted)] mb-8 bg-[var(--bg-tertiary)] p-3 rounded-xl border border-[var(--border-color)]">
                    <Navigation size={16} className="text-blue-500 mr-3" />
                    <span className="font-bold text-[var(--text-main)]">1.8 km</span>
                    <span className="mx-2 opacity-50">•</span>
                    <span>ETA 7 min</span>
                </div>

                {renderActionArea()}
                
                {delivery.status !== 'DELIVERED' && delivery.status !== 'DELIVERY_VERIFICATION' && (
                    <button 
                        onClick={handleEmergencyBlock}
                        className="w-full mt-4 bg-red-500/20 text-red-500 border border-red-500/50 font-bold py-3 rounded-2xl flex items-center justify-center transition-colors hover:bg-red-500/30"
                    >
                        <AlertTriangle className="mr-2" size={20} />
                        Emergency / Blocked in Transit
                    </button>
                )}
            </div>

            {chatModalOpen && (
                <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <motion.div 
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="bg-[var(--bg-secondary)] border border-[var(--border-color)] w-full max-w-md rounded-2xl p-5 shadow-2xl flex flex-col"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-[var(--text-main)] font-bold text-lg">Message Buyer</h3>
                            <button onClick={() => setChatModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex gap-2 mb-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                            <button onClick={() => setChatMessage("I am outside")} className="whitespace-nowrap px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-muted)] rounded-full text-sm hover:bg-[var(--bg-primary)] transition-colors">
                                I am outside
                            </button>
                            <button onClick={() => setChatMessage("I'm 5 minutes away")} className="whitespace-nowrap px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-muted)] rounded-full text-sm hover:bg-[var(--bg-primary)] transition-colors">
                                5 mins away
                            </button>
                            <button onClick={() => setChatMessage("Please call me")} className="whitespace-nowrap px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-muted)] rounded-full text-sm hover:bg-[var(--bg-primary)] transition-colors">
                                Please call me
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <input 
                                type="text"
                                value={chatMessage}
                                onChange={(e) => setChatMessage(e.target.value)}
                                placeholder="Type a message..."
                                className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] px-4 py-3 rounded-xl focus:outline-none focus:border-indigo-500 placeholder:text-[var(--text-muted)]"
                                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                            />
                            <button 
                                onClick={handleSendChat}
                                disabled={chatSending || !chatMessage.trim()}
                                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white w-12 h-12 flex items-center justify-center rounded-xl transition-colors"
                            >
                                {chatSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            <ProofVerification 
                isOpen={proofModalOpen} 
                onClose={() => setProofModalOpen(false)}
                onVerify={async (proof) => {
                    // Send to backend, then advance status
                    try {
                        await updateDeliveryStatus(delivery.id, 'DELIVERED', { proof, deliveryPin });
                    } catch (error) {
                        toast.error("Failed to update delivery status");
                    }
                }}
            />
        </div>
    );
};

export default ActiveDelivery;
