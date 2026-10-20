import React from 'react';
import { X, Printer, ShieldCheck } from 'lucide-react';

const PrintableReceiptModal = ({ isOpen, onClose, order }) => {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  // Parse seller's receipt config
  let receiptConfig = {
    headerText: 'RECEIPT',
    footerText: 'Thank you for your purchase!',
    themeColor: '#22c55e'
  };

  try {
    if (order.seller?.store?.portfolioConfig) {
      const config = JSON.parse(order.seller.store.portfolioConfig);
      if (config.receipt) {
        receiptConfig = { ...receiptConfig, ...config.receipt };
      }
    }
  } catch (e) {}

  const buyerAddress = (() => {
    if (!order.shippingAddress || order.shippingAddress === 'null') return 'Not Provided';
    try {
      const addr = JSON.parse(order.shippingAddress || '{}');
      if (addr && addr.street) {
        return [addr.street, addr.city, addr.state, addr.zipCode || addr.postalCode, addr.country].filter(Boolean).join(', ');
      }
      return order.shippingAddress;
    } catch(e) {
      return order.shippingAddress;
    }
  })();

  const buyerName = (() => {
    if (!order.shippingAddress || order.shippingAddress === 'null') return order.buyer?.fullName || 'Buyer';
    try {
      const addr = JSON.parse(order.shippingAddress || '{}');
      if (addr && addr.fullName) return addr.fullName;
    } catch(e) {}
    return order.buyer?.fullName || 'Buyer';
  })();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md print:bg-white print:p-0 print:backdrop-blur-none">
      <div className="modal-panel premium-glass text-black w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:rounded-none">
        
        {/* Modal Controls (Hidden when printing) */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 print:hidden">
          <h3 className="font-bold text-gray-700 flex items-center gap-2">
            <ShieldCheck className="text-emerald-500" /> Secure Receipt
          </h3>
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrint}
              className="px-4 py-2 bg-[var(--text-main)] text-black text-sm font-bold rounded shadow hover:opacity-90 flex items-center gap-2 transition-opacity"
            >
              <Printer size={16} /> Print Receipt
            </button>
            <button onClick={onClose} className="p-2 text-gray-700 hover:text-gray-700 500 transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>
        
        {/* Printable Area */}
        <div className="p-8 md:p-12 overflow-y-auto print:overflow-visible">
          <div className="absolute top-0 left-0 w-full h-3 print:h-2" style={{ backgroundColor: receiptConfig.themeColor }}></div>
          
          <div className="flex justify-between items-start mb-10 mt-4">
            <div>
              <h1 className="text-4xl font-black uppercase tracking-wider mb-1" style={{ color: receiptConfig.themeColor }}>
                {receiptConfig.headerText}
              </h1>
              <p className="font-bold text-gray-800 text-lg">{order.items?.[0]?.product?.store?.storeName || order.seller?.store?.storeName || 'Store'}</p>
              <p className="text-sm text-gray-500">{order.items?.[0]?.product?.store?.country || order.seller?.store?.country || ''}</p>
            </div>
            <div className="text-right text-sm">
              <p className="text-gray-500 font-bold mb-1">RECEIPT NO.</p>
              <p className="font-bold">#{order.id.substring(0,8).toUpperCase()}</p>
              <p className="text-gray-500 mt-2 font-bold mb-1">DATE ISSUED</p>
              <p className="font-bold">{new Date(order.updatedAt).toLocaleDateString()}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-8 mb-10">
            <div>
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">Billed To</h3>
              <p className="font-bold text-gray-800">{buyerName}</p>
              <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{buyerAddress}</p>
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">Payment Status</h3>
              <p className="font-bold text-emerald-600">PAID IN FULL</p>
              <p className="text-sm text-gray-600 mt-1">{order.paymentMethod === 'direct_bank' ? 'Direct Bank Transfer' : order.paymentMethod}</p>
            </div>
          </div>
          
          <table className="w-full mb-10 text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-xs">
                <th className="text-left py-3">Item Description</th>
                <th className="text-center py-3">Qty</th>
                <th className="text-right py-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(order.items || []).map((item, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src={typeof item.product?.images?.[0] === 'string' ? item.product.images[0] : (item.product?.images?.[0]?.url || '/placeholder.jpg')} 
                        alt="product" 
                        className="w-10 h-10 object-cover rounded"
                      />
                      <p className="font-bold text-gray-800">{item.product?.title || item.title || 'Unknown Product'}</p>
                    </div>
                  </td>
                  <td className="py-4 text-center text-gray-600">{item.quantity || 1}</td>
                  <td className="py-4 text-right font-bold text-gray-800"> NGN {parseFloat(item.priceAtTime || item.price || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="flex justify-end mb-10">
            <div className="w-64 space-y-3">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span> NGN {parseFloat(order.totalAmount - (order.shippingCost || 0)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Shipping</span>
                <span> NGN {parseFloat(order.shippingCost || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t-2 border-gray-200 pt-3 text-lg font-black" style={{ color: receiptConfig.themeColor }}>
                <span>TOTAL PAID</span>
                <span> NGN {parseFloat(order.totalAmount).toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <div className="text-center border-t border-gray-200 pt-8">
            <p className="text-sm text-gray-600 italic whitespace-pre-wrap">{receiptConfig.footerText}</p>
            <p className="text-xs text-gray-700 mt-4">This receipt was generated securely via GlobalX platform.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintableReceiptModal;
