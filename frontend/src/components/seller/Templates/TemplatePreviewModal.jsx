import React, { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { X, Monitor, Smartphone, Tablet, Wallet, CheckCircle, CreditCard } from 'lucide-react';
import TemplateRenderer from '../../storefront/TemplateRenderer';

const TemplatePreviewModal = ({ template, ownedRecord, onClose, onPurchaseSuccess, onCustomize }) => {
  const [deviceMode, setDeviceMode] = useState('desktop');
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState(null);

  const isOwned = !!ownedRecord;
  const price = Number(template.price);
  
  // Extract DNA from the template or the customized record
  const templateDNA = (() => {
    try {
      if (isOwned && ownedRecord.customizedConfiguration) {
        return typeof ownedRecord.customizedConfiguration === 'string'
          ? JSON.parse(ownedRecord.customizedConfiguration)
          : ownedRecord.customizedConfiguration;
      }
      return typeof template.configuration === 'string'
        ? JSON.parse(template.configuration)
        : template.configuration || {};
    } catch(e) { return {}; }
  })();

  const handlePurchase = async (paymentMethod = 'WALLET') => {
    setPurchasing(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const getCookie = (name) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return '';
      };
      
      const res = await axios.post(`/api/v1/templates/${template.id}/purchase`, 
        { 
          paymentMethod,
          redirectUrl: window.location.href 
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-csrf-token': getCookie('gx_csrf'),
            'Idempotency-Key': `BUY_${Date.now()}` // Simple idempotency for UI
          }
        }
      );
      
      const data = res.data;
      if (data.success) {
        if (data.authorization_url) {
          window.location.href = data.authorization_url;
        } else {
          onPurchaseSuccess();
        }
      } else {
        if (data.required) {
          setError(`Insufficient Wallet Balance. You need ₦${data.required.toLocaleString()} but have ₦${data.available.toLocaleString()}.`);
        } else {
          setError(data.message || 'Purchase failed');
        }
      }
    } catch (err) {
      setError('An error occurred during purchase.');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.8 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-6xl h-[90vh] bg-[var(--bg-tertiary)] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header toolbar */}
        <div className="bg-white border-b border-[var(--border-color)] px-6 py-4 flex items-center justify-between z-20 shadow-sm">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-black">{template.name}</h2>
            <div className="hidden md:flex bg-gray-100 rounded-lg p-1 gap-1">
              <button 
                onClick={() => setDeviceMode('desktop')}
                className={`p-1.5 rounded-md transition-colors ${deviceMode === 'desktop' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-black'}`}
              >
                <Monitor size={18} />
              </button>
              <button 
                onClick={() => setDeviceMode('tablet')}
                className={`p-1.5 rounded-md transition-colors ${deviceMode === 'tablet' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-black'}`}
              >
                <Tablet size={18} />
              </button>
              <button 
                onClick={() => setDeviceMode('mobile')}
                className={`p-1.5 rounded-md transition-colors ${deviceMode === 'mobile' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-black'}`}
              >
                <Smartphone size={18} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {error && <div className="text-red-500 text-sm font-bold">{error}</div>}
            
            {isOwned ? (
              <button 
                onClick={() => onCustomize(ownedRecord)}
                className="bg-black hover:bg-gray-900 text-white font-bold py-2 px-6 rounded-xl transition-colors flex items-center gap-2"
              >
                Customize
              </button>
            ) : (
              <div className="flex gap-2">
                <button 
                  onClick={() => handlePurchase('WALLET')}
                  disabled={purchasing}
                  className="bg-black hover:bg-gray-900 text-white font-bold py-2 px-6 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Wallet size={16} />
                  {purchasing ? 'Processing...' : template.isFree ? 'Get Free' : `Wallet (₦${price.toLocaleString()})`}
                </button>
                
                {!template.isFree && (
                  <button 
                    onClick={() => handlePurchase('CARD')}
                    disabled={purchasing}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <CreditCard size={16} />
                    {purchasing ? 'Processing...' : `Card (₦${price.toLocaleString()})`}
                  </button>
                )}
              </div>
            )}
            
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Live Preview Area */}
        <div className="flex-1 bg-gray-100 flex items-center justify-center p-4 overflow-hidden relative">
          {/* Device Frame */}
          <motion.div 
            layout
            className={`bg-white border-8 border-gray-300 rounded-[2rem] overflow-hidden shadow-xl relative transition-all duration-300 ease-in-out flex flex-col`}
            style={{
              width: deviceMode === 'mobile' ? '375px' : deviceMode === 'tablet' ? '768px' : '100%',
              height: deviceMode === 'mobile' ? '812px' : deviceMode === 'tablet' ? '1024px' : '100%',
              maxWidth: deviceMode === 'desktop' ? '100%' : undefined
            }}
          >
            {/* Fake Browser Header for Desktop */}
            {deviceMode === 'desktop' && (
              <div className="h-10 bg-gray-100 border-b border-gray-200 flex items-center px-4 gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="flex-1 bg-white mx-4 rounded-md h-6 border border-gray-200 flex items-center px-2 text-xs text-gray-400">
                  store.w-commerce.com
                </div>
              </div>
            )}
            
            {/* Fake Store Content */}
            <div className="flex-1 bg-gray-50 relative overflow-y-auto">
              {/* Dummy store background */}
              <div className="h-48 bg-gray-200 w-full mb-8" />
              <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <div key={i} className="bg-white p-4 rounded-xl shadow-sm h-64 flex flex-col gap-2">
                    <div className="flex-1 bg-gray-100 rounded-lg"></div>
                    <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
                    <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Render the actual template */}
            <TemplateRenderer templateDNA={templateDNA} isPreview={true} />
            
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default TemplatePreviewModal;
