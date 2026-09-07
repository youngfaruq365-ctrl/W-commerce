import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Radar, Users, Activity, Settings, Package } from 'lucide-react';

const navItems = [
    { to: '/dispatch/console', icon: Radar, label: 'Mission Control' },
    { to: '/dispatch/hub-queue', icon: Package, label: 'Hub Queue' },
    { to: '/dispatch/map', icon: Users, label: 'Fleet Map' },
    { to: '/dispatch/analytics', icon: Activity, label: 'Analytics' },
    { to: '/dispatch/settings', icon: Settings, label: 'Settings' }
];

const DispatchShell = () => {
    return (
        <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col hidden md:flex">
                <div className="h-16 flex items-center px-6 border-b border-slate-800">
                    <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white mr-3">W</div>
                    <span className="font-bold text-lg tracking-wide">Dispatch OS</span>
                </div>
                
                <nav className="flex-1 px-4 py-6 space-y-2">
                    {navItems.map((item) => (
                        <NavLink 
                            key={item.to} 
                            to={item.to}
                            className={({ isActive }) => `
                                flex items-center px-4 py-3 rounded-lg font-medium transition-all
                                ${isActive ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-inner' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}
                            `}
                        >
                            <item.icon size={20} className="mr-3" />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">A</div>
                        <div className="ml-3">
                            <p className="text-sm font-semibold text-white">Admin User</p>
                            <p className="text-xs text-slate-500 uppercase">Dispatcher</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col relative">
                <Outlet />
            </main>
        </div>
    );
};

export default DispatchShell;
