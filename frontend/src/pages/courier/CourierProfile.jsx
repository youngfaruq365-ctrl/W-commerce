import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCourierStore } from '../../store/courierStore';
import { useAuthStore } from '../../store/authStore';
import { User, Settings, Shield, LogOut, Star, Award, ChevronRight } from 'lucide-react';
import EditProfile from '../../modules/buyer/EditProfile';
import ApplyProModal from './ApplyProModal';

const CourierProfile = () => {
    const { profile, activeVehicle, fetchProfile, profileError } = useCourierStore();
    const { logout } = useAuthStore();
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [showProModal, setShowProModal] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    if (isEditing) {
        return <EditProfile onCancel={() => setIsEditing(false)} />;
    }

    return (
        <div className="p-4 pr-12 space-y-6">
            <header className="pt-6 pb-2 flex justify-between items-center">
                <h1 className="text-2xl font-bold text-[var(--text-main)]">Profile</h1>
                <button 
                    onClick={() => setIsEditing(true)}
                    className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                >
                    <Settings size={24} />
                </button>
            </header>

            <div className="relative flex items-center space-x-4 bg-white/50 dark:bg-black/50 backdrop-blur-[24px] p-4 border border-white/60 dark:border-white/10 rounded-[2rem] shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] overflow-hidden">
                <div className="absolute inset-0 pointer-events-none rounded-[2rem]" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 100%)', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.5)' }} />
                <div className="relative z-10 flex w-full items-center space-x-4">
                {profileError ? (
                    <div className="flex flex-col items-center justify-center w-full space-y-2 py-2">
                        <p className="text-red-400 text-sm">{profileError}</p>
                        <button onClick={() => fetchProfile(true)} className="px-4 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-bold">Retry</button>
                    </div>
                ) : profile ? (
                    <>
                        <div className="w-16 h-16 bg-white/50 dark:bg-black/50 rounded-full flex items-center justify-center text-2xl font-bold text-[var(--text-muted)] border border-white/80 dark:border-white/20 overflow-hidden shadow-inner">
                            {profile?.user?.avatarUrl ? (
                                <img src={profile.user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                                profile?.user?.fullName?.charAt(0) || 'C'
                            )}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[var(--text-main)] flex items-center">
                                {profile?.user?.fullName || 'Courier'}
                                {profile?.isPro && (
                                    <span className="ml-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center">
                                        <Award size={12} className="mr-1" /> PRO
                                    </span>
                                )}
                            </h2>
                            <div className="flex items-center text-amber-500 dark:text-amber-400 text-sm font-semibold mt-1">
                                <Star size={14} className="fill-amber-500 dark:fill-amber-400 mr-1" />
                                {profile?.metrics?.rating || '5.0'} <span className="text-[var(--text-muted)] opacity-70 ml-1 font-normal">({profile?.metrics?.completedDeliveries || 0} trips)</span>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center w-full space-x-4">
                        <div className="w-16 h-16 bg-white/20 dark:bg-white/5 rounded-full animate-pulse border border-white/50" />
                        <div className="flex-1 space-y-2">
                            <div className="h-6 bg-white/20 dark:bg-white/5 rounded animate-pulse w-1/2 border border-white/30" />
                            <div className="h-4 bg-white/20 dark:bg-white/5 rounded animate-pulse w-1/3 border border-white/30" />
                        </div>
                    </div>
                )}
                </div>
            </div>

            {/* Pro Courier Application Card */}
            {!profile?.isPro && (
                <div 
                    onClick={() => setShowProModal(true)}
                    className="relative p-[1.5px] rounded-[1.5rem] cursor-pointer shadow-[0_8px_32px_0_rgba(99,102,241,0.25)] hover:shadow-[0_15px_40px_0_rgba(99,102,241,0.35)] transition-all mt-4 overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 group-hover:scale-105 transition-transform duration-500" />
                    <div className="relative bg-white/80 dark:bg-black/80 backdrop-blur-[24px] rounded-[1.4rem] p-4 flex items-center justify-between border-t border-white/50">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-inner">
                                <Award size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-[var(--text-main)] flex items-center">
                                    Pro Courier <span className="ml-2 bg-gradient-to-r from-amber-200 to-yellow-400 text-yellow-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide shadow-sm">Apply</span>
                                </h3>
                                <p className="text-xs text-[var(--text-muted)] mt-0.5">Unlock premium rates & exclusive perks</p>
                            </div>
                        </div>
                        <ChevronRight size={20} className="text-[var(--text-muted)]" />
                    </div>
                </div>
            )}

            <div className="space-y-2 mt-4">
                <h3 className="text-[10px] font-black text-[var(--text-muted)] opacity-70 uppercase tracking-widest pl-2">Active Vehicle</h3>
                <div className="relative bg-white/50 dark:bg-black/50 backdrop-blur-[24px] p-4 border border-white/60 dark:border-white/10 rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.1)] overflow-hidden">
                    <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 100%)', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.4)' }} />
                    <div className="relative z-10 flex justify-between items-center">
                        <div>
                            <p className="text-[var(--text-main)] font-bold">{activeVehicle?.type ? activeVehicle.type.charAt(0).toUpperCase() + activeVehicle.type.slice(1).toLowerCase() : 'Motorcycle'}</p>
                            <p className="text-[var(--text-muted)] text-xs font-black tracking-widest uppercase mt-1">{activeVehicle?.licensePlate || 'ABJ-123-XY'}</p>
                        </div>
                        <span className="bg-emerald-500/10 text-emerald-500 px-3 py-1.5 rounded-xl text-[10px] font-black border border-emerald-500/20 shadow-inner">
                            VERIFIED
                        </span>
                    </div>
                </div>
            </div>

            <div className="space-y-2 pt-4">
                <h3 className="text-[10px] font-black text-[var(--text-muted)] opacity-70 uppercase tracking-widest pl-2">Account</h3>
                <div className="relative bg-white/50 dark:bg-black/50 backdrop-blur-[24px] border border-white/60 dark:border-white/10 rounded-[1.5rem] overflow-hidden shadow-[0_8px_32px_0_rgba(31,38,135,0.1)] divide-y divide-black/5 dark:divide-white/5">
                    <div className="absolute inset-0 pointer-events-none rounded-[1.5rem]" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 100%)', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.4)' }} />
                    <button 
                        onClick={() => setIsEditing(true)}
                        className="relative z-10 w-full flex items-center justify-between p-4 text-left hover:bg-black/5 dark:hover:bg-white/5 transition"
                    >
                        <span className="flex items-center text-[var(--text-main)] font-bold">
                            <User size={18} className="mr-3 text-[var(--text-muted)] drop-shadow-sm" /> Personal Info
                        </span>
                    </button>
                    <button 
                        onClick={() => navigate('/courier/onboarding')}
                        className="relative z-10 w-full flex items-center justify-between p-4 text-left hover:bg-black/5 dark:hover:bg-white/5 transition"
                    >
                        <span className="flex items-center text-[var(--text-main)] font-bold">
                            <Shield size={18} className="mr-3 text-[var(--text-muted)] drop-shadow-sm" /> Documents & Verification
                        </span>
                    </button>
                </div>
            </div>

            <div className="pt-6">
                <button 
                    onClick={() => logout()}
                    className="relative w-full flex items-center justify-center p-4 rounded-2xl border border-red-500/30 text-red-500 font-bold bg-white/40 dark:bg-black/40 backdrop-blur-[24px] hover:bg-red-500/10 transition shadow-[0_8px_32px_0_rgba(239,68,68,0.1)] overflow-hidden"
                >
                    <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{ boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.4)' }} />
                    <LogOut size={18} className="mr-2 relative z-10" /> <span className="relative z-10">Sign Out</span>
                </button>
            </div>
        <ApplyProModal isOpen={showProModal} onClose={() => setShowProModal(false)} />
        </div>
    );
};

export default CourierProfile;

