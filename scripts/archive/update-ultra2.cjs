const fs = require('fs');

const fileContent = `import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { 
  Home, Compass, PlusSquare, MessageCircle, User, 
  Heart, MessageSquare, Share2, ShoppingCart, CheckCircle, 
  ChevronLeft, Search, Bell, MoreHorizontal, LayoutGrid,
  Sun, Moon
} from 'lucide-react';
import axios from 'axios';

const Ultra2ProPortfolio = ({ store, brandConfig, handleAddToCart }) => {
  const navigate = useNavigate();
  const products = store?.products || [];
  
  const primaryColor = brandConfig?.primaryColor || '#16a34a'; // Green from design
  
  const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'profile' | 'home'
  const [profileSubTab, setProfileSubTab] = useState('posts'); // 'posts' | 'products' | 'likes'
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(store?.metrics?.followers || 0);
  const [themeMode, setThemeMode] = useState(brandConfig?.themeMode || 'dark'); // 'dark' | 'light'
  const [currentFeedIndex, setCurrentFeedIndex] = useState(0);

  // Real stats from backend
  const stats = {
    following: '0',
    followers: followerCount >= 1000 ? (followerCount/1000).toFixed(1) + 'K' : followerCount.toString(),
    likes: store?.metrics?.likes || 0
  };

  // Real feed posts (fallback to products if none exist)
  const feedPosts = store?.posts?.length > 0 ? store.posts : products.map(p => ({
    id: p.id,
    mediaUrl: p.images?.[0] || p.imageUrl || 'https://placehold.co/600x1000?text=Product',
    caption: p.name || p.title,
    product: p,
    _count: { likes: 0, comments: 0 }
  }));

  useEffect(() => {
    // Check initial follow status
    const checkFollow = async () => {
      try {
        if (!store?.seller?.id) return;
        const res = await axios.get(\`/api/v1/users/sellers/\${store.seller.id}/follow-status\`);
        setIsFollowing(res.data.isFollowing);
      } catch (e) {
        // Ignore, likely not logged in
      }
    };
    checkFollow();
  }, [store?.seller?.id]);

  const handleFollow = async () => {
    try {
      if (isFollowing) {
        await axios.delete(\`/api/v1/users/sellers/\${store.seller.id}/follow\`);
        setIsFollowing(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
        toast.success("Unfollowed store");
      } else {
        await axios.post(\`/api/v1/users/sellers/\${store.seller.id}/follow\`);
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
        toast.success("Following store!");
      }
    } catch (e) {
      if (e.response?.status === 401) toast.error("Please login to follow");
      else toast.error("Failed to update follow status");
    }
  };

  const toggleTheme = () => {
    setThemeMode(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleScroll = (e) => {
    const { scrollTop, clientHeight } = e.target;
    // Calculate the index of the post currently in view
    const newIndex = Math.round(scrollTop / clientHeight);
    if (newIndex !== currentFeedIndex && newIndex >= 0 && newIndex < feedPosts.length) {
      setCurrentFeedIndex(newIndex);
    }
  };

  const handleCentralPlusClick = () => {
    if (activeTab === 'feed' && feedPosts.length > 0) {
      const currentProduct = feedPosts[currentFeedIndex]?.product;
      if (currentProduct) {
        handleAddToCart?.(currentProduct, 1);
        toast.success("Added to cart!");
      } else {
        toast.error("No product linked to this post");
      }
    } else {
      toast("Go to feed to quick-add products!", { icon: '🛒' });
    }
  };

  // Theme colors
  const bgMain = themeMode === 'dark' ? 'bg-black' : 'bg-white';
  const textMain = themeMode === 'dark' ? 'text-white' : 'text-black';
  const textMuted = themeMode === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const bgOverlay = themeMode === 'dark' ? 'bg-black/60' : 'bg-white/60';
  const bgCard = themeMode === 'dark' ? 'bg-gray-900' : 'bg-gray-100';
  const borderColor = themeMode === 'dark' ? 'border-white/10' : 'border-black/10';

  const renderBottomNav = () => (
    <div className={\`absolute bottom-0 left-0 w-full h-16 \${bgMain} \${textMain} border-t \${borderColor} flex justify-around items-center px-2 z-50\`}>
      <button onClick={() => setActiveTab('home')} className={\`flex flex-col items-center gap-1 \${activeTab === 'home' ? textMain : textMuted}\`}>
        <Home size={24} />
        <span className="text-[10px]">Home</span>
      </button>
      <button onClick={() => setActiveTab('feed')} className={\`flex flex-col items-center gap-1 \${activeTab === 'feed' ? textMain : textMuted}\`}>
        <Compass size={24} />
        <span className="text-[10px]">Feed</span>
      </button>
      <button onClick={handleCentralPlusClick} className="flex items-center justify-center -mt-4 transition hover:scale-110 active:scale-95">
        <div className="w-12 h-8 rounded-xl bg-gradient-to-r from-blue-500 to-red-500 flex items-center justify-center text-white shadow-lg">
          <PlusSquare size={20} />
        </div>
      </button>
      <button onClick={() => navigate('/messages')} className={\`flex flex-col items-center gap-1 \${activeTab === 'inbox' ? textMain : textMuted}\`}>
        <MessageCircle size={24} />
        <span className="text-[10px]">Inbox</span>
      </button>
      <button onClick={() => setActiveTab('profile')} className={\`flex flex-col items-center gap-1 \${activeTab === 'profile' ? textMain : textMuted}\`}>
        <User size={24} />
        <span className="text-[10px]">Profile</span>
      </button>
    </div>
  );

  const renderFeed = () => (
    <div 
      className={\`h-full w-full \${bgMain} snap-y snap-mandatory overflow-y-scroll hide-scrollbar pb-16\`}
      onScroll={handleScroll}
    >
      {/* Top Nav Overlay */}
      <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-black/60 to-transparent z-10 flex justify-center items-end pb-4 pointer-events-none">
        <div className="flex gap-6 font-semibold text-lg pointer-events-auto">
          <button className="text-white">For You</button>
          <button className="text-gray-300 hover:text-white transition-colors">Following</button>
        </div>
        <button onClick={toggleTheme} className="absolute right-14 bottom-4 text-white hover:text-yellow-400 transition-colors pointer-events-auto">
          {themeMode === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
        </button>
        <button className="absolute right-4 bottom-4 text-white pointer-events-auto">
          <Search size={24} />
        </button>
      </div>

      {feedPosts.length > 0 ? (
        feedPosts.map((post) => (
          <div key={post.id} className="relative h-full w-full snap-start flex-shrink-0 bg-black">
            <img 
              src={post.mediaUrl} 
              alt={post.caption} 
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Gradient Overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
            
            {/* Right Side Actions */}
            <div className="absolute right-4 bottom-24 flex flex-col items-center gap-6 z-10">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white overflow-hidden p-0.5" onClick={() => setActiveTab('profile')}>
                  <img src={store?.seller?.avatar || store?.logo || \`https://placehold.co/100x100/\${primaryColor.replace('#', '')}/FFF?text=\${store?.name?.[0] || 'S'}\`} alt="avatar" className="w-full h-full rounded-full object-cover" />
                </div>
                <button onClick={handleFollow} className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white border-2 border-black">
                  {isFollowing ? <CheckCircle size={14} /> : <PlusSquare size={14} />}
                </button>
              </div>

              <button className="flex flex-col items-center gap-1 text-white">
                <Heart size={32} />
                <span className="text-xs font-semibold">{post._count?.likes || 0}</span>
              </button>
              
              <button className="flex flex-col items-center gap-1 text-white">
                <MessageSquare size={32} fill="currentColor" className="text-white/80" />
                <span className="text-xs font-semibold">{post._count?.comments || 0}</span>
              </button>

              <button className="flex flex-col items-center gap-1 text-white">
                <Share2 size={32} />
                <span className="text-xs font-semibold">Share</span>
              </button>
            </div>

            {/* Bottom Left Info */}
            <div className="absolute left-4 bottom-20 w-[70%] z-10">
              <h3 className="font-bold text-lg text-white mb-1">@{store?.slug || 'store'}</h3>
              <p className="text-sm text-white/90 mb-3 line-clamp-2">{post.caption}</p>
              
              {post.product && (
                <div className="flex items-center gap-2 mb-4 bg-black/40 backdrop-blur-md rounded-lg p-2 border border-white/10">
                  <ShoppingCart size={20} className="text-white" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">₦{post.product.price?.toLocaleString()}</p>
                  </div>
                  <button 
                    onClick={() => {
                      handleAddToCart?.(post.product, 1);
                      toast.success("Added to cart!");
                    }}
                    className="px-4 py-1.5 rounded-full text-xs font-bold text-white transition hover:scale-105 active:scale-95"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Buy
                  </button>
                </div>
              )}
            </div>
          </div>
        ))
      ) : (
        <div className="h-full flex items-center justify-center text-gray-400">
          No posts to show in feed.
        </div>
      )}
    </div>
  );

  const renderProfile = () => (
    <div className={\`h-full w-full \${bgMain} \${textMain} overflow-y-auto pb-16\`}>
      {/* Header */}
      <div className={\`sticky top-0 \${bgOverlay} backdrop-blur-md z-20 flex items-center justify-between p-4 border-b \${borderColor}\`}>
        <button onClick={() => setActiveTab('feed')} className="p-2"><ChevronLeft size={24} /></button>
        <h2 className="font-bold text-lg">Profile</h2>
        <div className="flex gap-4">
          <button onClick={toggleTheme} className="hover:text-yellow-400 transition-colors">
            {themeMode === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
          </button>
          <button><MoreHorizontal size={24} /></button>
        </div>
      </div>

      <div className="px-4 pt-6 pb-4">
        {/* Avatar & Stats */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-24 h-24 rounded-full bg-gray-200 border-2 border-gray-300 p-1 mb-4 overflow-hidden relative">
            {store?.logo || store?.seller?.avatar ? (
              <img src={store.logo || store.seller.avatar} alt="Store" className="w-full h-full object-cover rounded-full" />
            ) : (
              <div className="w-full h-full rounded-full flex items-center justify-center text-3xl text-white font-bold" style={{ backgroundColor: primaryColor }}>
                {store?.name?.[0] || 'S'}
              </div>
            )}
            {store?.verification && (
              <div className="absolute bottom-0 right-0 bg-blue-500 rounded-full p-1 border-2 border-white text-white">
                <CheckCircle size={14} />
              </div>
            )}
          </div>
          
          <h2 className="text-xl font-bold">{store?.name || 'Urban Vibes'}</h2>
          
          <div className="flex justify-center gap-8 w-full mt-4">
            <div className="text-center">
              <p className="font-bold text-lg">{stats.following}</p>
              <p className={\`text-xs \${textMuted} font-medium\`}>Following</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-lg">{stats.followers}</p>
              <p className={\`text-xs \${textMuted} font-medium\`}>Followers</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-lg">{stats.likes}</p>
              <p className={\`text-xs \${textMuted} font-medium\`}>Likes</p>
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className={\`text-center mb-6 px-4 text-sm \${textMain}\`}>
          <p>{store?.description || 'Premium fashion & lifestyle. Worldwide shipping 🌍.'}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-6">
          <button 
            onClick={handleFollow}
            className="flex-1 py-2.5 rounded-md font-bold text-white transition active:scale-95"
            style={{ backgroundColor: isFollowing ? (themeMode === 'dark' ? '#374151' : '#e5e7eb') : primaryColor, color: isFollowing ? (themeMode === 'dark' ? '#fff' : '#000') : '#fff' }}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </button>
          <button 
            onClick={() => navigate(\`/messages?storeId=\${store.id}\`)}
            className={\`flex-1 py-2.5 rounded-md font-bold \${bgCard} border \${borderColor} \${textMain} transition active:scale-95\`}
          >
            Message
          </button>
          <button className={\`p-2.5 rounded-md \${bgCard} border \${borderColor} transition active:scale-95\`}>
            <User size={20} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={\`flex border-t border-b \${borderColor} sticky top-16 \${bgMain} z-10\`}>
        <button 
          onClick={() => setProfileSubTab('posts')}
          className={\`flex-1 py-3 text-center text-sm font-semibold transition-colors \${profileSubTab === 'posts' ? \`\${textMain} border-b-2 \${themeMode === 'dark' ? 'border-white' : 'border-black'}\` : textMuted}\`}
        >
          <LayoutGrid size={18} className="mx-auto" />
        </button>
        <button 
          onClick={() => setProfileSubTab('products')}
          className={\`flex-1 py-3 text-center text-sm font-semibold transition-colors \${profileSubTab === 'products' ? \`\${textMain} border-b-2 \${themeMode === 'dark' ? 'border-white' : 'border-black'}\` : textMuted}\`}
        >
          Products
        </button>
        <button 
          onClick={() => setProfileSubTab('likes')}
          className={\`flex-1 py-3 text-center text-sm font-semibold transition-colors \${profileSubTab === 'likes' ? \`\${textMain} border-b-2 \${themeMode === 'dark' ? 'border-white' : 'border-black'}\` : textMuted}\`}
        >
          <Heart size={18} className="mx-auto" />
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {profileSubTab === 'posts' && (
          <div className="grid grid-cols-3 gap-0.5 mt-0.5">
            {feedPosts.map((post, i) => (
              <div 
                key={post.id} 
                className={\`aspect-[3/4] \${bgCard} relative group cursor-pointer overflow-hidden\`}
                onClick={() => {
                  setCurrentFeedIndex(i);
                  setActiveTab('feed');
                  // Quick scroll to the selected post
                  setTimeout(() => {
                    const feedContainer = document.querySelector('.snap-y');
                    if (feedContainer) {
                      feedContainer.scrollTo({ top: i * feedContainer.clientHeight, behavior: 'instant' });
                    }
                  }, 50);
                }}
              >
                <img 
                  src={post.mediaUrl} 
                  alt={post.caption}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
              </div>
            ))}
          </div>
        )}
        
        {profileSubTab === 'products' && (
          <div className="grid grid-cols-2 gap-2 p-2">
            {products.map(product => (
              <div 
                key={product.id} 
                className={\`\${bgCard} rounded-xl overflow-hidden cursor-pointer shadow-sm border \${borderColor}\`}
                onClick={() => navigate(\`/product/\${product.id}\`)}
              >
                <div className="aspect-square bg-gray-200 relative">
                  <img 
                    src={product.images?.[0] || product.imageUrl || 'https://placehold.co/300x300?text=Product'} 
                    alt={product.title || product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3">
                  <p className={\`text-sm font-medium \${textMain} truncate\`}>{product.title || product.name}</p>
                  <p className={\`text-xs font-bold mt-1\`} style={{ color: primaryColor }}>₦{product.price?.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {profileSubTab === 'likes' && (
          <div className={\`flex flex-col items-center justify-center h-48 \${textMuted} text-sm\`}>
            <Heart size={32} className="mb-2 opacity-50" />
            No liked posts yet.
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center">
      {/* Mobile App Container */}
      <div className={\`w-full h-screen sm:max-w-[400px] sm:h-[800px] sm:max-h-[90vh] \${bgMain} sm:rounded-[40px] sm:border-[8px] border-gray-900 shadow-2xl relative overflow-hidden flex flex-col\`}>
        
        {/* Dynamic Island / Notch Mock for Desktop */}
        <div className="hidden sm:block absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-2xl z-50 pointer-events-none"></div>

        <AnimatePresence mode="wait">
          {activeTab === 'feed' && (
            <motion.div 
              key="feed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full w-full"
            >
              {renderFeed()}
            </motion.div>
          )}
          {activeTab === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="h-full w-full"
            >
              {renderProfile()}
            </motion.div>
          )}
          {activeTab === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={\`h-full w-full \${bgMain} flex flex-col items-center justify-center p-8 text-center\`}
            >
              <ShoppingCart size={48} className={\`\${textMuted} mb-4\`} />
              <h2 className={\`text-2xl font-bold mb-2 \${textMain}\`}>Store Home</h2>
              <p className={\`\${textMuted} mb-6\`}>Welcome to the traditional storefront view.</p>
              <button 
                onClick={() => setActiveTab('feed')}
                className="px-6 py-3 rounded-full text-white font-bold w-full transition active:scale-95"
                style={{ backgroundColor: primaryColor }}
              >
                Go to Feed
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {renderBottomNav()}
      </div>
      
      {/* Desktop Helper text */}
      <div className="hidden lg:block absolute left-8 top-1/2 -translate-y-1/2 text-gray-500 max-w-xs">
        <h2 className="text-2xl font-bold mb-2">Mobile-First Experience</h2>
        <p>The Ultra2Pro portfolio is designed specifically for mobile interaction, offering a highly immersive TikTok-style feed for your products.</p>
        <div className="mt-4 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
            <h3 className="font-bold mb-2 text-black">Features Implemented:</h3>
            <ul className="text-sm list-disc pl-4 space-y-1 text-gray-600">
                <li>Real Follower & Like Metrics</li>
                <li>Working Follow/Unfollow API</li>
                <li>Dark / Light Mode Toggle</li>
                <li>Dynamic Feed Posts Grid</li>
                <li>Quick-Add to Cart from Feed (center + button)</li>
                <li>Messaging & Inbox Integration</li>
            </ul>
        </div>
      </div>
    </div>
  );
};

export default Ultra2ProPortfolio;
`;

fs.writeFileSync('frontend/src/pages/portfolios/Ultra2ProPortfolio.jsx', fileContent);
console.log('Successfully updated Ultra2ProPortfolio.jsx with cart quick-add feature');
