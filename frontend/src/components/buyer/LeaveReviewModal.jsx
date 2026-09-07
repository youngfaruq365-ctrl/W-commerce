import React, { useState } from 'react';
import { X, Star } from 'lucide-react';
import { useBuyerStore } from '../../store/buyerStore';

const LeaveReviewModal = ({ isOpen, onClose, order }) => {
  const { submitReview } = useBuyerStore();
  const [selectedProductId, setSelectedProductId] = useState('');
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !order) return null;

  const products = order.items || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    const productId = selectedProductId || products[0]?.productId;
    if (!productId) {
      setError('No product found for this order.');
      return;
    }
    if (!comment.trim()) {
      setError('Please write a review comment.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const success = await submitReview(productId, order.id, rating, comment);
      if (success) {
        onClose();
        setComment('');
        setRating(5);
        setSelectedProductId('');
      } else {
        setError('Failed to submit review. You may have already reviewed this item.');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative modal-3d-glass rounded-xl w-full max-w-md p-6 shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-700 hover:text-black transition-colors">
          <X size={20} />
        </button>

        <h2 className="text-2xl font-bold mb-1">Leave a Review</h2>
        <p className="text-[var(--text-muted)] text-sm mb-6">
          Order #{order.id.slice(0, 8).toUpperCase()}
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {products.length > 1 && (
            <div>
              <label className="block text-sm font-bold mb-2">Select Product</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] rounded-lg px-4 py-3 text-black focus:outline-none focus:border-[var(--accent-gray)] transition-colors"
              >
                {products.map(item => (
                  <option key={item.id} value={item.productId || item.product?.id}>
                    {item.product?.title || 'Product'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {products.length === 1 && (
            <div className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)]">
              <img
                src={products[0]?.product?.images?.[0]?.url || '/placeholder.jpg'}
                className="w-12 h-12 rounded-lg object-cover"
                alt="product"
              />
              <p className="font-bold text-sm line-clamp-2">{products[0]?.product?.title}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold mb-2">Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-125"
                >
                  <Star
                    size={28}
                    className={`transition-colors ${star <= (hoveredRating || rating) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-600'}`}
                  />
                </button>
              ))}
              <span className="ml-2 text-[var(--text-muted)] self-center text-sm">{rating}/5</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Your Review</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience with this product..."
              rows="4"
              className="w-full bg-[var(--bg-tertiary)] border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] rounded-lg px-4 py-3 text-black focus:outline-none focus:border-[var(--accent-gray)] transition-colors resize-none"
            ></textarea>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[var(--accent-gray)] hover:brightness-110 text-black font-bold py-3 rounded-lg transition-all flex justify-center items-center gap-2 mt-2 disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LeaveReviewModal;

