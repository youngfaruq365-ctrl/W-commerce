import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Image as ImageIcon, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient as axios } from '@/utils/apiClient';

const CourierOnboarding = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    vehicleType: 'MOTORCYCLE',
    vehicleMake: '',
    vehicleModel: '',
    vehiclePlate: '',
    guarantorName: '',
    guarantorPhone: '',
    guarantorAddress: ''
  });

  const [file, setFile] = useState(null);
  const [kycStatus, setKycStatus] = useState('UNREGISTERED');
  const [initialLoading, setInitialLoading] = useState(true);

  React.useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await axios.get('/api/v1/courier/kyc/status', { withCredentials: true });
        if (res.data.success && res.data.kycStatus === 'SUBMITTED') {
          setKycStatus('SUBMITTED');
        } else if (res.data.success && res.data.kycStatus === 'APPROVED') {
          navigate('/courier/dashboard');
        }
      } catch (err) {
        // Assume unregistered if not found
      } finally {
        setInitialLoading(false);
      }
    };
    checkStatus();
  }, [navigate]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error('Driver\'s License is required');
      return;
    }

    setLoading(true);
    const data = new FormData();
    data.append('driversLicense', file);
    data.append('vehicleType', formData.vehicleType);
    data.append('vehicleMake', formData.vehicleMake);
    data.append('vehicleModel', formData.vehicleModel);
    data.append('vehiclePlate', formData.vehiclePlate);
    data.append('guarantorName', formData.guarantorName);
    data.append('guarantorPhone', formData.guarantorPhone);
    data.append('guarantorAddress', formData.guarantorAddress);

    try {
      const response = await axios.post('/api/v1/courier/kyc', data, { withCredentials: true });

      if (response.data.success) {
        toast.success('KYC Submitted Successfully!');
        navigate('/courier/dashboard');
      } else {
        toast.error(response.data.message || 'Failed to submit KYC');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'An error occurred submitting KYC');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="w-8 h-8 border-2 border-[var(--accent-gray)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (kycStatus === 'SUBMITTED') {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-main)] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl shadow-2xl p-8 text-center animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-[var(--accent-gray)]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-[var(--accent-gray)]" />
          </div>
          <h2 className="text-2xl font-black mb-3">Application Under Review</h2>
          <p className="text-[var(--text-muted)] mb-6">
            Your KYC details have been successfully submitted. Our team is currently reviewing your application. You will be notified once approved!
          </p>
          <button 
            onClick={() => navigate(0)}
            className="w-full py-3 px-4 bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] text-[var(--text-main)] font-bold rounded-xl transition-colors"
          >
            Refresh Status
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-main)] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-8 border-b border-[var(--border-color)] text-center">
          <div className="w-16 h-16 bg-[var(--accent-gray)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={32} className="text-[var(--accent-gray)]" />
          </div>
          <h1 className="text-3xl font-black tracking-tight mb-2">Courier KYC Verification</h1>
          <p className="text-[var(--text-muted)]">Complete your profile to start accepting deliveries</p>
        </div>

        {/* Steps */}
        <div className="flex border-b border-[var(--border-color)]">
          <div className={`flex-1 py-4 text-center font-bold text-sm ${step === 1 ? 'text-[var(--accent-gray)] border-b-2 border-[var(--accent-gray)]' : 'text-[var(--text-muted)]'}`}>
            1. Identity
          </div>
          <div className={`flex-1 py-4 text-center font-bold text-sm ${step === 2 ? 'text-[var(--accent-gray)] border-b-2 border-[var(--accent-gray)]' : 'text-[var(--text-muted)]'}`}>
            2. Vehicle
          </div>
          <div className={`flex-1 py-4 text-center font-bold text-sm ${step === 3 ? 'text-[var(--accent-gray)] border-b-2 border-[var(--accent-gray)]' : 'text-[var(--text-muted)]'}`}>
            3. Guarantor
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-bold">Driver's License</h2>
              <p className="text-sm text-[var(--text-muted)]">Upload a clear photo of your valid driver's license.</p>
              
              <div className="border-2 border-dashed border-[var(--border-color)] rounded-xl p-8 text-center hover:border-[var(--accent-gray)] transition cursor-pointer"
                   onClick={() => document.getElementById('dl-upload').click()}>
                <ImageIcon size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
                <p className="font-bold mb-1">{file ? file.name : "Click to upload Driver's License"}</p>
                <p className="text-xs text-[var(--text-muted)]">JPEG, PNG up to 5MB</p>
                <input 
                  id="dl-upload" 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => setFile(e.target.files[0])} 
                />
              </div>

              <div className="flex justify-end pt-4">
                <button 
                  onClick={() => setStep(2)}
                  disabled={!file}
                  className="bg-[var(--accent-gray)] text-[var(--bg-primary)] px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-bold">Vehicle Information</h2>
              <p className="text-sm text-[var(--text-muted)]">Details of the vehicle you will use for deliveries.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Vehicle Type</label>
                  <select name="vehicleType" value={formData.vehicleType} onChange={handleInputChange} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-gray)]">
                    <option value="MOTORCYCLE">Motorcycle / Bike</option>
                    <option value="CAR">Car</option>
                    <option value="VAN">Van / Truck</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">Make</label>
                    <input type="text" name="vehicleMake" value={formData.vehicleMake} onChange={handleInputChange} placeholder="e.g. Honda" className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-gray)]" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">Model</label>
                    <input type="text" name="vehicleModel" value={formData.vehicleModel} onChange={handleInputChange} placeholder="e.g. PCX 150" className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-gray)]" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">License Plate Number</label>
                  <input type="text" name="vehiclePlate" value={formData.vehiclePlate} onChange={handleInputChange} placeholder="e.g. ABC-123-XY" className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-gray)] uppercase" />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button onClick={() => setStep(1)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] px-4 py-2 font-bold">Back</button>
                <button 
                  onClick={() => setStep(3)}
                  disabled={!(formData.vehicleMake && formData.vehicleModel && formData.vehiclePlate)}
                  className="bg-[var(--accent-gray)] text-[var(--bg-primary)] px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-bold">Guarantor Information</h2>
              <p className="text-sm text-[var(--text-muted)]">A trusted person we can contact in case of emergency.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Full Name</label>
                  <input type="text" name="guarantorName" value={formData.guarantorName} onChange={handleInputChange} placeholder="Guarantor's Full Name" className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-gray)]" />
                </div>
                
                <div>
                  <label className="block text-sm font-bold mb-2">Phone Number</label>
                  <input type="tel" name="guarantorPhone" value={formData.guarantorPhone} onChange={handleInputChange} placeholder="+234..." className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-gray)]" />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Physical Address</label>
                  <textarea name="guarantorAddress" value={formData.guarantorAddress} onChange={handleInputChange} placeholder="Full residential address" rows="3" className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-gray)]"></textarea>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button onClick={() => setStep(2)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] px-4 py-2 font-bold" disabled={loading}>Back</button>
                <button 
                  onClick={handleSubmit}
                  disabled={loading || !(formData.guarantorName && formData.guarantorPhone && formData.guarantorAddress)}
                  className="bg-green-500 text-white px-8 py-2 rounded-lg font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Submitting...' : 'Submit KYC Application'} <CheckCircle2 size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourierOnboarding;
