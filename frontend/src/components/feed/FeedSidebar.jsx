import React from 'react';
import { 
  Sparkles, TrendingUp, Users, Radio, Bookmark, 
  Shirt, MonitorSmartphone, Smile, Home, Smartphone,
  Heart, ShoppingBag, History
} from 'lucide-react';

const SidebarSection = ({ title, items, activeCategory, onCategoryChange }) => (
  <div className="mb-6">
    {title && <h3 className="text-gray-400 text-xs font-black uppercase tracking-wider mb-3 px-3">{title}</h3>}
    <div className="space-y-1">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onCategoryChange(item.id)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${
            activeCategory === item.id 
              ? 'bg-blue-600 text-white font-bold' 
              : 'text-[var(--text-main)] hover:bg-[var(--bg-tertiary)]'
          }`}
        >
          {item.icon && <item.icon size={18} className={activeCategory === item.id ? 'text-white' : 'text-[var(--text-muted)]'} />}
          <span className="text-sm">{item.label}</span>
        </button>
      ))}
    </div>
  </div>
);

const FeedSidebar = ({ activeCategory, onCategoryChange }) => {
  const feedItems = [
    { id: 'foryou', label: 'For You', icon: Sparkles },
    { id: 'trending', label: 'Trending', icon: TrendingUp },
    { id: 'following', label: 'Following', icon: Users },
    { id: 'live', label: 'Live', icon: Radio },
    { id: 'saved', label: 'Saved', icon: Bookmark },
  ];

  const shopItems = [
    { id: 'cat_fashion', label: 'Fashion', icon: Shirt },
    { id: 'cat_electronics', label: 'Electronics', icon: MonitorSmartphone },
    { id: 'cat_beauty', label: 'Beauty', icon: Smile },
    { id: 'cat_home', label: 'Home & Living', icon: Home },
    { id: 'cat_phones', label: 'Phones & Gadgets', icon: Smartphone },
  ];

  const activityItems = [
    { id: 'act_liked', label: 'Liked', icon: Heart },
    { id: 'act_purchased', label: 'Purchased', icon: ShoppingBag },
    { id: 'act_recent', label: 'Recently Viewed', icon: History },
  ];

  return (
    <div className="w-64 flex-shrink-0 hidden md:block">
      <div className="sticky top-24 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-4 shadow-sm h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar">
        <SidebarSection 
          items={feedItems} 
          activeCategory={activeCategory} 
          onCategoryChange={onCategoryChange} 
        />
        
        <div className="w-full h-px bg-[var(--border-color)] my-4" />
        
        <SidebarSection 
          title="Shop" 
          items={shopItems} 
          activeCategory={activeCategory} 
          onCategoryChange={onCategoryChange} 
        />
        
        <div className="w-full h-px bg-[var(--border-color)] my-4" />
        
        <SidebarSection 
          title="My Activity" 
          items={activityItems} 
          activeCategory={activeCategory} 
          onCategoryChange={onCategoryChange} 
        />
      </div>
    </div>
  );
};

export default FeedSidebar;
