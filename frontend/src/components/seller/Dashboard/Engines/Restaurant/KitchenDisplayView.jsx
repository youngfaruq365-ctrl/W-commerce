import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, ChefHat, Bell, Flame } from 'lucide-react';

const KitchenDisplayView = () => {
  const [tickets, setTickets] = useState([
    { id: 'TKT-101', table: '4', time: '12m', status: 'cooking', items: ['2x Wagyu Burger (Medium)', '1x Truffle Fries', '2x Coke'], urgent: true },
    { id: 'TKT-102', table: '12', time: '8m', status: 'new', items: ['1x Caesar Salad', '1x Grilled Salmon'], urgent: false },
    { id: 'TKT-103', table: 'Takeaway', time: '5m', status: 'new', items: ['3x Pepperoni Pizza'], urgent: false },
    { id: 'TKT-104', table: '2', time: '20m', status: 'ready', items: ['1x Ribeye Steak', '1x Mashed Potatoes', '1x Red Wine'], urgent: false },
  ]);

  const updateStatus = (id, newStatus) => {
    setTickets(tickets.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  const getStatusColor = (status, urgent) => {
    if (status === 'ready') return 'bg-green-500/10 border-green-500/50';
    if (urgent) return 'bg-red-500/10 border-red-500/50 animate-pulse';
    if (status === 'cooking') return 'bg-orange-500/10 border-orange-500/50';
    return 'bg-gray-800 border-gray-600';
  };

  const columns = [
    { id: 'new', title: 'New Tickets', icon: Bell, color: 'text-gray-200' },
    { id: 'cooking', title: 'Cooking', icon: Flame, color: 'text-orange-400' },
    { id: 'ready', title: 'Ready / QA', icon: CheckCircle, color: 'text-green-400' }
  ];

  return (
    <div className="bg-[#0f1115] p-6 min-h-[800px] flex flex-col font-sans text-gray-200 h-full rounded-2xl shadow-[inset_0_0_50px_rgba(0,0,0,0.5)]">
      <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
        <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tighter">
          <ChefHat className="text-orange-500" size={32} />
          KITCHEN DISPLAY
        </h1>
        <div className="flex gap-4 items-center">
          <div className="bg-gray-800 px-4 py-2 rounded-lg font-bold text-sm border border-gray-700">
            Avg Prep: <span className="text-orange-400">14m</span>
          </div>
          <div className="bg-gray-800 px-4 py-2 rounded-lg font-bold text-sm border border-gray-700">
            Active: <span className="text-white">{tickets.length}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 h-full">
        {columns.map(col => (
          <div key={col.id} className="bg-black/50 border border-gray-800 rounded-xl p-4 flex flex-col shadow-xl">
            <div className={`flex items-center gap-2 mb-4 font-bold text-lg ${col.color} border-b border-gray-800 pb-2`}>
              <col.icon size={20} />
              {col.title}
              <span className="ml-auto bg-gray-800 text-white text-xs px-2 py-1 rounded-full">
                {tickets.filter(t => t.status === col.id).length}
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {tickets.filter(t => t.status === col.id).map(ticket => (
                <motion.div 
                  layout
                  key={ticket.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`p-4 rounded-xl border ${getStatusColor(ticket.status, ticket.urgent)} shadow-lg cursor-pointer transition-transform hover:scale-[1.02]`}
                  onClick={() => {
                    if (ticket.status === 'new') updateStatus(ticket.id, 'cooking');
                    else if (ticket.status === 'cooking') updateStatus(ticket.id, 'ready');
                    else updateStatus(ticket.id, 'new'); // reset for demo
                  }}
                >
                  <div className="flex justify-between items-start mb-3 border-b border-gray-700/50 pb-2">
                    <div>
                      <h3 className="font-bold text-white text-lg">{ticket.id}</h3>
                      <p className="text-sm font-bold text-gray-400">Table {ticket.table}</p>
                    </div>
                    <div className={`flex items-center gap-1 font-bold text-sm ${ticket.urgent ? 'text-red-400' : 'text-gray-300'}`}>
                      <Clock size={14} /> {ticket.time}
                    </div>
                  </div>
                  <ul className="space-y-1 mb-4">
                    {ticket.items.map((item, i) => (
                      <li key={i} className="text-sm font-medium text-gray-200 pl-2 border-l-2 border-gray-600">
                        {item}
                      </li>
                    ))}
                  </ul>
                  {ticket.status === 'new' && (
                    <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  className="w-full bg-orange-500 hover:bg-orange-600 text-black font-black py-2 rounded-lg text-sm transition-colors">START COOKING</button>
                  )}
                  {ticket.status === 'cooking' && (
                    <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  className="w-full bg-green-500 hover:bg-green-600 text-black font-black py-2 rounded-lg text-sm transition-colors">MARK READY</button>
                  )}
                  {ticket.status === 'ready' && (
                    <div className="text-center font-bold text-green-400 text-sm tracking-widest bg-green-900/30 py-2 rounded-lg border border-green-500/30">AWAITING PICKUP</div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KitchenDisplayView;
