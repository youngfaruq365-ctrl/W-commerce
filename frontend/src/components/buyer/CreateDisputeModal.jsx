import React, { useState, useRef } from 'react';
import { X, AlertCircle, Upload, Trash2, Paperclip } from 'lucide-react';
import { useBuyerStore } from '../../store/buyerStore';
import axios from 'axios';

const CreateDisputeModal = ({ isOpen, onClose, orders, initialOrderId }) => {
  const { raiseDispute } = useBuyerStore();
  const [selectedOrderId, setSelectedOrderId] = useState(initialOrderId || '');
  const [reason, setReason] = useState('NOT_DELIVERED');
  const [description, setDescription] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState([]); // File objects
  const [evidencePreviews, setEvidencePreviews] = useState([]); // data URLs for preview
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const validOrders = orders?.filter(o =>
    ['PAID', 'PACKED', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(o.status)
  ) || [];

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files).slice(0, 3 - evidenceFiles.length);
    if (!selected.length) return;
    const newFiles = [...evidenceFiles, ...selected].slice(0, 3);
    setEvidenceFiles(newFiles);
    // Generate previews
    newFiles.forEach((file, i) => {
      if (evidencePreviews[i]) return; // already have preview
      const reader = new FileReader();
      reader.onload = (ev) => {
        setEvidencePreviews(prev => {
          const next = [...prev];
          next[i] = ev.target.result;
          return next;
        });
      };
      reader.readAsDataURL(file);
    });
    // Reset file input so same file can be re-selected
    e.target.value = '';
  };

  const removeFile = (idx) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== idx));
    setEvidencePreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrderId) { setError('Please select an order to dispute.'); return; }
    if (!description.trim()) { setError('Please provide a description of the issue.'); return; }

    setIsSubmitting(true);
    setError('');

    try {
      // 1. Upload evidence files (if any)
      let evidenceUrls = [];
      if (evidenceFiles.length > 0) {
        const formData = new FormData();
        evidenceFiles.forEach(f => formData.append('files', f));
        try {
          const uploadRes = await axios.post('/api/v1/upload/multiple', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          evidenceUrls = uploadRes.data.urls || uploadRes.data.files?.map(f => f.url) || [];
        } catch (err) {
          setError('Evidence upload failed. Please try again.');
          setIsSubmitting(false);
          return;
        }
      }

      // 2. Submit dispute with evidence URLs
      const success = await raiseDispute(selectedOrderId, reason, description, evidenceUrls);
      if (success) {
        onClose();
        setSelectedOrderId('');
        setDescription('');
        setEvidenceFiles([]);
        setEvidencePreviews([]);
      } else {
        setError('Failed to raise dispute. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative modal-3d-glass rounded-xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-700 hover:text-black transition-colors">
          <X size={20} />
        </button>

        <h2 className="text-2xl font-bold mb-1">Raise a Dispute</h2>
        <p className="text-[var(--text-muted)] mb-6 text-sm">
          Our escrow service protects your funds. Provide as much evidence as possible to speed up resolution.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <AlertCircle size={18} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Order selector */}
          <div>
            <label className="block text-sm font-bold mb-2">Select Order</label>
            <select
              value={selectedOrderId}
              onChange={e => setSelectedOrderId(e.target.value)}
              className="w-full bg-[var(--bg-tertiary)] border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] rounded-lg px-4 py-3 text-black focus:outline-none transition-colors"
            >
              <option value="">-- Choose an Order --</option>
              {validOrders.map(order => (
                <option key={order.id} value={order.id}>
                  Order #{order.id.slice(0, 8).toUpperCase()} — ${parseFloat(order.totalAmount).toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-bold mb-2">Dispute Reason</label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full bg-[var(--bg-tertiary)] border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] rounded-lg px-4 py-3 text-black focus:outline-none transition-colors"
            >
              <option value="NOT_DELIVERED">Item not delivered</option>
              <option value="ITEM_DEFECTIVE">Item defective or damaged</option>
              <option value="NOT_AS_DESCRIBED">Item not as described</option>
              <option value="WRONG_ITEM">Wrong item received</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold mb-2">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Provide detailed information about the issue — what happened, when, and what resolution you expect..."
              rows="4"
              className="w-full bg-[var(--bg-tertiary)] border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] rounded-lg px-4 py-3 text-black focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Evidence Upload */}
          <div>
            <label className="block text-sm font-bold mb-2 flex items-center gap-2">
              <Paperclip size={14} className="text-[var(--accent-gray)]" />
              Evidence (photos / videos — up to 3)
              <span className="text-[var(--text-muted)] font-normal text-xs">Optional but strongly recommended</span>
            </label>

            {/* Preview thumbnails */}
            {evidencePreviews.length > 0 && (
              <div className="flex gap-3 mb-3 flex-wrap">
                {evidencePreviews.map((src, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-[var(--border-color)]">
                    <img src={src} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 w-5 h-5 bg-white/70 text-gray-700 rounded-full flex items-center justify-center hover:bg-gray-200 hover:text-black transition-colors"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {evidenceFiles.length < 3 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-[var(--border-color)] hover:border-[var(--accent-gray)] rounded-lg p-4 flex flex-col items-center gap-2 text-[var(--text-muted)] hover:text-black transition-colors"
              >
                <Upload size={20} />
                <span className="text-sm">Click to upload evidence ({evidenceFiles.length}/3)</span>
                <span className="text-xs">JPG, PNG, WebP, MP4 accepted</span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-3 rounded-lg transition-colors flex justify-center items-center gap-2 mt-2 disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Dispute'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateDisputeModal;
