import React, { useEffect, useState } from 'react';
import { Activity, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { apiClient as axios } from '@/utils/apiClient';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const FleetAnalytics = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await axios.get('/api/v1/admin/fleet-analytics');
                if (res.data.success) {
                    setData(res.data.data);
                }
            } catch (err) {
                // console.error("Failed to fetch fleet analytics", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    if (loading || !data) {
        return <div className="p-6 h-full text-white bg-slate-950 flex items-center justify-center">Loading analytics...</div>;
    }

    return (
        <div className="p-6 h-full overflow-y-auto bg-slate-950">
            <header className="mb-8">
                <h1 className="text-2xl font-bold text-white flex items-center">
                    <Activity className="mr-3 text-blue-400" />
                    Fleet Analytics
                </h1>
                <p className="text-slate-400 text-sm mt-1">Performance metrics and SLA monitoring for today.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                    <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center">
                        <Clock size={14} className="mr-2" /> Avg Delivery Time
                    </div>
                    <div className="text-3xl font-bold text-white">{data.avgDeliveryTime}</div>
                    <div className="text-green-400 text-xs mt-2 font-medium">{data.avgDeliveryTimeTrend}</div>
                </div>
                
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                    <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center">
                        <TrendingUp size={14} className="mr-2" /> Total Deliveries
                    </div>
                    <div className="text-3xl font-bold text-white">{data.totalDeliveries}</div>
                    <div className="text-green-400 text-xs mt-2 font-medium">{data.deliveriesTrend}</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                    <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center">
                        <Activity size={14} className="mr-2" /> Fleet Utilization
                    </div>
                    <div className="text-3xl font-bold text-white">{data.fleetUtilization}</div>
                    <div className="text-blue-400 text-xs mt-2 font-medium">{data.utilizationStatus}</div>
                </div>

                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5">
                    <div className="text-red-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center">
                        <AlertTriangle size={14} className="mr-2" /> SLA Breaches
                    </div>
                    <div className="text-3xl font-bold text-red-400">{data.slaBreaches}</div>
                    <div className="text-red-400/70 text-xs mt-2 font-medium">{data.slaStatus}</div>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-96 flex flex-col">
                <h3 className="text-white font-semibold mb-4">Deliveries per Hour</h3>
                <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.chartData}>
                            <defs>
                                <linearGradient id="colorDeliveries" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="time" stroke="#64748b" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <YAxis stroke="#64748b" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }} />
                            <Area type="monotone" dataKey="deliveries" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorDeliveries)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default FleetAnalytics;
