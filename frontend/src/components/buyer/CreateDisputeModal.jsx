import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  AlertCircle, 
  Upload, 
  Trash2, 
  PackageX, 
  Shuffle, 
  AlertTriangle, 
  Truck, 
  MessageSquareOff, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  DollarSign, 
  RotateCcw, 
  Layers
} from 'lucide-react';
import { useBuyerStore } from '../../store/buyerStore';
import { apiClient as axios } from '@/utils/apiClient';

const CAUSE_TAXONOMY = {
  DAMAGED_ITEM: {
    category: 'DAMAGED_ITEM',
    title: 'Damaged or Defective Item',
    icon: PackageX,
    description: 'Product arrived broken, crushed, defective, or physically damaged.',
    color: 'rose',
    subCauses: [
      { id: 'CRUSHED_BOX', label: 'Crushed / Torn Shipping Box', evidenceTip: 'Take a clear photo of the shipping box & label.' },
      { id: 'BROKEN_SCREEN', label: 'Shattered Screen / Cracked Display', evidenceTip: 'Show screen damage clearly under good lighting.' },
      { id: 'DEFECTIVE_HARDWARE', label: 'Internal Hardware or Electrical Failure', evidenceTip: 'A short video demonstrating power failure is best.' },
      { id: 'LEAKING_PACKAGE', label: 'Spilled / Leaking Product Contents', evidenceTip: 'Capture fluid damage on inner packaging.' }
    ]
  },
  WRONG_ITEM: {
    category: 'WRONG_ITEM',
    title: 'Wrong Item or Variant',
    icon: Shuffle,
    description: 'Received incorrect product, wrong size/color, or missing parts.',
    color: 'blue',
    subCauses: [
      { id: 'WRONG_SIZE', label: 'Incorrect Size / Measurements', evidenceTip: 'Photo of the tag and measuring tape comparison.' },
      { id: 'WRONG_COLOR', label: 'Color or Style Mismatch', evidenceTip: 'Clear photo showing actual color vs listing photo.' },
      { id: 'COMPLETELY_DIFFERENT', label: 'Completely Different Product', evidenceTip: 'Photo of the package label and received item.' },
      { id: 'MISSING_PARTS', label: 'Missing Accessories or Cables', evidenceTip: 'Photo of all included contents laid out.' }
    ]
  },
  NOT_AS_DESCRIBED: {
    category: 'NOT_AS_DESCRIBED',
    title: 'Not As Described or Fake',
    icon: AlertTriangle,
    description: 'Item differs from listing description, counterfeit suspected, or used.',
    color: 'amber',
    subCauses: [
      { id: 'COUNTERFEIT_SUSPECTED', label: 'Suspected Counterfeit / Fake Goods', evidenceTip: 'Close-ups of branding, stitching, barcodes, or serials.' },
      { id: 'SPEC_MISMATCH', label: 'Technical Specification Discrepancy', evidenceTip: 'Screenshot of product specs vs actual hardware info.' },
      { id: 'USED_SOLD_AS_NEW', label: 'Used / Refurbished Item Sold As Brand New', evidenceTip: 'Show scratches, fingerprints, or opened seals.' }
    ]
  },
  NOT_RECEIVED: {
    category: 'NOT_RECEIVED',
    title: 'Package Not Received',
    icon: Truck,
    description: 'Tracking is stuck, marked delivered without receipt, or fake tracking.',
    color: 'indigo',
    subCauses: [
      { id: 'TRACKING_STUCK', label: 'Tracking Inactive >7 Days Past ETA', evidenceTip: 'Screenshot of carrier tracking status page.' },
      { id: 'MARKED_DELIVERED_NOT_RECEIVED', label: 'Marked "Delivered" but Not Received', evidenceTip: 'Check with building/neighbors and attach delivery notice.' },
      { id: 'INVALID_TRACKING', label: 'Invalid / Unrecognized Tracking Code', evidenceTip: 'Screenshot of tracking lookup error from carrier.' }
    ]
  },
  SELLER_UNRESPONSIVE: {
    category: 'SELLER_UNRESPONSIVE',
    title: 'Seller Unresponsive or Refusing Return',
    icon: MessageSquareOff,
    description: 'Seller refused stated return policy or ghosted messages for over 48 hours.',
    color: 'purple',
    subCauses: [
      { id: 'REFUSED_POLICY', label: 'Seller Denied Valid Return Policy', evidenceTip: 'Screenshots of chat history showing refusal.' },
      { id: 'GHOSTED_48H', label: 'No Response to Inquiries for >48 Hours', evidenceTip: 'Screenshots of unanswered message threads.' }
    ]
  }
};

