import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Heart, Calendar, LogIn, User, Package, ChevronRight, Star } from 'lucide-react';
import { usePreview } from '../commerce/PreviewContext';

const tabs = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'orders',  label: 'Orders',  icon: Package },
  { id: 'wishlist',label: 'Saved',   icon: Heart },
  { id: 'bookings',label: 'Bookings',icon: Calendar },
];

const GuestView = ({ onLogin }) => (
  <div className="flex flex-col items-center justify-center h-full gap-6 px-8 text-center">
    <div className="w-20 h-20 rounded-full bg-[var(--s-surface)] flex items-center justify-center">
      <User size={36} className="opacity-40" />
    </div>
    <div>
      <h3 className="font-black text-xl mb-1" style={{ fontFamily: 'var(--s-font-heading)' }}>Welcome</h3>
      <p className="opacity-50 text-sm">Sign in to view your orders, saved items, and more.</p>
    </div>
    <button
      onClick={onLogin}
      className="w-full py-3 px-6 rounded-full font-bold text-sm transition-all hover:opacity-90 active:scale-95"
      style={{ backgroundColor: 'var(--s-primary)', color: 'var(--s-bg)' }}
    >
      <span className="flex items-center justify-center gap-2"><LogIn size={16} /> Sign In / Register</span>
    </button>
    <p className="text-xs opacity-40">This is a store preview. Mock auth is enabled.</p>
  </div>
);

const AuthView = ({ user, onLogout }) => (
  <div className="flex flex-col items-center justify-center h-full gap-6 px-8 text-center">
    <div className="w-20 h-20 rounded-full bg-[var(--s-surface)] flex items-center justify-center">
      <User size={36} style={{ color: 'var(--s-primary)' }} />
    </div>
    <div>
      <h3 className="font-black text-xl mb-1" style={{ fontFamily: 'var(--s-font-heading)' }}>{user.name}</h3>
      <p className="opacity-50 text-sm">{user.email}</p>
    </div>
    <button
      onClick={onLogout}
      className="w-full py-3 px-6 rounded-full font-bold text-sm transition-all hover:opacity-90 active:scale-95"
      style={{ backgroundColor: 'var(--s-surface)', color: 'var(--s-text)' }}
    >
      Sign Out
    </button>
  </div>
);

const OrderCard = ({ order }) => (
  <div className="border border-[var(--s-border,rgba(0,0,0,0.1))] rounded-2xl p-4 mb-3">
    <div className="flex justify-between items-start mb-3">
      <div>
        <p className="font-black text-sm">{order.id}</p>
        <p className="text-xs opacity-50">{new Date(order.date).toLocaleDateString()}</p>
      </div>
      <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: 'var(--s-primary)', color: 'var(--s-bg)' }}>
        {order.status}
      </span>
    </div>
    <div className="flex gap-2 mb-3">
      {order.items.slice(0, 3).map((item, i) => (
        <img key={i} src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
      ))}
      {order.items.length > 3 && (
        <div className="w-12 h-12 rounded-lg bg-[var(--s-surface)] flex items-center justify-center text-xs font-bold opacity-60">
          +{order.items.length - 3}
        </div>
      )}
    </div>
    <div className="flex justify-between items-center">
      <p className="text-xs opacity-50">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
      <p className="font-black text-sm">${order.total.toFixed(2)}</p>
    </div>
  </div>
);

const WishlistCard = ({ item, onAddToCart, onRemove }) => (
  <div className="flex gap-3 mb-3 p-3 border border-[var(--s-border,rgba(0,0,0,0.1))] rounded-2xl">
    <img src={item.image} alt={item.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
    <div className="flex-1 min-w-0">
      <p className="font-bold text-sm truncate">{item.name}</p>
      <p className="font-black text-sm" style={{ color: 'var(--s-primary)' }}>${item.price.toFixed(2)}</p>
      <div className="flex gap-1 items-center mt-1">
        <Star size={10} fill="currentColor" className="text-yellow-400" />
        <span className="text-xs opacity-50">{item.rating}</span>
      </div>
    </div>
    <div className="flex flex-col gap-2 items-end flex-shrink-0">
      <button onClick={() => onRemove(item.id)} className="opacity-40 hover:opacity-100 transition-opacity">
        <X size={14} />
      </button>
      <button
        onClick={() => onAddToCart(item)}
        className="text-xs font-bold px-3 py-1 rounded-full transition-all hover:opacity-90 active:scale-95 whitespace-nowrap"
        style={{ backgroundColor: 'var(--s-primary)', color: 'var(--s-bg)' }}
      >
        Add
      </button>
    </div>
  </div>
);

const BookingCard = ({ booking }) => (
  <div className="border border-[var(--s-border,rgba(0,0,0,0.1))] rounded-2xl p-4 mb-3">
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--s-primary)', color: 'var(--s-bg)' }}>
        <Calendar size={18} />
      </div>
      <div className="flex-1">
        <p className="font-black text-sm">{booking.service || booking.title || 'Appointment'}</p>
        <p className="text-xs opacity-50">{booking.date} {booking.time && `at ${booking.time}`}</p>
        {booking.notes && <p className="text-xs opacity-60 mt-1">{booking.notes}</p>}
      </div>
      <span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">Confirmed</span>
    </div>
  </div>
);

