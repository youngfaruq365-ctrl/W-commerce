import React from 'react';
import AssetRegistry from '../../../assets/AssetRegistry';
import useAssetStore from '../../../store/assetStore';
import * as LucideIcons from 'lucide-react';

const iconMap = {
  'seller.analytics': LucideIcons.Activity,
  'seller.performance': LucideIcons.Zap,
  'seller.inventory': LucideIcons.Package,
  'seller.orders': LucideIcons.ShoppingBag,
  'seller.dashboard': LucideIcons.Layout,
  'seller.messages': LucideIcons.MessageSquare,
  'seller.verification': LucideIcons.ShieldCheck,
  'seller.marketing': LucideIcons.Megaphone,
  'seller.settings': LucideIcons.Settings,
  'seller.wallet': LucideIcons.CreditCard,
  'shared.star': LucideIcons.Star,
  'shared.bell': LucideIcons.Bell,
  'shared.menu': LucideIcons.Menu,
  'shared.close': LucideIcons.X,
  'shared.plus': LucideIcons.Plus,
  'shared.archive': LucideIcons.Archive,
  'shared.search': LucideIcons.Search,
  'shared.edit': LucideIcons.Edit,
  'shared.delete': LucideIcons.Trash2,
  'shared.location': LucideIcons.MapPin,
  'shared.phone': LucideIcons.Phone,
  'success': LucideIcons.CheckCircle,
};

const GXIcon = ({ name, className = '', size = 24, themeOverride = null }) => {
  const { theme } = useAssetStore();
  const activeTheme = themeOverride || theme;
  const iconPath = AssetRegistry.getIcon(name, activeTheme);

  if (!iconPath) {
    const FallbackIcon = iconMap[name];
    if (FallbackIcon) {
      return <FallbackIcon className={`gx-icon ${className}`} size={size} />;
    }

    return (
      <div 
        className={`gx-icon-placeholder ${className}`} 
        style={{ width: size, height: size, backgroundColor: '#333', borderRadius: '50%' }}
        title={`Missing icon: ${name}`}
      />
    );
  }

  return (
    <img 
      src={iconPath} 
      alt={`${name} icon`} 
      className={`gx-icon ${className}`} 
      style={{ width: size, height: size }} 
    />
  );
};

export default GXIcon;
