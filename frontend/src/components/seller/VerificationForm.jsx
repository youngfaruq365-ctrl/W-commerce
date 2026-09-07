import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldAlert, ShieldCheck, CheckCircle, Upload, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const VerificationForm = ({ showNotification }) => {
  const { user, checkAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  
  const [formData, setFormData] = useState({
    type: 'KYB',
    idType: 'COMPANY_REGISTRATION',
    idNumber: '',
    documentUrl: ''
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await axios.get('/api/v1/verification/my-status');
      if (res.data.success) {
        setStatus(res.data);
      }
    } catch (err) {
      // Error handled silently
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const uploadData = new FormData();
    uploadData.append('image', file);

    setUploadingImage(true);
    try {
      const res = await axios.post('/api/v1/upload', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        setFormData(prev => ({ ...prev, documentUrl: res.data.imageUrl }));
        if(showNotification) showNotification('Document uploaded successfully!');
      }
    } catch (err) {
      if(showNotification) showNotification('Failed to upload document', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.idNumber || !formData.documentUrl) {
      if(showNotification) showNotification('Please fill all fields and provide a document URL', 'error');
      return;
    }
    
    setLoading(true);
    try {
      const res = await axios.post('/api/v1/verification/submit', {
        type: formData.type,
        idType: formData.idType,
        idNumber: formData.idNumber,
        documentUrls: [formData.documentUrl]
      });
      
      if (res.data.success) {
        if(showNotification) showNotification('Verification submitted successfully!');
        await fetchStatus(); // refresh status
      }
    } catch (err) {
      if(showNotification) showNotification(err.response?.data?.message || 'Failed to submit verification', 'error');
    } finally {
      setLoading(false);
    }
  };

  const isVerified = status?.kycTier >= 2 || user?.kycTier >= 2;
  const pendingRequests = status?.requests?.filter(r => r.status === 'PENDING') || [];
  const hasPending = pendingRequests.length > 0;

  if (isVerified) {
    return (
      <div className="bg-white border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] p-8 rounded-xl max-w-2xl">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[var(--accent-gray)] shadow-[0_2px_10px_var(--accent-gray-dim)]">
          <ShieldCheck size={32} className="text-gray-700 500" />
          <div>
            <h3 className="font-bold text-lg text-black">Verified Merchant</h3>
            <p className="text-sm text-[var(--text-muted)]">Your business identity is fully verified.</p>
          </div>
        </div>
        <p className="text-sm text-[var(--text-muted)]">No further documents required at this time.</p>
      </div>
    );
  }

  if (hasPending) {
    return (
      <div className="bg-white border border-yellow-500/30 p-8 rounded-xl max-w-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500 animate-pulse"></div>
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[var(--accent-gray)] shadow-[0_2px_10px_var(--accent-gray-dim)]">
          <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
            <Loader2 size={24} className="text-yellow-500 animate-spin" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-black">Verification Pending</h3>
            <p className="text-sm text-[var(--text-muted)]">We are reviewing your submitted documents.</p>
          </div>
        </div>
        <p className="text-sm text-[var(--text-muted)]">This process usually takes 24-48 hours. We will notify you once complete.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] p-8 rounded-xl max-w-2xl">
      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[var(--accent-gray)] shadow-[0_2px_10px_var(--accent-gray-dim)]">
        <ShieldAlert size={32} className="text-[var(--accent-gray)]" />
        <div>
          <h3 className="font-bold text-lg text-black">Action Required</h3>
          <p className="text-sm text-[var(--text-muted)]">Please verify your business to lift restrictions.</p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-black mb-2">Verification Type</label>
          <select 
            className="w-full bg-[var(--bg-tertiary)] border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] text-black rounded-lg px-4 py-3 focus:outline-none focus:border-[var(--accent-gray)]"
            value={formData.type}
            onChange={(e) => setFormData({...formData, type: e.target.value})}
          >
            <option value="KYB">KYB (Business / Company)</option>
            <option value="KYC">KYC (Individual / Sole Proprietor)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-black mb-2">Document Type</label>
          <select 
            className="w-full bg-[var(--bg-tertiary)] border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] text-black rounded-lg px-4 py-3 focus:outline-none focus:border-[var(--accent-gray)]"
            value={formData.idType}
            onChange={(e) => setFormData({...formData, idType: e.target.value})}
          >
            {formData.type === 'KYB' ? (
              <>
                <option value="COMPANY_REGISTRATION">Certificate of Incorporation</option>
                <option value="TAX_CERTIFICATE">Tax Identification Certificate</option>
              </>
            ) : (
              <>
                <option value="PASSPORT">International Passport</option>
                <option value="DRIVERS_LICENSE">Driver's License</option>
                <option value="NATIONAL_ID">National ID Card</option>
              </>
            )}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-black mb-2">Registration / ID Number</label>
          <input 
            type="text" 
            placeholder="e.g. RC-123456"
            className="w-full bg-[var(--bg-tertiary)] border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] text-black rounded-lg px-4 py-3 focus:outline-none focus:border-[var(--accent-gray)]"
            value={formData.idNumber}
            onChange={(e) => setFormData({...formData, idNumber: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-black mb-2">Upload Document</label>
          <div className="flex items-center gap-4">
            <label className="cursor-pointer bg-[var(--bg-tertiary)] border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] hover:border-[var(--accent-gray)] text-black rounded-lg px-4 py-3 transition-colors flex items-center gap-2">
              {uploadingImage ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
              {uploadingImage ? 'Uploading...' : 'Choose File'}
              <input 
                type="file" 
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploadingImage}
              />
            </label>
            <input 
              type="text" 
              readOnly
              placeholder="Or paste an image URL..."
              className="flex-1 bg-white/50 border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] text-[var(--text-muted)] rounded-lg px-4 py-3 cursor-not-allowed"
              value={formData.documentUrl}
            />
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            Upload a clear photo or scan of your document.
          </p>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-[var(--accent-gray)] text-black font-extrabold py-4 px-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity tracking-widest uppercase disabled:opacity-50 mt-4"
        >
          {loading ? 'Submitting...' : 'Submit Verification'}
        </button>
      </form>
    </div>
  );
};

export default VerificationForm;
