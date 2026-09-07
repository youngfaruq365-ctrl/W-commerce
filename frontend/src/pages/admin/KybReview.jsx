import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, FileText, Search, User, Briefcase } from 'lucide-react';
import axios from 'axios';

const KybReview = () => {
  const [tab, setTab] = useState('MERCHANTS'); // MERCHANTS or COURIERS
  const [couriers, setCouriers] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tab === 'COURIERS') {
      fetchCouriers();
    } else if (tab === 'MERCHANTS') {
      fetchMerchants();
    }
  }, [tab]);

  const fetchCouriers = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/v1/admin/couriers/pending-kyc');
      if (res.data.success) setCouriers(res.data.data);
    } catch (err) {
      toast.error('Failed to fetch courier KYC');
    } finally {
      setLoading(false);
    }
  };

  const fetchMerchants = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/v1/admin/verifications');
      if (res.data.success) {
        // Filter out KYC if it's only for couriers. Actually, backend returns both KYC and KYB. We should filter for KYB or BUSINESS type requests if needed, but for now we can just show what comes back or filter by type === 'KYB'.
        setMerchants(res.data.requests.filter(req => req.type === 'KYB' || req.type === 'BUSINESS'));
      }
    } catch (err) {
      toast.error('Failed to fetch merchant KYB');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    try {
      const res = await axios.post(`/api/v1/admin/couriers/${id}/kyc-${action}`);
      if (res.data.success) {
        toast.success(`Courier ${action}d successfully`);
        fetchCouriers();
      } else {
        toast.error(res.data.message || 'Action failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Network error');
    }
  };

  const handleMerchantAction = async (requestId, status) => {
    try {
      const res = await axios.post('/api/v1/admin/verifications/process', {
        requestId,
        status,
        adminNotes: `Action taken from Admin Panel`
      });
      if (res.data.success) {
        toast.success(`Merchant ${status.toLowerCase()} successfully`);
        fetchMerchants();
      } else {
        toast.error(res.data.message || 'Action failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Network error');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-black pt-24 pb-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Verification Center</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button 
            onClick={() => setTab('MERCHANTS')}
            className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition ${tab === 'MERCHANTS' ? 'bg-black text-white' : 'bg-white/50 text-gray-600 hover:bg-white'}`}
          >
            <Briefcase size={18} /> Merchant KYB
          </button>
          <button 
            onClick={() => setTab('COURIERS')}
            className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition ${tab === 'COURIERS' ? 'bg-black text-white' : 'bg-white/50 text-gray-600 hover:bg-white'}`}
          >
            <User size={18} /> Courier KYC
          </button>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
              <input type="text" placeholder="Search..." className="w-full bg-white/50 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-gx-gray transition-colors" />
            </div>
            <div className="flex gap-2">
              <select className="bg-white/50 border border-white/10 rounded-lg px-4 py-2 text-sm">
                <option>Pending Review</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-gray-500 bg-white/30">
                  <th className="p-4">{tab === 'MERCHANTS' ? 'Business Name' : 'Courier Info'}</th>
                  <th className="p-4">{tab === 'MERCHANTS' ? 'Country' : 'Vehicle'}</th>
                  <th className="p-4">{tab === 'MERCHANTS' ? 'Reg Number' : 'Guarantor'}</th>
                  <th className="p-4">Documents</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                
                {tab === 'MERCHANTS' && loading && (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-gray-500">Loading merchants...</td>
                  </tr>
                )}

                {tab === 'MERCHANTS' && !loading && merchants.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-gray-500">No pending merchant applications.</td>
                  </tr>
                )}

                {tab === 'MERCHANTS' && !loading && merchants.map(merchant => (
                  <tr key={merchant.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-semibold">{merchant.user?.store?.storeName || merchant.user?.fullName}</td>
                    <td className="p-4 text-gray-700">{merchant.user?.store?.country || 'Unknown'}</td>
                    <td className="p-4 text-gray-700 font-mono">{merchant.idNumber || 'N/A'}</td>
                    <td className="p-4">
                      <button onClick={() => window.open(JSON.parse(merchant.documentUrls)[0] || '#', '_blank')} className="flex items-center gap-1 text-blue-400 hover:underline">
                        <FileText size={14} /> View Docs
                      </button>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${merchant.status === 'PENDING' ? 'bg-gx-warning/20 text-gx-warning' : merchant.status === 'APPROVED' ? 'bg-gx-success/10 text-gx-success' : 'bg-gx-error/10 text-gx-error'}`}>
                        {merchant.status}
                      </span>
                    </td>
                    <td className="p-4 flex gap-2 justify-end">
                      {merchant.status === 'PENDING' && (
                        <>
                          <button onClick={() => handleMerchantAction(merchant.id, 'APPROVED')} className="p-2 bg-gx-success/10 text-gx-success rounded hover:bg-gx-success/20 transition-colors" title="Approve">
                            <CheckCircle size={18} />
                          </button>
                          <button onClick={() => handleMerchantAction(merchant.id, 'REJECTED')} className="p-2 bg-gx-gray/10 text-gx-gray rounded hover:bg-gx-gray/20 transition-colors" title="Reject">
                            <XCircle size={18} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}

                {tab === 'COURIERS' && loading && (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-gray-500">Loading couriers...</td>
                  </tr>
                )}

                {tab === 'COURIERS' && !loading && couriers.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-gray-500">No pending courier applications.</td>
                  </tr>
                )}

                {tab === 'COURIERS' && !loading && couriers.map(courier => (
                  <tr key={courier.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <p className="font-semibold">{courier.user?.firstName} {courier.user?.lastName}</p>
                      <p className="text-xs text-gray-500">{courier.user?.email}</p>
                    </td>
                    <td className="p-4">
                      {courier.vehicles?.[0] ? (
                        <>
                          <p className="font-bold">{courier.vehicles[0].plateNumber}</p>
                          <p className="text-xs text-gray-500">{courier.vehicles[0].make} {courier.vehicles[0].model}</p>
                        </>
                      ) : 'N/A'}
                    </td>
                    <td className="p-4">
                      <p className="font-semibold">{courier.guarantorName}</p>
                      <p className="text-xs text-gray-500">{courier.guarantorPhone}</p>
                    </td>
                    <td className="p-4">
                      <a href={courier.driversLicenseUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-400 hover:underline">
                        <FileText size={14} /> View ID
                      </a>
                    </td>
                    <td className="p-4">
                      <span className="bg-gx-warning/20 text-gx-warning px-2 py-1 rounded text-xs font-bold uppercase">{courier.kycStatus}</span>
                    </td>
                    <td className="p-4 flex gap-2 justify-end">
                      <button onClick={() => handleAction(courier.id, 'approve')} className="p-2 bg-gx-success/10 text-gx-success rounded hover:bg-gx-success/20 transition-colors" title="Approve">
                        <CheckCircle size={18} />
                      </button>
                      <button onClick={() => handleAction(courier.id, 'reject')} className="p-2 bg-gx-gray/10 text-gx-gray rounded hover:bg-gx-gray/20 transition-colors" title="Reject">
                        <XCircle size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KybReview;
