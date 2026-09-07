import re
import os

dashboard_path = 'c:/Users/HomePC/Downloads/W-COMMERCE PROJECT/frontend/src/pages/buyer/Dashboard.jsx'
with open(dashboard_path, 'r', encoding='utf-8') as f:
    dashboard_content = f.read()

# Add isLoading state
if 'const [isLoading, setIsLoading] = useState(true);' not in dashboard_content:
    dashboard_content = dashboard_content.replace(
        'const [stats, setStats] = useState({',
        'const [isLoading, setIsLoading] = useState(true);\n  const [stats, setStats] = useState({'
    )

# Replace useEffect
old_use_effect = '''  useEffect(() => {
    fetchProfile();
    fetchOrders();
    fetchWishlist();
    fetchWallet();
    fetchWalletTransactions();
    fetchSavedShops();
    fetchMessages();
    fetchDisputes();
    fetchReviews();
    fetchNotifications();
  }, []);'''

new_use_effect = '''  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchProfile(), fetchOrders(), fetchWishlist(), fetchWallet(),
          fetchWalletTransactions(), fetchSavedShops(), fetchMessages(),
          fetchDisputes(), fetchReviews(), fetchNotifications()
        ]);
      } catch (e) {} finally {
        setIsLoading(false);
      }
    };
    initData();
  }, []);'''
dashboard_content = dashboard_content.replace(old_use_effect, new_use_effect)

# History Skeleton
history_orig = '''            <h2 className="text-2xl font-bold mb-6">Order History</h2>
            {orders && orders.filter(o => ['DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'REJECTED'].includes(o.status)).length > 0 ? ('''

history_new = '''            <h2 className="text-2xl font-bold mb-6">Order History</h2>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="premium-glass p-6 rounded-xl border border-[var(--border-color)] animate-pulse flex gap-4">
                     <div className="w-16 h-16 bg-gray-300 dark:bg-zinc-700 rounded-lg"></div>
                     <div className="flex-1 space-y-2 py-1">
                        <div className="h-4 bg-gray-300 dark:bg-zinc-700 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-300 dark:bg-zinc-700 rounded w-1/4"></div>
                     </div>
                  </div>
                ))}
              </div>
            ) : orders && orders.filter(o => ['DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'REJECTED'].includes(o.status)).length > 0 ? ('''
dashboard_content = dashboard_content.replace(history_orig, history_new)

# Wallet Skeleton
wallet_orig = '''            <h2 className="text-2xl font-bold mb-6">Escrow Wallet</h2>
            <div className="premium-glass p-8 rounded-xl border border-[var(--border-color)] relative overflow-hidden">'''
wallet_new = '''            <h2 className="text-2xl font-bold mb-6">Escrow Wallet</h2>
            {isLoading ? (
              <div className="premium-glass p-8 rounded-xl border border-[var(--border-color)] animate-pulse">
                <div className="h-4 bg-gray-300 dark:bg-zinc-700 rounded w-1/4 mb-4"></div>
                <div className="h-10 bg-gray-300 dark:bg-zinc-700 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-300 dark:bg-zinc-700 rounded w-1/3"></div>
              </div>
            ) : (
            <div className="premium-glass p-8 rounded-xl border border-[var(--border-color)] relative overflow-hidden">'''
dashboard_content = dashboard_content.replace(wallet_orig, wallet_new)

# Fix wallet closing brace
wallet_end_orig = '''                  </div>
               </div>
            </div>
            
            <h3 className="text-xl font-bold mt-8 mb-4">Recent Transactions</h3>'''
wallet_end_new = '''                  </div>
               </div>
            </div>
            )}
            
            <h3 className="text-xl font-bold mt-8 mb-4\">Recent Transactions</h3>'''
dashboard_content = dashboard_content.replace(wallet_end_orig, wallet_end_new)

# Improve touch targets in dashboard
dashboard_content = dashboard_content.replace('px-4 py-2', 'px-6 py-3 min-h-[44px]')
dashboard_content = dashboard_content.replace('w-8 h-8', 'w-10 h-10')
# Dashboard is already somewhat responsive, but we can ensure layout is better. 

with open(dashboard_path, 'w', encoding='utf-8') as f:
    f.write(dashboard_content)

cart_path = 'c:/Users/HomePC/Downloads/W-COMMERCE PROJECT/frontend/src/pages/Cart.jsx'
with open(cart_path, 'r', encoding='utf-8') as f:
    cart_content = f.read()

# Make Cart touch targets larger and more responsive
cart_content = cart_content.replace('px-4 py-2', 'px-6 py-3 min-h-[44px]')
cart_content = cart_content.replace('px-4 py-1', 'px-5 py-2 min-h-[44px]')
cart_content = cart_content.replace('w-8 h-8', 'w-12 h-12')
cart_content = cart_content.replace('p-1', 'p-3 min-h-[44px] min-w-[44px] flex items-center justify-center')
cart_content = cart_content.replace('flex flex-col sm:flex-row', 'flex flex-col md:flex-row')

with open(cart_path, 'w', encoding='utf-8') as f:
    f.write(cart_content)

print('Files updated successfully')
