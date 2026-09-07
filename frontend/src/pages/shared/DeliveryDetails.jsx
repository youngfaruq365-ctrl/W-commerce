import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDeliveryStore } from '../../store/deliveryStore';
import { Package, User, Clock, ArrowLeft } from 'lucide-react';
import DeliveryTimeline from '../../components/delivery/DeliveryTimeline';

const DeliveryDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { queue, activeDelivery, deliveryHistory } = useDeliveryStore();

    // Find the delivery across all state categories
    const safeQueue = Array.isArray(queue) ? queue : [];
    const safeHistory = Array.isArray(deliveryHistory) ? deliveryHistory : [];
    const delivery = activeDelivery?.id === id ? activeDelivery 
                   : (safeQueue.find(d => d.id === id) || safeHistory.find(d => d.id === id));

    if (!delivery) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">Delivery Not Found</h2>
                    <p className="text-slate-400 mb-6">The requested delivery could not be located in your current session.</p>
                    <button onClick={() => navigate(-1)} className="px-6 py-2 bg-blue-600 rounded-lg font-bold">Go Back</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col">
            <header className="p-4 border-b border-slate-800 bg-slate-900 sticky top-0 z-10 flex items-center">
                <button onClick={() => navigate(-1)} className="p-2 mr-3 bg-slate-800 text-white rounded-full">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-white font-bold text-lg">Order #{String(delivery.id).substring(0,8)}</h1>
                    <span className="text-blue-400 text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                        {delivery.status}
                    </span>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 max-w-2xl mx-auto w-full">
                
                {/* Timeline */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                    <h3 className="text-white font-bold mb-4 flex items-center">
                        <Clock size={16} className="mr-2 text-slate-400" /> Tracking Timeline
                    </h3>
                    <DeliveryTimeline status={delivery.status} />
                </div>

                {/* Customer Info */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                    <h3 className="text-white font-bold mb-4 flex items-center">
                        <User size={16} className="mr-2 text-slate-400" /> Customer Information
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between border-b border-slate-800 pb-2">
                            <span className="text-slate-400 text-sm">Name</span>
                            <span className="text-white font-medium">{delivery.order?.user?.fullName || 'Guest User'}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-800 pb-2">
                            <span className="text-slate-400 text-sm">Phone</span>
                            <span className="text-white font-medium">{delivery.order?.user?.phone || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col border-b border-slate-800 pb-2">
                            <span className="text-slate-400 text-sm mb-1">Delivery Address</span>
                            <span className="text-white font-medium">{delivery.dropoffAddress}</span>
                        </div>
                    </div>
                </div>

                {/* Package Details */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-8">
                    <h3 className="text-white font-bold mb-4 flex items-center">
                        <Package size={16} className="mr-2 text-slate-400" /> Package Details
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between border-b border-slate-800 pb-2">
                            <span className="text-slate-400 text-sm">Items</span>
                            <span className="text-white font-medium">{delivery.order?.items?.length || 1} items</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-800 pb-2">
                            <span className="text-slate-400 text-sm">Weight (Est)</span>
                            <span className="text-white font-medium">{delivery.packageWeight || '1.5 kg'}</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default DeliveryDetails;
