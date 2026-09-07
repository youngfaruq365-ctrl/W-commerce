import React from 'react';
import { ShieldCheck } from 'lucide-react';

const PopupSellerBrand = ({ showLogo, showName, showVerified, sellerName = "Seller", logoUrl, theme }) => {
  return (
    <div className="flex flex-col items-center gap-2 mb-4">
      {showLogo && logoUrl && (
        <img src={logoUrl} alt={sellerName} className="w-12 h-12 rounded-full border-2" style={{ borderColor: theme?.accent || '#fff' }} />
      )}
      {showName && (
        <div className="flex items-center gap-1 font-bold text-sm tracking-wide">
          {sellerName}
          {showVerified && <ShieldCheck size={14} className="text-blue-500" />}
        </div>
      )}
    </div>
  );
};

export default PopupSellerBrand;
