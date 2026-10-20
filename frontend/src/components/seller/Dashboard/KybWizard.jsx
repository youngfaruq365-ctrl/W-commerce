import React, { useState, useEffect } from 'react';
import { apiClient as axios } from '@/utils/apiClient';
import { ShieldAlert, CheckCircle, Upload, Loader2, FileText, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

const KybWizard = ({ existingRequest, onComplete }) => {
  const [expandedSection, setExpandedSection] = useState('sellerType');
  const [loading, setLoading] = useState(false);
  
  // Track status of sections
  const sectionStatuses = existingRequest?.sectionStatuses || {};
  const rejectionReasons = existingRequest?.rejectionReasons || {};

  const [formData, setFormData] = useState({
    sellerType: existingRequest?.sellerType || 'Registered Business',
    identityData: existingRequest?.identityData || { fullName: '', idType: 'PASSPORT', idNumber: '', dob: '', address: '' },
    businessData: existingRequest?.businessData || { legalName: '', tradingName: '', registrationNumber: '', tin: '', industry: '', category: '' },
    ownershipData: existingRequest?.ownershipData || { directors: '', beneficialOwners: '', ownershipPercentage: '' },
    addressData: existingRequest?.addressData || { registeredAddress: '', operatingAddress: '', storeLocation: '', proofOfAddressUrl: '' },
    payoutData: existingRequest?.payoutData || { bank: '', accountNumber: '', accountName: '' }
  });

  const [uploadingImage, setUploadingImage] = useState(false);

  const handleFileUpload = async (e, section, field) => {
    const file = e.target.files[0];
    if (!file) return;

    const uploadData = new FormData();
    uploadData.append('image', file);

    setUploadingImage(true);
    try {
      const res = await axios.post('/api/v1/upload', uploadData);
      if (res.data.success) {
        setFormData(prev => ({
          ...prev,
          [section]: {
            ...prev[section],
            [field]: res.data.imageUrl
          }
        }));
        toast.success('Document uploaded successfully!');
      }
    } catch (err) {
      toast.error('Failed to upload document');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleUpdateSection = async (sectionKey) => {
    // If it's a completely new submission, we don't update section, we submit all.
    // Wait, the UI allows submitting section by section if it's an update, or all at once?
    // Let's implement full submission if existingRequest is null.
    if (!existingRequest) return;
    
    setLoading(true);
    try {
      const apiSectionName = sectionKey.replace('Data', '');
      const res = await axios.put(`/api/v1/verification/${existingRequest.id}/section`, {
        section: apiSectionName,
        data: formData[sectionKey]
      });
      if (res.data.success) {
        toast.success(res.data.message);
        if (onComplete) onComplete();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update section');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAll = async () => {
    setLoading(true);
    try {
      const payload = {
        type: 'KYB',
        sellerType: formData.sellerType,
        identityData: formData.identityData,
        businessData: formData.businessData,
        ownershipData: formData.ownershipData,
        addressData: formData.addressData,
        payoutData: formData.payoutData
      };
      const res = await axios.post('/api/v1/verification/submit', payload);
      if (res.data.success) {
        toast.success('KYB Verification Submitted Successfully!');
        if (onComplete) onComplete();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit verification');
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { id: 'sellerType', title: '01 Seller Type', dataKey: 'sellerType' },
    { id: 'identity', title: '02 Identity', dataKey: 'identityData' },
    { id: 'business', title: '03 Business', dataKey: 'businessData' },
    { id: 'ownership', title: '04 Ownership', dataKey: 'ownershipData' },
    { id: 'address', title: '05 Address', dataKey: 'addressData' },
    { id: 'payout', title: '06 Payout', dataKey: 'payoutData' },
  ];

  const getSectionStatus = (id) => {
    if (!existingRequest) return null;
    return sectionStatuses[id] || 'PENDING';
  };

  return (
    <div className="bg-white border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] rounded-xl max-w-2xl overflow-hidden">
      <div className="p-8 border-b border-[var(--accent-gray)] shadow-[0_2px_10px_var(--accent-gray-dim)]">
        <div className="flex items-center gap-4 mb-2">
          <ShieldAlert size={32} className="text-[var(--accent-gray)]" />
          <h3 className="font-extrabold text-xl text-black">Action Required</h3>
        </div>
        <p className="text-sm text-[var(--text-muted)] ml-12">Verify your business to lift selling restrictions.</p>
      </div>

      <div className="divide-y divide-[var(--accent-gray)]">
        {sections.map((sec, idx) => {
          const isExpanded = expandedSection === sec.id;
          const status = getSectionStatus(sec.id);
          const isRejected = status === 'REJECTED';
          const isApproved = status === 'APPROVED';

          return (
            <div key={sec.id} className="group">
              <button 
                onClick={() => setExpandedSection(isExpanded ? null : sec.id)}
                className={`w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-gray-50' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <h4 className="font-bold text-lg text-black">{sec.title}</h4>
                  {status && (
                    <span className={`px-2 py-1 rounded text-xs font-bold ${status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : isApproved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {status}
                    </span>
                  )}
                </div>
                {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
              </button>
              
              {isExpanded && (
                <div className="p-6 pt-0 bg-gray-50 animate-in slide-in-from-top-2 duration-200">
                  {isRejected && rejectionReasons[sec.id] && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex gap-3 text-sm">
                      <XCircle size={18} className="shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold mb-1">Update Required</p>
                        <p>{rejectionReasons[sec.id]}</p>
                      </div>
                    </div>
                  )}

                  {/* FORM FIELDS PER SECTION */}
                  <div className="space-y-4">
                    {sec.id === 'sellerType' && (
                      <div className="space-y-2">
                        {['Individual', 'Registered Business', 'Company', 'Organization'].map(type => (
                          <label key={type} className="flex items-center gap-3 p-3 border border-[var(--accent-gray)] rounded-lg cursor-pointer hover:border-black transition-colors">
                            <input 
                              type="radio" 
                              name="sellerType" 
                              value={type}
                              checked={formData.sellerType === type}
                              onChange={(e) => setFormData({...formData, sellerType: e.target.value})}
                              className="w-4 h-4 accent-black"
                              disabled={isApproved}
                            />
                            <span className="font-medium text-black">{type}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {sec.id === 'identity' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Full Legal Name</label>
                          <input type="text" value={formData.identityData.fullName} onChange={e => setFormData({...formData, identityData: {...formData.identityData, fullName: e.target.value}})} disabled={isApproved} className="w-full bg-white border border-[var(--accent-gray)] rounded-lg px-3 py-2 text-black focus:outline-none focus:border-black" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Government ID</label>
                          <select value={formData.identityData.idType} onChange={e => setFormData({...formData, identityData: {...formData.identityData, idType: e.target.value}})} disabled={isApproved} className="w-full bg-white border border-[var(--accent-gray)] rounded-lg px-3 py-2 text-black focus:outline-none focus:border-black">
                            <option value="PASSPORT">Passport</option>
                            <option value="NIN">NIN</option>
                            <option value="DRIVERS_LICENSE">Driver's License</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">ID Number</label>
                          <input type="text" value={formData.identityData.idNumber} onChange={e => setFormData({...formData, identityData: {...formData.identityData, idNumber: e.target.value}})} disabled={isApproved} className="w-full bg-white border border-[var(--accent-gray)] rounded-lg px-3 py-2 text-black focus:outline-none focus:border-black" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Date of Birth</label>
                          <input type="date" value={formData.identityData.dob} onChange={e => setFormData({...formData, identityData: {...formData.identityData, dob: e.target.value}})} disabled={isApproved} className="w-full bg-white border border-[var(--accent-gray)] rounded-lg px-3 py-2 text-black focus:outline-none focus:border-black" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Residential Address</label>
                          <input type="text" value={formData.identityData.address} onChange={e => setFormData({...formData, identityData: {...formData.identityData, address: e.target.value}})} disabled={isApproved} className="w-full bg-white border border-[var(--accent-gray)] rounded-lg px-3 py-2 text-black focus:outline-none focus:border-black" />
                        </div>
                      </div>
                    )}

                    {sec.id === 'business' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Legal Business Name</label>
                          <input type="text" value={formData.businessData.legalName} onChange={e => setFormData({...formData, businessData: {...formData.businessData, legalName: e.target.value}})} disabled={isApproved} className="w-full bg-white border border-[var(--accent-gray)] rounded-lg px-3 py-2 text-black focus:outline-none focus:border-black" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Trading Name</label>
                          <input type="text" value={formData.businessData.tradingName} onChange={e => setFormData({...formData, businessData: {...formData.businessData, tradingName: e.target.value}})} disabled={isApproved} className="w-full bg-white border border-[var(--accent-gray)] rounded-lg px-3 py-2 text-black focus:outline-none focus:border-black" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">CAC / Registration Number</label>
                          <input type="text" value={formData.businessData.registrationNumber} onChange={e => setFormData({...formData, businessData: {...formData.businessData, registrationNumber: e.target.value}})} disabled={isApproved} className="w-full bg-white border border-[var(--accent-gray)] rounded-lg px-3 py-2 text-black focus:outline-none focus:border-black" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">TIN</label>
                          <input type="text" value={formData.businessData.tin} onChange={e => setFormData({...formData, businessData: {...formData.businessData, tin: e.target.value}})} disabled={isApproved} className="w-full bg-white border border-[var(--accent-gray)] rounded-lg px-3 py-2 text-black focus:outline-none focus:border-black" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Industry</label>
                          <input type="text" value={formData.businessData.industry} onChange={e => setFormData({...formData, businessData: {...formData.businessData, industry: e.target.value}})} disabled={isApproved} className="w-full bg-white border border-[var(--accent-gray)] rounded-lg px-3 py-2 text-black focus:outline-none focus:border-black" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Business Category</label>
                          <input type="text" value={formData.businessData.category} onChange={e => setFormData({...formData, businessData: {...formData.businessData, category: e.target.value}})} disabled={isApproved} className="w-full bg-white border border-[var(--accent-gray)] rounded-lg px-3 py-2 text-black focus:outline-none focus:border-black" />
                        </div>
                      </div>
                    )}

                    {sec.id === 'ownership' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Directors</label>
                          <input type="text" value={formData.ownershipData.directors} onChange={e => setFormData({...formData, ownershipData: {...formData.ownershipData, directors: e.target.value}})} disabled={isApproved} className="w-full bg-white border border-[var(--accent-gray)] rounded-lg px-3 py-2 text-black focus:outline-none focus:border-black" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Beneficial Owners</label>
                          <input type="text" value={formData.ownershipData.beneficialOwners} onChange={e => setFormData({...formData, ownershipData: {...formData.ownershipData, beneficialOwners: e.target.value}})} disabled={isApproved} className="w-full bg-white border border-[var(--accent-gray)] rounded-lg px-3 py-2 text-black focus:outline-none focus:border-black" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Ownership %</label>
                          <input type="text" value={formData.ownershipData.ownershipPercentage} onChange={e => setFormData({...formData, ownershipData: {...formData.ownershipData, ownershipPercentage: e.target.value}})} disabled={isApproved} className="w-full bg-white border border-[var(--accent-gray)] rounded-lg px-3 py-2 text-black focus:outline-none focus:border-black" />
                        </div>
                      </div>
                    )}

                    {sec.id === 'address' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Registered Address</label>
                          <input type="text" value={formData.addressData.registeredAddress} onChange={e => setFormData({...formData, addressData: {...formData.addressData, registeredAddress: e.target.value}})} disabled={isApproved} className="w-full bg-white border border-[var(--accent-gray)] rounded-lg px-3 py-2 text-black focus:outline-none focus:border-black" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Operating Address</label>
                          <input type="text" value={formData.addressData.operatingAddress} onChange={e => setFormData({...formData, addressData: {...formData.addressData, operatingAddress: e.target.value}})} disabled={isApproved} className="w-full bg-white border border-[var(--accent-gray)] rounded-lg px-3 py-2 text-black focus:outline-none focus:border-black" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider flex items-center gap-1">Store Location</label>
                          <select 
                            value={formData.addressData.storeLocation} 
                            onChange={e => setFormData({...formData, addressData: {...formData.addressData, storeLocation: e.target.value}})} 
                            disabled={isApproved} 
                            className="w-full bg-white border border-[var(--accent-gray)] rounded-lg px-3 py-2 text-black focus:outline-none focus:border-black"
                          >
                            <option value="" disabled>📍 Select Store Location</option>
                            <optgroup label="Global Regions">
                              <option value="North America">North America</option>
                              <option value="Europe">Europe</option>
                              <option value="Africa">Africa</option>
                              <option value="Asia">Asia</option>
                              <option value="South America">South America</option>
                              <option value="Oceania">Oceania</option>
                            </optgroup>
                            <optgroup label="Nigerian States">
                              <option value="Lagos">Lagos</option>
                              <option value="Abuja">Abuja</option>
                              <option value="Rivers">Rivers</option>
                              <option value="Kano">Kano</option>
                              <option value="Oyo">Oyo</option>
                              <option value="Enugu">Enugu</option>
                              <option value="Delta">Delta</option>
                              <option value="Kaduna">Kaduna</option>
                              <option value="Ogun">Ogun</option>
                              <option value="Edo">Edo</option>
                            </optgroup>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Proof of Address (Image/PDF)</label>
                          <div className="flex items-center gap-4">
                            {!isApproved && (
                              <label className="cursor-pointer bg-white border border-[var(--accent-gray)] hover:border-black text-black rounded-lg px-4 py-2 transition-colors flex items-center gap-2">
                                {uploadingImage ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                {uploadingImage ? 'Uploading...' : 'Replace Document'}
                                <input 
                                  type="file" 
                                  accept="image/*,.pdf"
                                  className="hidden"
                                  onChange={(e) => handleFileUpload(e, 'addressData', 'proofOfAddressUrl')}
                                  disabled={uploadingImage}
                                />
                              </label>
                            )}
                            {formData.addressData.proofOfAddressUrl && (
                              <a href={formData.addressData.proofOfAddressUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-500 hover:underline text-sm font-medium">
                                <FileText size={16} /> View Uploaded File
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {sec.id === 'payout' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Bank</label>
                          <input type="text" value={formData.payoutData.bank} onChange={e => setFormData({...formData, payoutData: {...formData.payoutData, bank: e.target.value}})} disabled={isApproved} className="w-full bg-white border border-[var(--accent-gray)] rounded-lg px-3 py-2 text-black focus:outline-none focus:border-black" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Account Number</label>
                          <input type="text" value={formData.payoutData.accountNumber} onChange={e => setFormData({...formData, payoutData: {...formData.payoutData, accountNumber: e.target.value}})} disabled={isApproved} className="w-full bg-white border border-[var(--accent-gray)] rounded-lg px-3 py-2 text-black focus:outline-none focus:border-black" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Account Name</label>
                          <div className="relative">
                            <input type="text" value={formData.payoutData.accountName} onChange={e => setFormData({...formData, payoutData: {...formData.payoutData, accountName: e.target.value}})} disabled={isApproved} className="w-full bg-white border border-[var(--accent-gray)] rounded-lg px-3 py-2 text-black focus:outline-none focus:border-black pr-10" />
                            <CheckCircle size={18} className="absolute right-3 top-2.5 text-green-500 opacity-50" />
                          </div>
                        </div>
                      </div>
                    )}

                  </div>

                  {existingRequest && !isApproved && (
                    <div className="mt-6 flex justify-end">
                      <button 
                        onClick={() => handleUpdateSection(sec.dataKey)}
                        disabled={loading}
                        className="bg-black text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
                      >
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        Update Section
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!existingRequest && (
        <div className="p-6 border-t border-[var(--accent-gray)] bg-gray-50">
          <button 
            onClick={handleSubmitAll}
            disabled={loading}
            className="w-full bg-[var(--accent-gray)] text-black font-extrabold py-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity tracking-widest uppercase disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Business Verification'}
          </button>
        </div>
      )}
    </div>
  );
};

export default KybWizard;
