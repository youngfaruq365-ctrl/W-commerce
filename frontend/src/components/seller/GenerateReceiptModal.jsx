import React, { useState, useEffect } from 'react';
import { useSellerStore } from '../../store/sellerStore';
import { X, Receipt, CheckCircle, Save } from 'lucide-react';
import axios from 'axios';

const GenerateReceiptModal = ({ isOpen, onClose, proof, onSuccess }) => {
  const { profile, updateStoreConfig } = useSellerStore();
  const [headerText, setHeaderText] = useState('TAX INVOICE');
  const [footerText, setFooterText] = useState('Thank you for your purchase!');
  const [themeColor, setThemeColor] = useState('#22c55e');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile?.store?.portfolioConfig) {
      try {
        const config = JSON.parse(profile.store.portfolioConfig);
        if (config.receipt) {
          setHeaderText(config.receipt.headerText || 'TAX INVOICE');
          setFooterText(config.receipt.footerText || 'Thank you for your purchase!');
          setThemeColor(config.receipt.themeColor || '#22c55e');
        }
      } catch (e) {
        // ignore parse errors
      }
    }
  }, [profile]);

  if (!isOpen || !proof) return null;

  const handleApproveAndGenerate = async () => {
    try {
      setLoading(true);
      
      // 1. Save receipt config to store
      let currentConfig = {};
      try {
        if (profile?.store?.portfolioConfig) {
           currentConfig = JSON.parse(profile.store.portfolioConfig);
        }
      } catch(e) {}
      
      currentConfig.receipt = { headerText, footerText, themeColor };
      await updateStoreConfig({ portfolioConfig: JSON.stringify(currentConfig) });
      
      // 2. Approve Payment
      const res = await axios.post(`/api/v1/payment/verify-proof/${proof.id}`, {
        action: 'APPROVE'
      });
      
      if (res.data.success) {
        onSuccess();
        onClose();
      }
      window.__gxAlert?.('Failed to generate receipt and approve payment.') ?? console.warn('Failed to generate receipt and approve payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/80 backdrop-blur-sm">
      <div className="modal-3d-glass w-full max-w-4xl rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(34,197,94,0.1)] flex flex-col md:flex-row">
        
        {/* Editor Side */}
        <div className="p-6 md:w-1/2 border-b md:border-b-0 md:border-r border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Receipt className="text-emerald-500" /> Design Receipt
            </h3>
            <button onClick={onClose} className="text-gray-700 hover:text-black md:hidden"><X size={24} /></button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Receipt Header Text</label>
              <input 
                type="text" 
                value={headerText} 
                onChange={(e) => setHeaderText(e.target.value)}
                className="w-full bg-white/50 border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] rounded-lg px-4 py-2 text-black focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Theme Color</label>
              <div className="flex gap-2">
                {['#22c55e', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899'].map(color => (
                  <button 
                    key={color}
                    onClick={() => setThemeColor(color)}
                    className={`w-8 h-8 rounded-full border-2 ${themeColor === color ? 'border-white scale-110' : 'border-transparent'} transition-all`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Thank You Note / Footer</label>
              <textarea 
                value={footerText} 
                onChange={(e) => setFooterText(e.target.value)}
                rows={3}
                className="w-full bg-white/50 border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] rounded-lg px-4 py-2 text-black focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>
          
          <div className="mt-8">
            <button 
              onClick={handleApproveAndGenerate}
              disabled={loading}
              className="w-full py-3 bg-emerald-500 text-black font-extrabold rounded-xl hover:bg-emerald-400 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
            >
              {loading ? 'Processing...' : <><CheckCircle size={20} /> Approve & Send Receipt</>}
            </button>
            <p className="text-center text-xs text-gray-500 mt-3">This will approve the payment and instantly notify the buyer that their receipt is ready to view and print.</p>
          </div>
        </div>
        
        {/* Preview Side */}
        <div className="p-6 md:w-1/2 bg-white text-black relative flex flex-col justify-center">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-700 hover:text-black hidden md:block"><X size={24} /></button>
          
          <div className="max-w-sm mx-auto w-full shadow-lg border border-gray-200 p-6 rounded relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: themeColor }}></div>
            
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black uppercase tracking-widest" style={{ color: themeColor }}>{headerText}</h2>
              <p className="text-sm font-bold text-gray-500 mt-1">{profile?.store?.storeName || 'Your Store'}</p>
            </div>
            
            <div className="flex justify-between items-end border-b border-gray-200 pb-4 mb-4">
              <div>
                <p className="text-xs text-gray-500 font-bold">BILLED TO</p>
                <p className="font-bold text-sm">
                  {(() => {
                    if (!proof.order?.shippingAddress || proof.order.shippingAddress === 'null') return 'Buyer';
                    try {
                      const addr = JSON.parse(proof.order.shippingAddress || '{}');
                      if (addr && addr.fullName) return addr.fullName;
                    } catch(e) {}
                    return 'Buyer';
                  })()}
                </p>
                <p className="text-xs text-gray-500">
                  {(() => {
                    if (!proof.order?.shippingAddress || proof.order.shippingAddress === 'null') return 'Not Provided';
                    try {
                      const addr = JSON.parse(proof.order.shippingAddress || '{}');
                      if (addr && addr.street) {
                        return [addr.street, addr.city, addr.state, addr.zipCode || addr.postalCode, addr.country].filter(Boolean).join(', ');
                      }
                      return proof.order.shippingAddress;
                    } catch(e) {
                      return proof.order.shippingAddress;
                    }
                  })()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 font-bold">RECEIPT NO.</p>
                <p className="font-bold text-sm">#{proof.id.substring(0,8).toUpperCase()}</p>
                <p className="text-xs text-gray-500">{new Date(proof.createdAt || Date.now()).toLocaleDateString()}</p>
              </div>
            </div>
            
            <table className="w-full mb-6">
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500 font-bold">
                  <th className="text-left pb-2">ITEM</th>
                  <th className="text-right pb-2">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {proof.order?.items?.length > 0 ? (
                  proof.order.items.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100 last:border-0">
                      <td className="py-2 text-sm flex items-center gap-2">
                        <img 
                          src={item.product?.images?.[0]?.url || 'https://placehold.co/100x100/111/333?text=Img'} 
                          alt="product" 
                          className="w-8 h-8 object-cover rounded"
                        />
                        <span className="truncate max-w-[150px]">{item.product?.title || 'Item'} (x{item.quantity})</span>
                      </td>
                      <td className="py-2 text-right text-sm font-bold"> ₦{(parseFloat(item.priceAtTime || item.price || 0) * item.quantity).toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-2 text-sm">Order Items</td>
                    <td className="py-2 text-right text-sm font-bold"> ₦{parseFloat(proof.totalAmount || proof.amount || 0).toFixed(2)}</td>
                  </tr>
                )}
              </tbody>
            </table>
            
            <div className="border-t border-gray-200 pt-4 flex justify-between items-center mb-8">
              <span className="font-bold">TOTAL PAID</span>
              <span className="text-xl font-black" style={{ color: themeColor }}> ₦{parseFloat(proof.order?.totalAmount || proof.amount || 0).toFixed(2)}</span>
            </div>
            
            <div className="text-center">
              <p className="text-xs text-gray-600 italic whitespace-pre-wrap">{footerText}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default GenerateReceiptModal;

