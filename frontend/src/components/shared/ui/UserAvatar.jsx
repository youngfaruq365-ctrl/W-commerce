import React from 'react';

export default function UserAvatar({ user, size = 'w-10 h-10', className = '' }) {
  if (!user) return null;

  // Verification Logic
  const isVerifiedSeller = user.role === 'SELLER' && user.isVerified;
  const isAdmin = user.role === 'ADMIN';

  let shadowClass = '';
  if (isVerifiedSeller) shadowClass = 'avatar-verified-seller';
  if (isAdmin) shadowClass = 'avatar-admin';

  const avatarUrl = user.avatarUrl || user.avatar || user.profileImage;
  const initials = (user.fullName || user.name || 'U').charAt(0).toUpperCase();

  return (
    <div className={`relative rounded-full overflow-hidden bg-[var(--bg-tertiary)] flex items-center justify-center font-bold flex-shrink-0 ${size} ${shadowClass} ${className}`}>
      {avatarUrl ? (
        <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
