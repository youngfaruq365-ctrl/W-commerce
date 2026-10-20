import { PLACEHOLDER_IMAGE } from '@/constants/placeholders';
import { resolveProductImage } from '@/utils/imageHelpers';
import React from 'react';
import { ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Area, AreaChart, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, PackageSearch, AlertTriangle } from 'lucide-react';

const DashboardCharts = ({ performanceData, products, banningRate = 0 }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full max-w-full overflow-hidden mt-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.5 }}
        className="lg:col-span-2 neu-card p-5 sm:p-7 transition-all duration-300"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Sales Trend
            </h3>
            <p className="text-sm text-[var(--text-muted)] mt-1">Last 30 days performance</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-[var(--text-main)]">Sales (₦)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.5)]" />
              <span className="text-[var(--text-muted)]">Visits</span>
            </div>
          </div>
        </div>
        <div className="h-64 sm:h-80 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={performanceData} margin={{ top: 15, right: 15, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" vertical={false} />
              <XAxis dataKey="name" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 500 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} dy={8} />
              <YAxis 
                stroke="#6b7280" 
                tick={{ fill: '#9ca3af', fontSize: 12 }} 
                axisLine={false} 
                tickLine={false} 
                domain={[0, (dataMax) => dataMax > 0 ? Math.ceil(dataMax * 1.25) : 5000]}
                allowDecimals={false}
                tickFormatter={(value) => {
                  if (value >= 1000000) return `₦${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `₦${(value / 1000).toFixed(0)}k`;
                  return `₦${value.toLocaleString()}`;
                }} 
                dx={-6} 
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-[#18181b]/95 border border-white/10 shadow-2xl rounded-2xl p-3.5 backdrop-blur-xl min-w-[130px]">
                      <p className="text-xs font-semibold text-gray-400 mb-2">{label}</p>
                      {payload.map((entry) => (
                        <div key={entry.name} className="flex items-center justify-between gap-3 text-xs py-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.stroke || entry.color }} />
                            <span className="text-gray-300 capitalize font-medium">{entry.name}</span>
                          </div>
                          <span className="font-bold text-white font-mono">
                            {entry.name === 'Sales' || entry.name === 'sales' ? `₦${Number(entry.value || 0).toLocaleString()}` : Number(entry.value || 0).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              <Area type="monotone" dataKey="sales" name="Sales" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" activeDot={{ r: 6, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }} />
              <Area type="monotone" dataKey="visits" name="Visits" stroke="#818cf8" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVisits)" activeDot={{ r: 5, fill: '#818cf8', stroke: '#ffffff', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.5, delay: 0.1 }}
        className="neu-card p-5 sm:p-7 transition-all duration-300 flex flex-col"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
              <PackageSearch className="w-5 h-5 text-[var(--text-main)]" />
              Top Products
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Best performing items</p>
          </div>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto scrollbar-hide pr-1">
          {[...(products || [])].sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0)).slice(0,5).map((prod, i) => (
            <motion.div 
              key={prod.id || i} 
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ duration: 0.3, delay: i * 0.1 }}
              className="group flex items-center justify-between p-3 rounded-xl hover:neu-card-pressed border border-transparent hover:border-[var(--border-color)] transition-all duration-200"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-lg neu-panel flex-shrink-0 overflow-hidden shadow-sm">
                  <img 
                    src={resolveProductImage(prod)} 
                    alt={prod.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" 
                    onError={(e) => { 
                      e.target.onerror = null; 
                      e.target.src = resolveProductImage(prod); 
                    }} 
                  />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-[var(--text-main)] truncate">{prod.title || `Product ${i}`}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">₦{Number(prod.price || 0).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex-shrink-0 ml-4 flex flex-col items-end">
                <span className={`inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold ${prod.stock === 0 ? 'text-red-500' : 'text-[var(--text-main)]'} neu-card-pressed rounded-full`}>
                  {prod.stock === 0 ? 'Sold out' : `${prod.soldCount || 0} sold`}
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
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.5, delay: 0.2 }}
        className="neu-card p-5 sm:p-7 transition-all duration-300 flex flex-col"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Banning Rate
            </h3>
            <p className="text-sm text-[var(--text-muted)] mt-1">Store suspension risk</p>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center relative min-h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[
                  { name: 'Rate', value: banningRate },
                  { name: 'Remaining', value: Math.max(0, 100 - banningRate) }
                ]}
                cx="50%"
                cy="100%"
                startAngle={180}
                endAngle={0}
                innerRadius={70}
                outerRadius={90}
                paddingAngle={0}
                dataKey="value"
                stroke="none"
              >
                <Cell key="cell-0" fill={banningRate >= 100 ? '#ef4444' : banningRate >= 50 ? '#f59e0b' : '#3b82f6'} />
                <Cell key="cell-1" fill="#e5e7eb" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-2 pointer-events-none">
            <span className="text-3xl font-black text-[var(--text-main)]">{banningRate}%</span>
            <span className="text-xs text-[var(--text-muted)] mt-1 font-semibold uppercase">{banningRate >= 100 ? 'Suspended' : 'Current Rate'}</span>
          </div>
        </div>
      </motion.div>

    </div>
  );
};

export default DashboardCharts;
