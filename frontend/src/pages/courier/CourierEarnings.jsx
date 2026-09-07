import React, { useEffect, useState } from 'react';
import { useCourierStore } from '../../store/courierStore';
import { realtimeClient } from '../../services/realtime/socketClient';
import { Wallet, TrendingUp, History, ArrowUpRight, Loader2, MapPin, CheckCircle, Package, Calendar, ChevronRight, Activity } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const CourierEarnings = () => {
    const { earnings, earningHistory, earningsLoading, fetchEarnings } = useCourierStore();
    const [selectedEarning, setSelectedEarning] = useState(null);

    useEffect(() => {
        fetchEarnings();

        // Listen for socket events to update real-time
        const handleStatusUpdate = (data) => {
            if (data.newStatus === 'DELIVERED') {
                fetchEarnings(true); // Force refetch
            }
        };

        if (realtimeClient.socket) {
            realtimeClient.socket.on('delivery:status', handleStatusUpdate);
        }

        return () => {
            if (realtimeClient.socket) {
                realtimeClient.socket.off('delivery:status', handleStatusUpdate);
            }
        };
    }, []);

    const formatDate = (dateString) => {
        const d = new Date(dateString);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + d.toLocaleDateString();
    };

    // Mock chart data for week
    const chartData = [
        { day: 'Mon', value: 12000 },
        { day: 'Tue', value: 18000 },
        { day: 'Wed', value: 15000 },
        { day: 'Thu', value: 24000 },
        { day: 'Fri', value: 32000 },
        { day: 'Sat', value: 28000 },
        { day: 'Sun', value: 19000 },
    ];
    const maxChartValue = Math.max(...chartData.map(d => d.value));

    return (
        <div className="p-4 space-y-6 pb-24 min-h-screen bg-[var(--bg-primary)]">
            <header className="pt-6 pb-4 border-b border-[var(--border-color)] flex justify-between items-center sticky top-0 bg-[var(--bg-primary)]/80 backdrop-blur-lg z-10">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-[var(--text-main)] flex items-center">
                        Earnings
                        {earningsLoading && <Loader2 size={18} className="ml-3 text-[var(--accent-primary)] animate-spin" />}
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1">Track your income & analytics</p>
                </div>
            </header>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-3xl p-6 shadow-xl relative overflow-hidden group"
            >
                <div className="absolute -right-10 -top-10 w-48 h-48 bg-[var(--accent-primary)] opacity-10 rounded-full blur-3xl pointer-events-none group-hover:opacity-20 transition-opacity duration-500"></div>
                <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-blue-500 opacity-10 rounded-full blur-3xl pointer-events-none group-hover:opacity-20 transition-opacity duration-500"></div>
                
                <div className="flex items-center text-[var(--text-muted)] mb-3">
                    <Wallet size={18} className="mr-2 text-[var(--accent-primary)]" />
                    <span className="text-xs font-bold uppercase tracking-widest">Available Balance</span>
                </div>
                <div className="text-5xl font-black text-[var(--text-main)] font-mono tracking-tight mb-2">
                    ₦{earnings.balance?.toLocaleString() || '0'}
                </div>
                
                <button className="mt-8 w-full bg-gradient-to-r from-[var(--accent-primary)] to-blue-600 hover:from-[var(--accent-primary)] hover:to-blue-500 text-white font-bold py-4 rounded-2xl transition-all shadow-lg hover:shadow-[var(--accent-primary)]/20 flex items-center justify-center group/btn">
                    Withdraw Funds 
                    <ArrowUpRight size={20} className="ml-2 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                </button>
            </motion.div>

            <div className="grid grid-cols-2 gap-4">
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl p-5 shadow-lg hover:shadow-xl transition-shadow"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Today</div>
                        <div className="p-2 bg-green-500/10 text-green-500 rounded-lg"><TrendingUp size={16} /></div>
                    </div>
                    <div className="text-2xl font-black text-[var(--text-main)] font-mono">₦{earnings.today?.toLocaleString() || '0'}</div>
                </motion.div>
                <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl p-5 shadow-lg hover:shadow-xl transition-shadow"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">This Week</div>
                        <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg"><Calendar size={16} /></div>
                    </div>
                    <div className="text-2xl font-black text-[var(--text-main)] font-mono">₦{earnings.thisWeek?.toLocaleString() || '0'}</div>
                </motion.div>
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl p-6 shadow-lg"
            >
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[var(--text-main)] font-bold text-lg flex items-center">
                        <Activity size={18} className="mr-2 text-[var(--accent-primary)]" /> Analytics
                    </h3>
                </div>
                <div className="flex items-end justify-between h-40 gap-2">
                    {chartData.map((data, index) => (
                        <div key={data.day} className="flex flex-col items-center flex-1 group">
                            <div className="w-full relative h-full flex flex-col justify-end">
                                <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--bg-tertiary)] text-[var(--text-main)] text-[10px] py-1 px-2 rounded font-bold shadow-lg whitespace-nowrap z-10 left-1/2 -translate-x-1/2">
                                    ₦{data.value.toLocaleString()}
                                </div>
                                <motion.div 
                                    initial={{ height: 0 }}
                                    animate={{ height: `${(data.value / maxChartValue) * 100}%` }}
                                    transition={{ duration: 1, delay: 0.2 + (index * 0.1), ease: "easeOut" }}
                                    className="w-full bg-gradient-to-t from-[var(--accent-primary)]/50 to-[var(--accent-primary)] rounded-t-lg group-hover:opacity-80 transition-opacity"
                                />
                            </div>
                            <span className="text-[10px] font-bold text-[var(--text-muted)] mt-2 uppercase">{data.day}</span>
                        </div>
                    ))}
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
            >
                <h3 className="text-[var(--text-main)] font-bold text-lg mb-4 flex items-center px-2">
                    <History size={18} className="mr-2 text-[var(--text-muted)]" /> Recent Trips
                </h3>
                <div className="space-y-3">
                    {earningHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl border-dashed">
                            <History size={40} className="text-[var(--text-muted)] opacity-50 mb-3" />
                            <div className="text-[var(--text-muted)] font-medium text-sm">No recent earnings</div>
                        </div>
                    ) : (
                        earningHistory.map((earning, idx) => (
                            <motion.div 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + (idx * 0.1) }}
                                key={earning.id} 
                                onClick={() => setSelectedEarning(earning)}
                                className="group flex justify-between items-center p-5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-2xl cursor-pointer active:scale-95 transition-all shadow-sm hover:shadow-md"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                                        <Package size={20} className="text-[var(--accent-primary)]" />
                                    </div>
                                    <div>
                                        <p className="text-[var(--text-main)] font-bold">{earning.description || `Delivery #${earning.assignmentId?.slice(-6) || 'N/A'}`}</p>
                                        <p className="text-xs text-[var(--text-muted)] font-medium mt-1">{formatDate(earning.createdAt)}</p>
                                    </div>
                                </div>
                                <div className="text-right flex items-center gap-3">
                                    <div>
                                        <p className="text-green-500 font-black font-mono text-lg">+₦{earning.amount.toLocaleString()}</p>
                                        <p className="text-[10px] text-green-500/70 font-bold uppercase tracking-wider mt-1 flex justify-end items-center"><CheckCircle size={10} className="mr-1"/> {earning.status}</p>
                                    </div>
                                    <ChevronRight size={18} className="text-[var(--text-muted)] group-hover:translate-x-1 transition-transform" />
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </motion.div>

            {/* Earning Breakdown Modal */}
            <AnimatePresence>
                {selectedEarning && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedEarning(null)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                        />
                        <motion.div 
                            initial={{ opacity: 0, y: '100%' }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="fixed inset-x-0 bottom-0 z-50 p-4 pb-8"
                        >
                            <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-[var(--accent-primary)] to-blue-500"></div>
                                <div className="flex justify-between items-start mb-8 pt-2">
                                    <div>
                                        <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-black mb-2">Earning Breakdown</div>
                                        <h3 className="text-4xl font-black text-[var(--text-main)] tracking-tight">₦{selectedEarning.amount.toLocaleString()}</h3>
                                        <p className="text-xs text-[var(--text-muted)] font-mono mt-2 bg-[var(--bg-tertiary)] inline-block px-2 py-1 rounded">Ref: {selectedEarning.reference}</p>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedEarning(null)}
                                        className="w-10 h-10 bg-[var(--bg-tertiary)] rounded-full text-[var(--text-main)] hover:bg-[var(--border-color)] transition-colors flex items-center justify-center"
                                    >
                                        ✕
                                    </button>
                                </div>

                                <div className="space-y-4 bg-[var(--bg-primary)] p-5 rounded-2xl border border-[var(--border-color)]">
                                    {selectedEarning.assignment?.pricingSnapshot && (
                                        <>
                                            {(() => {
                                                try {
                                                    const snap = JSON.parse(selectedEarning.assignment.pricingSnapshot);
                                                    return (
                                                        <>
                                                            <div className="flex justify-between items-center pb-3 border-b border-[var(--border-color)] border-dashed">
                                                                <span className="text-[var(--text-muted)] font-medium flex items-center"><MapPin size={14} className="mr-2"/> Distance</span>
                                                                <span className="font-mono text-[var(--text-main)] font-bold">{snap.distanceKm || 0} km</span>
                                                            </div>
                                                            <div className="flex justify-between items-center pb-3 border-b border-[var(--border-color)] border-dashed">
                                                                <span className="text-[var(--text-muted)] font-medium">Base Fee</span>
                                                                <span className="font-mono text-[var(--text-main)] font-bold">₦{snap.baseFee}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center pb-3 border-b border-[var(--border-color)] border-dashed">
                                                                <span className="text-[var(--text-muted)] font-medium">Distance Fee</span>
                                                                <span className="font-mono text-[var(--text-main)] font-bold">₦{((snap.perKm || 0) * (snap.distanceKm || 0)).toLocaleString()}</span>
                                                            </div>
                                                        </>
                                                    );
                                                } catch(e) {
                                                    return null;
                                                }
                                            })()}
                                        </>
                                    )}
                                    <div className="flex justify-between items-center pt-2">
                                        <span className="font-black text-[var(--text-main)] text-lg">Total Earning</span>
                                        <span className="font-mono font-black text-green-500 text-xl">₦{selectedEarning.amount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 mt-4 bg-green-500/10 p-3 rounded-xl">
                                        <span className="text-[var(--text-muted)] font-bold text-xs uppercase">Status</span>
                                        <span className="font-black text-green-500 uppercase text-xs flex items-center tracking-wider">
                                            <CheckCircle size={14} className="mr-1" /> {selectedEarning.status}
                                        </span>
                                    </div>
                                </div>
                                <button className="w-full mt-6 bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] text-[var(--text-main)] font-bold py-4 rounded-xl transition-colors">
                                    Download Receipt
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CourierEarnings;
