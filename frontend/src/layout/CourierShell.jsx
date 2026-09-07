import React, { useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, ListTodo, Map, Wallet, UserCircle } from 'lucide-react';
import { OfflineIndicator } from '../components/delivery/OfflineIndicator';
import { useTrackingStore } from '../store/trackingStore';

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
            <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20">
                <Outlet />
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 w-full glass-nav pb-safe z-40">
                <div className="flex justify-around items-center h-16 px-2">
                    {navItems.map((item) => (
                        <NavLink 
                            key={item.to} 
                            to={item.to}
                            className={({ isActive }) => `
                                flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors
                                ${isActive ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}
                            `}
                        >
                            <item.icon size={22} strokeWidth={2.5} />
                            <span className="text-[10px] font-semibold tracking-wide">{item.label}</span>
                        </NavLink>
                    ))}
                </div>
            </nav>
        </div>
    );
};

export default CourierShell;
