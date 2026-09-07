import React, { useEffect } from 'react';
import { useDispatchStore } from '../../store/dispatchStore';
import { CourierCard } from '../../components/delivery/CourierCard';
import { DeliveryCard } from '../../components/delivery/DeliveryCard';
import { Users, Package, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const DispatchConsole = () => {
    const { 
        unassignedOrders, fleet, fetchFleet, fetchUnassignedOrders, 
        assignOrderToCourier, unassignedLoading, fleetLoading,
        matches, matchesLoading, fetchMatches
    } = useDispatchStore();

    useEffect(() => {
        fetchFleet();
        fetchUnassignedOrders();
    }, [fetchFleet, fetchUnassignedOrders]);

    useEffect(() => {
        if (unassignedOrders.length > 0) {
            fetchMatches(unassignedOrders[0].id);
        }
    }, [unassignedOrders, fetchMatches]);

    const handleAssign = async (courierId) => {
        // Find the first unassigned order to assign (for demo UI flow)
        if (!unassignedOrders.length) return;
        const orderId = unassignedOrders[0].id;
        try {
            await assignOrderToCourier(orderId, courierId);
            toast.success('Courier assigned successfully');
        } catch (error) {
            toast.error('Failed to assign courier');
        }
    };

    return (
        <div className="flex-1 flex flex-col lg:flex-row h-full">
            {/* Left Column: Unassigned Orders */}
            <div className="w-full lg:w-1/3 border-r border-slate-800 bg-slate-950 flex flex-col">
                <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                    <h2 className="text-white font-bold flex items-center">
                        <Package size={18} className="mr-2 text-blue-400" /> 
                        Unassigned Orders
                    </h2>
                    <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-2 py-1 rounded-full">{unassignedOrders.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {unassignedLoading && !unassignedOrders.length ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" /></div>
                    ) : unassignedOrders.length === 0 ? (
                        <div className="text-center text-slate-500 py-10">No unassigned orders</div>
                    ) : (
                        unassignedOrders.map(order => (
                            <DeliveryCard key={order.id} assignment={order} highlighted={unassignedOrders[0]?.id === order.id} />
                        ))
                    )}
                </div>
            </div>

            {/* Middle/Right Column: Couriers */}
            <div className="flex-1 flex flex-col bg-slate-900/20">
                <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                    <h2 className="text-white font-bold flex items-center">
                        <Users size={18} className="mr-2 text-green-400" /> 
                        Available Fleet
                    </h2>
                    <div className="flex gap-2">
                        <span className="bg-green-500/10 text-green-400 text-xs font-bold px-2 py-1 rounded border border-green-500/20">
                            {fleet.filter(c => c.status === 'ONLINE').length} Online
                        </span>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                    {unassignedOrders.length > 0 && (
                        <div className="mb-6 bg-blue-900/20 border border-blue-500/20 rounded-xl p-4">
                            <h3 className="text-blue-400 font-bold mb-2">Assigning Order #{unassignedOrders[0]?.id?.substring(0,6)}</h3>
                            <p className="text-sm text-slate-400">Select a courier below to dispatch this order.</p>
                        </div>
                    )}

                    {matchesLoading || (fleetLoading && !fleet.length) ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-green-500" /></div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {(unassignedOrders.length > 0 && matches.length > 0 ? matches : fleet.map(c => ({ courier: c, score: null, distance: null }))).map((match) => (
                                <CourierCard 
                                    key={match.courier.id} 
                                    courier={match.courier} 
                                    matchScore={match.score}
                                    distance={match.distance}
                                    onAssign={() => handleAssign(match.courier.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DispatchConsole;
