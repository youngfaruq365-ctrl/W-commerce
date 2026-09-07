import React from 'react';
import { ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Area, AreaChart } from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, PackageSearch } from 'lucide-react';

const DashboardCharts = ({ performanceData, products }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full max-w-full overflow-hidden mt-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.5 }}
        className="lg:col-span-2 bg-white/60 backdrop-blur-xl p-5 sm:p-7 rounded-2xl border border-white/40 shadow-[0_8px_32px_rgba(31,38,135,0.07)] hover:shadow-lg hover:border-black/30 transition-all duration-300"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-black flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-black" />
              Sales Trend
            </h3>
            <p className="text-sm text-[var(--text-muted)] mt-1">Last 30 days performance</p>
          </div>
        </div>
        <div className="h-64 sm:h-80 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#000000" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#000000" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#9ca3af" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="name" stroke="#888" tick={{ fill: '#888', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
              <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(value) => `₦${value.toLocaleString()}`} dx={-10} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb', borderRadius: '12px', color: '#000', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                itemStyle={{ color: '#000', fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="sales" stroke="#000000" fillOpacity={1} fill="url(#colorSales)" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0 }} />
              <Area type="monotone" dataKey="visits" stroke="#9ca3af" fillOpacity={1} fill="url(#colorVisits)" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-white/60 backdrop-blur-xl p-5 sm:p-7 rounded-2xl border border-white/40 shadow-[0_8px_32px_rgba(31,38,135,0.07)] hover:shadow-lg hover:border-black/30 transition-all duration-300 flex flex-col"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-black flex items-center gap-2">
              <PackageSearch className="w-5 h-5 text-black" />
              Top Products
            </h3>
            <p className="text-sm text-[var(--text-muted)] mt-1">Best performing items</p>
          </div>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto scrollbar-hide pr-1">
          {[...(products || [])].sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0)).slice(0,5).map((prod, i) => (
            <motion.div 
              key={prod.id || i} 
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ duration: 0.3, delay: i * 0.1 }}
              className="group flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-black transition-all duration-200"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden shadow-sm">
                  <img src={prod.images?.[0]?.url || '/assets/splash_3d_box_1781971684931.png'} alt={prod.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" onError={(e) => { e.target.onerror = null; e.target.src = '/assets/splash_3d_box_1781971684931.png'; }} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-black truncate">{prod.title || `Product ${i}`}</h4>
                  <p className="text-xs text-[var(--text-muted)] truncate">₦{Number(prod.price || 0).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex-shrink-0 ml-4 flex flex-col items-end">
                <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold bg-gray-100 text-black rounded-full">
                  {prod.soldCount || 0} sold
                </span>
              </div>
            </motion.div>
          ))}
          {(!products || products.length === 0) && (
            <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] text-sm">
              <PackageSearch className="w-12 h-12 mb-3 opacity-20" />
              No products listed yet.
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default DashboardCharts;
