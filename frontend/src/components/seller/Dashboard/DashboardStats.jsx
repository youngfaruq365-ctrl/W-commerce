import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Wallet, ShoppingCart, Users, Package, Eye, MessageSquare, Star } from 'lucide-react';

const DashboardStats = ({ analytics }) => {
  const stats = [
    { label: "Total Revenue", val: !isNaN(Number(analytics?.totalRevenue)) && analytics?.totalRevenue != null ? `₦${Number(analytics.totalRevenue).toFixed(2)}` : "₦0.00", icon: Wallet, color: "text-[#006cff]", bg: "neu-card-pressed" },
    { label: "Weekly Sales", val: !isNaN(Number(analytics?.weeklySales)) && analytics?.weeklySales != null ? `₦${Number(analytics.weeklySales).toFixed(2)}` : "₦0.00", icon: TrendingUp, color: "text-emerald-500", bg: "neu-card-pressed" },
    { label: "Total Orders", val: analytics?.totalOrders ?? "0", sub: analytics?.pendingOrders > 0 ? `${analytics.pendingOrders} pending` : null, icon: ShoppingCart, color: "text-orange-500", bg: "neu-card-pressed" },
    { label: "Repeat Buyers", val: typeof analytics?.repeatBuyerRate !== 'undefined' ? `${Number(analytics.repeatBuyerRate).toFixed(1)}%` : "0%", icon: Users, color: "text-purple-500", bg: "neu-card-pressed" },
    { label: "Total Products", val: analytics?.totalProducts || "0", icon: Package, color: "text-[var(--text-main)]", bg: "neu-card-pressed" },
    { label: "Total Views", val: analytics?.totalViews || "0", icon: Eye, color: "text-[var(--text-main)]", bg: "neu-card-pressed" },
    { label: "Total Inquiries", val: analytics?.totalInquiries || "0", icon: MessageSquare, color: "text-rose-500", bg: "neu-card-pressed" },
    { label: "Avg Rating", val: analytics?.avgRating || "0.0", icon: Star, color: "text-amber-500", bg: "neu-card-pressed" }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
    >
      {stats.map((stat, i) => (
        <motion.div 
          key={i} 
          variants={itemVariants}
          className="relative group overflow-hidden neu-card p-5 sm:p-6 transition-all duration-300 flex flex-col justify-center"
        >
          <div className="relative z-10 flex items-center justify-between mb-4">
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2} />
            </div>
            <div className="flex items-center gap-1 text-xs sm:text-sm font-bold text-[var(--text-main)] neu-card-pressed px-2 py-1 rounded-full">
              <TrendingUp className="w-3 h-3" />
              <span>+12%</span>
            </div>
          </div>
          <div className="relative z-10 w-full truncate">
            <h3 className="text-[var(--text-muted)] text-xs sm:text-sm font-medium mb-1 truncate">{stat.label}</h3>
            <p className="text-xl sm:text-2xl font-bold text-[var(--text-main)] tracking-tight truncate">{stat.val}</p>
            {stat.sub && <p className="text-xs text-orange-500 font-semibold mt-0.5">{stat.sub}</p>}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default DashboardStats;
