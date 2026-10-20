import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { User, Mail, Phone, Calendar, Shield, Package, Star, Users, Gift, ChevronRight, Edit3, Camera, Award } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useBuyerStore } from '../../store/buyerStore';
import { WButton, WBadge, WAvatar } from '../../design/components';
import UserAvatar from '../../components/shared/ui/UserAvatar';

import { useNavigate } from 'react-router-dom';
import EditProfile from './EditProfile';

const accountLevels = {
  Bronze: { color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/30', icon: '🥉' },
  Silver: { color: 'text-slate-300', bg: 'bg-slate-300/10', border: 'border-slate-300/30', icon: '🥈' },
  Gold:   { color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/30', icon: '🥇' },
};

const navSections = [
  { icon: Package, label: 'My Orders', desc: 'Track, manage & return', href: '/buyer/dashboard?tab=history' },
  { icon: Star, label: 'Wishlist', desc: 'Saved products & lists', href: '/buyer/dashboard?tab=wishlist' },
  { icon: Gift, label: 'Referral Center', desc: 'Invite & earn rewards', href: '/buyer/referrals' },
  { icon: Shield, label: 'Security', desc: 'Password & 2FA settings', href: '/buyer/dashboard?tab=security' },
  { icon: Users, label: 'Affiliate Dashboard', desc: 'Earn from commissions', href: '/buyer/dashboard?tab=overview' },
  { icon: Mail, label: 'Notification Settings', desc: 'Customize your alerts', href: '/buyer/dashboard?tab=notifications' },
];

export default function BuyerProfile() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const { profile, orders, reviews, fetchProfile, fetchOrders, fetchReviews, isLoading } = useBuyerStore();

  useEffect(() => {
    fetchProfile();
    fetchOrders();
    fetchReviews();
  }, [fetchProfile, fetchOrders, fetchReviews]);

  const level = 'Gold';
  const levelStyle = accountLevels[level];
  const displayUser = profile || user || {};

  const stats = [
    { label: 'Orders', value: isLoading ? '...' : (orders?.length || 0) },
    { label: 'Reviews', value: isLoading ? '...' : (reviews?.length || 0) },
    { label: 'Referrals', value: isLoading ? '...' : (displayUser.referralCount || 0) },
    { label: 'Points', value: isLoading ? '...' : (displayUser.rewardPoints || 0) },
  ];

  if (isEditing) {
    return <EditProfile onCancel={() => setIsEditing(false)} />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-main)]">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Profile Card */}
        <div className="relative overflow-hidden rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-md p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-white/3 to-transparent pointer-events-none" />
          <div className="relative flex flex-col md:flex-row items-center md:items-start gap-6">

            {/* Avatar */}
            <div className="relative group flex-shrink-0">
              <UserAvatar user={displayUser} size="w-24 h-24" className="text-4xl" />
              <button onClick={() => setIsEditing(true)} className="absolute bottom-0 right-0 w-8 h-8 bg-[var(--text-main)] rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                <Camera size={14} className="text-[var(--bg-primary)]" />
              </button>
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">{displayUser.fullName || displayUser.name || 'Set Full Name'}</h1>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${levelStyle.color} ${levelStyle.bg} ${levelStyle.border}`}>
                  {levelStyle.icon} {level} Member
                </span>
              </div>
              <div className="flex flex-col md:flex-row md:items-center gap-4 text-[var(--text-muted)] text-sm mt-2">
                <span className="flex items-center gap-1.5"><Mail size={13} />{displayUser.email || 'No email set'}</span>
                <span className="flex items-center gap-1.5"><Phone size={13} />{displayUser.phone || 'No phone set'}</span>
                <span className="flex items-center gap-1.5"><Calendar size={13} />Member since {displayUser.createdAt ? new Date(displayUser.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : 'recently'}</span>
              </div>
              <p className="text-[var(--text-muted)] text-sm mt-3 max-w-md">{displayUser.bio || 'Add a bio to tell the community about yourself.'}</p>
              <div className="mt-4">
                <WButton onClick={() => setIsEditing(true)} variant="ghost" size="sm" icon={<Edit3 size={13} />}>Edit Profile</WButton>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-3">
          {stats.map(s => (
            <div key={s.label} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 text-center hover:border-[var(--border-hover)] transition-all">
              <p className="text-2xl font-black">{s.value}</p>
              <p className="text-[var(--text-muted)] text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Account Level Progress */}
        <div className={`rounded-2xl border p-5 ${levelStyle.bg} ${levelStyle.border}`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className={`font-bold flex items-center gap-2 ${levelStyle.color}`}><Award size={16} /> {level} Member</h3>
              <p className="text-[var(--text-muted)] text-sm mt-0.5">{4000 - (displayUser.rewardPoints || 0)} points to Platinum tier</p>
            </div>
            <span className="text-2xl">👑</span>
          </div>
          <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
            <div className={`h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400`} style={{ width: `${Math.min(((displayUser.rewardPoints || 0) / 4000) * 100, 100)}%` }} />
          </div>
          <div className="flex justify-between text-xs text-[var(--text-muted)] mt-2">
            <span>{displayUser.rewardPoints || 0} pts</span>
            <span>4,000 pts</span>
          </div>
        </div>

        {/* Info Rows */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl divide-y divide-[var(--border-subtle)]">
          {[
            { icon: User, label: 'Full Name', value: displayUser.fullName || displayUser.name || 'Not set' },
            { icon: Mail, label: 'Email', value: displayUser.email || 'Not set' },
            { icon: Phone, label: 'Phone', value: displayUser.phone || 'Not set' },
            { icon: Calendar, label: 'Date of Birth', value: displayUser.dob ? new Date(displayUser.dob).toLocaleDateString() : 'Not set' },
            { icon: Shield, label: 'Account Status', value: displayUser.isVerified ? 'Verified ✓' : 'Unverified' },
          ].map(row => (
            <div key={row.label} className="flex items-center gap-4 p-4">
              <div className="w-8 h-8 bg-[var(--bg-tertiary)] rounded-lg flex items-center justify-center flex-shrink-0">
                <row.icon size={15} className="text-[var(--text-muted)]" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-[var(--text-muted)]">{row.label}</p>
                <p className="text-sm font-medium mt-0.5">{row.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation Cards */}
        <h2 className="text-lg font-bold">Account Sections</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {navSections.map(n => (
            <button onClick={() => navigate(n.href)} key={n.label}
              className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 flex items-center gap-4 hover:border-[var(--border-hover)] hover:bg-[var(--accent-gray-glow)] transition-all text-left group">
              <div className="w-10 h-10 bg-[var(--bg-tertiary)] rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <n.icon size={18} className="text-[var(--text-muted)]" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{n.label}</p>
                <p className="text-[var(--text-muted)] text-xs mt-0.5">{n.desc}</p>
              </div>
              <ChevronRight size={16} className="text-[var(--text-muted)] group-hover:translate-x-1 transition-transform" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
