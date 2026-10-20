import React, { useState } from 'react';
import { X, Target } from 'lucide-react';
import { useBuyerStore } from '../../store/buyerStore';
import toast from 'react-hot-toast';

const CreateSourcingRequestModal = ({ onClose }) => {
  const { createBuyerRequest, isLoading } = useBuyerStore();
  const [formData, setFormData] = useState({
    productName: '',
    description: '',
    budget: '',
    quantity: 1,
    category: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.productName || !formData.description || !formData.budget) {
      toast.error('Please fill in all required fields');
      return;
    }

    const payload = {
      productName: formData.productName,
      description: formData.description,
      budget: Number(formData.budget),
      quantity: Number(formData.quantity) || 1,
      category: formData.category || 'General'
    };

    const success = await createBuyerRequest(payload);
    if (success) {
      toast.success('Sourcing request submitted successfully!');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="modal-panel bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="bg-[var(--bg-secondary)] p-6 border-b border-[var(--border-color)] flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
              <Target size={20} className="text-black" />
            </div>
            <h3 className="text-xl font-bold text-black">Create Sourcing Request</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors text-[var(--text-muted)]">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-[var(--text-muted)] mb-6">
            Can't find what you're looking for? Submit a request and our sellers will provide custom quotes for you.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-black mb-1">Product Name *</label>
              <input
                type="text"
                placeholder="e.g. Bulk Organic Honey"
                value={formData.productName}
                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-black mb-1">Detailed Description *</label>
              <textarea
                placeholder="Describe exactly what you need, specifications, sizes, etc."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm h-28 resize-none focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-black mb-1">Target Budget (₦) *</label>
                <input
                  type="number"
                  placeholder="e.g. 50000"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]"
                  required
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-1">Quantity *</label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]"
                  required
                  min="1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-black mb-1">Category (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Groceries"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]"
              />
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 rounded-xl font-bold text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-3 bg-[var(--accent-primary)] text-white rounded-xl font-bold text-sm hover:shadow-[0_0_15px_var(--accent-primary-dim)] transition-all disabled:opacity-50"
              >
                {isLoading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateSourcingRequestModal;
