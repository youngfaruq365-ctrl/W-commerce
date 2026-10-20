import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { MapPin, PackageCheck, Truck, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

const steps = [
    { id: 'ASSIGNED', label: 'Assigned', icon: Clock },
    { id: 'PICKED_UP', label: 'Picked Up', icon: PackageCheck },
    { id: 'IN_TRANSIT', label: 'In Transit', icon: Truck },
    { id: 'DELIVERED', label: 'Delivered', icon: CheckCircle2 },
];

export const DeliveryTimeline = ({ currentStatus, className }) => {
    // Map current status to one of our 4 major timeline steps
    const getStepIndex = (status) => {
        switch (status) {
            case 'PENDING': return -1;
            case 'ASSIGNED':
            case 'COURIER_ACCEPTED':
            case 'EN_ROUTE_TO_PICKUP':
            case 'ARRIVED_AT_PICKUP':
                return 0; // Assigned / Pre-pickup
            case 'PICKED_UP':
                return 1;
            case 'IN_TRANSIT':
            case 'ARRIVED_AT_DESTINATION':
            case 'DELIVERY_VERIFICATION':
                return 2;
            case 'DELIVERED':
                return 3;
            default:
                return -1;
        }
    };

    const currentIndex = getStepIndex(currentStatus);
    const isFailed = currentStatus?.includes('FAILED') || currentStatus?.includes('CANCELLED');

    return (
        <div className={twMerge("flex w-full items-center justify-between", className)}>
            {steps.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = index < currentIndex;
                const isCurrent = index === currentIndex;

                return (
                    <div key={step.id} className="flex flex-col items-center relative flex-1">
                        {/* Connecting Line */}
                        {index !== steps.length - 1 && (
                            <div className={clsx(
                                "absolute top-4 left-1/2 w-full h-[2px] -z-10",
                                index < currentIndex ? "bg-green-500" : "bg-slate-700"
                            )} />
                        )}
                        
                        <div className={clsx(
                            "w-8 h-8 rounded-full flex items-center justify-center border-2 z-10 transition-colors duration-300",
                            isFailed && isCurrent 
                                ? "bg-red-500 border-red-500 text-white animate-pulse"
                                : isCompleted 
                                    ? "bg-green-500 border-green-500 text-slate-950" 
                                    : isCurrent 
                                        ? "bg-green-500 border-green-500 text-slate-950 shadow-[0_0_15px_rgba(34,197,94,0.5)] ring-4 ring-green-500/20"
                                        : "bg-slate-900 border-slate-700 text-slate-500"
                        )}>
                            {isFailed && isCurrent ? (
                                <AlertCircle size={14} />
                            ) : (
                                <Icon size={14} strokeWidth={isCompleted || isCurrent ? 3 : 2} />
                            )}
                        </div>
                        
                        <span className={clsx(
                            "text-[10px] mt-2 font-medium tracking-wide uppercase text-center",
                            isCompleted ? "text-slate-300" : "text-slate-600"
                        )}>
                            {step.label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

export default DeliveryTimeline;
