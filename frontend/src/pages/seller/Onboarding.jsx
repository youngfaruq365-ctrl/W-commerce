import React, { useState } from 'react';
import { Store, Upload, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiClient as axios } from '@/utils/apiClient';
import toast from 'react-hot-toast';

const SellerOnboarding = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    businessName: '',
    registrationNumber: '',
    country: 'United States',
  });
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const countries = ['United States', 'United Kingdom', 'United Arab Emirates', 'Germany', 'Singapore', 'Nigeria', 'Canada', 'Australia'];

  const handleSubmit = async () => {
    if (!document) {
      toast.error('Please upload a document first.');
      return;
    }
    try {
      setLoading(true);
      const formDataToSend = new FormData();
      formDataToSend.append('businessName', formData.businessName);
      formDataToSend.append('registrationNumber', formData.registrationNumber);
      formDataToSend.append('country', formData.country);
      formDataToSend.append('document', document);

      const res = await axios.post('/api/v1/seller/onboarding', formDataToSend);
      if (res.data.success) {
        setStep(3);
        toast.success('Application submitted successfully!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit application.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-[#050505] text-black pt-24 pb-12 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-gx-gray/20 text-gx-gray rounded-full flex items-center justify-center mx-auto mb-4">
            <Store size={32} />
          </div>
          <h1 className="text-4xl font-bold mb-4">Become a GlobalX Merchant</h1>
          <p className="text-gray-700">Reach millions of buyers worldwide with secure escrow and centralized hub shipping.</p>
        </div>

        <div className="glass-card p-8">
          {/* Progress Bar */}
          <div className="flex gap-2 mb-8">
            <div className={`h-2 flex-1 rounded-full ${step >= 1 ? 'bg-gx-gray' : 'bg-white/10'}`}></div>
            <div className={`h-2 flex-1 rounded-full ${step >= 2 ? 'bg-gx-gray' : 'bg-white/10'}`}></div>
            <div className={`h-2 flex-1 rounded-full ${step >= 3 ? 'bg-gx-gray' : 'bg-white/10'}`}></div>
          </div>

          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Business Details</h2>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Registered Business Name</label>
                <input type="text" className="glass-input w-full" placeholder="e.g. Global Imports LLC" value={formData.businessName} onChange={(e) => setFormData({...formData, businessName: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Business Registration Number</label>
                <input type="text" className="glass-input w-full" placeholder="Company ID" value={formData.registrationNumber} onChange={(e) => setFormData({...formData, registrationNumber: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Country of Operation</label>
                <select className="glass-input w-full bg-white/50" value={formData.country} onChange={(e) => setFormData({...formData, country: e.target.value})}>
                  {countries.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button onClick={() => setStep(2)} className="glass-btn glass-btn-primary w-full py-4 mt-4">Continue</button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">KYB Documents</h2>
              <p className="text-sm text-gray-700">Please upload your business registration documents for verification.</p>
              
              <label className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-gx-gray/50 hover:bg-gx-gray/5 transition-all cursor-pointer block">
                <input type="file" className="hidden" accept=".pdf,.jpg,.png" onChange={(e) => setDocument(e.target.files[0])} />
                <Upload size={40} className="mx-auto text-gray-500 mb-4" />
                <p className="font-semibold mb-1">{document ? document.name : 'Click to upload documents'}</p>
                <p className="text-xs text-gray-500">PDF, JPG, or PNG (Max 5MB)</p>
              </label>

              <div className="flex gap-4 mt-8">
                <button onClick={() => setStep(1)} className="glass-btn flex-1 py-4" disabled={loading}>Back</button>
                <button onClick={handleSubmit} disabled={loading} className="glass-btn glass-btn-primary flex-1 py-4">
                  {loading ? 'Submitting...' : 'Submit Documents'}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-gx-success/20 text-gx-success rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={40} />
              </div>
              <h2 className="text-3xl font-bold mb-4">Application Submitted!</h2>
              <p className="text-gray-700 mb-8 max-w-md mx-auto">
                Your merchant application is now under review. We typically process KYB applications within 24-48 hours.
              </p>
              <Link to="/seller/dashboard" className="glass-btn glass-btn-primary px-8 py-3">Go to Dashboard</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SellerOnboarding;
