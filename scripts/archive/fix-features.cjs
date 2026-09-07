const fs = require('fs');

const path = 'frontend/src/pages/portfolios/Ultra2ProPortfolio.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add ArrowLeft to lucide-react imports
content = content.replace(
  /import {([^}]+)} from 'lucide-react';/,
  (match, p1) => {
    if (!p1.includes('ArrowLeft')) {
      return `import {${p1}, ArrowLeft, Send } from 'lucide-react';`;
    }
    return match;
  }
);

// 2. Add new states
const statesToAdd = `
  const [searchQuery, setSearchQuery] = useState('');
  const [likedPosts, setLikedPosts] = useState({});
  const [likeCounts, setLikeCounts] = useState({});
  
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [activePostId, setActivePostId] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentCounts, setCommentCounts] = useState({});
`;
content = content.replace(
  /const \[currentFeedIndex, setCurrentFeedIndex\] = useState\(0\);/,
  `const [currentFeedIndex, setCurrentFeedIndex] = useState(0);${statesToAdd}`
);

// 3. Initialize counts when feedPosts is mapped
const initializeCounts = `
  useEffect(() => {
    const initialLikes = {};
    const initialComments = {};
    feedPosts.forEach(post => {
      if (post._count) {
        initialLikes[post.id] = post._count.likes || 0;
        initialComments[post.id] = post._count.comments || 0;
      }
    });
    setLikeCounts(initialLikes);
    setCommentCounts(initialComments);
  }, [store?.posts]);
`;
content = content.replace(
  /useEffect\(\(\) => {\n    \/\/ Check initial follow status/,
  `${initializeCounts}\n\n  useEffect(() => {\n    // Check initial follow status`
);

// 4. Add handlers for Like, Comment, Share
const handlers = `
  const handleLike = async (postId) => {
    try {
      const isLiked = likedPosts[postId];
      setLikedPosts(prev => ({ ...prev, [postId]: !isLiked }));
      setLikeCounts(prev => ({ 
        ...prev, 
        [postId]: (prev[postId] || 0) + (isLiked ? -1 : 1) 
      }));

      if (isLiked) {
        await axios.delete(\`/api/v1/feed/\${postId}/like\`);
      } else {
        await axios.post(\`/api/v1/feed/\${postId}/like\`);
      }
    } catch (e) {
      // Revert on failure
      setLikedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
      setLikeCounts(prev => ({ 
        ...prev, 
        [postId]: (prev[postId] || 0) + (likedPosts[postId] ? 1 : -1) 
      }));
      if (e.response?.status === 401) toast.error("Please login to like posts");
    }
  };

  const handleShare = async (post) => {
    const shareData = {
      title: store?.name || 'Store Post',
      text: post.caption || 'Check out this post!',
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied to clipboard!");
      }
    } catch (e) {
      console.log('Error sharing:', e);
    }
  };

  const openComments = async (postId) => {
    setActivePostId(postId);
    setIsCommentsOpen(true);
    try {
      const res = await axios.get(\`/api/v1/feed/\${postId}/comments\`);
      if (res.data.success) {
        setComments(res.data.data);
      }
    } catch (e) {
      console.error("Failed to load comments");
    }
  };

  const submitComment = async () => {
    if (!newComment.trim() || !activePostId) return;
    try {
      const res = await axios.post(\`/api/v1/feed/\${activePostId}/comments\`, { content: newComment });
      if (res.data.success) {
        setComments(prev => [res.data.data, ...prev]);
        setNewComment('');
        setCommentCounts(prev => ({
          ...prev,
          [activePostId]: (prev[activePostId] || 0) + 1
        }));
      }
    } catch (e) {
      if (e.response?.status === 401) toast.error("Please login to comment");
      else toast.error("Failed to post comment");
    }
  };
`;
content = content.replace(
  /const toggleTheme = \(\) => {/,
  `${handlers}\n  const toggleTheme = () => {`
);

// 5. Update Search Icon to open Search tab
content = content.replace(
  /<button className="absolute right-4 bottom-4 text-white pointer-events-auto">[\s\S]*?<Search size={24} \/>[\s\S]*?<\/button>/,
  `<button onClick={() => setActiveTab('search')} className="absolute right-4 bottom-4 text-white hover:text-gray-300 transition-colors pointer-events-auto">
          <Search size={24} />
        </button>`
);

// 6. Update Feed Buttons (Like, Comment, Share)
content = content.replace(
  /<button className="flex flex-col items-center gap-1 text-white">\s*<Heart size={32} \/>\s*<span className="text-xs font-semibold">{post\._count\?.likes \|\| 0}<\/span>\s*<\/button>/g,
  `<button onClick={() => handleLike(post.id)} className="flex flex-col items-center gap-1 text-white transition active:scale-95">
                <Heart size={32} fill={likedPosts[post.id] ? "#ef4444" : "none"} className={likedPosts[post.id] ? "text-red-500" : ""} />
                <span className="text-xs font-semibold">{likeCounts[post.id] || 0}</span>
              </button>`
);

content = content.replace(
  /<button className="flex flex-col items-center gap-1 text-white">\s*<MessageSquare size={32} fill="currentColor" className="text-white\/80" \/>\s*<span className="text-xs font-semibold">{post\._count\?.comments \|\| 0}<\/span>\s*<\/button>/g,
  `<button onClick={() => openComments(post.id)} className="flex flex-col items-center gap-1 text-white transition active:scale-95">
                <MessageSquare size={32} fill="currentColor" className="text-white/80" />
                <span className="text-xs font-semibold">{commentCounts[post.id] || 0}</span>
              </button>`
);

content = content.replace(
  /<button className="flex flex-col items-center gap-1 text-white">\s*<Share2 size={32} \/>\s*<span className="text-xs font-semibold">Share<\/span>\s*<\/button>/g,
  `<button onClick={() => handleShare(post)} className="flex flex-col items-center gap-1 text-white transition active:scale-95">
                <Share2 size={32} />
                <span className="text-xs font-semibold">Share</span>
              </button>`
);

// 7. Add renderSearch()
const renderSearch = `
  const renderSearch = () => {
    const filteredProducts = products.filter(p => 
      (p.title || p.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className={\`h-full w-full \${bgMain} flex flex-col pt-4\`}>
        <div className="px-4 flex items-center gap-3 mb-6">
          <button onClick={() => setActiveTab('feed')} className={\`\${textMain} active:scale-95\`}>
            <ArrowLeft size={24} />
          </button>
          <div className={\`flex-1 flex items-center gap-2 \${bgCard} px-4 py-2 rounded-full border \${borderColor}\`}>
            <Search size={18} className={textMuted} />
            <input 
              type="text" 
              placeholder="Search products..." 
              className={\`bg-transparent outline-none flex-1 \${textMain} text-sm\`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className={textMuted}>
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-20">
          <h2 className={\`text-lg font-bold \${textMain} mb-4\`}>
            {searchQuery ? \`Results for "\${searchQuery}"\` : 'All Products'}
          </h2>
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {filteredProducts.map(product => (
                <div 
                  key={product.id} 
                  className={\`\${bgCard} rounded-xl overflow-hidden cursor-pointer shadow-sm border \${borderColor}\`}
                  onClick={() => navigate(\`/product/\${product.id}\`)}
                >
                  <div className="aspect-square bg-gray-200 relative">
                    <img 
                      src={product.images?.[0]?.url || product.images?.[0] || product.imageUrl || 'https://placehold.co/300x300?text=Product'} 
                      alt={product.title || product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3">
                    <p className={\`text-sm font-medium \${textMain} truncate\`}>{product.title || product.name}</p>
                    <p className={\`text-xs font-bold mt-1\`} style={{ color: primaryColor }}>$\${product.price?.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={\`flex flex-col items-center justify-center py-20 \${textMuted}\`}>
              <Search size={48} className="mb-4 opacity-50" />
              <p>No products found</p>
            </div>
          )}
        </div>
      </div>
    );
  };
`;
content = content.replace(
  /const renderBottomNav = \(\) => \(/,
  `${renderSearch}\n\n  const renderBottomNav = () => (`
);

// 8. Add Search tab to AnimatePresence
const searchTab = `
          {activeTab === 'search' && (
            <motion.div 
              key="search"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-0 z-40 bg-black"
            >
              {renderSearch()}
            </motion.div>
          )}
`;
content = content.replace(
  /<\/AnimatePresence>/,
  `${searchTab}\n        </AnimatePresence>`
);

// 9. Add Comments Bottom Sheet to the root container
const commentsSheet = `
        {/* Comments Bottom Sheet */}
        <AnimatePresence>
          {isCommentsOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsCommentsOpen(false)}
                className="absolute inset-0 bg-black/60 z-50"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className={\`absolute bottom-0 left-0 w-full h-[60%] \${bgMain} rounded-t-3xl z-50 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.2)] border-t \${borderColor}\`}
              >
                <div className="w-full flex justify-center py-3">
                  <div className="w-12 h-1.5 bg-gray-400/50 rounded-full" />
                </div>
                <div className={\`px-4 pb-2 border-b \${borderColor} flex justify-between items-center\`}>
                  <h3 className={\`font-bold \${textMain}\`}>{commentCounts[activePostId] || 0} Comments</h3>
                  <button onClick={() => setIsCommentsOpen(false)} className={textMuted}><X size={20} /></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {comments.length > 0 ? comments.map(comment => (
                    <div key={comment.id} className="flex gap-3">
                      <img src={comment.user?.avatarUrl || \`https://placehold.co/40x40/333/FFF?text=\${comment.user?.fullName?.[0] || 'U'}\`} className="w-8 h-8 rounded-full" alt="avatar" />
                      <div>
                        <p className={\`text-xs font-bold \${textMuted}\`}>{comment.user?.fullName}</p>
                        <p className={\`text-sm \${textMain} mt-0.5\`}>{comment.content}</p>
                      </div>
                    </div>
                  )) : (
                    <div className={\`h-full flex items-center justify-center \${textMuted} text-sm\`}>
                      No comments yet. Be the first!
                    </div>
                  )}
                </div>

                <div className={\`p-4 border-t \${borderColor} flex items-center gap-2\`}>
                  <input 
                    type="text" 
                    placeholder="Add comment..." 
                    className={\`flex-1 bg-transparent border \${borderColor} \${textMain} text-sm px-4 py-2.5 rounded-full outline-none\`}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitComment()}
                  />
                  <button 
                    onClick={submitComment}
                    disabled={!newComment.trim()}
                    className={\`w-10 h-10 rounded-full flex items-center justify-center text-white transition \${newComment.trim() ? '' : 'opacity-50'}\`}
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Send size={16} />
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
`;
content = content.replace(
  /\{renderBottomNav\(\)\}\n      <\/div>/,
  `{renderBottomNav()}\n${commentsSheet}\n      </div>`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully added features to Ultra2ProPortfolio.jsx');
