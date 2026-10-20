import React, { useEffect, useState } from 'react';
import { apiClient as axios } from '@/utils/apiClient';
import { Truck, MapPin, DollarSign, Clock, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

const FreightOffersView = () => {
    const [freightRequests, setFreightRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);

    const fetchFreight = async () => {
        try {
            const res = await axios.get('/api/v1/seller-studio/freight', { withCredentials: true });
            if (res.data.success) {
                setFreightRequests(res.data.data);
            }
        } catch (err) {
            toast.error('Failed to load freight requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFreight();
    }, []);

    const handleAction = async (offerId, action) => {
        setActionLoading(offerId);
        try {
            const res = await axios.post(`/api/v1/seller-studio/freight/offer/${offerId}/${action}`, {}, { withCredentials: true });
            if (res.data.success) {
                toast.success(`Offer ${action}ed!`);
                fetchFreight();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || `Failed to ${action} offer`);
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-gray-400" size={32} /></div>;
    }

    if (freightRequests.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500">
                <Truck size={48} className="mx-auto mb-4 opacity-20" />
                <p>No active freight requests</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-6">
                <Truck className="text-blue-500" />
                Active Freight Requests
            </h2>

            {freightRequests.map(assignment => {
                const pricing = assignment.pricingSnapshot ? JSON.parse(assignment.pricingSnapshot) : {};
                
                return (
                    <div key={assignment.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                        <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-gray-900 mb-1">
                                    Order #{assignment.orderId.substring(0, 8)}
                                </h3>
                                <div className="flex items-center text-sm text-gray-500 gap-4">
                                    <span className="flex items-center gap-1"><MapPin size={14}/> {pricing.pickupLocation || 'Unknown'}</span>
                                    <span className="flex items-center gap-1 text-gray-400">→</span>
                                    <span className="flex items-center gap-1">{assignment.orderDetails?.shippingAddress || 'Unknown'}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 bg-blue-100 text-blue-700 rounded-lg">
                                    {assignment.status}
                                </span>
                                <p className="text-sm font-semibold text-gray-900 mt-2">
                                    Base Fee: ₦{assignment.customerDeliveryFee?.toLocaleString()}
                                </p>
                            </div>
                        </div>

                        <div className="p-5">
                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Courier Counter-Offers</h4>
                            {assignment.offers?.length > 0 ? (
                                <div className="space-y-3">
                                    {assignment.offers.map(offer => (
                                        <div key={offer.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                                                    {offer.courier.user.fullName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900">{offer.courier.user.fullName}</p>
                                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                                        <Clock size={12}/> {new Date(offer.createdAt).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <p className="text-lg font-bold text-emerald-600">
                                                        ₦{Number(offer.proposedFee).toLocaleString()}
                                                    </p>
                                                    <p className="text-xs text-gray-500">Proposed Fee</p>
                                                </div>
                                                
                                                {offer.status === 'PENDING' ? (
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => handleAction(offer.id, 'accept')}
                                                            disabled={actionLoading === offer.id}
                                                            className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 flex items-center gap-1 font-semibold text-sm disabled:opacity-50"
                                                        >
                                                            <Check size={16}/> Accept
                                                        </button>
                                                        <button 
                                                            onClick={() => handleAction(offer.id, 'reject')}
                                                            disabled={actionLoading === offer.id}
                                                            className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 flex items-center gap-1 font-semibold text-sm disabled:opacity-50"
                                                        >
                                                            <X size={16}/> Reject
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                                                        offer.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                        {offer.status}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-sm">No counter-offers received yet.</p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default FreightOffersView;
