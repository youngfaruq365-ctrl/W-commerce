import React from 'react';
import { useCourierStore } from '../../store/courierStore';
import { useAuthStore } from '../../store/authStore';
import { User, Settings, Shield, LogOut, Star } from 'lucide-react';

const CourierProfile = () => {
    const { profile, activeVehicle } = useCourierStore();
    const { logout } = useAuthStore();

    return (
        <div className="p-4 space-y-6">
            <header className="pt-6 pb-2 flex justify-between items-center">
                <h1 className="text-2xl font-bold text-[var(--text-main)]">Profile</h1>
                <button className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
                    <Settings size={24} />
                </button>
            </header>

            <div className="flex items-center space-x-4 bg-[var(--bg-secondary)] p-4 border border-[var(--border-color)] rounded-2xl shadow-sm">
                {profile ? (
                    <>
                        <div className="w-16 h-16 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center text-2xl font-bold text-[var(--text-muted)] border border-[var(--border-color)]">
                            {profile?.user?.fullName?.charAt(0) || 'C'}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[var(--text-main)]">{profile?.user?.fullName || 'Courier'}</h2>
                            <div className="flex items-center text-amber-500 dark:text-amber-400 text-sm font-semibold mt-1">
                                <Star size={14} className="fill-amber-500 dark:fill-amber-400 mr-1" />
                                {profile?.metrics?.rating || '5.0'} <span className="text-[var(--text-muted)] opacity-70 ml-1 font-normal">({profile?.metrics?.completedDeliveries || 0} trips)</span>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center w-full space-x-4">
                        <div className="w-16 h-16 bg-[var(--bg-tertiary)] rounded-full animate-pulse" />
                        <div className="flex-1 space-y-2">
                            <div className="h-6 bg-[var(--bg-tertiary)] rounded animate-pulse w-1/2" />
                            <div className="h-4 bg-[var(--bg-tertiary)] rounded animate-pulse w-1/3" />
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <h3 className="text-xs font-bold text-[var(--text-muted)] opacity-70 uppercase tracking-widest pl-2">Active Vehicle</h3>
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-4 rounded-xl flex justify-between items-center shadow-sm">
                    <div>
                        <p className="text-[var(--text-main)] font-semibold">Motorcycle</p>
                        <p className="text-[var(--text-muted)] text-sm font-mono mt-1">{activeVehicle?.licensePlate || 'ABJ-123-XY'}</p>
                    </div>
                    <span className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-xs font-bold border border-green-500/20">
                        VERIFIED
                    </span>
                </div>
            </div>

            <div className="space-y-2 pt-4">
                <h3 className="text-xs font-bold text-[var(--text-muted)] opacity-70 uppercase tracking-widest pl-2">Account</h3>
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl overflow-hidden divide-y divide-[var(--border-color)] shadow-sm">
                    <button className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--bg-tertiary)] transition">
                        <span className="flex items-center text-[var(--text-main)] font-medium">
                            <User size={18} className="mr-3 text-[var(--text-muted)]" /> Personal Info
                        </span>
                    </button>
                    <button className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--bg-tertiary)] transition">
                        <span className="flex items-center text-[var(--text-main)] font-medium">
                            <Shield size={18} className="mr-3 text-[var(--text-muted)]" /> Documents & Verification
                        </span>
                    </button>
                </div>
            </div>

            <div className="pt-6">
                <button 
                    onClick={() => logout()}
                    className="w-full flex items-center justify-center p-4 rounded-xl border border-red-500/20 text-red-500 font-bold bg-red-500/5 hover:bg-red-500/10 transition"
                >
                    <LogOut size={18} className="mr-2" /> Sign Out
                </button>
            </div>
        </div>
    );
};

export default CourierProfile;
