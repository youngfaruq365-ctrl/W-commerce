import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, Plus, Edit2, Trash2, Smartphone, Save, ChefHat, ExternalLink, Menu as MenuIcon } from 'lucide-react';

const QRMenuConfigView = () => {
  const [categories, setCategories] = useState([
    { id: 'cat-1', name: 'Starters', items: [
      { id: 'i-1', name: 'Truffle Fries', price: '₦8.00', desc: 'Crispy fries with parmesan and truffle oil' },
      { id: 'i-2', name: 'Calamari', price: '₦12.00', desc: 'Lightly fried with lemon aioli' }
    ]},
    { id: 'cat-2', name: 'Mains', items: [
      { id: 'i-3', name: 'Wagyu Burger', price: '₦24.00', desc: '8oz wagyu beef, brioche bun, aged cheddar' },
      { id: 'i-4', name: 'Grilled Salmon', price: '₦28.00', desc: 'Wild caught salmon with seasonal veg' }
    ]}
  ]);

  const [activeCategory, setActiveCategory] = useState(categories[0].id);
  const [isPublishing, setIsPublishing] = useState(false);
  const [selectedTable, setSelectedTable] = useState('Table 1');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({ name: '', price: '', desc: '' });
  const [showItemModal, setShowItemModal] = useState(false);

  const currentCat = categories.find(c => c.id === activeCategory) || categories[0];

  const handlePublish = () => {
    setIsPublishing(true);
    setTimeout(() => {
      setIsPublishing(false);
      toast.success('Digital QR Menu published to all tables!');
    }, 800);
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const newId = `cat-${Date.now()}`;
    setCategories(prev => [...prev, { id: newId, name: newCategoryName.trim(), items: [] }]);
    setActiveCategory(newId);
    setNewCategoryName('');
    setShowNewCategoryInput(false);
    toast.success('Category added');
  };

  const openAddItem = () => {
    setEditingItem(null);
    setItemForm({ name: '', price: '₦15.00', desc: '' });
    setShowItemModal(true);
  };

  const openEditItem = (item) => {
    setEditingItem(item);
    setItemForm({ name: item.name, price: item.price, desc: item.desc });
    setShowItemModal(true);
  };

  const handleSaveItem = () => {
    if (!itemForm.name.trim()) return toast.error('Item name is required');
    const formattedPrice = itemForm.price.startsWith('₦') ? itemForm.price : `₦${itemForm.price || '0.00'}`;
    setCategories(prev => prev.map(cat => {
      if (cat.id !== activeCategory) return cat;
      if (editingItem) {
        return {
          ...cat,
          items: cat.items.map(i => i.id === editingItem.id ? { ...i, name: itemForm.name, price: formattedPrice, desc: itemForm.desc } : i)
        };
      }
      return {
        ...cat,
        items: [...cat.items, { id: `i-${Date.now()}`, name: itemForm.name, price: formattedPrice, desc: itemForm.desc }]
      };
    }));
    setShowItemModal(false);
    toast.success(editingItem ? 'Menu item updated' : 'Menu item added');
  };

  const handleDeleteItem = (itemId) => {
    setCategories(prev => prev.map(cat => cat.id === activeCategory ? { ...cat, items: cat.items.filter(i => i.id !== itemId) } : cat));
    toast.success('Menu item removed');
  };

  const handleDownloadTent = () => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(window.location.origin + '/shop?table=' + selectedTable)}`;
    window.open(qrUrl, '_blank', 'noopener,noreferrer');
    toast.success(`QR code generated for ${selectedTable}`);
  };

  return (
    <div className="bg-white border border-[var(--border-color)] p-8 rounded-xl min-h-[800px] flex flex-col relative overflow-hidden">
      
      {/* Header */}
      <div className="flex justify-between items-start mb-8 border-b border-[var(--border-color)] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-black mb-2 flex items-center gap-3">
            <QrCode className="text-[var(--accent-gray-dark)]" size={32} />
            Digital Menu Builder
          </h1>
          <p className="text-[var(--text-muted)] text-sm">Design your QR menu, update prices in real-time, and publish to all tables instantly.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => toast.success(`Previewing ${currentCat?.name} (${currentCat?.items.length || 0} items)`)}
            className="bg-white border border-[var(--border-color)] text-black font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <ExternalLink size={16} /> Preview
          </button>
          <button 
            onClick={handlePublish}
            className="bg-black hover:bg-gray-900 text-white font-bold px-6 py-2 rounded-xl text-sm flex items-center gap-2 transition-colors relative overflow-hidden"
          >
            {isPublishing ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Publishing...
              </motion.div>
            ) : (
              <>
                <Save size={16} /> Publish Changes
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 flex-1">
        
        {/* Editor Section */}
        <div className="flex-1 flex flex-col">
          {/* Categories Nav */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 custom-scrollbar">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${
                  activeCategory === cat.id 
                    ? 'bg-black text-white shadow-md scale-105' 
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:bg-gray-100 hover:text-black'
                }`}
              >
                {cat.name}
              </button>
            ))}
            {showNewCategoryInput ? (
              <div className="flex items-center gap-2 ml-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  placeholder="Category name"
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-black"
                />
                <button onClick={handleAddCategory} className="px-3 py-1.5 bg-black text-white rounded-lg text-xs font-bold">Add</button>
                <button onClick={() => setShowNewCategoryInput(false)} className="px-2 py-1.5 text-gray-500 text-xs">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setShowNewCategoryInput(true)} className="px-4 py-2 rounded-lg font-bold text-sm text-[var(--text-muted)] hover:text-black hover:bg-gray-100 flex items-center gap-1 border border-dashed border-gray-300 ml-2">
                <Plus size={14} /> New Category
              </button>
            )}
          </div>

          {showItemModal && (
            <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
              <h4 className="font-bold text-black text-sm">{editingItem ? 'Edit Menu Item' : 'New Menu Item'}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={itemForm.name}
                  onChange={e => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="Dish name"
                  className="p-2.5 border border-gray-300 rounded-lg text-sm text-black bg-white"
                />
                <input
                  type="text"
                  value={itemForm.price}
                  onChange={e => setItemForm({ ...itemForm, price: e.target.value })}
                  placeholder="Price (e.g. ₦15.00)"
                  className="p-2.5 border border-gray-300 rounded-lg text-sm text-black bg-white"
                />
              </div>
              <input
                type="text"
                value={itemForm.desc}
                onChange={e => setItemForm({ ...itemForm, desc: e.target.value })}
                placeholder="Short description"
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm text-black bg-white"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowItemModal(false)} className="px-4 py-2 text-xs font-bold text-gray-600">Cancel</button>
                <button onClick={handleSaveItem} className="px-4 py-2 bg-black text-white rounded-lg text-xs font-bold">Save Item</button>
              </div>
            </div>
          )}

          {/* Menu Items List */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            <AnimatePresence mode="popLayout">
              {currentCat?.items.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white border border-[var(--border-color)] rounded-xl p-4 flex gap-4 group hover:border-black/30 transition-colors shadow-sm"
                >
                  <div className="w-20 h-20 bg-[var(--bg-tertiary)] rounded-lg flex items-center justify-center flex-shrink-0">
                    <ChefHat className="text-gray-400" size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-black text-lg truncate">{item.name}</h3>
                      <span className="font-mono font-bold text-[var(--accent-gray-dark)] bg-gray-100 px-2 py-1 rounded text-sm">{item.price}</span>
                    </div>
                    <p className="text-sm text-[var(--text-muted)] line-clamp-2 leading-relaxed">{item.desc}</p>
                  </div>
                  <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditItem(item)} className="p-2 rounded-lg bg-gray-50 text-gray-600 hover:text-black hover:bg-gray-100"><Edit2 size={16} /></button>
                    <button onClick={() => handleDeleteItem(item.id)} className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"><Trash2 size={16} /></button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            <button onClick={openAddItem} className="w-full bg-[var(--bg-tertiary)] border-2 border-dashed border-[var(--border-color)] rounded-xl p-4 flex items-center justify-center gap-2 text-[var(--text-muted)] font-bold hover:bg-gray-50 hover:text-black hover:border-black/30 transition-all mt-4">
              <Plus size={20} /> Add New Item to {currentCat?.name}
            </button>
          </div>
        </div>

        {/* Live Preview & QR Gen */}
        <div className="w-full lg:w-[350px] flex flex-col gap-6">
          <div className="bg-[var(--bg-tertiary)] rounded-3xl p-6 border border-[var(--border-color)] flex flex-col items-center flex-shrink-0 shadow-inner">
            <h3 className="font-bold text-black mb-4 flex items-center gap-2"><Smartphone size={18}/> Table QR Code</h3>
            <div className="bg-white p-4 rounded-xl shadow-lg mb-4 transform hover:scale-105 transition-transform cursor-pointer">
              <div className="w-48 h-48 bg-[url('https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=w-commerce.com/menu')] bg-contain" />
            </div>
            <select
              value={selectedTable}
              onChange={e => setSelectedTable(e.target.value)}
              className="w-full bg-white border border-[var(--border-color)] rounded-lg px-4 py-2 font-bold text-sm text-black outline-none mb-3 shadow-sm"
            >
              <option>Table 1</option>
              <option>Table 2</option>
              <option>Table 3</option>
              <option>Bar Area</option>
            </select>
            <button onClick={handleDownloadTent} className="w-full bg-black text-white font-bold py-2 rounded-lg text-sm hover:bg-gray-900 transition-colors">
              Download Table Tent
            </button>
          </div>

          <div className="bg-white border border-[var(--border-color)] rounded-xl p-5 flex-1 overflow-hidden shadow-sm flex flex-col relative">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-200 via-gray-800 to-gray-200" />
             <h3 className="font-bold text-black mb-1 flex items-center gap-2 mt-2"><MenuIcon size={16}/> Customer Preview</h3>
             <p className="text-xs text-[var(--text-muted)] mb-4">Live simulation of the mobile menu.</p>
             <div className="flex-1 bg-gray-50 rounded-lg border border-gray-200 p-3 overflow-hidden flex flex-col">
                <div className="bg-black text-white p-3 rounded-t-lg font-bold text-center text-sm">{currentCat?.name || 'Menu'}</div>
                <div className="flex-1 overflow-y-auto space-y-2 p-2">
                  {currentCat?.items.map(it => (
                    <div key={it.id} className="p-2.5 bg-white border border-gray-100 rounded-md shadow-sm flex justify-between items-center text-xs">
                      <span className="font-bold text-black truncate">{it.name}</span>
                      <span className="font-mono text-gray-700">{it.price}</span>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default QRMenuConfigView;
