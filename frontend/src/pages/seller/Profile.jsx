import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MapPin, Star, Package, MessageCircle, UserPlus, CheckCircle2, ChevronLeft, Store as StoreIcon, ShieldCheck, Clock, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { gxPrompt } from '../../components/shared/ui/GXDialog';

const SellerProfile = () => {
  const { sellerId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchSellerProfile = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/v1/seller/${sellerId}/profile`);
        if (res.data.success) {
          setSeller(res.data.seller);
          // In a real app we'd fetch follow status too, for now default to false
        } else {
          throw new Error('Seller not found');
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to load seller profile');
      } finally {
        setLoading(false);
      }
    };
    if (sellerId) fetchSellerProfile();
  }, [sellerId]);

  const handleFollow = async () => {
    if (!user) return toast.error('Please login to follow sellers');
    try {
      setActionLoading(true);
      const res = await axios.post(`/api/v1/seller/${sellerId}/follow`);
      if (res.data.success) {
        setIsFollowing(res.data.isFollowing);
        toast.success(res.data.isFollowing ? 'Followed seller!' : 'Unfollowed seller.');
      }
    } catch (err) {
      toast.error('Failed to follow seller');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!user) return toast.error('Please login to send messages');
    const msg = await gxPrompt(`Send a message to ${seller?.storeName || 'this seller'}`, {
      title: 'Message Seller 💬',
      placeholder: 'What would you like to ask? e.g. Is this item available?',
      confirmLabel: 'Send Message',
    });
    if (!msg) return;
    try {
      const res = await axios.post(`/api/v1/messages/send`, {
        receiverId: seller.id,
        content: msg
      });
      if (res.data.success) {
        toast.success('Message sent successfully!');
      }
    } catch (err) {
      toast.error('Failed to send message');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-6 flex justify-center items-center bg-[#0a0a0a]">
        <div className="w-16 h-16 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !seller) {
    return (
      <div className="min-h-screen pt-32 pb-12 px-6 flex flex-col items-center text-center bg-[#0a0a0a]">
        <h1 className="text-4xl font-extrabold text-white mb-4">Seller Not Found</h1>
        <p className="text-gray-400 text-lg mb-8">{error}</p>
        <button onClick={() => navigate(-1)} className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition font-medium">Go Back</button>
      </div>
    );
  }

  const { stats, store } = seller;
  const joinDate = new Date(seller.joinedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-24 pb-20 px-4 sm:px-6 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Back Navigation */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ChevronLeft size={20} />
          <span className="font-medium">Back</span>
        </button>

        {/* Top Section: Identity & Quick Actions */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="bg-[#111] border border-white/5 rounded-3xl p-6 sm:p-8 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -z-10 pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
          
          <div className="flex flex-col sm:flex-row gap-6 sm:items-start">
            <div className="relative shrink-0 mx-auto sm:mx-0">
              <div className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1 ${seller.isVerified ? 'bg-gradient-to-tr from-green-500 to-green-400 shadow-[0_0_15px_rgba(34,197,94,0.5)] border-2 border-green-500' : 'bg-gradient-to-tr from-gray-800 to-gray-700'}`}>
                <div className="w-full h-full bg-black rounded-full flex items-center justify-center overflow-hidden">
                  {seller?.avatar ? (
                    <img src={seller.avatar.startsWith('http') ? seller.avatar : `/${seller.avatar}`} alt={seller.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl font-black text-gray-500">{(seller?.name || 'S').substring(0, 2).toUpperCase()}</span>
                  )}
                </div>
              </div>
              {seller.isVerified && (
                <div className="absolute bottom-1 right-1 bg-blue-500 p-1.5 rounded-full border-[3px] border-[#111]" title="Verified Identity">
                  <ShieldCheck size={20} className="text-white fill-blue-500" />
                </div>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center justify-center sm:justify-start gap-2 mb-1">
                {seller.name}
                {seller.isVerified && <CheckCircle2 size={20} className="text-blue-400" />}
              </h1>
              <p className="text-gray-400 font-medium mb-3">@{seller.name.toLowerCase().replace(/\s+/g, '')}</p>
              
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-2 text-sm text-gray-300 mb-6">
                <div className="flex items-center gap-1.5">
                  <Star size={16} className="text-yellow-400 fill-yellow-400" />
                  <span className="font-bold text-white">{(stats?.rating || 0).toFixed(1)}</span>
                  <span className="text-gray-500">• {stats?.reviewCount || 0} reviews</span>
                </div>
                {store?.country && (
                  <div className="flex items-center gap-1.5">
                    <MapPin size={16} className="text-gray-400" />
                    <span>{store.country}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Clock size={16} className="text-gray-400" />
                  <span>Joined {joinDate}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <button onClick={handleFollow} disabled={actionLoading} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors">
                  <UserPlus size={18} /> {isFollowing ? 'Following' : 'Follow'}
                </button>
                <button onClick={handleMessage} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-colors">
                  <MessageCircle size={18} /> Message
                </button>
                {store && store.slug && (
                  <Link to={`/store/${store.slug}`} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 border border-white/20 hover:border-white/40 text-white rounded-xl font-semibold transition-colors">
                    <StoreIcon size={18} /> Visit Store
                  </Link>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* About & Performance Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* About Section */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="bg-[#111] border border-white/5 rounded-3xl p-6 sm:p-8">
            <h2 className="text-xs font-bold text-gray-500 tracking-wider uppercase mb-4">About the Seller</h2>
            <div className="prose prose-invert prose-sm">
              <p className="text-gray-300 leading-relaxed">
                {store?.bio || store?.description || "This seller hasn't added a biography yet."}
              </p>
            </div>
          </motion.div>

          {/* Trust & Performance */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }} className="bg-[#111] border border-white/5 rounded-3xl p-6 sm:p-8">
            <h2 className="text-xs font-bold text-gray-500 tracking-wider uppercase mb-4">Trust & Performance</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/50 rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-2 text-gray-400 mb-1">
                  <Star size={16} className="text-yellow-500" /> <span className="text-sm font-medium">Rating</span>
                </div>
                <div className="text-2xl font-black text-white">{(stats?.rating || 0).toFixed(1)}</div>
              </div>
              <div className="bg-black/50 rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-2 text-gray-400 mb-1">
                  <Package size={16} className="text-blue-400" /> <span className="text-sm font-medium">Orders</span>
                </div>
                <div className="text-2xl font-black text-white">{stats?.orderCount >= 1000 ? (stats.orderCount/1000).toFixed(1)+'K' : (stats?.orderCount || 0)}</div>
              </div>
              <div className="bg-black/50 rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-2 text-gray-400 mb-1">
                  <TrendingUp size={16} className="text-emerald-400" /> <span className="text-sm font-medium">Response</span>
                </div>
                <div className="text-2xl font-black text-white">{stats?.responseRate || '98'}%</div>
              </div>
              <div className="bg-black/50 rounded-2xl p-4 border border-white/5 flex flex-col justify-center">
                {stats?.orderCount >= 1000 && stats?.rating >= 4.8 ? (
                  <div className="flex items-center gap-2 text-purple-400 font-bold">
                    <ShieldCheck size={20} /> Platinum Tier
                  </div>
                ) : stats?.orderCount >= 100 && stats?.rating >= 4.5 ? (
                  <div className="flex items-center gap-2 text-yellow-400 font-bold">
                    <ShieldCheck size={20} /> Gold Tier
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-gray-400 font-bold">
                    <ShieldCheck size={20} /> Silver Tier
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Store & Products Section */}
        {store ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }} className="space-y-6">
            
            {/* Store Card */}
            <Link to={`/store/${store.slug}`} className="block group">
              <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/20 rounded-3xl p-6 sm:p-8 hover:border-blue-500/40 transition-all">
                <h2 className="text-xs font-bold text-blue-400 tracking-wider uppercase mb-4">Seller's Store</h2>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">{store.name}</h3>
                    <p className="text-gray-400 text-sm line-clamp-1">{store.description}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                    <ChevronLeft size={20} className="rotate-180" />
                  </div>
                </div>
              </div>
            </Link>

            {/* Products Grid */}
            {store.topProducts && store.topProducts.length > 0 && (
              <div className="bg-[#111] border border-white/5 rounded-3xl p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xs font-bold text-gray-500 tracking-wider uppercase">Top Products</h2>
                  <Link to={`/store/${store.slug}`} className="text-sm font-medium text-blue-400 hover:text-blue-300">View all →</Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {store.topProducts.slice(0,4).map(product => (
                    <Link key={product.id} to={`/product/${product.id}`} className="group relative bg-black/50 rounded-2xl overflow-hidden border border-white/5 hover:border-white/20 transition-colors">
                      <div className="aspect-[4/5] bg-gray-900 relative">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-700"><Package size={32} /></div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      </div>
                      <div className="p-3">
                        <p className="text-xs font-medium text-gray-300 truncate mb-1">{product.title}</p>
                        <p className="text-sm font-black text-white">${product.price}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }} className="bg-[#111] border border-white/5 rounded-3xl p-12 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-gray-500 mb-4">
              <StoreIcon size={32} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">No Storefront Yet</h3>
            <p className="text-gray-400 text-sm max-w-sm mx-auto">This seller hasn't published a storefront or added any products yet, but you can still message them directly.</p>
          </motion.div>
        )}

      </div>
    </div>
  );
};

export default SellerProfile;
