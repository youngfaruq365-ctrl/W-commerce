import React, { useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, ListTodo, Map, Wallet, UserCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { OfflineIndicator } from '../components/delivery/OfflineIndicator';
import { useTrackingStore } from '../store/trackingStore';
import { WPageTransition } from '../components/motion/WPageTransition';

const navItems = [
    { to: '/courier/dashboard', icon: LayoutDashboard, label: 'Dash' },
    { to: '/courier/queue', icon: ListTodo, label: 'Queue' },
    { to: '/courier/active', icon: Map, label: 'Active' },
    { to: '/courier/earnings', icon: Wallet, label: 'Earn' },
    { to: '/courier/profile', icon: UserCircle, label: 'Profile' }
];

const CourierShell = () => {
    const connectionStatus = useTrackingStore(state => state.connectionStatus);
    const initRealtime = useTrackingStore(state => state.initRealtime);
    const isOffline = !navigator.onLine || connectionStatus === 'disconnected';

    useEffect(() => {
        initRealtime();
    }, [initRealtime]);

    return (
        <div className="flex flex-col h-[100dvh] bg-[var(--bg-primary)] text-[var(--text-main)] overflow-hidden font-sans">
            <OfflineIndicator isOffline={isOffline} />
            
            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20 relative">
                <WPageTransition>
                    <Outlet />
                </WPageTransition>
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-[420px] neu-panel rounded-[2.5rem] z-50">
                
                <div className="flex justify-around items-center h-[80px] px-2 relative z-10">
                    {navItems.map((item) => (
                        <NavLink 
                            key={item.to} 
                            to={item.to}
                            className={({ isActive }) => `
                                relative flex flex-col items-center justify-center w-[66px] h-[66px] rounded-[1.5rem] transition-all duration-300
                                ${isActive ? 'text-[var(--text-main)] scale-105' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}
                            `}
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive && (
                                        <motion.div 
                                            layoutId="courierNavIndicator"
                                            className="absolute inset-0 neu-button rounded-[1.5rem]"
                                            initial={false}
                                            transition={{ type: "spring", stiffness: 350, damping: 25 }}
                                        />
                                    )}
                                    <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} className="relative z-10 drop-shadow-sm" />
                                    <span className="text-[10px] font-black tracking-widest mt-1 relative z-10 uppercase drop-shadow-sm">{item.label}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </div>
            </nav>
        </div>
    );
};

export default CourierShell;
