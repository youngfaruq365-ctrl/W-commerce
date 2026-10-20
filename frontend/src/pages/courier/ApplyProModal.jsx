import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, CheckCircle, Award } from 'lucide-react';

const ApplyProModal = ({ isOpen, onClose, onApply }) => {
    const navigate = useNavigate();

    if (!isOpen) return null;

    const handleApply = () => {
        if (onApply) {
            onApply();
        } else {
            onClose();
            navigate('/courier/subscription');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="modal-panel bg-[var(--bg-main)] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-6 text-white relative">
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full transition">
                        <X size={20} />
                    </button>
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4">
                        <Award size={32} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-black mb-1">Become a Pro Courier</h2>
                    <p className="text-white/80 text-sm">Elevate your earnings and get exclusive perks.</p>
                </div>
                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                            <CheckCircle size={20} className="text-green-500 mt-0.5 shrink-0" />
                            <div>
                                <h4 className="font-bold text-[var(--text-main)]">Higher Earnings</h4>
                                <p className="text-sm text-[var(--text-muted)]">Get up to 20% more per delivery.</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <CheckCircle size={20} className="text-green-500 mt-0.5 shrink-0" />
                            <div>
                                <h4 className="font-bold text-[var(--text-main)]">Priority Support</h4>
                                <p className="text-sm text-[var(--text-muted)]">Skip the queue when you need help.</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <CheckCircle size={20} className="text-green-500 mt-0.5 shrink-0" />
                            <div>
                                <h4 className="font-bold text-[var(--text-main)]">Exclusive Deliveries</h4>
                                <p className="text-sm text-[var(--text-muted)]">Access high-value and corporate orders.</p>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={handleApply}
                        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98]"
                    >
                        Apply Now
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ApplyProModal;
