import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Package, CheckCircle, Clock, Truck, ChevronRight } from 'lucide-react';
import { apiClient as axios } from '../../utils/apiClient';

const HubQueue = () => {
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);

    const fetchPackages = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/v1/hub/packages');
            const data = res.data;
            if (data.success) {
                setPackages(data.packages);
            } else {
                toast.error(data.message || 'Failed to fetch packages');
            }
        } catch (err) {
            toast.error('Error fetching hub packages');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPackages();
    }, []);

    const handleConsolidate = async (id) => {
        try {
            setProcessingId(id);
            const res = await axios.post(`/api/v1/hub/packages/${id}/consolidate`, {});
            const data = res.data;
            if (data.success) {
                toast.success('Package consolidated and dispatched successfully!');
                fetchPackages();
            } else {
                toast.error(data.message || 'Failed to consolidate package');
            }
        } catch (err) {
            toast.error('Error consolidating package');
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto w-full">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center">
                        <Package className="mr-3 text-blue-500" size={32} />
                        Hub Consolidation Queue
                    </h1>
                    <p className="text-slate-400 mt-2">Manage and dispatch consolidated packages</p>
                </div>
                <button 
                    onClick={fetchPackages}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                    Refresh Queue
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : packages.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
                    <Package className="mx-auto text-slate-600 mb-4" size={48} />
                    <h3 className="text-xl font-medium text-white mb-2">No Packages in Queue</h3>
                    <p className="text-slate-400">There are currently no consolidated packages waiting at the hub.</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {packages.map((pkg) => {
                        const subOrders = pkg.subOrders || [];
                        const allArrived = subOrders.length > 0 && subOrders.every(order => order.hubStatus === 'ARRIVED');
                        
                        return (
                            <div key={pkg.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col md:flex-row gap-6">
                                <div className="flex-1">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="text-lg font-semibold text-white tracking-tight">Package #{pkg.id.substring(0, 8).toUpperCase()}</h3>
                                                {allArrived ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                                                        <CheckCircle size={12} className="mr-1" />
                                                        Ready for Dispatch
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                        <Clock size={12} className="mr-1" />
                                                        Waiting for Items
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-400">Buyer: <span className="text-slate-200 font-medium">{pkg.buyerName || (pkg.buyer && pkg.buyer.name) || 'Unknown'}</span></p>
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <h4 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">Sub-Orders ({subOrders.length})</h4>
                                        <div className="space-y-2">
                                            {subOrders.map(order => (
                                                <div key={order.id} className="flex items-center justify-between p-3 bg-slate-950/50 rounded-lg border border-slate-800/50">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-slate-200">Order #{order.id.substring(0, 8).toUpperCase()}</span>
                                                        <span className="text-xs text-slate-500">Seller: {order.seller?.storeName || 'Unknown'}</span>
                                                    </div>
                                                    <div>
                                                        {order.hubStatus === 'ARRIVED' ? (
                                                            <span className="text-xs font-medium text-green-400 flex items-center">
                                                                <CheckCircle size={14} className="mr-1" /> Arrived
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs font-medium text-slate-400 flex items-center">
                                                                <Truck size={14} className="mr-1" /> In Transit
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            {subOrders.length === 0 && (
                                                <p className="text-sm text-slate-500 italic">No sub-orders attached.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex flex-col justify-end min-w-[200px] border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
                                    <button
                                        onClick={() => handleConsolidate(pkg.id)}
                                        disabled={!allArrived || processingId === pkg.id || pkg.status === 'DISPATCHED'}
                                        className={`
                                            w-full flex items-center justify-center py-3 px-4 rounded-lg font-medium transition-all
                                            ${allArrived && pkg.status !== 'DISPATCHED'
                                                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20' 
                                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'}
                                        `}
                                    >
                                        {processingId === pkg.id ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : pkg.status === 'DISPATCHED' ? (
                                            'Already Dispatched'
                                        ) : (
                                            <>
                                                Consolidate & Dispatch
                                                <ChevronRight size={18} className="ml-2" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default HubQueue;
