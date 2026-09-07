import React from 'react';
import { useDeliveryStore } from '../../store/deliveryStore';
import { DeliveryCard } from '../../components/delivery/DeliveryCard';
import { useNavigate } from 'react-router-dom';

const DeliveryQueue = () => {
    const { queue, setActiveDelivery } = useDeliveryStore();
    const navigate = useNavigate();

    return (
        <div className="p-4 space-y-4">
            <header className="pt-6 pb-2 border-b border-[var(--border-color)] mb-4">
                <h1 className="text-2xl font-bold text-[var(--text-main)]">Delivery Queue</h1>
                <p className="text-[var(--text-muted)] text-sm">You have {queue?.length || 0} pending assignments.</p>
            </header>

            {!queue?.length ? (
                <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)] opacity-70">
                    <div className="w-16 h-16 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center mb-4">
                        📦
                    </div>
                    <p>No deliveries in queue</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {queue.map(assignment => (
                        <DeliveryCard 
                            key={assignment.id} 
                            assignment={assignment} 
                            onClick={() => {
                                setActiveDelivery(assignment);
                                navigate('/courier/active');
                            }} 
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default DeliveryQueue;
