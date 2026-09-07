import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const DeliveryStatus = ({ status, className }) => {
    const getStatusConfig = (s) => {
        switch (s) {
            case 'PENDING':
                return { label: 'PENDING', bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' };
            case 'ASSIGNED':
            case 'COURIER_ACCEPTED':
                return { label: 'DISPATCHED', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' };
            case 'EN_ROUTE_TO_PICKUP':
            case 'ARRIVED_AT_PICKUP':
            case 'PICKED_UP':
            case 'IN_TRANSIT':
            case 'ARRIVED_AT_DESTINATION':
                return { label: 'ACTIVE', bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' };
            case 'DELIVERED':
                return { label: 'DELIVERED', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' };
            case 'FAILED':
            case 'CANCELLED':
            case 'REJECTED':
                return { label: 'FAILED', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' };
            case 'RESCHEDULED':
                return { label: 'RESCHEDULED', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' };
            default:
                return { label: s || 'UNKNOWN', bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' };
        }
    };

    const config = getStatusConfig(status);

    return (
        <span className={twMerge(
            clsx(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                config.bg, config.text, config.border
            ),
            className
        )}>
            {config.label}
        </span>
    );
};
