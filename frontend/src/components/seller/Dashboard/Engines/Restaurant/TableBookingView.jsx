import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Calendar, Users, Map, Clock, Check, X, Phone, Plus, Filter, Search } from 'lucide-react';
import { motion } from 'framer-motion';

const TableBookingView = () => {
  const [activeTab, setActiveTab] = useState('floor');

  // Dummy Tables for Floor Plan
  const tables = [
    { id: 1, type: 'round', seats: 4, status: 'occupied', x: 20, y: 20 },
    { id: 2, type: 'square', seats: 2, status: 'available', x: 20, y: 60 },
    { id: 3, type: 'rect', seats: 6, status: 'reserved', x: 50, y: 20 },
    { id: 4, type: 'round', seats: 4, status: 'available', x: 80, y: 20 },
    { id: 5, type: 'square', seats: 2, status: 'occupied', x: 80, y: 60 },
  ];

  // Dummy Bookings for Guest List
  const bookings = [
    { id: 'B-1', name: 'Sarah Connor', time: '19:00', partySize: 4, status: 'confirmed', phone: '+1 234 567 890' },
    { id: 'B-2', name: 'John Smith', time: '19:30', partySize: 2, status: 'pending', phone: '+1 987 654 321' },
    { id: 'B-3', name: 'Emily Chen', time: '20:00', partySize: 6, status: 'confirmed', phone: '+1 555 123 456' },
  ];

  const getTableColor = (status) => {
    if (status === 'occupied') return 'bg-red-500 border-red-600 text-white';
    if (status === 'reserved') return 'bg-orange-400 border-orange-500 text-white';
    return 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100 cursor-pointer';
  };

  const getTableShape = (type) => {
    if (type === 'round') return 'rounded-full aspect-square';
    if (type === 'square') return 'rounded-xl aspect-square';
    return 'rounded-xl aspect-[2/1]';
  };

  return (
    <div className="bg-white border border-[var(--border-color)] p-8 rounded-xl min-h-[800px] flex flex-col relative overflow-hidden">
      
      {/* Header */}
      <div className="flex justify-between items-start mb-8 border-b border-[var(--border-color)] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-black mb-2 flex items-center gap-3">
            <Calendar className="text-[var(--accent-gray-dark)]" size={32} />
            Table Reservations
          </h1>
          <p className="text-[var(--text-muted)] text-sm">Manage your floor plan, upcoming bookings, and walk-ins.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  className="bg-white border border-[var(--border-color)] text-black font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors shadow-sm">
            <Filter size={16} /> Filter
          </button>
          <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  className="bg-black hover:bg-gray-900 text-white font-bold px-6 py-2 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-lg">
            <Plus size={16} /> New Walk-in
          </button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 mb-6 bg-[var(--bg-tertiary)] p-1.5 rounded-xl w-fit">
        <button 
          onClick={() => setActiveTab('floor')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'floor' ? 'bg-white text-black shadow-sm' : 'text-[var(--text-muted)] hover:text-black'}`}
        >
          <Map size={16} /> Floor Plan
        </button>
        <button 
          onClick={() => setActiveTab('list')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'list' ? 'bg-white text-black shadow-sm' : 'text-[var(--text-muted)] hover:text-black'}`}
        >
          <Users size={16} /> Guest List
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex gap-8">
        
        {/* Main View Area */}
        <div className="flex-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-2xl relative overflow-hidden flex flex-col shadow-inner">
          
          {activeTab === 'floor' ? (
            <div className="flex-1 relative p-8">
              {/* Dummy Grid Background */}
              <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
              
              {/* Floor Plan Legend */}
              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur border border-[var(--border-color)] p-3 rounded-lg flex gap-4 text-xs font-bold shadow-sm z-10">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-50 border border-green-200" /> Available</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /> Occupied</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-400" /> Reserved</div>
              </div>

              {/* Render Tables */}
              {tables.map(table => (
                <motion.div
                  key={table.id}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  className={`absolute flex items-center justify-center font-bold text-sm border-2 shadow-sm transition-colors ${getTableColor(table.status)} ${getTableShape(table.type)}`}
                  style={{
                    left: `${table.x}%`,
                    top: `${table.y}%`,
                    width: table.type === 'rect' ? '120px' : '70px',
                    height: '70px',
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <div className="flex flex-col items-center">
                    <span>T{table.id}</span>
                    <span className="text-[10px] opacity-70 flex items-center gap-1"><Users size={10} />{table.seats}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex-1 bg-white p-6 overflow-y-auto">
               <div className="relative mb-6">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                 <input type="text" placeholder="Search guests or reservations..." className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl pl-10 pr-4 py-3 font-medium text-sm focus:outline-none focus:border-black transition-colors" />
               </div>
               
               <div className="space-y-4">
                 {bookings.map(booking => (
                   <div key={booking.id} className="border border-[var(--border-color)] rounded-xl p-4 flex justify-between items-center hover:border-black/30 transition-colors group">
                     <div className="flex gap-4 items-center">
                       <div className="bg-[var(--bg-tertiary)] text-black font-mono font-bold px-3 py-2 rounded-lg text-lg border border-[var(--border-color)] text-center w-20 shadow-sm">
                         {booking.time}
                       </div>
                       <div>
                         <h3 className="font-bold text-black text-lg">{booking.name}</h3>
                         <div className="flex items-center gap-4 text-sm text-[var(--text-muted)] mt-1">
                           <span className="flex items-center gap-1"><Users size={14}/> Party of {booking.partySize}</span>
                           <span className="flex items-center gap-1"><Phone size={14}/> {booking.phone}</span>
                         </div>
                       </div>
                     </div>
                     <div className="flex items-center gap-3">
                       {booking.status === 'pending' ? (
                         <>
                           <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors border border-green-200"><Check size={18}/></button>
                           <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors border border-red-200"><X size={18}/></button>
                         </>
                       ) : (
                         <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold uppercase border border-gray-200">Confirmed</span>
                       )}
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          )}
        </div>

        {/* Sidebar Summary */}
        <div className="w-[300px] flex flex-col gap-6 hidden xl:flex">
          <div className="bg-white border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-black mb-4">Today's Overview</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-color)]">
                <span className="text-[var(--text-muted)] text-sm font-medium">Total Bookings</span>
                <span className="font-bold text-xl text-black">{bookings.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-color)]">
                <span className="text-[var(--text-muted)] text-sm font-medium">Expected Guests</span>
                <span className="font-bold text-xl text-black">12</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-50 text-red-700 rounded-lg border border-red-100">
                <span className="text-sm font-medium">Current Wait Time</span>
                <span className="font-bold text-xl">15m</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-black to-gray-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group cursor-pointer hover:shadow-2xl transition-all">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/20 transition-colors" />
             <Clock size={24} className="mb-4 text-gray-300" />
             <h3 className="font-bold text-lg mb-1">Shift Management</h3>
             <p className="text-gray-400 text-sm mb-4">View staff schedules and assign sections to waiters.</p>
             <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  className="text-white text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
               Manage Staff &rarr;
             </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TableBookingView;
