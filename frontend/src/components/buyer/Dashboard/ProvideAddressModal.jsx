import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Loader2 } from 'lucide-react';
import { apiClient as axios } from '@/utils/apiClient';
import toast from 'react-hot-toast';
import { useBuyerStore } from '../../../store/buyerStore';

const ProvideAddressModal = ({ isOpen, onClose, orderId }) => {
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState({
    street: '',
    city: '',
    state: '',
    country: '',
    zipCode: '',
    phone: '',
    fullName: ''
  });
  
  const { fetchOrders } = useBuyerStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`/api/v1/orders/${orderId}/update-address`, {
        shippingAddress: JSON.stringify(address)
      });
      if (response.data.success) {
        toast.success('Address updated successfully');
        fetchOrders();
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update address');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="modal-panel premium-glass dark:bg-[#1a1a1a] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-[var(--border-color)]"
        >
          <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center bg-gray-50 dark:bg-[#111]">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <MapPin className="text-[var(--accent-gray)]" /> Provide Shipping Details
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <p className="text-sm text-[var(--text-muted)] mb-4">
              The seller has requested your shipping address to process Order #{orderId?.slice(0, 8).toUpperCase()}.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-bold mb-1">Full Name</label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                  value={address.fullName}
                  onChange={(e) => setAddress({...address, fullName: e.target.value})}
                  placeholder="e.g. John Doe"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold mb-1">Street Address</label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                  value={address.street}
                  onChange={(e) => setAddress({...address, street: e.target.value})}
                  placeholder="123 Main St"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">City</label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                  value={address.city}
                  onChange={(e) => setAddress({...address, city: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">State / Province</label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                  value={address.state}
                  onChange={(e) => setAddress({...address, state: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Country</label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                  value={address.country}
                  onChange={(e) => setAddress({...address, country: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">ZIP / Postal Code</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                  value={address.zipCode}
                  onChange={(e) => setAddress({...address, zipCode: e.target.value})}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold mb-1">Phone Number</label>
                <input
                  required
                  type="tel"
                  className="w-full px-4 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                  value={address.phone}
                  onChange={(e) => setAddress({...address, phone: e.target.value})}
                  placeholder="+234..."
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-[var(--border-color)] mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 rounded-xl font-bold border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 rounded-xl font-bold bg-black text-white dark:bg-white dark:text-black flex items-center justify-center min-w-[120px] disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Details'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ProvideAddressModal;
