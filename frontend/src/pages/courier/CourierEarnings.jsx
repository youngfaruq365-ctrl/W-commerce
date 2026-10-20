import React, { useEffect, useState } from 'react';
import { useCourierStore } from '../../store/courierStore';
import { realtimeClient } from '../../services/realtime/socketClient';
import { Wallet, TrendingUp, History, ArrowUpRight, Loader2, MapPin, CheckCircle, Package, Calendar, ChevronRight, Activity, Zap, CreditCard } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

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
    }, [fetchEarnings]);

    const formatDate = (dateString) => {
        const d = new Date(dateString);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + d.toLocaleDateString();
    };

    // Generate chart data from earningHistory (current week)
    const chartData = React.useMemo(() => {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const data = days.map(day => ({ day, value: 0 }));
        
        if (earningHistory && earningHistory.length > 0) {
            // Only consider earnings from the last 7 days
            const now = new Date();
            const weekAgo = new Date();
            weekAgo.setDate(now.getDate() - 7);
            
            earningHistory.forEach(item => {
                const d = new Date(item.createdAt);
                if (d >= weekAgo) {
                    let dayIndex = d.getDay() - 1; // 0 is Sunday, so Sunday-1 = -1
                    if (dayIndex === -1) dayIndex = 6; // Make Sunday the last element
                    data[dayIndex].value += item.amount;
                }
            });
        }
        return data;
    }, [earningHistory]);

    const maxChartValue = Math.max(...chartData.map(d => d.value), 1000); // at least 1000 to prevent divide by 0

    return (
        <div className="p-4 space-y-6 pb-24 min-h-screen bg-[var(--bg-primary)] relative overflow-hidden">
            {/* Background glowing orbs (Removed) */}
            <header className="pt-6 pb-4 flex justify-between items-center sticky top-0 bg-[var(--bg-primary)]/60 backdrop-blur-2xl z-20 border-b border-[var(--border-color)]">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-[var(--text-main)] flex items-center gap-2">
                        Earnings
                        {earningsLoading && <Loader2 size={18} className="text-[var(--accent-primary)] animate-spin" />}
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1 font-medium">Track your income & analytics</p>
                </div>
            </header>

            {/* Premium Credit Card Style Balance */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 rounded-[2.5rem] p-8 shadow-[0_20px_50px_-12px_rgba(30,58,138,0.5)] overflow-hidden group text-white border border-white/10"
            >
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay pointer-events-none"></div>
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500/30 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-400/40 transition-colors duration-700"></div>
                <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-[var(--accent-primary)]/30 rounded-full blur-3xl pointer-events-none group-hover:bg-[var(--accent-primary)]/40 transition-colors duration-700"></div>
                
                <div className="relative z-10 flex items-center justify-between mb-4">
                    <div className="flex items-center text-blue-200">
                        <Wallet size={20} className="mr-2" />
                        <span className="text-xs font-black uppercase tracking-widest">Available Balance</span>
                    </div>
                    <CreditCard size={24} className="text-white/30" />
                </div>
                
                <div className="relative z-10 text-5xl md:text-6xl font-black font-mono tracking-tighter mb-8 drop-shadow-lg">
                    <span className="text-blue-300">₦</span>{earnings.balance?.toLocaleString() || '0'}
                </div>
                
                <motion.div 
                    className="relative z-10 w-full bg-white/10 text-white font-black py-4 rounded-2xl flex items-center justify-center overflow-hidden border border-white/20"
                >
                    <span className="relative z-10 flex items-center tracking-widest uppercase">
                        Weekly Earn 
                    </span>
                </motion.div>
            </motion.div>

            <div className="grid grid-cols-2 gap-4">
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-[2rem] p-6 shadow-xl relative overflow-hidden group"
                >
                    <div className="absolute -right-8 -top-8 w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-700"></div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">Today</div>
                        <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl shadow-inner"><TrendingUp size={16} /></div>
                    </div>
                    <div className="text-3xl font-black text-[var(--text-main)] font-mono tracking-tighter relative z-10">₦{earnings.today?.toLocaleString() || '0'}</div>
                </motion.div>
                <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-[2rem] p-6 shadow-xl relative overflow-hidden group"
                >
                    <div className="absolute -right-8 -top-8 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-700"></div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">This Week</div>
                        <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl shadow-inner"><Calendar size={16} /></div>
                    </div>
                    <div className="text-3xl font-black text-[var(--text-main)] font-mono tracking-tighter relative z-10">₦{earnings.thisWeek?.toLocaleString() || '0'}</div>
                </motion.div>
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-[2.5rem] p-8 shadow-xl"
            >
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-[var(--text-main)] font-black text-xl flex items-center tracking-tight">
                        <Activity size={20} className="mr-2 text-[var(--accent-primary)]" /> Analytics
                    </h3>
                </div>
                <motion.div 
                    initial={{ opacity: 0, scaleY: 0.8, transformOrigin: 'bottom' }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    transition={{ duration: 1, delay: 0.4 }}
                    className="h-48 w-full mt-2 -ml-2"
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.6} />
                            <XAxis 
                                dataKey="day" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 900, textTransform: 'uppercase' }} 
                                dy={10}
                            />
                            <Tooltip 
                                cursor={{ stroke: 'var(--text-muted)', strokeWidth: 1, strokeDasharray: '4 4' }}
                                contentStyle={{ 
                                    backgroundColor: 'var(--bg-primary)', 
                                    border: '1px solid var(--border-color)', 
                                    borderRadius: '12px',
                                    fontWeight: '900',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                                }}
                                itemStyle={{ color: '#3b82f6' }}
                                formatter={(value) => [`₦${value.toLocaleString()}`, 'Earned']}
                                labelStyle={{ color: 'var(--text-main)' }}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="value" 
                                stroke="#3b82f6" 
                                strokeWidth={4}
                                fillOpacity={1}
                                fill="url(#colorValue)"
                                dot={{ fill: 'var(--bg-primary)', stroke: '#3b82f6', strokeWidth: 3, r: 6 }}
                                activeDot={{ r: 8, fill: '#3b82f6', stroke: 'var(--bg-primary)', strokeWidth: 3 }}
                                isAnimationActive={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </motion.div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
            >
                <h3 className="text-[var(--text-main)] font-black text-xl mb-6 flex items-center px-2 tracking-tight">
                    <History size={20} className="mr-2 text-[var(--text-muted)]" /> Recent Trips
                </h3>
                <div className="space-y-4">
                    {earningHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-[2.5rem] border-dashed">
                            <History size={48} className="text-[var(--text-muted)] opacity-50 mb-4" />
                            <div className="text-[var(--text-muted)] font-bold text-sm tracking-wide">No recent earnings</div>
                        </div>
                    ) : (
                        earningHistory.map((earning, idx) => (
                            <motion.div 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + (idx * 0.1) }}
                                key={earning.id} 
                                onClick={() => setSelectedEarning(earning)}
                                className="group flex justify-between items-center p-6 bg-white/40 dark:bg-black/40 backdrop-blur-md hover:bg-white/60 dark:hover:bg-black/60 border border-white/20 dark:border-white/10 rounded-[2rem] cursor-pointer active:scale-[0.98] transition-all shadow-sm hover:shadow-lg"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)]/10 to-[var(--accent-primary)]/30 border border-[var(--accent-primary)]/20 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all shadow-inner">
                                        <Package size={24} className="text-[var(--accent-primary)]" />
                                    </div>
                                    <div>
                                        <p className="text-[var(--text-main)] font-black text-lg tracking-tight">{earning.description || `Delivery #${earning.assignmentId?.slice(-6) || 'N/A'}`}</p>
                                        <p className="text-xs text-[var(--text-muted)] font-bold tracking-wide mt-1">{formatDate(earning.createdAt)}</p>
                                    </div>
                                </div>
                                <div className="text-right flex items-center gap-4">
                                    <div>
                                        <p className="text-emerald-500 font-black font-mono text-xl tracking-tighter">+₦{earning.amount.toLocaleString()}</p>
                                        <p className="text-[10px] text-emerald-500/70 font-black uppercase tracking-widest mt-1 flex justify-end items-center"><CheckCircle size={10} className="mr-1"/> {earning.status}</p>
                                    </div>
                                    <ChevronRight size={20} className="text-[var(--text-muted)] group-hover:translate-x-1 group-hover:text-[var(--text-main)] transition-all" />
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </motion.div>

            {/* Earning Breakdown Modal */}
            <AnimatePresence>
                {selectedEarning && (
                    <div key="earning-modal">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedEarning(null)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                        />
                        <motion.div 
                            initial={{ opacity: 0, y: '100%', scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: '100%', scale: 0.9 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="fixed inset-x-4 bottom-8 z-50 bg-[var(--bg-secondary)]/90 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.3)] border border-white/10 overflow-hidden"
                        >
                            <div className="p-8">
                                <div className="w-16 h-2 bg-white/20 rounded-full mx-auto mb-8" />
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tight">Trip Details</h3>
                                    <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl shadow-inner">
                                        <CheckCircle size={24} />
                                    </div>
                                </div>
                                
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center py-4 border-b border-white/10">
                                        <span className="text-sm font-bold text-[var(--text-muted)] tracking-wide uppercase">Amount Earned</span>
                                        <span className="text-2xl font-black font-mono text-emerald-500">+₦{selectedEarning.amount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-4 border-b border-white/10">
                                        <span className="text-sm font-bold text-[var(--text-muted)] tracking-wide uppercase">Date & Time</span>
                                        <span className="text-sm font-bold text-[var(--text-main)]">{formatDate(selectedEarning.createdAt)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-4 border-b border-white/10">
                                        <span className="text-sm font-bold text-[var(--text-muted)] tracking-wide uppercase">Delivery ID</span>
                                        <span className="text-sm font-black font-mono text-[var(--text-main)] bg-white/5 px-2 py-1 rounded-md">{selectedEarning.assignmentId?.slice(-6) || 'N/A'}</span>
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={() => setSelectedEarning(null)}
                                    className="mt-10 w-full bg-white/10 hover:bg-white/20 text-[var(--text-main)] font-black tracking-widest uppercase py-4 rounded-2xl transition-colors border border-white/10"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CourierEarnings;