export const UserProfilePanel = ({ isOpen, onClose }) => {
  const { orders, wishlist, bookings, addToCart, addToWishlist, store, user, login, logout } = usePreview();
  const [activeTab, setActiveTab] = useState('account');

  const handleRemoveWishlist = (id) => addToWishlist({ id }); // toggle off

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70]"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm z-[80] flex flex-col shadow-2xl"
            style={{ backgroundColor: 'var(--s-bg)', color: 'var(--s-text)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--s-border,rgba(0,0,0,0.08))]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--s-primary)', color: 'var(--s-bg)' }}>
                  <User size={18} />
                </div>
                <div>
                  <p className="font-black text-sm" style={{ fontFamily: 'var(--s-font-heading)' }}>My Account</p>
                  <p className="text-xs opacity-40">{store?.name}</p>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--s-surface)] opacity-70 hover:opacity-100 transition-opacity">
                <X size={16} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[var(--s-border,rgba(0,0,0,0.08))] px-2">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const count = tab.id === 'orders' ? orders.length : tab.id === 'wishlist' ? wishlist.length : tab.id === 'bookings' ? bookings.length : null;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex-1 flex flex-col items-center gap-1 py-3 text-xs font-bold transition-all relative"
                    style={{ opacity: activeTab === tab.id ? 1 : 0.45 }}
                  >
                    <Icon size={16} />
                    <span>{tab.label}</span>
                    {count > 0 && (
                      <span className="absolute top-2 right-2 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center" style={{ backgroundColor: 'var(--s-primary)', color: 'var(--s-bg)' }}>
                        {count}
                      </span>
                    )}
                    {activeTab === tab.id && (
                      <motion.div layoutId="profile-tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: 'var(--s-primary)' }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.18 }}
                >
                  {/* Account Tab */}
                  {activeTab === 'account' && (
                    user ? <AuthView user={user} onLogout={logout} /> : <GuestView onLogin={login} />
                  )}

                  {/* Orders Tab */}
                  {activeTab === 'orders' && (
                    orders.length === 0 ? (
                      <EmptyState icon={<ShoppingBag size={32} />} title="No orders yet" desc="Your orders will appear here once you make a purchase." />
                    ) : (
                      orders.map(order => <OrderCard key={order.id} order={order} />)
                    )
                  )}

                  {/* Wishlist Tab */}
                  {activeTab === 'wishlist' && (
                    wishlist.length === 0 ? (
                      <EmptyState icon={<Heart size={32} />} title="Your wishlist is empty" desc="Save items you love by tapping the heart icon on any product." />
                    ) : (
                      wishlist.map(item => (
                        <WishlistCard
                          key={item.id}
                          item={item}
                          onAddToCart={(p) => { addToCart(p); onClose(); }}
                          onRemove={handleRemoveWishlist}
                        />
                      ))
                    )
                  )}

                  {/* Bookings Tab */}
                  {activeTab === 'bookings' && (
                    bookings.length === 0 ? (
                      <EmptyState icon={<Calendar size={32} />} title="No bookings yet" desc="Your appointments and reservations will appear here." />
                    ) : (
                      bookings.map((b, i) => <BookingCard key={i} booking={b} />)
                    )
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const EmptyState = ({ icon, title, desc }) => (
  <div className="flex flex-col items-center justify-center h-48 gap-3 text-center px-4">
    <div className="opacity-20">{icon}</div>
    <p className="font-black text-base">{title}</p>
    <p className="text-xs opacity-40">{desc}</p>
  </div>
);

export default UserProfilePanel;
