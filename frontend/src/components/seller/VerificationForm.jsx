import React, { useState, useEffect } from 'react';
import { apiClient as axios } from '@/utils/apiClient';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import KybWizard from './Dashboard/KybWizard';

const VerificationForm = ({ showNotification }) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);

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
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-gray-500" size={32} /></div>;
  }

  const isVerified = status?.kycTier >= 2 || user?.kycTier >= 2;
  const requests = status?.requests || [];
  
  // Find the most recent KYB request if any
  const existingKybRequest = requests.find(r => r.type === 'KYB');
  
  const hasPending = existingKybRequest?.status === 'PENDING';
  const hasRejected = existingKybRequest?.status === 'REJECTED';

  if (isVerified) {
    return (
      <div className="bg-white border border-[var(--accent-gray)] shadow-[0_0_10px_var(--accent-gray-dim)] p-8 rounded-xl max-w-2xl">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[var(--accent-gray)] shadow-[0_2px_10px_var(--accent-gray-dim)]">
          <ShieldCheck size={32} className="text-gray-700" />
          <div>
            <h3 className="font-bold text-lg text-black">Verified Merchant</h3>
            <p className="text-sm text-[var(--text-muted)]">Your business identity is fully verified.</p>
          </div>
        </div>
        <p className="text-sm text-[var(--text-muted)]">No further documents required at this time.</p>
      </div>
    );
  }

  // If there's an existing request (even pending or rejected), we show the KybWizard but pass the existingRequest so it populates the data and allows them to view/update sections if needed.
  return (
    <KybWizard existingRequest={existingKybRequest} onComplete={fetchStatus} />
  );
};

export default VerificationForm;
