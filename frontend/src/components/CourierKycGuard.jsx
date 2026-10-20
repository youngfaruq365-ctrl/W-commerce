import React, { useEffect, useState } from 'react';
import { apiClient as axios } from '@/utils/apiClient';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useIsPresent } from 'framer-motion';

const CourierKycGuard = ({ children }) => {
  const { user } = useAuthStore();
  const [kycStatus, setKycStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const isPresent = useIsPresent();

  useEffect(() => {
    const checkKyc = async () => {
      try {
        const res = await axios.get('/api/v1/courier/kyc/status');
        if (res.data.success) {
          setKycStatus(res.data.kycStatus);
        } else {
          setKycStatus('UNREGISTERED');
        }
      } catch (err) {
        setKycStatus('ERROR');
      } finally {
        setLoading(false);
      }
    };
    checkKyc();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If KYC is not approved, redirect to onboarding unless we are already on the onboarding page
  if (kycStatus !== 'APPROVED' && location.pathname !== '/courier/onboarding' && isPresent) {
    return <Navigate to="/courier/onboarding" replace />;
  }

  return children;
};

export default CourierKycGuard;