const CreateDisputeModal = ({ isOpen, onClose, orders, initialOrderId }) => {
  const { raiseDispute } = useBuyerStore();
  
  // Wizard Step: 1 = Category, 2 = Subcause & Resolution, 3 = Evidence & Notes
  const [step, setStep] = useState(1);
  const [selectedOrderId, setSelectedOrderId] = useState(initialOrderId || '');
  const [causeCategory, setCauseCategory] = useState('DAMAGED_ITEM');
  const [subCause, setSubCause] = useState('CRUSHED_BOX');
  const [desiredResolution, setDesiredResolution] = useState('REFUND');
  const [description, setDescription] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [evidencePreviews, setEvidencePreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedOrderId(initialOrderId || '');
      setStep(1);
      setCauseCategory('DAMAGED_ITEM');
      setSubCause('CRUSHED_BOX');
      setDesiredResolution('REFUND');
      setDescription('');
      setEvidenceFiles([]);
      setEvidencePreviews([]);
      setError('');
    }
  }, [isOpen, initialOrderId]);

  if (!isOpen) return null;

  const validOrders = orders?.filter(o =>
    ['PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(o.status)
  ) || [];

  const currentCategory = CAUSE_TAXONOMY[causeCategory] || CAUSE_TAXONOMY.DAMAGED_ITEM;
  const currentSubCause = currentCategory.subCauses.find(sc => sc.id === subCause) || currentCategory.subCauses[0];

  const handleCategorySelect = (categoryKey) => {
    setCauseCategory(categoryKey);
    const cat = CAUSE_TAXONOMY[categoryKey];
    if (cat?.subCauses?.length) {
      setSubCause(cat.subCauses[0].id);
    }
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files).slice(0, 3 - evidenceFiles.length);
    if (!selected.length) return;
    const newFiles = [...evidenceFiles, ...selected].slice(0, 3);
    setEvidenceFiles(newFiles);

    newFiles.forEach((file, i) => {
      if (evidencePreviews[i]) return;
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
    e.target.value = '';
  };

  const removeFile = (idx) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== idx));
    setEvidencePreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrderId) {
      setError('Please select an order to dispute.');
      return;
    }
    if (!description.trim()) {
      setError('Please describe what happened in detail.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      let evidenceUrls = [];
      if (evidenceFiles.length > 0) {
        const formData = new FormData();
        evidenceFiles.forEach(f => formData.append('images', f));
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 20000);
          const uploadRes = await axios.post('/api/v1/upload/multiple', formData, {
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          evidenceUrls = uploadRes.data.urls || uploadRes.data.files?.map(f => f.url) || [];
        } catch (err) {
          console.error("Evidence upload error:", err);
          setError(`Evidence upload failed: ${err.message || 'Unknown error'}`);
          setIsSubmitting(false);
          return;
        }
      }

      const extraData = {
        causeCategory,
        subCause,
        desiredResolution
      };

      const success = await raiseDispute(
        selectedOrderId,
        causeCategory,
        description,
        evidenceUrls,
        extraData
      );

      if (success) {
        onClose();
      } else {
        setError('Failed to open dispute. Please check your network and try again.');
      }
    } catch (err) {
      setError(err.message || 'Error creating dispute.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header with Wizard Step Indicator */}
        <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              Raise Buyer Protection Dispute
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${step === 1 ? 'bg-blue-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                1. Cause Category
              </span>
              <span className="text-zinc-400">→</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${step === 2 ? 'bg-blue-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                2. Sub-Cause & Resolution
              </span>
              <span className="text-zinc-400">→</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${step === 3 ? 'bg-blue-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                3. Evidence & Submit
              </span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Wizard Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* Order Selector (Always visible or customizable) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
              Select Disputed Order
            </label>
            <select
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Choose an eligible order --</option>
              {validOrders.map((ord) => (
                <option key={ord.id} value={ord.id}>
                  Order #{ord.id.slice(0, 8).toUpperCase()} — ${(Number(ord.totalAmount) || 0).toLocaleString()} ({ord.status})
                </option>
              ))}
            </select>
          </div>

          {/* STEP 1: CATEGORY SELECTION */}
          {step === 1 && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                What is the primary issue with this order?
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.values(CAUSE_TAXONOMY).map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = causeCategory === cat.category;
                  return (
                    <button
                      key={cat.category}
                      type="button"
                      onClick={() => handleCategorySelect(cat.category)}
                      className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/40 text-blue-950 dark:text-blue-100 shadow-md'
                          : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-blue-600 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'}`}>
                          <Icon size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-zinc-900 dark:text-white leading-tight">
                            {cat.title}
                          </h4>
                          <span className="text-[11px] opacity-70">
                            {cat.subCauses.length} specific causes
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-snug">
                        {cat.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: SUB-CAUSE & DESIRED RESOLUTION */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              
              {/* Sub-causes chips */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-2">
                  Select Specific Sub-Cause:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {currentCategory.subCauses.map((sc) => {
                    const isSelected = subCause === sc.id;
                    return (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => setSubCause(sc.id)}
                        className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                            : 'bg-zinc-50 dark:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700 hover:border-blue-400'
                        }`}
                      >
                        <span>{sc.label}</span>
                        {isSelected && <CheckCircle2 size={16} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Desired Resolution */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-2">
                  What resolution do you request?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setDesiredResolution('REFUND')}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      desiredResolution === 'REFUND'
                        ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/40'
                        : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <DollarSign size={16} /> Full Refund
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">
                      Release escrow payment back to your card or wallet.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDesiredResolution('REPLACEMENT')}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      desiredResolution === 'REPLACEMENT'
                        ? 'bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/40'
                        : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                        <RotateCcw size={16} /> Replacement
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">
                      Seller ships replacement unit with new tracking under escrow.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDesiredResolution('PARTIAL_DISCOUNT')}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      desiredResolution === 'PARTIAL_DISCOUNT'
                        ? 'bg-purple-500/10 border-purple-500 ring-2 ring-purple-500/40'
                        : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                        <Layers size={16} /> Partial Refund
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">
                      Keep the item with a partial price discount or store credit.
                    </p>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* STEP 3: EVIDENCE & STATEMENT */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              
              {/* Evidence Guidance Tip Box */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2.5">
                <AlertCircle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-zinc-900 dark:text-white">Recommended Evidence for: {currentSubCause.label}</p>
                  <p className="mt-0.5 text-zinc-600 dark:text-zinc-300">{currentSubCause.evidenceTip}</p>
                </div>
              </div>

              {/* Description Input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                  Explain the Issue in Detail *
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide precise details: condition when unboxed, what was missing, or how the defect occurred..."
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-2xl p-3.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Photo & Video Upload */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                  Upload Photo or Document Evidence (Max 3)
                </label>
                
                <div className="flex flex-wrap items-center gap-3">
                  {evidencePreviews.map((preview, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-zinc-300 dark:border-zinc-700 group">
                      <img src={preview} alt={`Evidence ${i}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}

                  {evidenceFiles.length < 3 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-20 h-20 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-blue-500 flex flex-col items-center justify-center text-zinc-400 hover:text-blue-500 transition-colors"
                    >
                      <Upload size={18} />
                      <span className="text-[10px] font-semibold mt-1">Upload</span>
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                />
              </div>

              {/* Seller Notification SLA Notice */}
              <div className="p-3.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-300 flex items-center gap-3">
                <Clock size={20} className="text-blue-500 flex-shrink-0" />
                <span>
                  <strong>Escrow Protection Notice:</strong> Submitting this dispute immediately freezes the seller's escrow payout. The seller is alerted with a strict <strong>48-hour response deadline</strong>.
                </span>
              </div>

            </div>
          )}

        </div>

        {/* Wizard Footer Navigation */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
              >
                <ChevronLeft size={16} />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {step < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (!selectedOrderId) {
                    setError('Please select an order first.');
                    return;
                  }
                  setError('');
                  setStep(step + 1);
                }}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                <span>Continue</span>
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Submitting Claim...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Dispute & Freeze Escrow</span>
                    <ShieldAlert size={16} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default CreateDisputeModal;
