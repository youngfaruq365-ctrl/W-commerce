import React, { useState, useEffect } from 'react';
import { apiClient as axios } from '@/utils/apiClient';
import { Menu, ChevronRight } from 'lucide-react';

const MegaMenu = ({ onCategorySelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuData, setMenuData] = useState({});
  const [activeCategory, setActiveCategory] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const menuRef = React.useRef(null);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await axios.get('/api/v1/products/menu');
        if (res.data.success && res.data.menu && Object.keys(res.data.menu).length > 0) {
          setMenuData(res.data.menu);
          setActiveCategory(Object.keys(res.data.menu)[0]);
        } else {
          setMenuData({});
          setActiveCategory(null);
        }
      } catch (err) {
        // Handle error silently
      } finally {
        setIsLoading(false);
      }
    };
    fetchMenu();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handleSubSelect = (cat, sub) => {
    setIsOpen(false);
    if (onCategorySelect) {
      onCategorySelect(cat, sub);
    }
  };

  return (
    <div className="relative group/megamenu h-full flex items-center" ref={menuRef}>
      {/* Trigger Button */}
      <button 
        className="icon-3d-glass-box w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center cursor-pointer shrink-0"
        onMouseEnter={() => setIsOpen(true)}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Menu size={18} className="text-[color:var(--text-main)] drop-shadow-[0_0_5px_var(--accent-gray)]" />
      </button>

      {/* Dropdown Panel - App Dark Style / Glassmorphism */}
      <div 
        className={`fixed sm:absolute top-[70px] sm:top-full left-4 sm:left-auto right-4 sm:right-0 sm:mt-2 sm:w-[850px] sm:max-w-[90vw] h-[500px] max-h-[70vh] modal-3d-glass text-[var(--text-main)] rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] flex flex-col md:flex-row overflow-hidden transition-all duration-300 origin-top sm:origin-top-right z-50 ${isOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'}`}
        onMouseLeave={() => setIsOpen(false)}
      >
        {isLoading && Object.keys(menuData).length === 0 ? (
          <div className="flex w-full items-center justify-center">
             <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--accent-gray)]"></div>
          </div>
        ) : Object.keys(menuData).length > 0 ? (
          <>
            {/* Left Sidebar - Main Categories */}
            <div className="w-full md:w-64 bg-[var(--bg-tertiary)]/50 border-b md:border-b-0 md:border-r border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] overflow-x-auto md:overflow-y-auto py-2 md:py-4 flex-shrink-0 custom-scrollbar flex md:block">
              {Object.keys(menuData).map((cat) => (
                <div 
                  key={cat}
                  className={`px-4 md:px-6 py-3 md:py-4 cursor-pointer flex-shrink-0 flex items-center justify-between transition-all duration-300 ${activeCategory === cat ? 'bg-[var(--bg-tertiary)] font-bold border-b-4 md:border-b-0 md:border-l-4 border-[var(--accent-gray)] text-[var(--text-main)] shadow-inner' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--text-main)]/5 font-medium border-b-4 md:border-b-0 md:border-l-4 border-transparent'}`}
                  onMouseEnter={() => window.innerWidth >= 768 && setActiveCategory(cat)}
                  onClick={() => setActiveCategory(cat)}
                >
                  <span className="truncate pr-2">{cat}</span>
                  <ChevronRight size={16} className={`hidden md:block transition-transform ${activeCategory === cat ? 'text-[var(--accent-gray)] translate-x-1' : 'opacity-50'}`} />
                </div>
              ))}
            </div>

            {/* Right Panel - Subcategories */}
            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar relative">
              {/* Subtle Ambient Glow inside panel */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent-gray)]/10 blur-[100px] rounded-full pointer-events-none"></div>

              <h3 className="text-xl font-bold mb-8 flex items-center gap-2 border-b border-[var(--accent-gray)] shadow-[0_2px_10px_var(--accent-gray-dim)] pb-4 text-[var(--text-main)]">
                Explore {activeCategory}
              </h3>
              
              {menuData[activeCategory] && menuData[activeCategory].length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-6 sm:gap-y-8 relative z-10">
                  {menuData[activeCategory].map((sub, idx) => (
                    <div 
                      key={idx} 
                      className="flex flex-col items-center group cursor-pointer"
                      onClick={() => handleSubSelect(activeCategory, sub.name)}
                    >
                      <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full overflow-hidden mb-2 sm:mb-4 border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] group-hover:border-[var(--accent-gray)] transition-all duration-300 shadow-lg group-hover:shadow-[0_0_20px_var(--accent-gray-dim)] transform group-hover:-translate-y-2 bg-[var(--bg-tertiary)] relative">
                        <div className="absolute inset-0 bg-[var(--bg-primary)]/20 group-hover:bg-transparent transition-colors z-10"></div>
                        <img 
                          src={sub.image.startsWith('http') || sub.image.startsWith('/') ? sub.image : `/${sub.image}`} 
                          alt={sub.name} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                      <span className="text-sm font-semibold text-center text-[var(--text-muted)] group-hover:text-[var(--text-main)] line-clamp-2 leading-tight transition-colors">
                        {sub.name}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-center py-20 italic">
                  No subcategories found.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex w-full items-center justify-center text-gray-500">
             No categories available yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default MegaMenu;

