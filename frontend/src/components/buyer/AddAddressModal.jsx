import React, { useState } from 'react';
import { X, MapPin, Loader2, CheckCircle } from 'lucide-react';
import { useBuyerStore } from '../../store/buyerStore';
import { apiClient as axios } from '@/utils/apiClient';

const AddAddressModal = ({ isOpen, onClose }) => {
  const { fetchProfile } = useBuyerStore();
  const [formData, setFormData] = useState({
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    landmark: '',
    closestBusStop: ''
  });
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/v1/user/address', formData);
      if (response.data.success || response.status === 201 || response.status === 200) {
        setIsSuccess(true);
        fetchProfile(); // refresh the user's addresses
        setTimeout(() => {
          setIsSuccess(false);
          setFormData({ street: '', city: '', state: '', postalCode: '', country: '', landmark: '', closestBusStop: '' });
          onClose();
        }, 1500);
      } else {
        setError('Failed to save address.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving address.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="modal-3d-glass rounded-2xl w-full max-w-lg overflow-hidden relative shadow-2xl">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2 text-black">
            <MapPin className="text-[var(--accent-gray)]" /> Add New Address
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-700 hover:text-black">
            <X size={20} />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in duration-300">
            <CheckCircle className="text-emerald-500 w-24 h-24 animate-[bounce_1s_ease-in-out]" />
            <h3 className="text-2xl font-bold text-black text-center">Address Saved!</h3>
            <p className="text-[var(--text-muted)] text-center">Your delivery address has been added successfully.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6 animate-in fade-in duration-300">
            {error && (
              <div className="bg-gray-500/10 border border-gray-500/50 text-gray-700 p-4 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Street Address</label>
              <input
                type="text"
                name="street"
                value={formData.street}
                onChange={handleChange}
                placeholder="123 Main St, Apt 4B"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-black focus:outline-none focus:border-[var(--accent-gray)] transition-colors"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="New York"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-black focus:outline-none focus:border-[var(--accent-gray)] transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">State / Province</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="NY"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-black focus:outline-none focus:border-[var(--accent-gray)] transition-colors"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Postal Code</label>
                <input
                  type="text"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleChange}
                  placeholder="10001"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-black focus:outline-none focus:border-[var(--accent-gray)] transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Country</label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  placeholder="United States"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-black focus:outline-none focus:border-[var(--accent-gray)] transition-colors"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Landmark (Optional)</label>
                <input
                  type="text"
                  name="landmark"
                  value={formData.landmark}
                  onChange={handleChange}
                  placeholder="E.g., Beside the big tree"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-black focus:outline-none focus:border-[var(--accent-gray)] transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Closest Bus Stop (Optional)</label>
                <input
                  type="text"
                  name="closestBusStop"
                  value={formData.closestBusStop}
                  onChange={handleChange}
                  placeholder="E.g., Oshodi Bus Stop"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-black focus:outline-none focus:border-[var(--accent-gray)] transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--accent-gray)] text-black font-bold py-3 rounded-xl hover:brightness-110 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>
              ) : 'Save Address'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddAddressModal;

